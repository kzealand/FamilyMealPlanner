const db = require('../config/database');

async function checkKevinMealPlan() {
  try {
    console.log('🔍 Checking Kevin Zealand\'s meal plan in database...\n');
    
    const userId = '1b197763-ef47-45a8-8710-182c4f8fe5a3'; // Kevin Zealand's user ID
    const weekStartDate = '2025-07-06';
    
    console.log(`User ID: ${userId}`);
    console.log(`Week start date: ${weekStartDate}\n`);
    
    // Step 1: Check the exact value stored in the database
    console.log('1️⃣ Checking exact database value...');
    const mealPlanResult = await db.query(
      'SELECT id, user_id, week_start_date, created_at, updated_at FROM meal_plans WHERE user_id = $1 AND week_start_date = $2',
      [userId, weekStartDate]
    );
    
    if (mealPlanResult.rows.length === 0) {
      console.log('❌ No meal plan found with exact date match');
      
      // Check what meal plans exist for Kevin
      console.log('\n2️⃣ Checking all meal plans for Kevin...');
      const allMealPlansResult = await db.query(
        'SELECT id, week_start_date, created_at FROM meal_plans WHERE user_id = $1 ORDER BY week_start_date',
        [userId]
      );
      
      console.log(`Found ${allMealPlansResult.rows.length} meal plans for Kevin:`);
      allMealPlansResult.rows.forEach((plan, index) => {
        console.log(`  ${index + 1}. week_start_date: ${plan.week_start_date} (ID: ${plan.id})`);
        console.log(`     created_at: ${plan.created_at}`);
        console.log(`     Type of week_start_date: ${typeof plan.week_start_date}`);
        console.log('');
      });
      
      // Check if there's a meal plan with a similar date
      console.log('3️⃣ Checking for meal plans with similar dates...');
      const similarDatesResult = await db.query(
        `SELECT id, week_start_date, created_at 
         FROM meal_plans 
         WHERE user_id = $1 
         AND week_start_date >= $2::date - interval '7 days'
         AND week_start_date <= $2::date + interval '7 days'
         ORDER BY week_start_date`,
        [userId, weekStartDate]
      );
      
      console.log(`Found ${similarDatesResult.rows.length} meal plans within ±7 days:`);
      similarDatesResult.rows.forEach((plan, index) => {
        console.log(`  ${index + 1}. week_start_date: ${plan.week_start_date} (ID: ${plan.id})`);
        console.log(`     created_at: ${plan.created_at}`);
        console.log('');
      });
      
    } else {
      console.log('✅ Found meal plan!');
      const mealPlan = mealPlanResult.rows[0];
      console.log(`  ID: ${mealPlan.id}`);
      console.log(`  week_start_date: ${mealPlan.week_start_date}`);
      console.log(`  Type of week_start_date: ${typeof mealPlan.week_start_date}`);
      console.log(`  created_at: ${mealPlan.created_at}`);
      console.log(`  updated_at: ${mealPlan.updated_at}`);
      
      // Check meal plan items
      console.log('\n4️⃣ Checking meal plan items...');
      const mealPlanItemsResult = await db.query(
        `SELECT mpi.id, mpi.day_of_week, mpi.recipe_id, r.name as recipe_name
         FROM meal_plan_items mpi
         LEFT JOIN recipes r ON mpi.recipe_id = r.id
         WHERE mpi.meal_plan_id = $1
         ORDER BY mpi.day_of_week`,
        [mealPlan.id]
      );
      
      console.log(`Found ${mealPlanItemsResult.rows.length} meal plan items:`);
      mealPlanItemsResult.rows.forEach(item => {
        const recipeName = item.recipe_name || 'Custom meal';
        console.log(`  - Day ${item.day_of_week}: ${recipeName}`);
      });
    }
    
    // Step 5: Test the shopping list generation query
    console.log('\n5️⃣ Testing shopping list generation query...');
    const familyId = '202c763a-ef11-4f1d-a4c2-610ee8da666e'; // Chen Zealand's family
    
    // Get family members
    const familyMembersResult = await db.query(
      'SELECT user_id FROM family_members WHERE family_id = $1',
      [familyId]
    );
    
    const familyMemberIds = familyMembersResult.rows.map(row => row.user_id);
    console.log(`Family member IDs: ${familyMemberIds.join(', ')}`);
    
    // Test the exact query used in shopping list generation
    const shoppingListQueryResult = await db.query(
      'SELECT id FROM meal_plans WHERE user_id = ANY($1) AND week_start_date = $2',
      [familyMemberIds, weekStartDate]
    );
    
    console.log(`Shopping list query found ${shoppingListQueryResult.rows.length} meal plans:`);
    shoppingListQueryResult.rows.forEach((plan, index) => {
      console.log(`  ${index + 1}. Meal plan ID: ${plan.id}`);
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
  checkKevinMealPlan();
}

module.exports = { checkKevinMealPlan }; 