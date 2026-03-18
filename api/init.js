const { initDB } = require('../lib/db');
const { cors } = require('../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    console.log('Init: Starting database initialization...');
    console.log('Init: POSTGRES_URLPGSQL env var exists:', !!process.env.POSTGRES_URLPGSQL);
    await initDB();
    res.json({ ok: true, message: 'Database initialized' });
  } catch (err) {
    console.error('Init error:', err);
    res.status(500).json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
