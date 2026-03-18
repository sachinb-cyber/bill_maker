const { pool } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');
const { generateMonth, mkBillId, MN } = require('../../lib/generate');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: 'Request ID required' });

  // PUT - admin approves/rejects
  if (req.method === 'PUT') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const { status, admin_note } = req.body;

    try {
      if (status === 'approved') {
        // Get request
        const reqResult = await pool.query('SELECT * FROM bill_requests WHERE id=$1 LIMIT 1', [id]);
        if (!reqResult.rows.length) return res.status(404).json({ error: 'Request not found' });
        const req2 = reqResult.rows[0];

        // Get farmer
        const farmerResult = await pool.query('SELECT * FROM users WHERE id=$1 LIMIT 1', [req2.farmer_id]);
        if (!farmerResult.rows.length) return res.status(404).json({ error: 'Farmer not found' });
        const farmer = farmerResult.rows[0];

        // Generate bill
        const mi = parseInt(req2.month_index);
        const yr = req2.year;
        const data = generateMonth(mi, yr, {
          lMin: parseFloat(farmer.l_min), lMax: parseFloat(farmer.l_max),
          fMin: parseFloat(farmer.f_min), fMax: parseFloat(farmer.f_max),
          target: parseFloat(farmer.target)
        });
        const billId = mkBillId(farmer.farmer_code, mi, yr);
        const billDbId = 'bill-' + Date.now();

        await pool.query(
          'INSERT INTO bills (id, farmer_id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, records, bill_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (bill_id) DO UPDATE SET updated_at=NOW()',
          [billDbId, farmer.id, farmer.farmer_code, farmer.name, farmer.dairy_name||'SHRI KRISHNA DUDH DAIRY', farmer.milk_type||'Cow', mi, MN[mi], yr, data.days, data.totalEntries, data.totalLitre, data.avgFat, data.totalAmount, JSON.stringify(data.records), billId]
        );

        // Record payment
        const payId = 'pay-' + Date.now();
        await pool.query(
          'INSERT INTO payments (id, farmer_id, farmer_code, farmer_name, month_name, year, amount, payment_mode, reference, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [payId, farmer.id, farmer.farmer_code, farmer.name, req2.month_name, yr, req2.amount_paid, req2.payment_mode, req2.reference||'', 'paid']
        );

        await pool.query(
          'UPDATE bill_requests SET status=$1, admin_note=$2, bill_id=$3, resolved_at=NOW() WHERE id=$4',
          ['approved', admin_note||'Bill generated.', billId, id]
        );
        return res.json({ ok: true, bill_id: billId });
      }

      // Reject
      await pool.query('UPDATE bill_requests SET status=$1, admin_note=$2, resolved_at=NOW() WHERE id=$3', ['rejected', admin_note||'', id]);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
