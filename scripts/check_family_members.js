const db = require('../config/database');

async function checkFamilyMembers() {
  try {
    console.log('🔍 Checking family members in database...\n');
    
    const familyId = '202c763a-ef11-4f1d-a4c2-610ee8da666e'; // Chen Zealand's family
    
    console.log(`Family ID: ${familyId}\n`);
    
    // Step 1: Check if the family exists
    console.log('1️⃣ Checking if family exists...');
    const familyResult = await db.query(
      'SELECT id, name, description, created_at FROM families WHERE id = $1',
      [familyId]
    );
    
    if (familyResult.rows.length === 0) {
      console.log('❌ Family not found!');
      return;
    }
    
    const family = familyResult.rows[0];
    console.log('✅ Family found:');
    console.log(`  Name: ${family.name}`);
    console.log(`  Description: ${family.description}`);
    console.log(`  Created at: ${family.created_at}`);
    
    // Step 2: Check family members
    console.log('\n2️⃣ Checking family members...');
    const membersResult = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.profile_image_url, fm.role, fm.joined_at
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = $1
       ORDER BY fm.joined_at ASC`,
      [familyId]
    );
    
    console.log(`Found ${membersResult.rows.length} family members:`);
    membersResult.rows.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email})`);
      console.log(`     Role: ${member.role}`);
      console.log(`     Joined: ${member.joined_at}`);
      console.log(`     User ID: ${member.id}`);
      console.log('');
    });
    
    // Step 3: Check all users to see if they exist
    console.log('3️⃣ Checking all users...');
    const allUsersResult = await db.query(
      'SELECT id, first_name, last_name, email, created_at FROM users ORDER BY created_at',
      []
    );
    
    console.log(`Total users in database: ${allUsersResult.rows.length}`);
    allUsersResult.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Created: ${user.created_at}`);
      console.log('');
    });
    
    // Step 4: Check if John Doe and Kevin Zealand are in any families
    console.log('4️⃣ Checking if John Doe and Kevin Zealand are in any families...');
    const johnDoeId = '165bf0a4-b6b1-4adc-9b90-12464ef18384';
    const kevinZealandId = '1b197763-ef47-45a8-8710-182c4f8fe5a3';
    
    const johnDoeFamilies = await db.query(
      `SELECT f.id, f.name, fm.role
       FROM family_members fm
       JOIN families f ON fm.family_id = f.id
       WHERE fm.user_id = $1`,
      [johnDoeId]
    );
    
    const kevinZealandFamilies = await db.query(
      `SELECT f.id, f.name, fm.role
       FROM family_members fm
       JOIN families f ON fm.family_id = f.id
       WHERE fm.user_id = $1`,
      [kevinZealandId]
    );
    
    console.log('John Doe families:');
    if (johnDoeFamilies.rows.length === 0) {
      console.log('  ❌ Not in any families');
    } else {
      johnDoeFamilies.rows.forEach(family => {
        console.log(`  ✅ ${family.name} (${family.role})`);
      });
    }
    
    console.log('\nKevin Zealand families:');
    if (kevinZealandFamilies.rows.length === 0) {
      console.log('  ❌ Not in any families');
    } else {
      kevinZealandFamilies.rows.forEach(family => {
        console.log(`  ✅ ${family.name} (${family.role})`);
      });
    }
    
    // Step 5: Test the exact query used by the API
    console.log('\n5️⃣ Testing the exact API query...');
    const apiQueryResult = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.profile_image_url, fm.role, fm.joined_at
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = $1
       ORDER BY fm.joined_at ASC`,
      [familyId]
    );
    
    console.log(`API query returned ${apiQueryResult.rows.length} members:`);
    apiQueryResult.rows.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email})`);
    });
    
    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('💥 Check failed:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkFamilyMembers();
}

module.exports = { checkFamilyMembers }; 