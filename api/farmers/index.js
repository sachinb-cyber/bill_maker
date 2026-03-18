const bcrypt = require('bcryptjs');
const { pool } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - list all farmers (admin only)
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    try {
      const result = await pool.query('SELECT id, username, farmer_code, name, mobile, village, milk_type, dairy_name, l_min, l_max, f_min, f_max, target, created_at FROM users WHERE role=$1 ORDER BY farmer_code', ['farmer']);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - add farmer (admin only)
  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const { name, code, mobile, village, milk_type, dairy_name, l_min, l_max, f_min, f_max, target } = req.body;
    if (!name || !code || !mobile) return res.status(400).json({ error: 'Name, code and mobile required' });
    try {
      const hash = await bcrypt.hash(mobile, 10);
      const id = 'farmer-' + Date.now();
      await pool.query(
        'INSERT INTO users (id, username, password, role, farmer_code, name, mobile, village, milk_type, dairy_name, l_min, l_max, f_min, f_max, target) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
        [id, code, hash, 'farmer', code, name, mobile, village||'', milk_type||'Cow', dairy_name||'SHRI KRISHNA DUDH DAIRY', l_min||37.5, l_max||43.5, f_min||4.1, f_max||4.9, target||103000]
      );
      return res.json({ ok: true, id, code });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
