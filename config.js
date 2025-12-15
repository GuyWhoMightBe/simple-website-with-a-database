require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
	port: process.env.PORT || 3000,
	sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
	adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
	db: {
		host: process.env.DB_HOST || 'localhost',
		user: process.env.DB_USER || 'root',
		password: process.env.DB_PASSWORD || '',
		database: process.env.DB_NAME || 'showcase_db',
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0
	}
};

const pool = mysql.createPool(config.db);

module.exports = { config, pool };
