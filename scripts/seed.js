const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create sample users
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password123', saltRounds);
    
    const users = [
      {
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        birthday: '1985-03-15',
        dietary_restrictions: ['gluten-free'],
        nutrition_targets: { calories: 2000, protein: 150 },
        favorite_foods: ['chicken', 'salmon', 'quinoa']
      },
      {
        email: 'jane.doe@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        birthday: '1988-07-22',
        dietary_restrictions: ['dairy-free'],
        nutrition_targets: { calories: 1800, protein: 120 },
        favorite_foods: ['avocado', 'sweet potato', 'almonds']
      },
      {
        email: 'kid.doe@example.com',
        first_name: 'Alex',
        last_name: 'Doe',
        birthday: '2015-11-08',
        dietary_restrictions: ['nuts'],
        nutrition_targets: { calories: 1500, protein: 80 },
        favorite_foods: ['pizza', 'pasta', 'apples']
      }
    ];
    
    console.log('👥 Creating sample users...');
    const createdUsers = [];
    for (const user of users) {
      const result = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, birthday, dietary_restrictions, nutrition_targets, favorite_foods)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, first_name, last_name`,
        [user.email, passwordHash, user.first_name, user.last_name, user.birthday, user.dietary_restrictions, user.nutrition_targets, user.favorite_foods]
      );
      createdUsers.push(result.rows[0]);
      console.log(`✅ Created user: ${user.first_name} ${user.last_name}`);
    }
    
    // Create sample family
    console.log('🏠 Creating sample family...');
    const familyResult = await db.query(
      'INSERT INTO families (name, description, created_by) VALUES ($1, $2, $3) RETURNING id, name',
      ['The Doe Family', 'A happy family of three', createdUsers[0].id]
    );
    const family = familyResult.rows[0];
    console.log(`✅ Created family: ${family.name}`);
    
    // Create a second sample family
    console.log('🏠 Creating a second sample family...');
    const family2Result = await db.query(
      'INSERT INTO families (name, description, created_by) VALUES ($1, $2, $3) RETURNING id, name',
      ['The Smiths', 'A friendly neighbor family', createdUsers[1].id]
    );
    const family2 = family2Result.rows[0];
    console.log(`✅ Created family: ${family2.name}`);
    
    // Add users to family
    console.log('👨‍👩‍👧‍👦 Adding users to families...');
    // Add users to the first family
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [family.id, createdUsers[0].id, 'admin']
    );
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [family.id, createdUsers[1].id, 'admin']
    );
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [family.id, createdUsers[2].id, 'member']
    );
    // Add one user to the second family
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [family2.id, createdUsers[1].id, 'admin']
    );
    // Add John Doe to the second family as well, for testing purposes
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [family2.id, createdUsers[0].id, 'admin']
    );
    console.log('✅ Added all users to their respective families');
    
    // Create sample ingredients
    console.log('🥕 Creating sample ingredients...');
    const ingredients = [
      { name: 'Chicken Breast', unit: 'lbs' },
      { name: 'Brown Rice', unit: 'cups' },
      { name: 'Broccoli', unit: 'cups' },
      { name: 'Olive Oil', unit: 'tbsp' },
      { name: 'Garlic', unit: 'cloves' },
      { name: 'Onion', unit: 'medium' },
      { name: 'Tomatoes', unit: 'medium' },
      { name: 'Ground Beef', unit: 'lbs' },
      { name: 'Pasta', unit: 'cups' },
      { name: 'Cheese', unit: 'cups' },
      { name: 'Milk', unit: 'cups' },
      { name: 'Eggs', unit: 'large' },
      { name: 'Flour', unit: 'cups' },
      { name: 'Sugar', unit: 'cups' },
      { name: 'Butter', unit: 'tbsp' }
    ];
    
    const createdIngredients = [];
    for (const ingredient of ingredients) {
      const result = await db.query(
        'INSERT INTO ingredients (name, unit) VALUES ($1, $2) RETURNING id, name',
        [ingredient.name, ingredient.unit]
      );
      createdIngredients.push(result.rows[0]);
    }
    console.log(`✅ Created ${ingredients.length} ingredients`);
    
    // Create sample recipes
    console.log('🍳 Creating sample recipes...');
    const recipes = [
      {
        name: 'Grilled Chicken with Rice',
        description: 'A healthy and delicious grilled chicken served with brown rice and steamed broccoli.',
        prep_time_minutes: 15,
        cook_time_minutes: 25,
        servings: 4,
        cooking_instructions: '1. Season chicken with salt and pepper\n2. Grill chicken for 6-8 minutes per side\n3. Cook rice according to package instructions\n4. Steam broccoli for 5 minutes\n5. Serve together with olive oil drizzle',
        star_rating: 4.5,
        dietary_tags: ['high-protein', 'gluten-free'],
        ingredients: [
          { name: 'Chicken Breast', quantity: 2, unit: 'lbs' },
          { name: 'Brown Rice', quantity: 2, unit: 'cups' },
          { name: 'Broccoli', quantity: 4, unit: 'cups' },
          { name: 'Olive Oil', quantity: 2, unit: 'tbsp' }
        ]
      },
      {
        name: 'Spaghetti Bolognese',
        description: 'Classic Italian pasta dish with rich meat sauce.',
        prep_time_minutes: 20,
        cook_time_minutes: 45,
        servings: 6,
        cooking_instructions: '1. Brown ground beef in a large pan\n2. Add chopped onions and garlic, cook until soft\n3. Add tomatoes and simmer for 30 minutes\n4. Cook pasta according to package instructions\n5. Serve sauce over pasta with cheese',
        star_rating: 4.8,
        dietary_tags: ['family-favorite'],
        ingredients: [
          { name: 'Ground Beef', quantity: 1.5, unit: 'lbs' },
          { name: 'Pasta', quantity: 3, unit: 'cups' },
          { name: 'Tomatoes', quantity: 6, unit: 'medium' },
          { name: 'Onion', quantity: 1, unit: 'medium' },
          { name: 'Garlic', quantity: 4, unit: 'cloves' },
          { name: 'Cheese', quantity: 1, unit: 'cups' }
        ]
      },
      {
        name: 'Scrambled Eggs with Toast',
        description: 'Simple and nutritious breakfast option.',
        prep_time_minutes: 5,
        cook_time_minutes: 10,
        servings: 2,
        cooking_instructions: '1. Crack eggs into a bowl and whisk\n2. Heat butter in a pan over medium heat\n3. Pour in eggs and stir gently\n4. Toast bread and serve together',
        star_rating: 4.2,
        dietary_tags: ['breakfast', 'quick'],
        ingredients: [
          { name: 'Eggs', quantity: 4, unit: 'large' },
          { name: 'Butter', quantity: 2, unit: 'tbsp' },
          { name: 'Flour', quantity: 2, unit: 'cups' }
        ]
      }
    ];
    
    const createdRecipes = [];
    for (const recipe of recipes) {
      const { ingredients, ...recipeData } = recipe;
      
      const recipeResult = await db.query(
        `INSERT INTO recipes (family_id, name, description, prep_time_minutes, cook_time_minutes, 
          servings, cooking_instructions, star_rating, dietary_tags, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, name`,
        [family.id, recipeData.name, recipeData.description, recipeData.prep_time_minutes, 
         recipeData.cook_time_minutes, recipeData.servings, recipeData.cooking_instructions, 
         recipeData.star_rating, recipeData.dietary_tags, createdUsers[0].id]
      );
      
      const createdRecipe = recipeResult.rows[0];
      createdRecipes.push(createdRecipe);
      
      // Add ingredients to recipe
      for (const ingredient of ingredients) {
        const ingredientRecord = createdIngredients.find(i => i.name === ingredient.name);
        if (ingredientRecord) {
          await db.query(
            'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)',
            [createdRecipe.id, ingredientRecord.id, ingredient.quantity, ingredient.unit]
          );
        }
      }
      
      console.log(`✅ Created recipe: ${recipeData.name}`);
    }
    
    // Add some favorite recipes
    console.log('⭐ Adding favorite recipes...');
    await db.query(
      'INSERT INTO user_favorite_recipes (user_id, recipe_id) VALUES ($1, $2)',
      [createdUsers[0].id, createdRecipes[0].id]
    );
    await db.query(
      'INSERT INTO user_favorite_recipes (user_id, recipe_id) VALUES ($1, $2)',
      [createdUsers[1].id, createdRecipes[1].id]
    );
    console.log('✅ Added favorite recipes');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Data Summary:');
    console.log(`- Users: ${createdUsers.length}`);
    console.log(`- Families: 2`);
    console.log(`- Ingredients: ${createdIngredients.length}`);
    console.log(`- Recipes: ${createdRecipes.length}`);
    console.log('\n🔑 Sample Login Credentials:');
    console.log('Email: john.doe@example.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 