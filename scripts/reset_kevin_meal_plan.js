const db = require('../config/database');

async function resetKevinMealPlan() {
  try {
    console.log('🔄 Resetting Kevin Zealand\'s meal plan...\n');
    
    const weekStartDate = '2025-06-29';
    
    // Get Kevin Zealand's user ID
    const kevinResult = await db.query(
      'SELECT id, first_name, last_name FROM users WHERE email = $1',
      ['kzealand@me.com']
    );
    
    if (kevinResult.rows.length === 0) {
      console.log('❌ Kevin Zealand not found');
      return;
    }
    
    const kevin = kevinResult.rows[0];
    console.log(`Found user: ${kevin.first_name} ${kevin.last_name} (ID: ${kevin.id})`);
    
    // Get Kevin's meal plan
    const mealPlanResult = await db.query(
      'SELECT id FROM meal_plans WHERE user_id = $1 AND week_start_date = $2',
      [kevin.id, weekStartDate]
    );
    
    if (mealPlanResult.rows.length === 0) {
      console.log('❌ No meal plan found for Kevin for this week');
      return;
    }
    
    const mealPlanId = mealPlanResult.rows[0].id;
    console.log(`Found meal plan ID: ${mealPlanId}`);
    
    // Delete existing meal plan items
    console.log('🗑️  Deleting existing meal plan items...');
    await db.query('DELETE FROM meal_plan_items WHERE meal_plan_id = $1', [mealPlanId]);
    console.log('✅ Deleted existing meal plan items');
    
    // Get the seeded recipes (from The Doe Family)
    const seededRecipesResult = await db.query(
      `SELECT r.id, r.name 
       FROM recipes r
       JOIN families f ON r.family_id = f.id
       WHERE f.name = 'The Doe Family'
       ORDER BY r.name`,
      []
    );
    
    console.log(`Found ${seededRecipesResult.rows.length} seeded recipes:`);
    seededRecipesResult.rows.forEach(recipe => {
      console.log(`  - ${recipe.name}`);
    });
    
    // Get meal slot IDs
    const mealSlotsResult = await db.query(
      'SELECT id, name FROM meal_slots WHERE name IN ($1, $2, $3) ORDER BY display_order',
      ['breakfast', 'lunch', 'dinner']
    );
    
    console.log(`Found ${mealSlotsResult.rows.length} meal slots`);
    
    // Create new meal plan items with seeded recipes
    const newMeals = [
      { meal_slot_id: mealSlotsResult.rows.find(slot => slot.name === 'breakfast')?.id, recipe_id: seededRecipesResult.rows[2]?.id, day_of_week: 0 }, // Scrambled Eggs
      { meal_slot_id: mealSlotsResult.rows.find(slot => slot.name === 'lunch')?.id, recipe_id: seededRecipesResult.rows[0]?.id, day_of_week: 1 },     // Grilled Chicken
      { meal_slot_id: mealSlotsResult.rows.find(slot => slot.name === 'dinner')?.id, recipe_id: seededRecipesResult.rows[1]?.id, day_of_week: 2 }     // Spaghetti Bolognese
    ].filter(meal => meal.meal_slot_id && meal.recipe_id);
    
    console.log('\n📝 Creating new meal plan items:');
    
    for (const meal of newMeals) {
      const recipeName = seededRecipesResult.rows.find(r => r.id === meal.recipe_id)?.name;
      const mealSlotName = mealSlotsResult.rows.find(s => s.id === meal.meal_slot_id)?.name;
      
      console.log(`  Day ${meal.day_of_week} - ${mealSlotName}: ${recipeName}`);
      
      await db.query(
        'INSERT INTO meal_plan_items (meal_plan_id, meal_slot_id, recipe_id, day_of_week) VALUES ($1, $2, $3, $4)',
        [mealPlanId, meal.meal_slot_id, meal.recipe_id, meal.day_of_week]
      );
    }
    
    console.log('\n✅ Kevin\'s meal plan has been reset to use seeded recipes!');
    console.log('\n🛒 Now when you generate a shopping list, it should include:');
    console.log('  - Ingredients from Scrambled Eggs with Toast (breakfast)');
    console.log('  - Ingredients from Grilled Chicken with Rice (lunch)');
    console.log('  - Ingredients from Spaghetti Bolognese (dinner)');
    console.log('\n📋 This will match John Doe\'s meal plan ingredients for proper testing.');
    
  } catch (error) {
    console.error('💥 Failed to reset Kevin\'s meal plan:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  resetKevinMealPlan();
}

module.exports = { resetKevinMealPlan }; 