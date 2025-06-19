const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 Executing schema...');
    
    await db.query(schema);
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations }; 