const { sql } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');
const { calcAmt } = require('../../lib/generate');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Requires checker or admin login
  const user = requireAuth(req, res, ['admin', 'checker']);
  if (!user) return;

  const { farmer_code, month_index, year } = req.body;
  if (!farmer_code || month_index === undefined || !year)
    return res.status(400).json({ error: 'farmer_code, month_index, year required' });

  const { rows } = await sql`
    SELECT b.*, u.name as farmer_name_db FROM bills b
    JOIN users u ON b.farmer_id = u.id
    WHERE b.farmer_code=${farmer_code} AND b.month_index=${month_index} AND b.year=${year}
    LIMIT 1
  `;

  if (!rows.length) return res.json({ status: 'NOT_FOUND', genuine: false });

  const bill = rows[0];
  const records = typeof bill.records === 'string' ? JSON.parse(bill.records) : bill.records;

  // Tamper check
  const recalcTotal = Math.round(records.reduce((s, r) => s + calcAmt(parseFloat(r.litre), parseFloat(r.fat)), 0) * 100) / 100;
  const intact = Math.abs(recalcTotal - parseFloat(bill.total_amount)) < 0.05;

  if (!intact) return res.json({ status: 'TAMPERED', genuine: false, bill_id: bill.bill_id });

  return res.json({
    status: 'GENUINE',
    genuine: true,
    bill_id: bill.bill_id,
    farmer_name: bill.farmer_name,
    farmer_code: bill.farmer_code,
    dairy_name: bill.dairy_name,
    month_name: bill.month_name,
    year: bill.year,
    total_entries: bill.total_entries,
    total_litre: bill.total_litre,
    avg_fat: bill.avg_fat,
    total_amount: bill.total_amount,
    generated_at: bill.created_at
  });
};
