import pg from 'pg';
const { Pool } = pg;

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
  connectionTimeoutMillis: 10000, // 10 second connection timeout
  query_timeout: 5000, // 5 second query timeout
});

async function runDatabaseRead() {
  let exitCode = 0;
  
  try {
    // Test basic connectivity
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database connection successful!');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('📊 Database version:', result.rows[0].db_version);
    
    // Check table count
    const tableCount = await pool.query(
      "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('📋 Number of tables:', tableCount.rows[0].table_count);
    
    // Additional health checks - check if important tables exist
    const importantTables = ['organizations', 'services', 'schedules'];
    for (const tableName of importantTables) {
      const tableExists = await pool.query(
        'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)',
        ['public', tableName]
      );
      if (tableExists.rows[0].exists) {
        console.log(`✅ Table '${tableName}' exists`);
      } else {
        console.log(`⚠️  Table '${tableName}' is missing`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      severity: error.severity,
      detail: error.detail,
    });
    exitCode = 1;
  } finally {
    try {
      await pool.end();
      console.log('🔌 Database connection closed');
    } catch (endError) {
      console.error('Error closing connection:', endError.message);
    }
    process.exit(exitCode);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

runDatabaseRead();