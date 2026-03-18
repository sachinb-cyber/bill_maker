const bcrypt = require('bcryptjs');
const { pool } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: 'Farmer ID required' });

  if (req.method === 'PUT') {
    const { name, code, mobile, village, milk_type, dairy_name, l_min, l_max, f_min, f_max, target } = req.body;
    try {
      if (mobile) {
        const hash = await bcrypt.hash(mobile, 10);
        await pool.query(
          'UPDATE users SET name=$1, username=$2, farmer_code=$3, password=$4, mobile=$5, village=$6, milk_type=$7, dairy_name=$8, l_min=$9, l_max=$10, f_min=$11, f_max=$12, target=$13 WHERE id=$14',
          [name, code, code, hash, mobile, village||'', milk_type||'Cow', dairy_name||'SHRI KRISHNA DUDH DAIRY', l_min||37.5, l_max||43.5, f_min||4.1, f_max||4.9, target||103000, id]
        );
      } else {
        await pool.query(
          'UPDATE users SET name=$1, username=$2, farmer_code=$3, village=$4, milk_type=$5, dairy_name=$6, l_min=$7, l_max=$8, f_min=$9, f_max=$10, target=$11 WHERE id=$12',
          [name, code, code, village||'', milk_type||'Cow', dairy_name||'SHRI KRISHNA DUDH DAIRY', l_min||37.5, l_max||43.5, f_min||4.1, f_max||4.9, target||103000, id]
        );
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM users WHERE id=$1 AND role=$2', [id, 'farmer']);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
