const db = require('../config/database');

async function checkFamilies() {
  try {
    console.log('🏠 Checking families and members...\n');
    
    // Get all families with their members
    const familiesResult = await db.query(`
      SELECT 
        f.id,
        f.name,
        f.description,
        COUNT(fm.user_id) as member_count,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'id', u.id,
            'name', CONCAT(u.first_name, ' ', u.last_name),
            'email', u.email,
            'role', fm.role
          )
        ) as members
      FROM families f
      LEFT JOIN family_members fm ON f.id = fm.family_id
      LEFT JOIN users u ON fm.user_id = u.id
      GROUP BY f.id, f.name, f.description
      ORDER BY f.name
    `);
    
    if (familiesResult.rows.length === 0) {
      console.log('❌ No families found in the database.');
      return;
    }
    
    console.log(`Found ${familiesResult.rows.length} families:\n`);
    
    familiesResult.rows.forEach((family, index) => {
      console.log(`${index + 1}. ${family.name}`);
      console.log(`   Description: ${family.description || 'No description'}`);
      console.log(`   Members: ${family.member_count}`);
      
      if (family.members && family.members.length > 0) {
        family.members.forEach(member => {
          if (member.id) { // Filter out null members
            console.log(`   - ${member.name} (${member.email}) - ${member.role}`);
          }
        });
      } else {
        console.log('   - No members');
      }
      console.log('');
    });
    
    // Check meal plans for the week
    console.log('📅 Checking meal plans for week of 2025-06-29...\n');
    
    const mealPlansResult = await db.query(`
      SELECT 
        u.first_name,
        u.last_name,
        u.email,
        COUNT(mpi.id) as meal_count,
        ARRAY_AGG(DISTINCT ms.name) as meal_types
      FROM meal_plans mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN meal_plan_items mpi ON mp.id = mpi.meal_plan_id
      LEFT JOIN meal_slots ms ON mpi.meal_slot_id = ms.id
      WHERE mp.week_start_date = '2025-06-29'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY u.first_name, u.last_name
    `);
    
    if (mealPlansResult.rows.length === 0) {
      console.log('❌ No meal plans found for the week of 2025-06-29.');
      return;
    }
    
    console.log(`Found ${mealPlansResult.rows.length} users with meal plans:\n`);
    
    mealPlansResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`   Meals: ${user.meal_count} (${user.meal_types.join(', ')})`);
      console.log('');
    });
    
    console.log('✅ Family and meal plan check completed!');
    
  } catch (error) {
    console.error('💥 Failed to check families:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkFamilies();
}

module.exports = { checkFamilies }; 