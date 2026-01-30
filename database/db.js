const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Helper functions
const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

// Health check
const healthCheck = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: res.rows[0].now };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

module.exports = {
  query,
  getClient,
  healthCheck,
  pool,
};
