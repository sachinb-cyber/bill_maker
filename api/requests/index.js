const { pool } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'farmer']);
    if (!user) return;
    try {
      if (user.role === 'admin') {
        const result = await pool.query('SELECT * FROM bill_requests ORDER BY created_at DESC LIMIT 200');
        return res.json(result.rows);
      } else {
        const result = await pool.query('SELECT * FROM bill_requests WHERE farmer_id=$1 ORDER BY created_at DESC', [user.id]);
        return res.json(result.rows);
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - farmer submits request
  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['farmer']);
    if (!user) return;
    const { month_name, month_index, year, amount_paid, payment_mode, reference, note } = req.body;
    if (!month_name || !year || !amount_paid) return res.status(400).json({ error: 'Month, year and amount required' });

    try {
      const farmerResult = await pool.query('SELECT * FROM users WHERE id=$1 LIMIT 1', [user.id]);
      if (!farmerResult.rows.length) return res.status(404).json({ error: 'Farmer not found' });
      const farmer = farmerResult.rows[0];
      const id = 'req-' + Date.now();

      await pool.query(
        'INSERT INTO bill_requests (id, farmer_id, farmer_code, farmer_name, month_name, month_index, year, amount_paid, payment_mode, reference, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [id, user.id, farmer.farmer_code, farmer.name, month_name, month_index, year, amount_paid, payment_mode||'Cash', reference||'', note||'']
      );
      return res.json({ ok: true, id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
