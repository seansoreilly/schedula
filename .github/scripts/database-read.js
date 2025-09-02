const { Pool } = require('pg');

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
    
    process.exit(0);
  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDatabaseRead();