const { Pool } = require('pg');

// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection to be established
});

// Test database connection
async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Enable pgvector extension if not exists
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Query function for executing SQL queries
async function query(text, params) {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get a client from the pool for transactions
async function getClient() {
  return await pool.connect();
}

module.exports = {
  pool,
  connectDB,
  query,
  getClient
};