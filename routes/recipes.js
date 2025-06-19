const express = require('express');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireFamilyAccess } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createRecipeSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional(),
  image_url: Joi.string().uri().optional(),
  prep_time_minutes: Joi.number().integer().min(0).optional(),
  cook_time_minutes: Joi.number().integer().min(0).optional(),
  servings: Joi.number().integer().min(1).optional(),
  cooking_instructions: Joi.string().optional(),
  star_rating: Joi.number().min(1).max(5).optional(),
  dietary_tags: Joi.array().items(Joi.string()).optional(),
  ingredients: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().optional(),
    notes: Joi.string().allow('').optional()
  })).optional()
});

const updateRecipeSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional(),
  image_url: Joi.string().uri().optional(),
  prep_time_minutes: Joi.number().integer().min(0).optional(),
  cook_time_minutes: Joi.number().integer().min(0).optional(),
  servings: Joi.number().integer().min(1).optional(),
  cooking_instructions: Joi.string().optional(),
  star_rating: Joi.number().min(1).max(5).optional(),
  dietary_tags: Joi.array().items(Joi.string()).optional(),
  ingredients: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().optional(),
    notes: Joi.string().allow('').optional()
  })).optional()
});

// Create a new recipe
router.post('/:familyId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { error, value } = createRecipeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { familyId } = req.params;
    const userId = req.user.id;
    const { ingredients, ...recipeData } = value;

    // Create recipe
    const recipeResult = await db.query(
      `INSERT INTO recipes (family_id, name, description, image_url, prep_time_minutes, cook_time_minutes, 
        servings, cooking_instructions, star_rating, dietary_tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [familyId, recipeData.name, recipeData.description, recipeData.image_url, 
       recipeData.prep_time_minutes, recipeData.cook_time_minutes, recipeData.servings,
       recipeData.cooking_instructions, recipeData.star_rating, recipeData.dietary_tags, userId]
    );

    const recipe = recipeResult.rows[0];

    // Add ingredients if provided
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        // Find or create ingredient
        let ingredientResult = await db.query(
          'SELECT id FROM ingredients WHERE LOWER(name) = LOWER($1)',
          [ingredient.name]
        );

        let ingredientId;
        if (ingredientResult.rows.length === 0) {
          const newIngredientResult = await db.query(
            'INSERT INTO ingredients (name, unit) VALUES ($1, $2) RETURNING id',
            [ingredient.name, ingredient.unit]
          );
          ingredientId = newIngredientResult.rows[0].id;
        } else {
          ingredientId = ingredientResult.rows[0].id;
        }

        // Add recipe ingredient
        await db.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
          [recipe.id, ingredientId, ingredient.quantity, ingredient.unit, ingredient.notes]
        );
      }
    }

    // Get recipe with ingredients
    const fullRecipe = await getRecipeWithIngredients(recipe.id);

    res.status(201).json({
      message: 'Recipe created successfully',
      recipe: fullRecipe
    });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all recipes for a family
router.get('/:familyId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { search, dietary_tags, favorite_only } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT DISTINCT r.id, r.name, r.description, r.image_url, r.prep_time_minutes, 
             r.cook_time_minutes, r.servings, r.cooking_instructions, r.star_rating, 
             r.dietary_tags, r.created_at, r.updated_at,
             u.first_name as created_by_first_name, u.last_name as created_by_last_name,
             CASE WHEN ufr.recipe_id IS NOT NULL THEN true ELSE false END as is_favorite
      FROM recipes r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN user_favorite_recipes ufr ON r.id = ufr.recipe_id AND ufr.user_id = $1
      WHERE r.family_id = $2
    `;

    const queryParams = [userId, familyId];
    let paramCount = 3;

    // Add search filter
    if (search) {
      query += ` AND (LOWER(r.name) LIKE LOWER($${paramCount}) OR LOWER(r.description) LIKE LOWER($${paramCount}))`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Add dietary tags filter
    if (dietary_tags) {
      const tags = dietary_tags.split(',');
      query += ` AND (r.dietary_tags && $${paramCount})`;
      queryParams.push(tags);
      paramCount++;
    }

    // Add favorite filter
    if (favorite_only === 'true') {
      query += ` AND ufr.recipe_id IS NOT NULL`;
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await db.query(query, queryParams);
    const recipes = result.rows;

    // Fetch ingredients for each recipe
    const enrichedRecipes = await Promise.all(
      recipes.map(async (r) => {
        const fullRecipe = await getRecipeWithIngredients(r.id, familyId, userId);
        // Preserve is_favorite from the original query (getRecipeWithIngredients may not include it)
        if (typeof r.is_favorite !== 'undefined') {
          fullRecipe.is_favorite = r.is_favorite;
        }
        return fullRecipe;
      })
    );

    res.json({ recipes: enrichedRecipes });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific recipe
router.get('/:familyId/:recipeId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId, recipeId } = req.params;
    const userId = req.user.id;

    const recipe = await getRecipeWithIngredients(recipeId, familyId, userId);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ recipe });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a recipe
router.put('/:familyId/:recipeId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { error, value } = updateRecipeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { familyId, recipeId } = req.params;
    const userId = req.user.id;

    // Check if recipe exists and belongs to family
    const existingRecipe = await db.query(
      'SELECT id FROM recipes WHERE id = $1 AND family_id = $2',
      [recipeId, familyId]
    );

    if (existingRecipe.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Remove ingredients from value for update query
    const { ingredients, ...recipeFields } = value;

    Object.keys(recipeFields).forEach(key => {
      if (recipeFields[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(recipeFields[key]);
        paramCount++;
      }
    });

    if (updateFields.length > 0) {
      updateValues.push(recipeId, familyId);
      const query = `
        UPDATE recipes 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount} AND family_id = $${paramCount + 1}
        RETURNING *
      `;
      const result = await db.query(query, updateValues);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
    }

    // Handle ingredients update
    if (ingredients) {
      // Delete all existing recipe_ingredients for this recipe
      await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
      // Insert new ingredients
      for (const ingredient of ingredients) {
        // Find or create ingredient
        let ingredientResult = await db.query(
          'SELECT id FROM ingredients WHERE LOWER(name) = LOWER($1)',
          [ingredient.name]
        );
        let ingredientId;
        if (ingredientResult.rows.length === 0) {
          const newIngredientResult = await db.query(
            'INSERT INTO ingredients (name, unit) VALUES ($1, $2) RETURNING id',
            [ingredient.name, ingredient.unit]
          );
          ingredientId = newIngredientResult.rows[0].id;
        } else {
          ingredientId = ingredientResult.rows[0].id;
        }
        // Add recipe ingredient
        await db.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
          [recipeId, ingredientId, ingredient.quantity, ingredient.unit, ingredient.notes]
        );
      }
    }

    // Get updated recipe with ingredients
    const updatedRecipe = await getRecipeWithIngredients(recipeId, familyId, userId);

    res.json({
      message: 'Recipe updated successfully',
      recipe: updatedRecipe
    });
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a recipe
router.delete('/:familyId/:recipeId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId, recipeId } = req.params;

    // Check if recipe exists and belongs to family
    const existingRecipe = await db.query(
      'SELECT id FROM recipes WHERE id = $1 AND family_id = $2',
      [recipeId, familyId]
    );

    if (existingRecipe.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Delete recipe (cascade will handle related records)
    await db.query('DELETE FROM recipes WHERE id = $1', [recipeId]);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle favorite recipe
router.post('/:familyId/:recipeId/favorite', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId, recipeId } = req.params;
    const userId = req.user.id;

    // Check if recipe exists and belongs to family
    const existingRecipe = await db.query(
      'SELECT id FROM recipes WHERE id = $1 AND family_id = $2',
      [recipeId, familyId]
    );

    if (existingRecipe.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check if already favorited
    const existingFavorite = await db.query(
      'SELECT id FROM user_favorite_recipes WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    if (existingFavorite.rows.length > 0) {
      // Remove from favorites
      await db.query(
        'DELETE FROM user_favorite_recipes WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      res.json({ message: 'Recipe removed from favorites', is_favorite: false });
    } else {
      // Add to favorites
      await db.query(
        'INSERT INTO user_favorite_recipes (user_id, recipe_id) VALUES ($1, $2)',
        [userId, recipeId]
      );
      res.json({ message: 'Recipe added to favorites', is_favorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get recipe with ingredients
async function getRecipeWithIngredients(recipeId, familyId = null, userId = null) {
  let query = `
    SELECT r.id, r.name, r.description, r.image_url, r.prep_time_minutes, 
           r.cook_time_minutes, r.servings, r.cooking_instructions, r.star_rating, 
           r.dietary_tags, r.created_at, r.updated_at,
           u.first_name as created_by_first_name, u.last_name as created_by_last_name
    FROM recipes r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = $1
  `;

  const queryParams = [recipeId];
  let paramCount = 2;

  if (familyId) {
    query += ` AND r.family_id = $${paramCount}`;
    queryParams.push(familyId);
    paramCount++;
  }

  const recipeResult = await db.query(query, queryParams);

  if (recipeResult.rows.length === 0) {
    return null;
  }

  const recipe = recipeResult.rows[0];

  // Get ingredients
  const ingredientsResult = await db.query(
    `SELECT i.id, i.name, i.unit, ri.quantity, ri.unit as recipe_unit, ri.notes
     FROM recipe_ingredients ri
     JOIN ingredients i ON ri.ingredient_id = i.id
     WHERE ri.recipe_id = $1
     ORDER BY i.name`,
    [recipeId]
  );

  recipe.ingredients = ingredientsResult.rows;

  // Add favorite status if userId provided
  if (userId) {
    const favoriteResult = await db.query(
      'SELECT id FROM user_favorite_recipes WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );
    recipe.is_favorite = favoriteResult.rows.length > 0;
  }

  return recipe;
}

module.exports = router; 