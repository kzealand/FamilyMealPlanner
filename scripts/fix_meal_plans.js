const db = require('../config/database');

async function fixMealPlans() {
  try {
    console.log('🔧 Fixing meal plan items with null day_of_week...\n');
    
    // Get all meal plan items with null day_of_week
    const nullDayItems = await db.query(`
      SELECT 
        mpi.id,
        mpi.meal_plan_id,
        mpi.meal_slot_id,
        mpi.recipe_id,
        ms.name as meal_slot_name,
        mp.week_start_date
      FROM meal_plan_items mpi
      JOIN meal_slots ms ON mpi.meal_slot_id = ms.id
      JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
      WHERE mpi.day_of_week IS NULL
      ORDER BY mpi.meal_plan_id, ms.display_order
    `);
    
    console.log(`Found ${nullDayItems.rows.length} meal plan items with null day_of_week`);
    
    if (nullDayItems.rows.length === 0) {
      console.log('✅ No meal plan items need fixing');
      return;
    }
    
    // Group items by meal plan
    const itemsByMealPlan = {};
    nullDayItems.rows.forEach(item => {
      if (!itemsByMealPlan[item.meal_plan_id]) {
        itemsByMealPlan[item.meal_plan_id] = [];
      }
      itemsByMealPlan[item.meal_plan_id].push(item);
    });
    
    console.log(`Found ${Object.keys(itemsByMealPlan).length} meal plans to fix\n`);
    
    // Fix each meal plan
    for (const [mealPlanId, items] of Object.entries(itemsByMealPlan)) {
      console.log(`Fixing meal plan ${mealPlanId} with ${items.length} items`);
      
      // Assign each meal to a different day of the week
      const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
      
      items.forEach((item, index) => {
        const dayOfWeek = daysOfWeek[index % daysOfWeek.length];
        
        console.log(`  Setting day ${dayOfWeek} for ${item.meal_slot_name}`);
        
        // Update the meal plan item
        db.query(
          'UPDATE meal_plan_items SET day_of_week = $1 WHERE id = $2',
          [dayOfWeek, item.id]
        ).then(() => {
          console.log(`    ✅ Updated item ${item.id}`);
        }).catch(error => {
          console.error(`    ❌ Error updating item ${item.id}:`, error);
        });
      });
      
      console.log('');
    }
    
    // Wait a moment for updates to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the fix
    console.log('🔍 Verifying the fix...\n');
    
    const remainingNullItems = await db.query(`
      SELECT COUNT(*) as count
      FROM meal_plan_items
      WHERE day_of_week IS NULL
    `);
    
    if (parseInt(remainingNullItems.rows[0].count) === 0) {
      console.log('✅ All meal plan items now have day_of_week values');
    } else {
      console.log(`❌ Still have ${remainingNullItems.rows[0].count} items with null day_of_week`);
    }
    
    // Show updated meal plans
    const updatedMealPlans = await db.query(`
      SELECT 
        mp.id,
        u.first_name,
        u.last_name,
        COUNT(mpi.id) as item_count
      FROM meal_plans mp
      JOIN users u ON mp.user_id = u.id
      JOIN meal_plan_items mpi ON mp.id = mpi.meal_plan_id
      WHERE mp.week_start_date = '2025-06-29'
      GROUP BY mp.id, u.first_name, u.last_name
      ORDER BY u.first_name, u.last_name
    `);
    
    console.log('\n📅 Updated meal plans:');
    updatedMealPlans.rows.forEach(plan => {
      console.log(`  ${plan.first_name} ${plan.last_name}: ${plan.item_count} items`);
    });
    
    console.log('\n🎉 Meal plan fix completed!');
    
  } catch (error) {
    console.error('💥 Failed to fix meal plans:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  fixMealPlans();
}

module.exports = { fixMealPlans }; 