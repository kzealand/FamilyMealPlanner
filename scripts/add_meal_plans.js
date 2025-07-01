const db = require('../config/database');

async function addMealPlans() {
  try {
    console.log('📅 Adding meal plans for existing users...');
    
    // Get all existing users
    const usersResult = await db.query('SELECT id, first_name, last_name FROM users');
    const users = usersResult.rows;
    
    if (users.length === 0) {
      console.log('❌ No users found. Please run the seed script first.');
      return;
    }
    
    console.log(`Found ${users.length} users`);
    
    // Get existing recipes
    const recipesResult = await db.query('SELECT id, name FROM recipes LIMIT 3');
    const recipes = recipesResult.rows;
    
    if (recipes.length === 0) {
      console.log('❌ No recipes found. Please run the seed script first.');
      return;
    }
    
    console.log(`Found ${recipes.length} recipes`);
    
    // Get meal slot IDs
    const mealSlotsResult = await db.query('SELECT id, name FROM meal_slots WHERE name IN ($1, $2, $3)', ['breakfast', 'lunch', 'dinner']);
    const mealSlots = mealSlotsResult.rows;
    
    if (mealSlots.length === 0) {
      console.log('❌ No meal slots found.');
      return;
    }
    
    console.log(`Found ${mealSlots.length} meal slots`);
    
    // Week start date for testing
    const weekStartDate = '2025-06-29';
    
    // Check if meal plans already exist for this week
    const existingMealPlans = await db.query(
      'SELECT COUNT(*) as count FROM meal_plans WHERE week_start_date = $1',
      [weekStartDate]
    );
    
    if (parseInt(existingMealPlans.rows[0].count) > 0) {
      console.log(`⚠️  Meal plans already exist for week of ${weekStartDate}`);
      console.log('Deleting existing meal plans...');
      await db.query('DELETE FROM meal_plan_items WHERE meal_plan_id IN (SELECT id FROM meal_plans WHERE week_start_date = $1)', [weekStartDate]);
      await db.query('DELETE FROM meal_plans WHERE week_start_date = $1', [weekStartDate]);
    }
    
    // Create meal plans for each user
    for (const user of users) {
      const mealPlanResult = await db.query(
        'INSERT INTO meal_plans (user_id, week_start_date) VALUES ($1, $2) RETURNING id',
        [user.id, weekStartDate]
      );
      const mealPlanId = mealPlanResult.rows[0].id;
      
      // Add meals to the meal plan (cycling through available recipes and meal slots)
      const meals = [
        { meal_slot_id: mealSlots.find(slot => slot.name === 'breakfast')?.id, recipe_id: recipes[0]?.id, day_of_week: 0 },
        { meal_slot_id: mealSlots.find(slot => slot.name === 'lunch')?.id, recipe_id: recipes[1]?.id, day_of_week: 1 },
        { meal_slot_id: mealSlots.find(slot => slot.name === 'dinner')?.id, recipe_id: recipes[2]?.id, day_of_week: 2 }
      ].filter(meal => meal.meal_slot_id && meal.recipe_id); // Only include meals with valid slots and recipes
      
      for (const meal of meals) {
        await db.query(
          'INSERT INTO meal_plan_items (meal_plan_id, meal_slot_id, recipe_id, day_of_week) VALUES ($1, $2, $3, $4)',
          [mealPlanId, meal.meal_slot_id, meal.recipe_id, meal.day_of_week]
        );
      }
      
      console.log(`✅ Created meal plan for ${user.first_name} ${user.last_name} with ${meals.length} meals`);
    }
    
    console.log('\n🎉 Meal plans added successfully!');
    console.log(`📅 Week starting: ${weekStartDate}`);
    console.log(`👥 Users with meal plans: ${users.length}`);
    console.log('\n🛒 Test Shopping List:');
    console.log('1. Login as any user');
    console.log('2. Go to Shopping List page');
    console.log(`3. Generate shopping list for week starting ${weekStartDate}`);
    console.log('4. Should include ingredients from all family members\' meal plans');
    
  } catch (error) {
    console.error('💥 Failed to add meal plans:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  addMealPlans();
}

module.exports = { addMealPlans }; 