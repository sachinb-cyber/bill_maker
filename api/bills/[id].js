const { sql } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');
const { calcAmt } = require('../../lib/generate');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  // GET single bill with full records
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'farmer', 'checker']);
    if (!user) return;
    const { rows } = await sql`SELECT * FROM bills WHERE id=${id} OR bill_id=${id} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'Bill not found' });
    const bill = rows[0];
    if (user.role === 'farmer' && bill.farmer_id !== user.id)
      return res.status(403).json({ error: 'Access denied' });
    return res.json(bill);
  }

  // PUT - edit bill records (admin only)
  if (req.method === 'PUT') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const { records } = req.body;
    if (!records) return res.status(400).json({ error: 'Records required' });

    // Recalculate totals
    const tL = Math.round(records.reduce((s, r) => s + parseFloat(r.litre), 0) * 10) / 10;
    const aF = Math.round(records.reduce((s, r) => s + parseFloat(r.fat), 0) / records.length * 10) / 10;
    const tA = Math.round(records.reduce((s, r) => s + calcAmt(parseFloat(r.litre), parseFloat(r.fat)), 0) * 100) / 100;

    // Recalc amounts
    const updatedRecs = records.map(r => ({
      ...r,
      amount: calcAmt(parseFloat(r.litre), parseFloat(r.fat))
    }));

    await sql`
      UPDATE bills SET records=${JSON.stringify(updatedRecs)}, total_litre=${tL}, avg_fat=${aF}, total_amount=${tA}, updated_at=NOW()
      WHERE id=${id}
    `;
    return res.json({ ok: true, total_litre: tL, avg_fat: aF, total_amount: tA });
  }

  // DELETE
  if (req.method === 'DELETE') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    await sql`DELETE FROM bills WHERE id=${id}`;
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
