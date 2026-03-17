const { sql } = require('../lib/db');
const { requireAuth, cors } = require('../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;

  const [farmers, bills, requests, payments] = await Promise.all([
    sql`SELECT COUNT(*) as cnt FROM users WHERE role='farmer'`,
    sql`SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as total FROM bills`,
    sql`SELECT COUNT(*) as cnt FROM bill_requests WHERE status='pending'`,
    sql`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='paid'`
  ]);

  const { rows: recentReqs } = await sql`SELECT * FROM bill_requests ORDER BY created_at DESC LIMIT 5`;
  const { rows: recentPays } = await sql`SELECT * FROM payments ORDER BY created_at DESC LIMIT 5`;

  res.json({
    farmers: parseInt(farmers.rows[0].cnt),
    bills: parseInt(bills.rows[0].cnt),
    bills_total: parseFloat(bills.rows[0].total),
    pending_requests: parseInt(requests.rows[0].cnt),
    payments_total: parseFloat(payments.rows[0].total),
    recent_requests: recentReqs,
    recent_payments: recentPays
  });
};
