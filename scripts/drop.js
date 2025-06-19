const db = require('../config/database');

async function dropAllTables() {
  const client = await db.pool.connect();
  try {
    console.log('Dropping all tables...');
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('All tables dropped successfully.');
  } catch (error) {
    console.error('Error dropping tables:', error);
  } finally {
    client.release();
    await db.pool.end();
  }
}

if (require.main === module) {
  dropAllTables();
} 