const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const app = require('../server');
const pool = require('../config/db');
const orderService = require('../services/order.service');
const slugify = require('../utils/slugify');

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) {
        server.close();
        await once(server, 'close');
    }
});

test('root route lists the API endpoints', async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.endpoints.categories, '/api/categories');
    assert.equal(body.endpoints.orders, '/api/v1/orders');
});

test('Swagger spec includes the exercise and homework routes', async () => {
    const response = await fetch(`${baseUrl}/api-docs.json`);
    const specification = await response.json();

    assert.equal(response.status, 200);
    assert.ok(specification.components.parameters.idParam);
    assert.ok(specification.paths['/products'].get);
    assert.ok(specification.paths['/products/{id}'].delete);
    assert.ok(specification.paths['/categories/{id}'].patch);
    assert.ok(specification.paths['/v1/orders'].post);
    assert.ok(specification.paths['/v1/orders/analytics/sales-summary'].get);
    assert.ok(specification.paths['/v1/customers/{id}/order-history'].get);
});

test('category input validation rejects too-short names', async () => {
    const response = await fetch(`${baseUrl}/api/categories`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'ab' })
    });

    assert.equal(response.status, 400);
});

test('order input validation rejects an empty items array without needing MySQL', async () => {
    const response = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId: 1, items: [] })
    });

    assert.equal(response.status, 400);
});

test('order IDs are validated before any MySQL connection is requested', async () => {
    const response = await fetch(`${baseUrl}/api/v1/orders/not-an-id`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
});

test('category slugs are generated from names', () => {
    assert.equal(slugify('Home & Living'), 'home-living');
});

test('order creation locks inventory, stores current prices, and commits atomically', async () => {
    const calls = [];
    const connection = {
        async beginTransaction() {
            calls.push(['begin']);
        },
        async query(sql, params) {
            calls.push([sql, params]);
            if (sql.startsWith('SELECT id FROM customers')) {
                return [[{ id: 1 }], []];
            }
            if (sql.startsWith('SELECT id, product_name')) {
                return [[{ id: 1, product_name: 'Mock Product', price: 12.34, stock: 5 }], []];
            }
            if (sql.startsWith('INSERT INTO orders')) {
                assert.equal(params[1], '24.68');
                return [{ insertId: 42 }, []];
            }
            return [{ affectedRows: 1 }, []];
        },
        async commit() {
            calls.push(['commit']);
        },
        async rollback() {
            calls.push(['rollback']);
        },
        release() {
            calls.push(['release']);
        }
    };
    const originalGetConnection = pool.getConnection;
    pool.getConnection = async () => connection;

    try {
        const order = await orderService.createOrder(1, [
            { productId: 1, quantity: 1 },
            { productId: 1, quantity: 1 }
        ]);

        assert.equal(order.id, 42);
        assert.equal(order.totalAmount, 24.68);
        assert.equal(order.items.length, 2);
        assert.deepEqual(calls.find(([sql]) => sql.startsWith('UPDATE products'))[1], [2, 1]);
        assert.ok(calls.some(([name]) => name === 'commit'));
        assert.ok(!calls.some(([name]) => name === 'rollback'));
        assert.ok(calls.some(([name]) => name === 'release'));
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test('insufficient stock rolls back the order transaction', async () => {
    const calls = [];
    const connection = {
        async beginTransaction() {
            calls.push('begin');
        },
        async query(sql) {
            if (sql.startsWith('SELECT id FROM customers')) {
                return [[{ id: 1 }], []];
            }
            if (sql.startsWith('SELECT id, product_name')) {
                return [[{ id: 1, product_name: 'Mock Product', price: 12.34, stock: 1 }], []];
            }
            return [{ affectedRows: 1 }, []];
        },
        async commit() {
            calls.push('commit');
        },
        async rollback() {
            calls.push('rollback');
        },
        release() {
            calls.push('release');
        }
    };
    const originalGetConnection = pool.getConnection;
    pool.getConnection = async () => connection;

    try {
        await assert.rejects(
            orderService.createOrder(1, [
                { productId: 1, quantity: 1 },
                { productId: 1, quantity: 1 }
            ]),
            (error) => error.status === 400 && error.message === 'Product 1 is out of stock'
        );
        assert.deepEqual(calls, ['begin', 'rollback', 'release']);
    } finally {
        pool.getConnection = originalGetConnection;
    }
});
