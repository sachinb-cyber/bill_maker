const { pool } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');
const { generateMonth, mkBillId, MN, MD } = require('../../lib/generate');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - list bills
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'farmer', 'checker']);
    if (!user) return;
    const farmer_id = req.query?.farmer_id;
    const year = req.query?.year;

    try {
      let rows;
      if (user.role === 'farmer') {
        // Farmer sees only their own bills
        const q = year
          ? await pool.query('SELECT id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, bill_id, created_at, updated_at FROM bills WHERE farmer_id=$1 AND year=$2 ORDER BY month_index', [user.id, year])
          : await pool.query('SELECT id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, bill_id, created_at, updated_at FROM bills WHERE farmer_id=$1 ORDER BY year, month_index', [user.id]);
        rows = q.rows;
      } else {
        // Admin/checker sees all or filtered
        let q;
        if (farmer_id && year) {
          q = await pool.query('SELECT id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, bill_id, created_at, updated_at FROM bills WHERE farmer_id=$1 AND year=$2 ORDER BY month_index', [farmer_id, year]);
        } else if (farmer_id) {
          q = await pool.query('SELECT id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, bill_id, created_at, updated_at FROM bills WHERE farmer_id=$1 ORDER BY year, month_index', [farmer_id]);
        } else {
          q = await pool.query('SELECT id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, bill_id, created_at, updated_at FROM bills ORDER BY created_at DESC LIMIT 200');
        }
        rows = q.rows;
      }
    return res.json(rows);
  }

  // POST - generate bills (admin only)
  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;

    const { farmer_id, year, months } = req.body;
    // months = array of { month_index, l_min, l_max, f_min, f_max, target }

    const { rows: farmers } = await sql`SELECT * FROM users WHERE id=${farmer_id} AND role='farmer' LIMIT 1`;
    if (!farmers.length) return res.status(404).json({ error: 'Farmer not found' });
    const farmer = farmers[0];

    const results = [];
    for (const cfg of months) {
      const mi = cfg.month_index;
      const data = generateMonth(mi, year, {
        lMin: parseFloat(cfg.l_min || farmer.l_min),
        lMax: parseFloat(cfg.l_max || farmer.l_max),
        fMin: parseFloat(cfg.f_min || farmer.f_min),
        fMax: parseFloat(cfg.f_max || farmer.f_max),
        target: parseFloat(cfg.target || farmer.target)
      });
      const billId = mkBillId(farmer.farmer_code, mi, year);
      const id = 'bill-' + Date.now() + '-' + mi;

      // Upsert
      await sql`
        INSERT INTO bills (id, farmer_id, farmer_code, farmer_name, dairy_name, milk_type, month_index, month_name, year, days, total_entries, total_litre, avg_fat, total_amount, records, cfg, bill_id)
        VALUES (${id}, ${farmer_id}, ${farmer.farmer_code}, ${farmer.name}, ${farmer.dairy_name}, ${farmer.milk_type}, ${mi}, ${MN[mi]}, ${year}, ${data.days}, ${data.totalEntries}, ${data.totalLitre}, ${data.avgFat}, ${data.totalAmount}, ${JSON.stringify(data.records)}, ${JSON.stringify(cfg)}, ${billId})
        ON CONFLICT (bill_id) DO UPDATE SET
          total_entries=EXCLUDED.total_entries, total_litre=EXCLUDED.total_litre,
          avg_fat=EXCLUDED.avg_fat, total_amount=EXCLUDED.total_amount,
          records=EXCLUDED.records, updated_at=NOW()
      `;
      results.push({ month_index: mi, month_name: MN[mi], bill_id: billId, total_amount: data.totalAmount });
    }
    return res.json({ ok: true, generated: results.length, results });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
