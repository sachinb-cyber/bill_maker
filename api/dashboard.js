const { pool } = require('../lib/db');
const { requireAuth, cors } = require('../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;

  try {
    const [farmerResult, billsResult, requestsResult, paymentsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as cnt FROM users WHERE role=$1', ['farmer']),
      pool.query('SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as total FROM bills'),
      pool.query('SELECT COUNT(*) as cnt FROM bill_requests WHERE status=$1', ['pending']),
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status=$1', ['paid'])
    ]);

    const recentReqs = await pool.query('SELECT * FROM bill_requests ORDER BY created_at DESC LIMIT 5');
    const recentPays = await pool.query('SELECT * FROM payments ORDER BY created_at DESC LIMIT 5');

    res.json({
      farmers: parseInt(farmerResult.rows[0].cnt),
      bills: parseInt(billsResult.rows[0].cnt),
      bills_total: parseFloat(billsResult.rows[0].total),
      pending_requests: parseInt(requestsResult.rows[0].cnt),
      payments_total: parseFloat(paymentsResult.rows[0].total),
      recent_requests: recentReqs.rows,
      recent_payments: recentPays.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
};
