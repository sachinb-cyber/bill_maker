const { Pool } = require('pg');

// Create a connection pool using the environment variable
const pool = new Pool({
  connectionString: process.env.POSTGRES_URLPGSQL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Helper function to run SQL queries
const sql = async (query, values = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result;
  } finally {
    client.release();
  }
};

// Initialize all tables
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','farmer','checker')),
      farmer_code TEXT,
      name TEXT,
      dairy_name TEXT DEFAULT 'SHRI KRISHNA DUDH DAIRY',
      mobile TEXT,
      village TEXT,
      milk_type TEXT DEFAULT 'Cow',
      l_min NUMERIC DEFAULT 37.5,
      l_max NUMERIC DEFAULT 43.5,
      f_min NUMERIC DEFAULT 4.1,
      f_max NUMERIC DEFAULT 4.9,
      target NUMERIC DEFAULT 103000,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL REFERENCES users(id),
      farmer_code TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      dairy_name TEXT NOT NULL,
      milk_type TEXT NOT NULL,
      month_index INTEGER NOT NULL,
      month_name TEXT NOT NULL,
      year TEXT NOT NULL,
      days INTEGER NOT NULL,
      total_entries INTEGER NOT NULL,
      total_litre NUMERIC NOT NULL,
      avg_fat NUMERIC NOT NULL,
      total_amount NUMERIC NOT NULL,
      records JSONB NOT NULL,
      cfg JSONB,
      bill_id TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bill_requests (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL REFERENCES users(id),
      farmer_code TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      month_name TEXT NOT NULL,
      month_index INTEGER NOT NULL,
      year TEXT NOT NULL,
      amount_paid NUMERIC NOT NULL,
      payment_mode TEXT NOT NULL,
      reference TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      admin_note TEXT,
      bill_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL REFERENCES users(id),
      farmer_code TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      month_name TEXT NOT NULL,
      year TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      payment_mode TEXT NOT NULL,
      reference TEXT,
      status TEXT DEFAULT 'paid' CHECK (status IN ('paid','partial','pending')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed admin and checker users if not exist
  const bcrypt = require('bcryptjs');
  const { rows } = await pool.query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
  if (rows.length === 0) {
    const adminHash = await bcrypt.hash('Sachin@12389qweasd#4', 10);
    const checkerHash = await bcrypt.hash('Sachin@123098@#1asdd', 10);
    await pool.query(
      `INSERT INTO users (id, username, password, role, name)
       VALUES ('admin-001', 'admin', $1, 'admin', 'Admin')
       ON CONFLICT DO NOTHING`,
      [adminHash]
    );
    await pool.query(
      `INSERT INTO users (id, username, password, role, name)
       VALUES ('checker-001', 'Bill checker', $1, 'checker', 'Bill Checker')
       ON CONFLICT DO NOTHING`,
      [checkerHash]
    );
    // Seed demo farmer
    const farmerHash = await bcrypt.hash('9876543210', 10);
    await pool.query(
      `INSERT INTO users (id, username, password, role, farmer_code, name, mobile, village)
       VALUES ('farmer-001', '0032', $1, 'farmer', '0032', 'Shiv Bharwad', '9876543210', 'Bharwad Vas')
       ON CONFLICT DO NOTHING`,
      [farmerHash]
    );
  }
}

module.exports = { pool, sql, initDB };
