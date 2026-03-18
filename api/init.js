const { initDB } = require('../lib/db');
const { cors } = require('../lib/auth');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    console.log('Init: Starting database initialization...');
    const dbUrl = process.env.POSTGRES_URLPGSQL;
    console.log('Init: POSTGRES_URLPGSQL exists:', !!dbUrl);
    
    if (!dbUrl) {
      console.warn('Init: POSTGRES_URLPGSQL not configured');
      return res.json({ 
        ok: false, 
        warning: 'Database connection string not configured',
        env_vars: Object.keys(process.env).filter(k => k.includes('POSTGR') || k.includes('SUPABASE') || k.includes('DB'))
      });
    }
    
    await initDB();
    res.json({ ok: true, message: 'Database initialized successfully' });
  } catch (err) {
    console.error('Init error:', err.message, err.stack);
    res.status(200).json({ 
      ok: false, 
      error: err.message,
      type: err.constructor.name
    });
  }
};
