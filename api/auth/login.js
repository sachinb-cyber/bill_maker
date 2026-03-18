const bcrypt = require('bcryptjs');
const { pool, initDB } = require('../../lib/db');
const { signToken, cors } = require('../../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDB();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    console.log('Login attempt:', username);
    
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username]
    );
    
    console.log('Query result:', { username, found: result.rows.length, rowCount: result.rowCount });
    
    if (!result.rows.length) {
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({
      id: user.id, username: user.username, role: user.role,
      name: user.name, farmer_code: user.farmer_code
    });

    res.json({
      token,
      user: {
        id: user.id, username: user.username, role: user.role,
        name: user.name, farmer_code: user.farmer_code,
        dairy_name: user.dairy_name, milk_type: user.milk_type,
        mobile: user.mobile, village: user.village,
        l_min: user.l_min, l_max: user.l_max,
        f_min: user.f_min, f_max: user.f_max, target: user.target
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
