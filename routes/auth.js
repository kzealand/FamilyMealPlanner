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
  birthday: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dietary_restrictions: Joi.array().items(Joi.string()).optional(),
  nutrition_targets: Joi.object().optional(),
  favorite_foods: Joi.array().items(Joi.string()).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).allow('', null).optional(),
  last_name: Joi.string().min(1).max(100).allow('', null).optional(),
  birthday: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  dietary_restrictions: Joi.array().items(Joi.string()).allow(null).optional(),
  nutrition_targets: Joi.object().allow(null).optional(),
  favorite_foods: Joi.array().items(Joi.string()).allow(null).optional(),
  profile_image_url: Joi.string().uri().allow('', null).optional()
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).required()
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

    // Convert birthday to consistent format (YYYY-MM-DD) to avoid timezone issues
    const formattedUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      birthday: user.birthday ? (() => {
        const date = new Date(user.birthday);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })() : null,
      dietary_restrictions: user.dietary_restrictions,
      nutrition_targets: user.nutrition_targets,
      favorite_foods: user.favorite_foods
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: formattedUser,
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

    // Convert birthday to consistent format (YYYY-MM-DD) to avoid timezone issues
    const formattedUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      birthday: user.birthday ? (() => {
        const date = new Date(user.birthday);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })() : null,
      dietary_restrictions: user.dietary_restrictions,
      nutrition_targets: user.nutrition_targets,
      favorite_foods: user.favorite_foods
    };

    res.json({
      message: 'Login successful',
      user: formattedUser,
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

    const user = result.rows[0];
    
    // Convert birthday to consistent format (YYYY-MM-DD) to avoid timezone issues
    if (user.birthday) {
      const date = new Date(user.birthday);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      user.birthday = `${year}-${month}-${day}`;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Profile update request body:', req.body);
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details[0].message);
      return res.status(400).json({ error: error.details[0].message });
    }
    console.log('Validated data:', value);

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        // Convert empty strings to null for database
        let fieldValue = value[key] === '' ? null : value[key];
        
        // Convert birthday string to Date object if it's a valid date string
        if (key === 'birthday' && fieldValue && typeof fieldValue === 'string') {
          console.log('Processing birthday field:', fieldValue);
          try {
            // Validate the date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(fieldValue)) {
              console.log('Invalid date format, setting to null');
              fieldValue = null;
            } else {
              // Keep as string to avoid timezone conversion
              console.log('Valid date format, keeping as string:', fieldValue);
            }
          } catch (error) {
            console.log('Error processing birthday:', error);
            fieldValue = null;
          }
        }
        
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(fieldValue);
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

    console.log('Update query:', query);
    console.log('Update values:', updateValues);

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    
    console.log('Raw database result birthday:', updatedUser.birthday);
    console.log('Raw database result birthday type:', typeof updatedUser.birthday);
    
    // Convert birthday to consistent format (YYYY-MM-DD) to avoid timezone issues
    if (updatedUser.birthday) {
      // If it's already a string in YYYY-MM-DD format, use it directly
      if (typeof updatedUser.birthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updatedUser.birthday)) {
        console.log('Birthday is already in correct string format:', updatedUser.birthday);
      } else {
        // If it's a Date object, format it properly
        const date = new Date(updatedUser.birthday);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        updatedUser.birthday = `${year}-${month}-${day}`;
        console.log('Formatted birthday from Date object:', updatedUser.birthday);
      }
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { current_password, new_password } = value;

    // Get current user with password hash
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidCurrentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 