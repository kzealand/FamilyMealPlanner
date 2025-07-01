const db = require('../config/database');

async function checkRecipes() {
  try {
    console.log('🍳 Checking all recipes in the database...\n');
    
    // Get all recipes with family info
    const recipesResult = await db.query(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.family_id,
        f.name as family_name,
        u.first_name,
        u.last_name,
        COUNT(ri.id) as ingredient_count
      FROM recipes r
      LEFT JOIN families f ON r.family_id = f.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      GROUP BY r.id, r.name, r.description, r.family_id, f.name, u.first_name, u.last_name
      ORDER BY f.name, r.name
    `);
    
    console.log(`Found ${recipesResult.rows.length} recipes:\n`);
    
    // Group by family
    const recipesByFamily = {};
    recipesResult.rows.forEach(recipe => {
      const familyName = recipe.family_name || 'No Family';
      if (!recipesByFamily[familyName]) {
        recipesByFamily[familyName] = [];
      }
      recipesByFamily[familyName].push(recipe);
    });
    
    Object.entries(recipesByFamily).forEach(([familyName, recipes]) => {
      console.log(`🏠 ${familyName} (${recipes.length} recipes):`);
      recipes.forEach(recipe => {
        console.log(`   - ${recipe.name} (${recipe.ingredient_count} ingredients)`);
        console.log(`     Created by: ${recipe.first_name} ${recipe.last_name}`);
        console.log(`     Description: ${recipe.description || 'No description'}`);
        console.log('');
      });
    });
    
    // Check for recipes that might be causing the shopping list issue
    console.log('🔍 Checking for specific recipes mentioned in the shopping list...\n');
    
    const problematicRecipes = ['Fresh Fruit Box', 'Mixed Nuts', 'Orzo Pasta Salad'];
    
    for (const recipeName of problematicRecipes) {
      const recipeResult = await db.query(
        'SELECT id, name, family_id, created_by FROM recipes WHERE name = $1',
        [recipeName]
      );
      
      if (recipeResult.rows.length > 0) {
        const recipe = recipeResult.rows[0];
        console.log(`Found recipe: ${recipe.name}`);
        console.log(`  ID: ${recipe.id}`);
        console.log(`  Family ID: ${recipe.family_id}`);
        console.log(`  Created by: ${recipe.created_by}`);
        
        // Get family info
        if (recipe.family_id) {
          const familyResult = await db.query('SELECT name FROM families WHERE id = $1', [recipe.family_id]);
          if (familyResult.rows.length > 0) {
            console.log(`  Family: ${familyResult.rows[0].name}`);
          }
        }
        
        // Get ingredients
        const ingredientsResult = await db.query(
          `SELECT ri.quantity, ri.unit, i.name
           FROM recipe_ingredients ri
           JOIN ingredients i ON ri.ingredient_id = i.id
           WHERE ri.recipe_id = $1`,
          [recipe.id]
        );
        
        console.log(`  Ingredients (${ingredientsResult.rows.length}):`);
        ingredientsResult.rows.forEach(ingredient => {
          console.log(`    - ${ingredient.name}: ${ingredient.quantity} ${ingredient.unit}`);
        });
        console.log('');
      } else {
        console.log(`Recipe not found: ${recipeName}\n`);
      }
    }
    
    console.log('✅ Recipe check completed!');
    
  } catch (error) {
    console.error('💥 Failed to check recipes:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkRecipes();
}

module.exports = { checkRecipes }; 