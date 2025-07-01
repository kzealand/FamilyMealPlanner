const express = require('express');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireFamilyAccess } = require('../middleware/auth');
const { normalizeDate, isValidDateString } = require('../utils/dateUtils');

const router = express.Router();

// Validation schemas
const generateShoppingListSchema = Joi.object({
  week_start_date: Joi.alternatives().try(
    Joi.date(),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
  ).required()
});

const updateShoppingListItemSchema = Joi.object({
  is_checked: Joi.boolean().required(),
  notes: Joi.string().optional()
});

// Generate shopping list for a family
router.post('/:familyId/generate', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { error, value } = generateShoppingListSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { familyId } = req.params;
    const { week_start_date } = value;

    // Normalize the date to YYYY-MM-DD format
    const normalizedWeekStartDate = normalizeDate(week_start_date);
    console.log('Shopping list generation - Original date:', week_start_date);
    console.log('Shopping list generation - Normalized date:', normalizedWeekStartDate);

    // Check if shopping list already exists for this week
    const existingList = await db.query(
      'SELECT id FROM shopping_lists WHERE family_id = $1 AND week_start_date = $2',
      [familyId, normalizedWeekStartDate]
    );

    if (existingList.rows.length > 0) {
      return res.status(409).json({ error: 'Shopping list already exists for this week' });
    }

    // Get all meal plans for the family for the specified week
    // First, get all family members
    const familyMembersResult = await db.query(
      'SELECT user_id FROM family_members WHERE family_id = $1',
      [familyId]
    );

    console.log('Family members found:', familyMembersResult.rows);

    if (familyMembersResult.rows.length === 0) {
      return res.status(400).json({ error: 'No family members found' });
    }

    const familyMemberIds = familyMembersResult.rows.map(row => row.user_id);
    console.log('Family member IDs:', familyMemberIds);

    // Get all meal plans for family members for the specified week
    const mealPlansResult = await db.query(
      'SELECT id FROM meal_plans WHERE user_id = ANY($1) AND week_start_date = $2',
      [familyMemberIds, normalizedWeekStartDate]
    );

    console.log('Meal plans found:', mealPlansResult.rows);

    if (mealPlansResult.rows.length === 0) {
      return res.status(400).json({ error: 'No meal plans found for this week' });
    }

    // Create shopping list
    const shoppingListResult = await db.query(
      'INSERT INTO shopping_lists (family_id, week_start_date) VALUES ($1, $2) RETURNING id',
      [familyId, normalizedWeekStartDate]
    );

    const shoppingListId = shoppingListResult.rows[0].id;

    // Aggregate ingredients from all meal plans
    const ingredientsMap = new Map();

    for (const mealPlan of mealPlansResult.rows) {
      const mealPlanId = mealPlan.id;
      console.log('Processing meal plan ID:', mealPlanId);

      // Get all meals with recipes for this meal plan
      const mealsResult = await db.query(
        `SELECT mpi.recipe_id, r.name as recipe_name, ri.ingredient_id, ri.quantity, ri.unit, ri.notes
         FROM meal_plan_items mpi
         JOIN recipe_ingredients ri ON mpi.recipe_id = ri.recipe_id
         JOIN recipes r ON mpi.recipe_id = r.id
         WHERE mpi.meal_plan_id = $1 AND mpi.recipe_id IS NOT NULL`,
        [mealPlanId]
      );

      console.log('Recipes found for meal plan:', mealsResult.rows);

      // Aggregate ingredients
      for (const meal of mealsResult.rows) {
        const key = `${meal.ingredient_id}_${meal.unit || 'no_unit'}`;
        
        if (ingredientsMap.has(key)) {
          const existing = ingredientsMap.get(key);
          existing.quantity += parseFloat(meal.quantity);
          // Add recipe name to the list of recipes
          if (!existing.recipes.includes(meal.recipe_name)) {
            existing.recipes.push(meal.recipe_name);
          }
          if (meal.notes && !existing.notes.includes(meal.notes)) {
            existing.notes = existing.notes ? `${existing.notes}; ${meal.notes}` : meal.notes;
          }
        } else {
          ingredientsMap.set(key, {
            ingredient_id: meal.ingredient_id,
            quantity: parseFloat(meal.quantity),
            unit: meal.unit,
            notes: meal.notes,
            recipes: [meal.recipe_name]
          });
        }
      }
    }

    // Insert shopping list items
    for (const [key, ingredient] of ingredientsMap) {
      // Create notes that include recipe information
      let notes = ingredient.notes || '';
      const recipeInfo = `From recipes: ${ingredient.recipes.join(', ')}`;
      const finalNotes = notes ? `${notes} | ${recipeInfo}` : recipeInfo;
      
      await db.query(
        'INSERT INTO shopping_list_items (shopping_list_id, ingredient_id, total_quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
        [shoppingListId, ingredient.ingredient_id, ingredient.quantity, ingredient.unit, finalNotes]
      );
    }

    // Get the complete shopping list
    const completeList = await getShoppingListWithDetails(shoppingListId);

    res.status(201).json({
      message: 'Shopping list generated successfully',
      shopping_list: completeList
    });
  } catch (error) {
    console.error('Generate shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shopping list for a family
router.get('/:familyId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { week_start_date } = req.query;

    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date parameter is required' });
    }

    // Normalize the date to YYYY-MM-DD format
    const normalizedWeekStartDate = normalizeDate(week_start_date);
    console.log('Get shopping list - Original date:', week_start_date);
    console.log('Get shopping list - Normalized date:', normalizedWeekStartDate);

    // Get shopping list
    const listResult = await db.query(
      'SELECT id FROM shopping_lists WHERE family_id = $1 AND week_start_date = $2',
      [familyId, normalizedWeekStartDate]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found for this week' });
    }

    const shoppingListId = listResult.rows[0].id;
    const completeList = await getShoppingListWithDetails(shoppingListId);

    res.json({ shopping_list: completeList });
  } catch (error) {
    console.error('Get shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shopping list item (check/uncheck, add notes)
router.put('/:familyId/items/:itemId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { error, value } = updateShoppingListItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { familyId, itemId } = req.params;
    const { is_checked, notes } = value;

    // Verify the item belongs to a shopping list for this family
    const itemResult = await db.query(
      `SELECT sli.id FROM shopping_list_items sli
       JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
       WHERE sli.id = $1 AND sl.family_id = $2`,
      [itemId, familyId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list item not found' });
    }

    // Update the item
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (is_checked !== undefined) {
      updateFields.push(`is_checked = $${paramCount}`);
      updateValues.push(is_checked);
      paramCount++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      updateValues.push(notes);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(itemId);
    const query = `
      UPDATE shopping_list_items 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list item not found' });
    }

    res.json({
      message: 'Shopping list item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Update shopping list item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shopping list
router.delete('/:familyId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { week_start_date } = req.query;

    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date parameter is required' });
    }

    // Delete shopping list (cascade will handle items)
    const result = await db.query(
      'DELETE FROM shopping_lists WHERE family_id = $1 AND week_start_date = $2 RETURNING id',
      [familyId, week_start_date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    console.error('Delete shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available shopping lists for a family
router.get('/:familyId/lists', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;

    const listsResult = await db.query(
      `SELECT id, week_start_date, generated_at,
              (SELECT COUNT(*) FROM shopping_list_items WHERE shopping_list_id = sl.id) as item_count,
              (SELECT COUNT(*) FROM shopping_list_items WHERE shopping_list_id = sl.id AND is_checked = true) as checked_count
       FROM shopping_lists sl
       WHERE family_id = $1
       ORDER BY week_start_date DESC`,
      [familyId]
    );

    res.json({ shopping_lists: listsResult.rows });
  } catch (error) {
    console.error('Get shopping lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get shopping list with details
async function getShoppingListWithDetails(shoppingListId) {
  // Get shopping list basic info
  const listResult = await db.query(
    'SELECT id, family_id, week_start_date, generated_at FROM shopping_lists WHERE id = $1',
    [shoppingListId]
  );

  if (listResult.rows.length === 0) {
    return null;
  }

  const shoppingList = listResult.rows[0];

  // Get shopping list items with ingredient details
  const itemsResult = await db.query(
    `SELECT sli.id, sli.total_quantity, sli.unit, sli.is_checked, sli.notes,
            i.id as ingredient_id, i.name as ingredient_name, i.unit as ingredient_unit
     FROM shopping_list_items sli
     JOIN ingredients i ON sli.ingredient_id = i.id
     WHERE sli.shopping_list_id = $1
     ORDER BY i.name`,
    [shoppingListId]
  );

  shoppingList.items = itemsResult.rows;

  // Calculate summary
  shoppingList.summary = {
    total_items: itemsResult.rows.length,
    checked_items: itemsResult.rows.filter(item => item.is_checked).length,
    unchecked_items: itemsResult.rows.filter(item => !item.is_checked).length
  };

  return shoppingList;
}

module.exports = router; 