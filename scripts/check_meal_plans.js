const db = require('../config/database');

async function checkMealPlans() {
  try {
    console.log('📅 Checking meal plans and items...\n');
    
    // Check meal plans for the week
    const weekStartDate = '2025-06-29';
    
    const mealPlansResult = await db.query(`
      SELECT 
        mp.id,
        mp.user_id,
        mp.week_start_date,
        u.first_name,
        u.last_name,
        u.email
      FROM meal_plans mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.week_start_date = $1
      ORDER BY u.first_name, u.last_name
    `, [weekStartDate]);
    
    console.log(`Found ${mealPlansResult.rows.length} meal plans for week ${weekStartDate}:\n`);
    
    for (const mealPlan of mealPlansResult.rows) {
      console.log(`Meal Plan ID: ${mealPlan.id}`);
      console.log(`User: ${mealPlan.first_name} ${mealPlan.last_name} (${mealPlan.email})`);
      console.log(`Week Start: ${mealPlan.week_start_date}`);
      
      // Check meal plan items
      const itemsResult = await db.query(`
        SELECT 
          mpi.id,
          mpi.day_of_week,
          mpi.recipe_id,
          mpi.custom_meal_name,
          mpi.notes,
          ms.name as meal_slot_name,
          r.name as recipe_name
        FROM meal_plan_items mpi
        JOIN meal_slots ms ON mpi.meal_slot_id = ms.id
        LEFT JOIN recipes r ON mpi.recipe_id = r.id
        WHERE mpi.meal_plan_id = $1
        ORDER BY mpi.day_of_week, ms.display_order
      `, [mealPlan.id]);
      
      console.log(`  Items: ${itemsResult.rows.length}`);
      
      itemsResult.rows.forEach(item => {
        console.log(`    Day ${item.day_of_week} - ${item.meal_slot_name}: ${item.recipe_name || item.custom_meal_name || 'No recipe'}`);
      });
      
      console.log('');
    }
    
    // Check for any potential issues
    console.log('🔍 Checking for potential issues...\n');
    
    // Check if all meal plan items have valid meal_slot_id
    const invalidSlotsResult = await db.query(`
      SELECT COUNT(*) as count
      FROM meal_plan_items mpi
      LEFT JOIN meal_slots ms ON mpi.meal_slot_id = ms.id
      WHERE ms.id IS NULL
    `);
    
    if (parseInt(invalidSlotsResult.rows[0].count) > 0) {
      console.log(`❌ Found ${invalidSlotsResult.rows[0].count} meal plan items with invalid meal_slot_id`);
    } else {
      console.log('✅ All meal plan items have valid meal_slot_id');
    }
    
    // Check if all meal plan items have valid recipe_id (if not null)
    const invalidRecipesResult = await db.query(`
      SELECT COUNT(*) as count
      FROM meal_plan_items mpi
      LEFT JOIN recipes r ON mpi.recipe_id = r.id
      WHERE mpi.recipe_id IS NOT NULL AND r.id IS NULL
    `);
    
    if (parseInt(invalidRecipesResult.rows[0].count) > 0) {
      console.log(`❌ Found ${invalidRecipesResult.rows[0].count} meal plan items with invalid recipe_id`);
    } else {
      console.log('✅ All meal plan items have valid recipe_id');
    }
    
    // Test the getMealPlanWithDetails function logic
    console.log('\n🧪 Testing getMealPlanWithDetails logic...\n');
    
    if (mealPlansResult.rows.length > 0) {
      const testMealPlanId = mealPlansResult.rows[0].id;
      console.log(`Testing with meal plan ID: ${testMealPlanId}`);
      
      try {
        // Simulate the getMealPlanWithDetails function
        const planResult = await db.query(
          `SELECT mp.id, mp.user_id, mp.week_start_date, mp.created_at, mp.updated_at,
                  u.first_name, u.last_name
           FROM meal_plans mp
           JOIN users u ON mp.user_id = u.id
           WHERE mp.id = $1`,
          [testMealPlanId]
        );
        
        if (planResult.rows.length === 0) {
          console.log('❌ Meal plan not found');
          return;
        }
        
        const mealPlan = planResult.rows[0];
        console.log('✅ Meal plan found:', mealPlan.first_name, mealPlan.last_name);
        
        // Get meal items
        const mealsResult = await db.query(
          `SELECT mpi.id, mpi.day_of_week, mpi.custom_meal_name, mpi.notes,
                  ms.name as meal_slot_name, ms.display_order,
                  r.id as recipe_id, r.name as recipe_name, r.image_url as recipe_image
           FROM meal_plan_items mpi
           JOIN meal_slots ms ON mpi.meal_slot_id = ms.id
           LEFT JOIN recipes r ON mpi.recipe_id = r.id
           WHERE mpi.meal_plan_id = $1
           ORDER BY mpi.day_of_week, ms.display_order`,
          [testMealPlanId]
        );
        
        console.log(`✅ Found ${mealsResult.rows.length} meal items`);
        
        // Test the organization logic
        const mealsByDay = {};
        for (let i = 0; i < 7; i++) {
          mealsByDay[i] = {};
        }
        
        mealsResult.rows.forEach(meal => {
          if (!mealsByDay[meal.day_of_week][meal.meal_slot_name]) {
            mealsByDay[meal.day_of_week][meal.meal_slot_name] = {
              id: meal.id,
              meal_slot_name: meal.meal_slot_name,
              recipe_id: meal.recipe_id,
              recipe_name: meal.recipe_name,
              recipe_image: meal.recipe_image,
              custom_meal_name: meal.custom_meal_name,
              notes: meal.notes
            };
          }
        });
        
        console.log('✅ Successfully organized meals by day');
        console.log('Sample day 0 meals:', Object.keys(mealsByDay[0]));
        
      } catch (error) {
        console.error('❌ Error testing getMealPlanWithDetails:', error);
      }
    }
    
    console.log('\n✅ Meal plan check completed!');
    
  } catch (error) {
    console.error('💥 Failed to check meal plans:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkMealPlans();
}

module.exports = { checkMealPlans }; 