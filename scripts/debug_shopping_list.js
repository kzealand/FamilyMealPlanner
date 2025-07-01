const db = require('../config/database');

async function debugShoppingList() {
  try {
    console.log('🔍 Debugging shopping list generation...\n');
    
    const familyId = '202c763a-ef11-4f1d-a4c2-610ee8da666e'; // Chen Zealand's family
    const weekStartDate = '2025-07-06';
    
    console.log(`Family ID: ${familyId}`);
    console.log(`Week start date being searched: ${weekStartDate}\n`);
    
    // Step 1: Get family members
    console.log('1️⃣ Getting family members...');
    const familyMembersResult = await db.query(
      'SELECT user_id FROM family_members WHERE family_id = $1',
      [familyId]
    );
    
    const familyMemberIds = familyMembersResult.rows.map(row => row.user_id);
    console.log(`Family member IDs: ${familyMemberIds.join(', ')}\n`);
    
    // Step 2: Check ALL meal plans for these users (without date filter)
    console.log('2️⃣ Checking ALL meal plans for family members...');
    const allMealPlansResult = await db.query(
      'SELECT id, user_id, week_start_date FROM meal_plans WHERE user_id = ANY($1) ORDER BY week_start_date',
      [familyMemberIds]
    );
    
    console.log(`Found ${allMealPlansResult.rows.length} total meal plans:`);
    for (const mealPlan of allMealPlansResult.rows) {
      // Get user name
      const userResult = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [mealPlan.user_id]);
      const userName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
      console.log(`  - ${userName}: week_start_date = ${mealPlan.week_start_date} (ID: ${mealPlan.id})`);
    }
    
    // Step 3: Check meal plans for the specific week
    console.log(`\n3️⃣ Checking meal plans for week ${weekStartDate}...`);
    const specificWeekMealPlansResult = await db.query(
      'SELECT id, user_id, week_start_date FROM meal_plans WHERE user_id = ANY($1) AND week_start_date = $2',
      [familyMemberIds, weekStartDate]
    );
    
    console.log(`Found ${specificWeekMealPlansResult.rows.length} meal plans for week ${weekStartDate}:`);
    for (const mealPlan of specificWeekMealPlansResult.rows) {
      const userResult = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [mealPlan.user_id]);
      const userName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
      console.log(`  - ${userName}: week_start_date = ${mealPlan.week_start_date} (ID: ${mealPlan.id})`);
    }
    
    // Step 4: Check if there are any meal plans with similar dates
    console.log('\n4️⃣ Checking for meal plans with similar dates...');
    const similarDatesResult = await db.query(
      `SELECT id, user_id, week_start_date 
       FROM meal_plans 
       WHERE user_id = ANY($1) 
       AND week_start_date >= $2::date - interval '7 days'
       AND week_start_date <= $2::date + interval '7 days'
       ORDER BY week_start_date`,
      [familyMemberIds, weekStartDate]
    );
    
    console.log(`Found ${similarDatesResult.rows.length} meal plans within ±7 days of ${weekStartDate}:`);
    for (const mealPlan of similarDatesResult.rows) {
      const userResult = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [mealPlan.user_id]);
      const userName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
      console.log(`  - ${userName}: week_start_date = ${mealPlan.week_start_date} (ID: ${mealPlan.id})`);
    }
    
    // Step 5: Check meal plan items for the specific week
    if (specificWeekMealPlansResult.rows.length > 0) {
      console.log('\n5️⃣ Checking meal plan items for the found meal plans...');
      for (const mealPlan of specificWeekMealPlansResult.rows) {
        const userResult = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [mealPlan.user_id]);
        const userName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
        
        console.log(`\n📅 Meal plan items for ${userName} (week ${mealPlan.week_start_date}):`);
        
                 const mealPlanItemsResult = await db.query(
           `SELECT mpi.id, mpi.day_of_week, mpi.recipe_id, r.name as recipe_name
            FROM meal_plan_items mpi
            LEFT JOIN recipes r ON mpi.recipe_id = r.id
            WHERE mpi.meal_plan_id = $1
            ORDER BY mpi.day_of_week, mpi.display_order`,
           [mealPlan.id]
         );
        
        if (mealPlanItemsResult.rows.length === 0) {
          console.log('  No meal plan items found');
        } else {
                     for (const item of mealPlanItemsResult.rows) {
             const recipeName = item.recipe_name || 'Custom meal';
             console.log(`  - Day ${item.day_of_week}: ${recipeName}`);
           }
        }
      }
    }
    
    console.log('\n✅ Debug completed!');
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  debugShoppingList();
}

module.exports = { debugShoppingList }; 