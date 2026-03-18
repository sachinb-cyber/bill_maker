const { pool } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');
const { calcAmt } = require('../../lib/generate');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: 'Bill ID required' });

  // GET single bill with full records
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'farmer', 'checker']);
    if (!user) return;
    try {
      const result = await pool.query('SELECT * FROM bills WHERE id=$1 OR bill_id=$1 LIMIT 1', [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Bill not found' });
      const bill = result.rows[0];
      if (user.role === 'farmer' && bill.farmer_id !== user.id)
        return res.status(403).json({ error: 'Access denied' });
      return res.json(bill);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT - edit bill records (admin only)
  if (req.method === 'PUT') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const { records } = req.body;
    if (!records) return res.status(400).json({ error: 'Records required' });

    try {
      // Recalculate totals
      const tL = Math.round(records.reduce((s, r) => s + parseFloat(r.litre), 0) * 10) / 10;
      const aF = Math.round(records.reduce((s, r) => s + parseFloat(r.fat), 0) / records.length * 10) / 10;
      const tA = Math.round(records.reduce((s, r) => s + calcAmt(parseFloat(r.litre), parseFloat(r.fat)), 0) * 100) / 100;

      // Recalc amounts
      const updatedRecs = records.map(r => ({
        ...r,
        amount: calcAmt(parseFloat(r.litre), parseFloat(r.fat))
      }));

      await pool.query(
        'UPDATE bills SET records=$1, total_litre=$2, avg_fat=$3, total_amount=$4, updated_at=NOW() WHERE id=$5',
        [JSON.stringify(updatedRecs), tL, aF, tA, id]
      );
      return res.json({ ok: true, total_litre: tL, avg_fat: aF, total_amount: tA });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE
  if (req.method === 'DELETE') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    try {
      await pool.query('DELETE FROM bills WHERE id=$1', [id]);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
