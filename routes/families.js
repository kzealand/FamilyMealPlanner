const express = require('express');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireFamilyAccess, requireAdminRole } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createFamilySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional()
});

const addMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'member').default('member')
});

// Create a new family
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = createFamilySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description } = value;
    const userId = req.user.id;

    // Create family
    const familyResult = await db.query(
      'INSERT INTO families (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, description, userId]
    );

    const family = familyResult.rows[0];

    // Add creator as admin member
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [family.id, userId, 'admin']
    );

    res.status(201).json({
      message: 'Family created successfully',
      family: {
        id: family.id,
        name: family.name,
        description: family.description,
        created_at: family.created_at
      }
    });
  } catch (error) {
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's families
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT f.id, f.name, f.description, f.created_at, fm.role
       FROM families f
       JOIN family_members fm ON f.id = fm.family_id
       WHERE fm.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ families: result.rows });
  } catch (error) {
    console.error('Get families error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get family details
router.get('/:familyId', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;

    const familyResult = await db.query(
      'SELECT id, name, description, created_at FROM families WHERE id = $1',
      [familyId]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const family = familyResult.rows[0];

    // Get family members
    const membersResult = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.profile_image_url, fm.role, fm.joined_at
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = $1
       ORDER BY fm.joined_at ASC`,
      [familyId]
    );

    res.json({
      family,
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Get family details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to family (admin only)
router.post('/:familyId/members', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { error, value } = addMemberSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { familyId } = req.params;
    const { email, role } = value;

    // Find user by email
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Check if user is already a member
    const existingMember = await db.query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a member of this family' });
    }

    // Add member
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [familyId, userId, role]
    );

    // Get updated member list
    const membersResult = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.profile_image_url, fm.role, fm.joined_at
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = $1
       ORDER BY fm.joined_at ASC`,
      [familyId]
    );

    res.status(201).json({
      message: 'Member added successfully',
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from family (admin only, cannot remove self)
router.delete('/:familyId/members/:userId', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { familyId, userId } = req.params;
    const currentUserId = req.user.id;

    // Prevent removing self
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove yourself from the family' });
    }

    // Check if user is a member
    const memberResult = await db.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Remove member
    await db.query(
      'DELETE FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update member role (admin only)
router.put('/:familyId/members/:userId/role', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { familyId, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "member"' });
    }

    const currentUserId = req.user.id;

    // Prevent changing own role
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Check if user is a member
    const memberResult = await db.query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update role
    await db.query(
      'UPDATE family_members SET role = $1 WHERE family_id = $2 AND user_id = $3',
      [role, familyId, userId]
    );

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave family (member can leave, admin can only leave if other admins exist)
router.delete('/:familyId/members/leave', authenticateToken, requireFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;
    const userRole = req.familyRole;

    if (userRole === 'admin') {
      // Check if there are other admins
      const adminCountResult = await db.query(
        'SELECT COUNT(*) FROM family_members WHERE family_id = $1 AND role = $2',
        [familyId, 'admin']
      );

      const adminCount = parseInt(adminCountResult.rows[0].count);
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot leave family: you are the only admin. Transfer admin role first or delete the family.' });
      }
    }

    // Remove member
    await db.query(
      'DELETE FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    res.json({ message: 'Successfully left the family' });
  } catch (error) {
    console.error('Leave family error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 