#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function setup() {
  console.log('🍽️  Family Meal Planner Setup');
  console.log('=============================\n');

  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from template...');
    
    const envExample = fs.readFileSync(path.join(__dirname, 'env.example'), 'utf8');
    fs.writeFileSync(envPath, envExample);
    
    console.log('✅ Created .env file');
    console.log('⚠️  Please edit .env file with your database credentials before continuing\n');
  } else {
    console.log('✅ .env file already exists\n');
  }

  // Check if PostgreSQL is running
  console.log('🔍 Checking PostgreSQL connection...');
  try {
    // Try to connect to PostgreSQL
    const { Pool } = require('pg');
    require('dotenv').config();
    
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'meal_planner',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });
    
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connection successful');
    await pool.end();
  } catch (error) {
    console.log('❌ PostgreSQL connection failed');
    console.log('Please ensure PostgreSQL is running and your .env file is configured correctly');
    console.log('Error:', error.message);
    process.exit(1);
  }

  // Run database migration
  console.log('\n🔄 Running database migrations...');
  try {
    execSync('npm run db:migrate', { stdio: 'inherit' });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.log('❌ Database migration failed');
    process.exit(1);
  }

  // Ask if user wants to seed the database
  console.log('\n🌱 Would you like to seed the database with sample data? (y/n)');
  
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      
      if (answer === 'y' || answer === 'yes') {
        console.log('🌱 Seeding database with sample data...');
        try {
          execSync('npm run db:seed', { stdio: 'inherit' });
          console.log('✅ Database seeding completed');
        } catch (error) {
          console.log('❌ Database seeding failed');
          process.exit(1);
        }
      } else {
        console.log('⏭️  Skipping database seeding');
      }
      
      console.log('\n🎉 Setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Start the server: npm run dev');
      console.log('2. The API will be available at http://localhost:3001');
      console.log('3. Health check: http://localhost:3001/health');
      
      if (answer === 'y' || answer === 'yes') {
        console.log('\n🔑 Sample login credentials:');
        console.log('Email: john.doe@example.com');
        console.log('Password: password123');
      }
      
      console.log('\n📚 See README.md for full documentation');
      resolve();
    });
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Setup cancelled');
  process.exit(0);
});

// Run setup
setup().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
}); 