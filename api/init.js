const { initDB } = require('../lib/db');
const { cors } = require('../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initDB();
    res.json({ ok: true, message: 'Database initialized' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
