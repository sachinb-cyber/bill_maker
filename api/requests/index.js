const { sql } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'farmer']);
    if (!user) return;
    if (user.role === 'admin') {
      const { rows } = await sql`SELECT * FROM bill_requests ORDER BY created_at DESC LIMIT 200`;
      return res.json(rows);
    } else {
      const { rows } = await sql`SELECT * FROM bill_requests WHERE farmer_id=${user.id} ORDER BY created_at DESC`;
      return res.json(rows);
    }
  }

  // POST - farmer submits request
  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['farmer']);
    if (!user) return;
    const { month_name, month_index, year, amount_paid, payment_mode, reference, note } = req.body;
    if (!month_name || !year || !amount_paid) return res.status(400).json({ error: 'Month, year and amount required' });

    const { rows: farmers } = await sql`SELECT * FROM users WHERE id=${user.id} LIMIT 1`;
    const farmer = farmers[0];
    const id = 'req-' + Date.now();

    await sql`
      INSERT INTO bill_requests (id, farmer_id, farmer_code, farmer_name, month_name, month_index, year, amount_paid, payment_mode, reference, note)
      VALUES (${id}, ${user.id}, ${farmer.farmer_code}, ${farmer.name}, ${month_name}, ${month_index}, ${year}, ${amount_paid}, ${payment_mode||'Cash'}, ${reference||''}, ${note||''})
    `;
    return res.json({ ok: true, id });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
