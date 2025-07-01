const db = require('../config/database');

async function testShoppingListGeneration() {
  try {
    console.log('🧪 Testing shopping list generation process...\n');
    
    const familyId = '202c763a-ef11-4f1d-a4c2-610ee8da666e'; // Chen Zealand's family
    const weekStartDate = '2025-06-29';
    
    console.log(`Testing for family: ${familyId}`);
    console.log(`Week start date: ${weekStartDate}\n`);
    
    // Step 1: Check if shopping list already exists
    console.log('1️⃣ Checking for existing shopping list...');
    const existingList = await db.query(
      'SELECT id FROM shopping_lists WHERE family_id = $1 AND week_start_date = $2',
      [familyId, weekStartDate]
    );
    
    if (existingList.rows.length > 0) {
      console.log(`Found existing shopping list ID: ${existingList.rows[0].id}`);
      console.log('Deleting existing shopping list...');
      await db.query('DELETE FROM shopping_list_items WHERE shopping_list_id = $1', [existingList.rows[0].id]);
      await db.query('DELETE FROM shopping_lists WHERE id = $1', [existingList.rows[0].id]);
      console.log('✅ Deleted existing shopping list');
    } else {
      console.log('No existing shopping list found');
    }
    
    // Step 2: Get family members
    console.log('\n2️⃣ Getting family members...');
    const familyMembersResult = await db.query(
      'SELECT user_id FROM family_members WHERE family_id = $1',
      [familyId]
    );
    
    const familyMemberIds = familyMembersResult.rows.map(row => row.user_id);
    console.log(`Family member IDs: ${familyMemberIds.join(', ')}`);
    
    // Step 3: Get meal plans for family members
    console.log('\n3️⃣ Getting meal plans for family members...');
    const mealPlansResult = await db.query(
      'SELECT id, user_id FROM meal_plans WHERE user_id = ANY($1) AND week_start_date = $2',
      [familyMemberIds, weekStartDate]
    );
    
    console.log(`Found ${mealPlansResult.rows.length} meal plans:`);
    
    // Step 4: Simulate the shopping list generation process
    console.log('\n4️⃣ Simulating shopping list generation...');
    
    // Create shopping list
    const shoppingListResult = await db.query(
      'INSERT INTO shopping_lists (family_id, week_start_date) VALUES ($1, $2) RETURNING id',
      [familyId, weekStartDate]
    );
    
    const shoppingListId = shoppingListResult.rows[0].id;
    console.log(`Created shopping list ID: ${shoppingListId}`);
    
    // Aggregate ingredients from all meal plans
    const ingredientsMap = new Map();
    
    for (const mealPlan of mealPlansResult.rows) {
      const mealPlanId = mealPlan.id;
      
      // Get user info
      const userResult = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [mealPlan.user_id]);
      const userName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
      console.log(`\n📅 Processing meal plan for ${userName} (ID: ${mealPlanId})`);
      
      // Get all meals with recipes for this meal plan
      const mealsResult = await db.query(
        `SELECT mpi.recipe_id, r.name as recipe_name, ri.ingredient_id, ri.quantity, ri.unit, ri.notes
         FROM meal_plan_items mpi
         JOIN recipe_ingredients ri ON mpi.recipe_id = ri.recipe_id
         JOIN recipes r ON mpi.recipe_id = r.id
         WHERE mpi.meal_plan_id = $1 AND mpi.recipe_id IS NOT NULL`,
        [mealPlanId]
      );
      
      console.log(`Found ${mealsResult.rows.length} recipe ingredients for ${userName}:`);
      
      // Aggregate ingredients
      for (const meal of mealsResult.rows) {
        const key = meal.ingredient_id; // Use just ingredient_id as key, not unit
        console.log(`  - ${meal.recipe_name}: ${meal.quantity} ${meal.unit}`);
        
        if (ingredientsMap.has(key)) {
          const existing = ingredientsMap.get(key);
          existing.quantity += parseFloat(meal.quantity);
          if (!existing.recipes.includes(meal.recipe_name)) {
            existing.recipes.push(meal.recipe_name);
          }
          if (!existing.users.includes(userName)) {
            existing.users.push(userName);
          }
        } else {
          ingredientsMap.set(key, {
            ingredient_id: meal.ingredient_id,
            quantity: parseFloat(meal.quantity),
            unit: meal.unit,
            notes: meal.notes,
            recipes: [meal.recipe_name],
            users: [userName]
          });
        }
      }
    }
    
    // Step 5: Show what ingredients will be added to shopping list
    console.log('\n5️⃣ Ingredients to be added to shopping list:');
    console.log(`Total unique ingredients: ${ingredientsMap.size}\n`);
    
    for (const [key, ingredient] of ingredientsMap) {
      // Get ingredient name
      const ingredientResult = await db.query('SELECT name FROM ingredients WHERE id = $1', [ingredient.ingredient_id]);
      const ingredientName = ingredientResult.rows[0]?.name || 'Unknown';
      
      console.log(`🥕 ${ingredientName}: ${ingredient.quantity} ${ingredient.unit}`);
      console.log(`   From recipes: ${ingredient.recipes.join(', ')}`);
      console.log(`   From users: ${ingredient.users.join(', ')}`);
      console.log('');
      
      // Insert into shopping list
      let notes = ingredient.notes || '';
      const recipeInfo = `From recipes: ${ingredient.recipes.join(', ')}`;
      const finalNotes = notes ? `${notes} | ${recipeInfo}` : recipeInfo;
      
      await db.query(
        'INSERT INTO shopping_list_items (shopping_list_id, ingredient_id, total_quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
        [shoppingListId, ingredient.ingredient_id, ingredient.quantity, ingredient.unit, finalNotes]
      );
    }
    
    // Step 6: Verify the shopping list was created correctly
    console.log('\n6️⃣ Verifying shopping list creation...');
    const shoppingListItems = await db.query(
      `SELECT 
        sli.id,
        sli.total_quantity,
        sli.unit,
        sli.notes,
        i.name as ingredient_name
       FROM shopping_list_items sli
       JOIN ingredients i ON sli.ingredient_id = i.id
       WHERE sli.shopping_list_id = $1
       ORDER BY i.name`,
      [shoppingListId]
    );
    
    console.log(`Shopping list contains ${shoppingListItems.rows.length} items:`);
    shoppingListItems.rows.forEach(item => {
      console.log(`   ${item.ingredient_name}: ${item.total_quantity} ${item.unit}`);
      console.log(`   Notes: ${item.notes}`);
      console.log('');
    });
    
    console.log('✅ Shopping list generation test completed!');
    
  } catch (error) {
    console.error('💥 Failed to test shopping list generation:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testShoppingListGeneration();
}

module.exports = { testShoppingListGeneration }; 