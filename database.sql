-- EasyBuy schema for InfinityFree. Select your target database in phpMyAdmin before importing.
-- This creates tables only; import your LOCAL data export separately to migrate products/users/orders.

CREATE TABLE
    IF NOT EXISTS sellers (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        phone VARCHAR(20) NULL,
        password_hash VARCHAR(255) NOT NULL,
        status ENUM ('active', 'suspended') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB;

CREATE TABLE
    IF NOT EXISTS products (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        seller_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(100) NOT NULL,
        category ENUM (
            'Books',
            'Stationery Kits',
            'Calculators',
            'Lab Equipment',
            'Electronics',
            'Accessories',
            'T-Shirts',
            'Bags'
        ) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        condition_label VARCHAR(60) NOT NULL,
        college VARCHAR(100) NOT NULL,
        description VARCHAR(2000) NOT NULL DEFAULT '',
        image_path VARCHAR(255) NOT NULL,
        stock INT UNSIGNED NOT NULL DEFAULT 1,
        status ENUM ('active', 'removed') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_products_status_created (status, created_at),
        INDEX idx_products_seller (seller_id),
        CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES sellers (id) ON DELETE CASCADE
    ) ENGINE = InnoDB;

-- Additive EasyBuy order and messaging tables. These tables do not replace existing data.
CREATE TABLE
    IF NOT EXISTS eb_orders (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_code VARCHAR(32) NOT NULL UNIQUE,
        customer_email VARCHAR(254) NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(24) NOT NULL,
        delivery_address VARCHAR(500) NOT NULL,
        payment_method VARCHAR(40) NOT NULL,
        payment_status VARCHAR(60) NOT NULL DEFAULT 'Not processed',
        status ENUM (
            'Placed',
            'Confirmed',
            'Shipped',
            'Delivered',
            'Cancelled'
        ) NOT NULL DEFAULT 'Placed',
        delivery_otp VARCHAR(6) NULL,
        delivery_otp_verified_at TIMESTAMP NULL DEFAULT NULL,
        cancelled_at TIMESTAMP NULL DEFAULT NULL,
        total DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_eb_orders_customer (customer_email, created_at),
        INDEX idx_eb_orders_status (status)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    IF NOT EXISTS eb_order_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NULL,
        product_code VARCHAR(80) NOT NULL,
        product_name VARCHAR(150) NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT '',
        image_path VARCHAR(255) NOT NULL DEFAULT '',
        unit_price DECIMAL(10, 2) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        seller_id BIGINT UNSIGNED NULL,
        INDEX idx_eb_items_order (order_id),
        INDEX idx_eb_items_seller (seller_id),
        CONSTRAINT fk_eb_items_order FOREIGN KEY (order_id) REFERENCES eb_orders (id) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    IF NOT EXISTS eb_tracking_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        status VARCHAR(40) NOT NULL,
        note VARCHAR(500) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eb_tracking_order (order_id, created_at),
        CONSTRAINT fk_eb_tracking_order FOREIGN KEY (order_id) REFERENCES eb_orders (id) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    IF NOT EXISTS eb_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        thread_key VARCHAR(80) NOT NULL,
        order_id BIGINT UNSIGNED NULL,
        product_code VARCHAR(80) NULL,
        sender_role ENUM ('buyer', 'seller') NOT NULL,
        sender_email VARCHAR(254) NOT NULL,
        recipient_email VARCHAR(254) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eb_messages_thread (thread_key, created_at),
        INDEX idx_eb_messages_recipient (recipient_email, created_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    IF NOT EXISTS eb_product_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        product_id BIGINT UNSIGNED NOT NULL,
        seller_id BIGINT UNSIGNED NOT NULL,
        action VARCHAR(40) NOT NULL,
        details VARCHAR(500) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eb_product_history (product_id, created_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- EasyBuy feature migration for MySQL/MariaDB. BACK UP the database first.
-- api/config.php applies these additive changes automatically when APIs are first used.
CREATE TABLE IF NOT EXISTS eb_return_requests (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 customer_email VARCHAR(254) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 status ENUM('Requested','Approved','Rejected','Refunded') NOT NULL DEFAULT 'Requested',
 refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_return_order(order_id), INDEX idx_return_customer(customer_email),
 CONSTRAINT fk_return_order FOREIGN KEY(order_id) REFERENCES eb_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS eb_feedback (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 product_code VARCHAR(80) NOT NULL,
 customer_email VARCHAR(254) NOT NULL,
 rating TINYINT UNSIGNED NOT NULL,
 comment VARCHAR(1000) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_feedback_order_product(order_id,product_code), INDEX idx_feedback_product(product_code),
 CONSTRAINT fk_feedback_order FOREIGN KEY(order_id) REFERENCES eb_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Column additions are applied with existence checks by api/config.php for MariaDB 10.4 compatibility.
