const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().min(1).max(100).required(),
  birthday: Joi.date().optional(),
  dietary_restrictions: Joi.array().items(Joi.string()).optional(),
  nutrition_targets: Joi.object().optional(),
  favorite_foods: Joi.array().items(Joi.string()).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).optional(),
  last_name: Joi.string().min(1).max(100).optional(),
  birthday: Joi.date().optional(),
  dietary_restrictions: Joi.array().items(Joi.string()).optional(),
  nutrition_targets: Joi.object().optional(),
  favorite_foods: Joi.array().items(Joi.string()).optional(),
  profile_image_url: Joi.string().uri().optional()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, first_name, last_name, birthday, dietary_restrictions, nutrition_targets, favorite_foods } = value;

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, birthday, dietary_restrictions, nutrition_targets, favorite_foods)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name, birthday, dietary_restrictions, nutrition_targets, favorite_foods, created_at`,
      [email, passwordHash, first_name, last_name, birthday, dietary_restrictions, nutrition_targets, favorite_foods]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        birthday: user.birthday,
        dietary_restrictions: user.dietary_restrictions,
        nutrition_targets: user.nutrition_targets,
        favorite_foods: user.favorite_foods
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Find user by email
    const result = await db.query(
      'SELECT id, email, password_hash, first_name, last_name, birthday, dietary_restrictions, nutrition_targets, favorite_foods FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        birthday: user.birthday,
        dietary_restrictions: user.dietary_restrictions,
        nutrition_targets: user.nutrition_targets,
        favorite_foods: user.favorite_foods
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, first_name, last_name, profile_image_url, birthday, dietary_restrictions, nutrition_targets, favorite_foods, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(req.user.id);
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, profile_image_url, birthday, dietary_restrictions, nutrition_targets, favorite_foods, updated_at
    `;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 