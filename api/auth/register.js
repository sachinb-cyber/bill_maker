const bcrypt = require('bcryptjs');
const { sql, initDB } = require('../../lib/db');
const { signToken, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDB();
    const { name, mobile, village, milk_type, dairy_name } = req.body;
    if (!name || !mobile) return res.status(400).json({ error: 'Name and mobile required' });

    // Auto-generate code
    const { rows: existing } = await sql`SELECT COUNT(*) as cnt FROM users WHERE role='farmer'`;
    const code = String(parseInt(existing[0].cnt) + 1).padStart(4, '0');

    const hash = await bcrypt.hash(mobile, 10);
    const id = 'farmer-' + Date.now();

    await sql`
      INSERT INTO users (id, username, password, role, farmer_code, name, mobile, village, milk_type, dairy_name)
      VALUES (${id}, ${code}, ${hash}, 'farmer', ${code}, ${name}, ${mobile}, ${village||''}, ${milk_type||'Cow'}, ${dairy_name||'SHRI KRISHNA DUDH DAIRY'})
    `;

    const token = signToken({ id, username: code, role: 'farmer', name, farmer_code: code });
    res.json({ token, user: { id, username: code, role: 'farmer', name, farmer_code: code, dairy_name: dairy_name||'SHRI KRISHNA DUDH DAIRY', milk_type: milk_type||'Cow' }, message: `Your code: ${code}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
