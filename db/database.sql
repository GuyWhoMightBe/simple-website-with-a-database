-- Schema for showcase website
CREATE DATABASE IF NOT EXISTS showcase_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE showcase_db;

CREATE TABLE IF NOT EXISTS users (
	id INT PRIMARY KEY AUTO_INCREMENT,
	vards VARCHAR(100) NOT NULL,
	uzvards VARCHAR(100) NOT NULL,
	epasts VARCHAR(255) NOT NULL UNIQUE,
	parole_hash VARCHAR(255) NOT NULL,
	is_admin TINYINT(1) NOT NULL DEFAULT 0,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
	id INT PRIMARY KEY AUTO_INCREMENT,
	title VARCHAR(200) NOT NULL,
	author VARCHAR(200) DEFAULT '',
	description TEXT,
	cover_url VARCHAR(500) DEFAULT '',
	cloneable TINYINT(1) NOT NULL DEFAULT 0,
	likes_count INT NOT NULL DEFAULT 0,
	owner_id INT NULL,
	deleted_at TIMESTAMP NULL DEFAULT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products
	ADD CONSTRAINT fk_product_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS likes (
	user_id INT NOT NULL,
	product_id INT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (user_id, product_id),
	CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	CONSTRAINT fk_like_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Seed sample products
INSERT INTO products (title, author, description, cover_url, cloneable) VALUES
('Heco', 'jthelms', 'We turn information into experiences people care about.', 'https://picsum.photos/seed/1/600/400', 1),
('Breaking Bad', 'joaopaulos', 'New concept', 'https://picsum.photos/seed/2/600/400', 0),
('Cards Webflow UI Kit', 'janlosert', 'Cards UI kit', 'https://picsum.photos/seed/3/600/400', 1),
('Webflow wireframe kit', 'DarioStefanutto', 'Wireframe kit', 'https://picsum.photos/seed/4/600/400', 1),
('Start up to lead!', 'MILK', 'Sports Accelerator', 'https://picsum.photos/seed/5/600/400', 0),
('Visual Designs UX Wireframes', 'janlosert', 'Wireframes', 'https://picsum.photos/seed/6/600/400', 1);
