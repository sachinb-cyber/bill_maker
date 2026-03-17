const { sql } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'farmer']);
    if (!user) return;
    if (user.role === 'admin') {
      const { farmer_id } = req.query;
      const { rows } = farmer_id
        ? await sql`SELECT * FROM payments WHERE farmer_id=${farmer_id} ORDER BY created_at DESC`
        : await sql`SELECT * FROM payments ORDER BY created_at DESC LIMIT 200`;
      return res.json(rows);
    } else {
      const { rows } = await sql`SELECT * FROM payments WHERE farmer_id=${user.id} ORDER BY created_at DESC`;
      return res.json(rows);
    }
  }

  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const { farmer_id, month_name, year, amount, payment_mode, reference, status } = req.body;
    const { rows: f } = await sql`SELECT * FROM users WHERE id=${farmer_id} LIMIT 1`;
    if (!f.length) return res.status(404).json({ error: 'Farmer not found' });
    const id = 'pay-' + Date.now();
    await sql`
      INSERT INTO payments (id, farmer_id, farmer_code, farmer_name, month_name, year, amount, payment_mode, reference, status)
      VALUES (${id}, ${farmer_id}, ${f[0].farmer_code}, ${f[0].name}, ${month_name}, ${year||''}, ${amount}, ${payment_mode||'Cash'}, ${reference||''}, ${status||'paid'})
    `;
    return res.json({ ok: true, id });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
