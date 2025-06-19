const express = require('express');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireFamilyAccess, requireAdminRole } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createMealPlanSchema = Joi.object({
  week_start_date: Joi.date().required(),
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

// Create or update meal plan for a user
router.post('/:familyId/:userId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { error, value } = createMealPlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { familyId, userId } = req.params;
    const currentUserId = req.user.id;
    const { week_start_date, meals } = value;

    // Check if user can edit this meal plan
    if (userId !== currentUserId && req.familyRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can edit other users\' meal plans' });
    }

    // Check if target user is a family member
    const targetUserMember = await db.query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    if (targetUserMember.rows.length === 0) {
      return res.status(404).json({ error: 'Target user is not a member of this family' });
    }

    // Check if meal plan already exists for this week
    const existingPlan = await db.query(
      'SELECT id FROM meal_plans WHERE user_id = $1 AND family_id = $2 AND week_start_date = $3',
      [userId, familyId, week_start_date]
    );

    let mealPlanId;
    if (existingPlan.rows.length > 0) {
      // Update existing plan
      mealPlanId = existingPlan.rows[0].id;
      
      // Clear existing meals
      await db.query('DELETE FROM meal_plan_items WHERE meal_plan_id = $1', [mealPlanId]);
    } else {
      // Create new plan
      const planResult = await db.query(
        'INSERT INTO meal_plans (user_id, family_id, week_start_date) VALUES ($1, $2, $3) RETURNING id',
        [userId, familyId, week_start_date]
      );
      mealPlanId = planResult.rows[0].id;
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
      
      if (!mealSlotId) {
        return res.status(400).json({ error: `Invalid meal slot: ${meal.meal_slot_name}` });
      }

      // Validate recipe if provided
      if (meal.recipe_id) {
        const recipeResult = await db.query(
          'SELECT id FROM recipes WHERE id = $1 AND family_id = $2',
          [meal.recipe_id, familyId]
        );
        
        if (recipeResult.rows.length === 0) {
          return res.status(400).json({ error: 'Recipe not found or does not belong to this family' });
        }
      }

      await db.query(
        'INSERT INTO meal_plan_items (meal_plan_id, meal_slot_id, recipe_id, custom_meal_name, notes, day_of_week) VALUES ($1, $2, $3, $4, $5, $6)',
        [mealPlanId, mealSlotId, meal.recipe_id || null, meal.custom_meal_name || null, meal.notes || null, meal.day_of_week]
      );
    }

    // Get the complete meal plan
    const completePlan = await getMealPlanWithDetails(mealPlanId, familyId);

    res.status(201).json({
      message: existingPlan.rows.length > 0 ? 'Meal plan updated successfully' : 'Meal plan created successfully',
      meal_plan: completePlan
    });
  } catch (error) {
    console.error('Create meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meal plan for a user
router.get('/:familyId/:userId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId, userId } = req.params;
    const { week_start_date } = req.query;

    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date parameter is required' });
    }

    // Check if target user is a family member
    const targetUserMember = await db.query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    if (targetUserMember.rows.length === 0) {
      return res.status(404).json({ error: 'Target user is not a member of this family' });
    }

    // Get meal plan
    const planResult = await db.query(
      'SELECT id FROM meal_plans WHERE user_id = $1 AND family_id = $2 AND week_start_date = $3',
      [userId, familyId, week_start_date]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found for this week' });
    }

    const mealPlanId = planResult.rows[0].id;
    const completePlan = await getMealPlanWithDetails(mealPlanId, familyId);

    res.json({ meal_plan: completePlan });
  } catch (error) {
    console.error('Get meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all meal plans for a family (admin only)
router.get('/:familyId', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { week_start_date } = req.query;

    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date parameter is required' });
    }

    // Get all meal plans for the family for the specified week
    const plansResult = await db.query(
      `SELECT mp.id, mp.user_id, mp.week_start_date, mp.created_at, mp.updated_at,
              u.first_name, u.last_name
       FROM meal_plans mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.family_id = $1 AND mp.week_start_date = $2
       ORDER BY u.first_name, u.last_name`,
      [familyId, week_start_date]
    );

    const mealPlans = [];
    for (const plan of plansResult.rows) {
      const completePlan = await getMealPlanWithDetails(plan.id, familyId);
      mealPlans.push(completePlan);
    }

    res.json({ meal_plans: mealPlans });
  } catch (error) {
    console.error('Get family meal plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete meal plan
router.delete('/:familyId/:userId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId, userId } = req.params;
    const { week_start_date } = req.query;
    const currentUserId = req.user.id;

    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date parameter is required' });
    }

    // Check if user can delete this meal plan
    if (userId !== currentUserId && req.familyRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete other users\' meal plans' });
    }

    // Check if target user is a family member
    const targetUserMember = await db.query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    if (targetUserMember.rows.length === 0) {
      return res.status(404).json({ error: 'Target user is not a member of this family' });
    }

    // Delete meal plan
    const result = await db.query(
      'DELETE FROM meal_plans WHERE user_id = $1 AND family_id = $2 AND week_start_date = $3 RETURNING id',
      [userId, familyId, week_start_date]
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
async function getMealPlanWithDetails(mealPlanId, familyId) {
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

  // Organize meals by day
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

  mealPlan.meals = mealsByDay;
  return mealPlan;
}

module.exports = router; 