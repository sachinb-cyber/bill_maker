const bcrypt = require('bcryptjs');
const { sql } = require('../../lib/db');
const { requireAuth, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, code, mobile, village, milk_type, dairy_name, l_min, l_max, f_min, f_max, target } = req.body;
    if (mobile) {
      const hash = await bcrypt.hash(mobile, 10);
      await sql`UPDATE users SET name=${name}, username=${code}, farmer_code=${code}, password=${hash}, mobile=${mobile}, village=${village||''}, milk_type=${milk_type||'Cow'}, dairy_name=${dairy_name||'SHRI KRISHNA DUDH DAIRY'}, l_min=${l_min||37.5}, l_max=${l_max||43.5}, f_min=${f_min||4.1}, f_max=${f_max||4.9}, target=${target||103000} WHERE id=${id}`;
    } else {
      await sql`UPDATE users SET name=${name}, username=${code}, farmer_code=${code}, village=${village||''}, milk_type=${milk_type||'Cow'}, dairy_name=${dairy_name||'SHRI KRISHNA DUDH DAIRY'}, l_min=${l_min||37.5}, l_max=${l_max||43.5}, f_min=${f_min||4.1}, f_max=${f_max||4.9}, target=${target||103000} WHERE id=${id}`;
    }
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM users WHERE id=${id} AND role='farmer'`;
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
