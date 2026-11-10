CREATE DATABASE IF NOT EXISTS ecommerce_order_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ecommerce_order_db;

CREATE TABLE IF NOT EXISTS customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_products_price_nonnegative CHECK (price >= 0),
    CONSTRAINT chk_products_stock_nonnegative CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT chk_orders_total_nonnegative CHECK (total_amount >= 0),
    INDEX idx_orders_customer_created (customer_id, created_at),
    INDEX idx_orders_status_created (status, created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_order_items_price_nonnegative CHECK (unit_price >= 0),
    INDEX idx_order_items_product (product_id)
);

INSERT INTO customers (id, full_name, email, phone) VALUES
    (1, 'Alex Nguyen', 'alex.nguyen@example.com', '+84901234567'),
    (2, 'Jamie Tran', 'jamie.tran@example.com', '+84907654321'),
    (3, 'Morgan Pham', 'morgan.pham@example.com', '+84908881234'),
    (4, 'Taylor Le', 'taylor.le@example.com', '+84905556677');

INSERT INTO products (id, product_name, price, stock) VALUES
    (1, 'Wireless Mouse', 25.00, 49),
    (2, 'Mechanical Keyboard', 89.99, 19),
    (3, '27-inch Monitor', 219.99, 9),
    (4, 'Noise-Cancelling Headphones', 59.50, 38),
    (5, 'USB-C Hub', 19.99, 50);

INSERT INTO orders (id, customer_id, status, total_amount) VALUES
    (1, 1, 'completed', 114.99),
    (2, 2, 'completed', 219.99),
    (3, 3, 'pending', 119.00),
    (4, 1, 'cancelled', 25.00);

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 1, 25.00),
    (1, 2, 1, 89.99),
    (2, 3, 1, 219.99),
    (3, 4, 2, 59.50),
    (4, 1, 1, 25.00);
