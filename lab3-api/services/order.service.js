const pool = require('../config/db');

const ORDER_STATUSES = new Set(['pending', 'completed', 'cancelled']);
const MAX_ORDER_TOTAL_CENTS = 999999999999;

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const parsePositiveInteger = (value, label, defaultValue) => {
    if (value === undefined && defaultValue !== undefined) {
        return defaultValue;
    }
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
        throw createHttpError(400, `${label} must be a positive integer`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
        throw createHttpError(400, `${label} must be a positive integer`);
    }
    return parsed;
};

const withTransaction = async (operation) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;
    try {
        await connection.beginTransaction();
        transactionStarted = true;
        const result = await operation(connection);
        await connection.commit();
        return result;
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('MySQL transaction rollback failed:', rollbackError);
            }
        }
        throw error;
    } finally {
        connection.release();
    }
};

const validateOrderItems = (customerId, items) => {
    const parsedCustomerId = parsePositiveInteger(String(customerId), 'customerId');
    if (!Array.isArray(items) || items.length === 0) {
        throw createHttpError(400, 'Items must be a non-empty array');
    }

    return {
        customerId: parsedCustomerId,
        items: items.map((item, index) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                throw createHttpError(400, `Item ${index + 1} must be an object`);
            }
            return {
                productId: parsePositiveInteger(String(item.productId), `items[${index}].productId`),
                quantity: parsePositiveInteger(String(item.quantity), `items[${index}].quantity`)
            };
        })
    };
};

const validateId = (id, label = 'id') => parsePositiveInteger(id, label);

const getPageOptions = (pageValue, limitValue) => {
    const page = parsePositiveInteger(pageValue, 'page', 1);
    const limit = parsePositiveInteger(limitValue, 'limit', 5);
    if (limit > 100) {
        throw createHttpError(400, 'limit cannot be greater than 100');
    }
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset)) {
        throw createHttpError(400, 'page is too large');
    }
    return { page, limit, offset };
};

exports.createOrder = async (customerId, items) => {
    const input = validateOrderItems(customerId, items);
    return withTransaction(async (connection) => {
        const [customers] = await connection.query(
            'SELECT id FROM customers WHERE id = ?',
            [input.customerId]
        );
        if (customers.length === 0) {
            throw createHttpError(404, 'Customer not found');
        }

        const productIds = [...new Set(input.items.map((item) => item.productId))].sort((a, b) => a - b);
        const [products] = await connection.query(
            'SELECT id, product_name, price, stock FROM products WHERE id IN (?) ORDER BY id FOR UPDATE',
            [productIds]
        );
        const productsById = new Map(products.map((product) => [Number(product.id), product]));
        const totalQuantityByProduct = new Map();
        const lines = [];
        let totalCents = 0;

        for (const item of input.items) {
            const product = productsById.get(item.productId);
            if (!product) {
                throw createHttpError(404, `Product ${item.productId} not found`);
            }
            const quantity = (totalQuantityByProduct.get(item.productId) || 0) + item.quantity;
            if (!Number.isSafeInteger(quantity)) {
                throw createHttpError(400, 'Product quantity exceeds the supported amount');
            }
            totalQuantityByProduct.set(item.productId, quantity);

            const unitPriceCents = Math.round(Number(product.price) * 100);
            const lineTotalCents = unitPriceCents * item.quantity;
            if (!Number.isSafeInteger(lineTotalCents)
                || !Number.isSafeInteger(totalCents + lineTotalCents)
                || totalCents + lineTotalCents > MAX_ORDER_TOTAL_CENTS) {
                throw createHttpError(400, 'Order total exceeds the supported amount');
            }
            totalCents += lineTotalCents;
            lines.push({
                productId: item.productId,
                productName: product.product_name,
                quantity: item.quantity,
                unitPriceCents
            });
        }

        for (const [productId, quantity] of totalQuantityByProduct) {
            const product = productsById.get(productId);
            if (Number(product.stock) < quantity) {
                throw createHttpError(400, `Product ${productId} is out of stock`);
            }
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [quantity, productId]
            );
        }

        const totalAmount = (totalCents / 100).toFixed(2);
        const [orderResult] = await connection.query(
            'INSERT INTO orders (customer_id, total_amount) VALUES (?, ?)',
            [input.customerId, totalAmount]
        );
        const orderId = orderResult.insertId;
        const itemValues = lines.map((line) => [
            orderId,
            line.productId,
            line.quantity,
            (line.unitPriceCents / 100).toFixed(2)
        ]);
        await connection.query(
            'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?',
            [itemValues]
        );

        return {
            id: orderId,
            customerId: input.customerId,
            status: 'pending',
            totalAmount: Number(totalAmount),
            items: lines.map((line) => ({
                productId: line.productId,
                productName: line.productName,
                quantity: line.quantity,
                unitPrice: line.unitPriceCents / 100,
                subtotal: (line.unitPriceCents * line.quantity) / 100
            }))
        };
    });
};

exports.getOrders = async ({ status, customerId, page: pageValue, limit: limitValue }) => {
    const { page, limit, offset } = getPageOptions(pageValue, limitValue);
    const conditions = [];
    const params = [];

    if (status !== undefined) {
        if (typeof status !== 'string' || !ORDER_STATUSES.has(status)) {
            throw createHttpError(400, 'Invalid order status');
        }
        conditions.push('o.status = ?');
        params.push(status);
    }
    if (customerId !== undefined) {
        conditions.push('o.customer_id = ?');
        params.push(parsePositiveInteger(customerId, 'customerId'));
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM orders o ${where}`,
        params
    );
    const [orders] = await pool.query(
        `SELECT o.id AS order_id, c.full_name AS customer_name, c.email, o.status,
                o.total_amount, COALESCE(SUM(oi.quantity), 0) AS total_items_count, o.created_at
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         ${where}
         GROUP BY o.id, c.full_name, c.email, o.status, o.total_amount, o.created_at
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    const totalOrders = Number(countRows[0].total);

    return {
        success: true,
        count: orders.length,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders
        },
        data: orders
    };
};

exports.getOrderById = async (idValue) => {
    const id = validateId(idValue);
    const [orders] = await pool.query(
        `SELECT o.id, o.customer_id, o.status, o.total_amount, o.created_at,
                c.full_name, c.email, c.phone
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.id = ?`,
        [id]
    );
    if (orders.length === 0) {
        throw createHttpError(404, 'Order not found');
    }

    const order = orders[0];
    const [items] = await pool.query(
        `SELECT p.product_name, oi.quantity, oi.unit_price,
                (oi.quantity * oi.unit_price) AS subtotal
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [id]
    );
    return {
        id: order.id,
        status: order.status,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        customer: {
            id: order.customer_id,
            fullName: order.full_name,
            email: order.email,
            phone: order.phone
        },
        items
    };
};

exports.updateOrderStatus = async (idValue, status) => {
    const id = validateId(idValue);
    if (typeof status !== 'string' || !ORDER_STATUSES.has(status)) {
        throw createHttpError(400, 'Invalid status');
    }

    return withTransaction(async (connection) => {
        const [orders] = await connection.query(
            'SELECT status FROM orders WHERE id = ? FOR UPDATE',
            [id]
        );
        if (orders.length === 0) {
            throw createHttpError(404, 'Order not found');
        }
        if (orders[0].status === 'cancelled') {
            throw createHttpError(400, 'Order is already cancelled');
        }

        if (status === 'cancelled') {
            const [items] = await connection.query(
                'SELECT product_id, SUM(quantity) AS quantity FROM order_items WHERE order_id = ? GROUP BY product_id',
                [id]
            );
            for (const item of items) {
                await connection.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
        }

        await connection.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        return { success: true, message: 'Status updated', status };
    });
};

exports.deleteOrder = async (idValue) => {
    const id = validateId(idValue);
    return withTransaction(async (connection) => {
        const [orders] = await connection.query(
            'SELECT status FROM orders WHERE id = ? FOR UPDATE',
            [id]
        );
        if (orders.length === 0) {
            throw createHttpError(404, 'Order not found');
        }

        if (orders[0].status !== 'cancelled') {
            const [items] = await connection.query(
                'SELECT product_id, SUM(quantity) AS quantity FROM order_items WHERE order_id = ? GROUP BY product_id',
                [id]
            );
            for (const item of items) {
                await connection.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
        }

        await connection.query('DELETE FROM orders WHERE id = ?', [id]);
        return { success: true, message: 'Order deleted' };
    });
};

exports.getSalesSummary = async () => {
    const [summaryRows] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue,
                COUNT(id) AS completedOrdersCount,
                COALESCE(AVG(total_amount), 0) AS averageOrderValue
         FROM orders
         WHERE status = 'completed'`
    );
    const [topProducts] = await pool.query(
        `SELECT p.id AS product_id, p.product_name,
                SUM(oi.quantity) AS total_sold
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p ON oi.product_id = p.id
         WHERE o.status = 'completed'
         GROUP BY p.id, p.product_name
         ORDER BY total_sold DESC, p.id ASC
         LIMIT 3`
    );
    const summary = summaryRows[0];
    return {
        totalRevenue: summary.totalRevenue,
        completedOrdersCount: Number(summary.completedOrdersCount),
        averageOrderValue: summary.averageOrderValue,
        topSellingProducts: topProducts
    };
};

exports.getCustomerHistory = async (idValue) => {
    const customerId = validateId(idValue, 'customerId');
    const [customers] = await pool.query(
        'SELECT id FROM customers WHERE id = ?',
        [customerId]
    );
    if (customers.length === 0) {
        throw createHttpError(404, 'Customer not found');
    }

    const [orders] = await pool.query(
        `SELECT id, status, total_amount, created_at
         FROM orders
         WHERE customer_id = ?
         ORDER BY created_at DESC`,
        [customerId]
    );
    const [spentRows] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS totalLifetimeSpent
         FROM orders
         WHERE customer_id = ? AND status = 'completed'`,
        [customerId]
    );
    return {
        totalLifetimeSpent: spentRows[0].totalLifetimeSpent,
        orderHistory: orders
    };
};
