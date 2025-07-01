const express = require('express');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { normalizeDate, isValidDateString } = require('../utils/dateUtils');

const router = express.Router();

// Validation schemas
const createMealPlanSchema = Joi.object({
  week_start_date: Joi.alternatives().try(
    Joi.date(),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
  ).required(),
  meals: Joi.array().items(Joi.object({
    day_of_week: Joi.number().integer().min(0).max(6).required(),
    meal_slot_name: Joi.string().valid('breakfast', 'am_snack', 'lunch', 'pm_snack', 'dinner', 'dessert').required(),
    recipe_id: Joi.string().uuid().optional(),
    custom_meal_name: Joi.string().optional(),
    notes: Joi.string().optional()
  })).min(1).required()
});

const updateMealPlanSchema = Joi.object({
  meals: Joi.array().items(Joi.object({
    day_of_week: Joi.number().integer().min(0).max(6).required(),
    meal_slot_name: Joi.string().valid('breakfast', 'am_snack', 'lunch', 'pm_snack', 'dinner', 'dessert').required(),
    recipe_id: Joi.string().uuid().optional(),
    custom_meal_name: Joi.string().optional(),
    notes: Joi.string().optional()
  })).min(1).required()
});

// Create or update meal plan for the authenticated user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = createMealPlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { week_start_date, meals } = value;
    console.log('POST /meal-plans:', { received_week_start_date: week_start_date });

    // Normalize the date to YYYY-MM-DD format
    const normalizedWeekStartDate = normalizeDate(week_start_date);
    console.log('Normalized week_start_date:', normalizedWeekStartDate);

    // Check if meal plan already exists for this week
    console.log('Looking for existing meal plan with user_id:', userId, 'week_start_date:', normalizedWeekStartDate);
    
    const existingPlan = await db.query(
      'SELECT id FROM meal_plans WHERE user_id = $1 AND week_start_date = $2',
      [userId, normalizedWeekStartDate]
    );
    console.log('Existing plan query result:', existingPlan.rows);

    let mealPlanId;
    if (existingPlan.rows.length > 0) {
      // Update existing plan
      mealPlanId = existingPlan.rows[0].id;
      console.log('Found existing meal plan, updating ID:', mealPlanId);
      
      // Clear existing meals
      console.log('Deleting existing meal plan items for meal plan ID:', mealPlanId);
      const deleteResult = await db.query('DELETE FROM meal_plan_items WHERE meal_plan_id = $1', [mealPlanId]);
      console.log('Deleted', deleteResult.rowCount, 'existing meal plan items');
    } else {
      // Create new plan
      console.log('No existing meal plan found, creating new one');
      try {
        const result = await db.query(
          'INSERT INTO meal_plans (user_id, week_start_date) VALUES ($1, $2) RETURNING id',
          [userId, normalizedWeekStartDate]
        );
        mealPlanId = result.rows[0].id;
        console.log('Created new meal plan with ID:', mealPlanId);
      } catch (error) {
        console.error('Create meal plan error:', error);
        return res.status(500).json({ error: 'Failed to create meal plan' });
      }
    }

    // Get meal slot IDs
    const mealSlotsResult = await db.query('SELECT id, name FROM meal_slots ORDER BY display_order');
    const mealSlotMap = {};
    mealSlotsResult.rows.forEach(slot => {
      mealSlotMap[slot.name] = slot.id;
    });

    // Add meals
    for (const meal of meals) {
      const mealSlotId = mealSlotMap[meal.meal_slot_name];
      
      console.log('Processing meal:', meal);
      console.log('meal_slot_name:', meal.meal_slot_name);
      console.log('mealSlotId:', mealSlotId);
      console.log('mealSlotMap:', mealSlotMap);
      
      if (!mealSlotId) {
        return res.status(400).json({ error: `Invalid meal slot: ${meal.meal_slot_name}` });
      }

      // Validate recipe if provided (check if user has access to it)
      if (meal.recipe_id) {
        console.log('Validating recipe access for recipe_id:', meal.recipe_id);
        const recipeResult = await db.query(
          `SELECT r.id FROM recipes r
           JOIN family_members fm ON r.family_id = fm.family_id
           WHERE r.id = $1 AND fm.user_id = $2`,
          [meal.recipe_id, userId]
        );
        
        console.log('Recipe validation result:', recipeResult.rows);
        
        if (recipeResult.rows.length === 0) {
          console.log('Recipe validation failed - recipe not found or no access');
          return res.status(400).json({ error: 'Recipe not found or you do not have access to it' });
        }
      }

      try {
        const insertResult = await db.query(
          'INSERT INTO meal_plan_items (meal_plan_id, meal_slot_id, recipe_id, custom_meal_name, notes, day_of_week) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [mealPlanId, mealSlotId, meal.recipe_id || null, meal.custom_meal_name || null, meal.notes || null, meal.day_of_week]
        );
        console.log('Successfully inserted meal plan item for day', meal.day_of_week, 'meal slot', meal.meal_slot_name, 'with ID:', insertResult.rows[0].id);
      } catch (insertError) {
        console.error('Error inserting meal plan item:', insertError);
        throw insertError;
      }
    }

    // Get the complete meal plan
    const completePlan = await getMealPlanWithDetails(mealPlanId);

    res.status(201).json({
      message: existingPlan.rows.length > 0 ? 'Meal plan updated successfully' : 'Meal plan created successfully',
      meal_plan: completePlan
    });
  } catch (error) {
    console.error('Create meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meal plan for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { week_start_date } = req.query;
    console.log('GET /meal-plans:', { received_week_start_date: week_start_date });

    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date parameter is required' });
    }

    // Normalize the date to YYYY-MM-DD format
    const normalizedWeekStartDate = normalizeDate(week_start_date);
    console.log('GET meal plan - Original date:', week_start_date);
    console.log('GET meal plan - Normalized date:', normalizedWeekStartDate);

    // Get meal plan
    const planResult = await db.query(
      'SELECT id FROM meal_plans WHERE user_id = $1 AND week_start_date = $2',
      [userId, normalizedWeekStartDate]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found for this week' });
    }

    const mealPlanId = planResult.rows[0].id;
    const completePlan = await getMealPlanWithDetails(mealPlanId);

    res.json({ meal_plan: completePlan });
  } catch (error) {
    console.error('Get meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete meal plan for the authenticated user
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { week_start_date } = req.query;

    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date parameter is required' });
    }

    // Normalize the date to YYYY-MM-DD format
    const normalizedWeekStartDate = normalizeDate(week_start_date);
    console.log('DELETE meal plan - Original date:', week_start_date);
    console.log('DELETE meal plan - Normalized date:', normalizedWeekStartDate);

    // Delete meal plan
    const result = await db.query(
      'DELETE FROM meal_plans WHERE user_id = $1 AND week_start_date = $2 RETURNING id',
      [userId, normalizedWeekStartDate]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get meal plan with details
async function getMealPlanWithDetails(mealPlanId) {
  // Get meal plan basic info
  const planResult = await db.query(
    `SELECT mp.id, mp.user_id, mp.week_start_date, mp.created_at, mp.updated_at,
            u.first_name, u.last_name
     FROM meal_plans mp
     JOIN users u ON mp.user_id = u.id
     WHERE mp.id = $1`,
    [mealPlanId]
  );

  if (planResult.rows.length === 0) {
    return null;
  }

  const mealPlan = planResult.rows[0];

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
    [mealPlanId]
  );

  console.log('Raw meal plan items from database:', mealsResult.rows);
  console.log('Number of meal plan items found:', mealsResult.rows.length);

  // Organize meals by day
  const mealsByDay = {};
  for (let i = 0; i < 7; i++) {
    mealsByDay[i] = {};
  }

  mealsResult.rows.forEach(meal => {
    console.log('Processing meal from database:', meal);
    console.log('meal.day_of_week:', meal.day_of_week);
    console.log('meal.meal_slot_name:', meal.meal_slot_name);
    console.log('mealsByDay[meal.day_of_week]:', mealsByDay[meal.day_of_week]);
    
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
      console.log('Added meal to mealsByDay:', mealsByDay[meal.day_of_week][meal.meal_slot_name]);
    } else {
      console.log('Meal slot already exists, skipping:', meal.meal_slot_name);
    }
  });

  console.log('Final mealsByDay structure:', mealsByDay);

  mealPlan.meals = mealsByDay;
  return mealPlan;
}

module.exports = router; 