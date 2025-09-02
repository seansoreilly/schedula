const { Pool } = require('pg');

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runDatabaseRead() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    const tableCount = await pool.query(
      "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    console.log('Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].db_version);
    console.log('Number of tables:', tableCount.rows[0].table_count);
    
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDatabaseRead();