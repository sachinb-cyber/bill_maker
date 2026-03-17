const { sql } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');
const { generateMonth, mkBillId, MN } = require('../../lib/generate');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  // PUT - admin approves/rejects
  if (req.method === 'PUT') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const { status, admin_note } = req.body;

    if (status === 'approved') {
      // Get request
      const { rows: reqs } = await sql`SELECT * FROM bill_requests WHERE id=${id} LIMIT 1`;
      if (!reqs.length) return res.status(404).json({ error: 'Request not found' });
      const req2 = reqs[0];

      // Get farmer
      const { rows: farmers } = await sql`SELECT * FROM users WHERE id=${req2.farmer_id} LIMIT 1`;
      if (!farmers.length) return res.status(404).json({ error: 'Farmer not found' });
      const farmer = farmers[0];

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

      await sql`
        INSERT INTO bills (id, farmer_id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, records, bill_id)
        VALUES (${billDbId}, ${farmer.id}, ${farmer.farmer_code}, ${farmer.name}, ${farmer.dairy_name||'SHRI KRISHNA DUDH DAIRY'}, ${farmer.milk_type||'Cow'}, ${mi}, ${MN[mi]}, ${yr}, ${data.days}, ${data.totalEntries}, ${data.totalLitre}, ${data.avgFat}, ${data.totalAmount}, ${JSON.stringify(data.records)}, ${billId})
        ON CONFLICT (bill_id) DO UPDATE SET updated_at=NOW()
      `;

      // Record payment
      const payId = 'pay-' + Date.now();
      await sql`
        INSERT INTO payments (id, farmer_id, farmer_code, farmer_name, month_name, year, amount, payment_mode, reference, status)
        VALUES (${payId}, ${farmer.id}, ${farmer.farmer_code}, ${farmer.name}, ${req2.month_name}, ${yr}, ${req2.amount_paid}, ${req2.payment_mode}, ${req2.reference||''}, 'paid')
      `;

      await sql`
        UPDATE bill_requests SET status='approved', admin_note=${admin_note||'Bill generated.'}, bill_id=${billId}, resolved_at=NOW()
        WHERE id=${id}
      `;
      return res.json({ ok: true, bill_id: billId });
    }

    // Reject
    await sql`UPDATE bill_requests SET status='rejected', admin_note=${admin_note||''}, resolved_at=NOW() WHERE id=${id}`;
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
