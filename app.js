const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { config, pool } = require('./config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
	secret: config.sessionSecret,
	resave: false,
	saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function requireAuth(req, res, next) {
	if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
	next();
}

function requireAdmin(req, res, next) {
	if (!req.session.user || !req.session.user.is_admin) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	next();
}

function isEmail(s){
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').toLowerCase());
}

function validatePassword(pw, email){
	const reasons = [];
	const s = String(pw||'');
	if (s.length < 8) reasons.push('At least 8 characters');
	const hasLower = /[a-z]/.test(s);
	const hasUpper = /[A-Z]/.test(s);
	const hasDigit = /\d/.test(s);
	const hasSymbol = /[^\w\s]/.test(s);
	const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
	if (classes < 3) reasons.push('Use a mix of upper/lowercase, numbers, and symbols (3 of 4)');
	const local = String(email||'').split('@')[0]||'';
	if (local && s.toLowerCase().includes(local.toLowerCase())) reasons.push('Password must not contain your email name');
	if (/(.)\1{2,}/.test(s)) reasons.push('Avoid repeated characters');
	return { valid: reasons.length === 0, reasons };
}

// Auth routes
app.post('/api/register', async (req, res) => {
	try {
		const { vards, uzvards, epasts, parole } = req.body;
		if (!vards || !uzvards || !epasts || !parole) return res.status(400).json({ error: 'Missing fields' });
		if (!isEmail(epasts)) return res.status(400).json({ error: 'Invalid email' });
		const pwCheck = validatePassword(parole, epasts);
		if (!pwCheck.valid) return res.status(400).json({ error: 'Weak password: ' + pwCheck.reasons.join('; ') });
		if (String(vards).length > 100 || String(uzvards).length > 100) return res.status(400).json({ error: 'Name too long' });
		const hash = await bcrypt.hash(parole, 10);
		const isAdmin = config.adminEmails.includes(String(epasts).toLowerCase()) ? 1 : 0;
		const [result] = await pool.execute(
			'INSERT INTO users (vards, uzvards, epasts, parole_hash, is_admin) VALUES (?, ?, ?, ?, ?)',
			[vards, uzvards, epasts, hash, isAdmin]
		);
		res.json({ success: true, id: result.insertId });
	} catch (err) {
		if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'User exists' });
		console.error(err);
		res.status(500).json({ error: 'Server error' });
	}
});

app.post('/api/login', async (req, res) => {
	try {
		const { epasts, parole } = req.body;
		if (!isEmail(epasts) || !parole) return res.status(400).json({ error: 'Invalid input' });
		const [rows] = await pool.execute('SELECT id, vards, uzvards, epasts, parole_hash, is_admin FROM users WHERE epasts = ?', [epasts]);
		if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
		const user = rows[0];
		const ok = await bcrypt.compare(parole, user.parole_hash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		req.session.user = { id: user.id, vards: user.vards, uzvards: user.uzvards, epasts: user.epasts, is_admin: !!user.is_admin };
		res.json({ success: true, user: req.session.user });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error' });
	}
});

app.post('/api/logout', (req, res) => {
	req.session.destroy(() => res.json({ success: true }));
});

// Products
app.get('/api/products', async (_req, res) => {
	try {
		const [rows] = await pool.execute('SELECT id, title, author, cover_url, likes_count, cloneable, created_at FROM products WHERE deleted_at IS NULL ORDER BY id DESC');
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error' });
	}
});

app.get('/api/products/:id', async (req, res) => {
	try {
		const [rows] = await pool.execute('SELECT id, title, author, description, cover_url, likes_count, cloneable, created_at FROM products WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
		if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error' });
	}
});

// Create product (any authenticated user)
app.post('/api/products', requireAuth, async (req, res) => {
	const { title, author, description, cover_url, cloneable } = req.body;
	if (!title) return res.status(400).json({ error: 'title required' });
	const [result] = await pool.execute('INSERT INTO products (title, author, description, cover_url, owner_id, cloneable) VALUES (?, ?, ?, ?, ?, ?)', [title, author || '', description || '', cover_url || '', req.session.user.id, cloneable ? 1 : 0]);
	res.json({ success: true, id: result.insertId });
});

// Likes
app.post('/api/products/:id/like', requireAuth, async (req, res) => {
	const userId = req.session.user.id;
	const productId = req.params.id;
	try {
		await pool.execute('INSERT IGNORE INTO likes (user_id, product_id) VALUES (?, ?)', [userId, productId]);
		await pool.execute('UPDATE products SET likes_count = (SELECT COUNT(*) FROM likes WHERE product_id = ?) WHERE id = ?', [productId, productId]);
		const [[row]] = await pool.execute('SELECT likes_count FROM products WHERE id = ?', [productId]);
		res.json({ success: true, likes: row.likes_count });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error' });
	}
});

app.delete('/api/products/:id/like', requireAuth, async (req, res) => {
	const userId = req.session.user.id;
	const productId = req.params.id;
	try {
		await pool.execute('DELETE FROM likes WHERE user_id = ? AND product_id = ?', [userId, productId]);
		await pool.execute('UPDATE products SET likes_count = (SELECT COUNT(*) FROM likes WHERE product_id = ?) WHERE id = ?', [productId, productId]);
		const [[row]] = await pool.execute('SELECT likes_count FROM products WHERE id = ?', [productId]);
		res.json({ success: true, likes: row.likes_count });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error' });
	}
});

// Admin CRUD
app.get('/api/admin/users', requireAdmin, async (_req, res) => {
	const [rows] = await pool.execute('SELECT id, vards, uzvards, epasts, is_admin FROM users ORDER BY id DESC');
	res.json(rows);
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
	const { title, author, description, cover_url } = req.body;
	if (!title) return res.status(400).json({ error: 'title required' });
	const [result] = await pool.execute('INSERT INTO products (title, author, description, cover_url) VALUES (?, ?, ?, ?)', [title, author || '', description || '', cover_url || '']);
	res.json({ success: true, id: result.insertId });
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
	const { title = null, author = null, description = null, cover_url = null } = req.body;
	await pool.execute(
		'UPDATE products SET title=COALESCE(?, title), author=COALESCE(?, author), description=COALESCE(?, description), cover_url=COALESCE(?, cover_url) WHERE id=?',
		[title, author, description, cover_url, req.params.id]
	);
	res.json({ success: true });
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
	await pool.execute('UPDATE products SET deleted_at = NOW() WHERE id=?', [req.params.id]);
	res.json({ success: true });
});

app.post('/api/admin/products/:id/restore', requireAdmin, async (req, res) => {
	await pool.execute('UPDATE products SET deleted_at = NULL WHERE id=?', [req.params.id]);
	res.json({ success: true });
});

app.post('/api/admin/products/restore-all', requireAdmin, async (_req, res) => {
	await pool.execute('UPDATE products SET deleted_at = NULL WHERE deleted_at IS NOT NULL');
	res.json({ success: true });
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
	const userId = req.params.id;
	// Soft delete the user's products and then delete user
	await pool.execute('UPDATE products SET deleted_at = NOW() WHERE owner_id = ?', [userId]);
	await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
	res.json({ success: true });
});

app.get('/api/me', (req, res) => {
	res.json({ user: req.session.user || null });
});

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
	console.log(`Server listening on http://localhost:${config.port}`);
});

