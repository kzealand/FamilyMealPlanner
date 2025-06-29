const express = require('express');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireFamilyAccess, requireAdminRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

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

const inviteMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'member').default('member'),
  message: Joi.string().max(500).optional()
});

// Get all test users (development only) - Must be before parameterized routes
router.get('/test-users', authenticateToken, async (req, res) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'This endpoint is only available in development' });
    }

    // Get all users with "TestUser" as last name (our test user pattern)
    const result = await db.query(
      `SELECT id, email, first_name, last_name, created_at
       FROM users 
       WHERE last_name = 'TestUser'
       ORDER BY created_at DESC`
    );

    res.json({ 
      testUsers: result.rows,
      note: 'These are test users created for invitation testing. Password is always "test123456"'
    });
  } catch (error) {
    console.error('Get test users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete test user (development only) - Must be before parameterized routes
router.delete('/test-users/:userId', authenticateToken, async (req, res) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'This endpoint is only available in development' });
    }

    const { userId } = req.params;

    // Verify this is actually a test user
    const userCheck = await db.query(
      'SELECT id, email, last_name FROM users WHERE id = $1 AND last_name = $2',
      [userId, 'TestUser']
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Test user not found' });
    }

    // Delete the test user (cascade will handle related records)
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ 
      message: 'Test user deleted successfully',
      deletedUser: userCheck.rows[0]
    });
  } catch (error) {
    console.error('Delete test user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

    // Debug log
    console.log('Family details response:', { family, members: membersResult.rows });

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

// Delete family (admin only)
router.delete('/:familyId', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;

    // Check if user is the creator or an admin
    const familyResult = await db.query(
      'SELECT created_by FROM families WHERE id = $1',
      [familyId]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const family = familyResult.rows[0];
    
    // Only the creator can delete the family
    if (family.created_by !== userId) {
      return res.status(403).json({ error: 'Only the family creator can delete the family' });
    }

    // Delete all related data (cascade will handle most, but we'll be explicit)
    await db.query('DELETE FROM family_members WHERE family_id = $1', [familyId]);
    await db.query('DELETE FROM recipes WHERE family_id = $1', [familyId]);
    await db.query('DELETE FROM meal_plans WHERE family_id = $1', [familyId]);
    await db.query('DELETE FROM shopping_lists WHERE family_id = $1', [familyId]);
    await db.query('DELETE FROM families WHERE id = $1', [familyId]);

    res.json({ message: 'Family deleted successfully' });
  } catch (error) {
    console.error('Delete family error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite member to family (admin only)
router.post('/:familyId/invite', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { error, value } = inviteMemberSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { familyId } = req.params;
    const { email, role, message } = value;

    // Check if user is already a member
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id;
      const existingMember = await db.query(
        'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
        [familyId, userId]
      );

      if (existingMember.rows.length > 0) {
        return res.status(409).json({ error: 'User is already a member of this family' });
      }
    }

    // Check if invitation already exists
    const existingInvite = await db.query(
      'SELECT id FROM family_invitations WHERE family_id = $1 AND email = $2 AND status = $3',
      [familyId, email, 'pending']
    );

    if (existingInvite.rows.length > 0) {
      return res.status(409).json({ error: 'Invitation already sent to this email' });
    }

    // Create invitation
    const invitationToken = uuidv4();
    const result = await db.query(
      `INSERT INTO family_invitations (family_id, email, role, message, invitation_token, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, invitation_token`,
      [familyId, email, role, message, invitationToken, req.user.id]
    );

    const invitation = result.rows[0];

    // DEVELOPMENT FEATURE: Create test user account for invitations
    // This helps test the full workflow during development
    let testUserCreated = false;
    let testUserCredentials = null;
    
    if (process.env.NODE_ENV === 'development' && !existingUser.rows.length) {
      try {
        // Generate a test password (simple for development)
        const testPassword = 'test123456';
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(testPassword, saltRounds);
        
        // Extract name from email for test user
        const emailName = email.split('@')[0];
        const firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        const lastName = 'TestUser';
        
        // Create test user
        const userResult = await db.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, dietary_restrictions, nutrition_targets, favorite_foods)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, email, first_name, last_name`,
          [email, passwordHash, firstName, lastName, [], {}, []]
        );
        
        testUserCreated = true;
        testUserCredentials = {
          email: email,
          password: testPassword,
          firstName: firstName,
          lastName: lastName
        };
        
        console.log(`🧪 Created test user account for invitation: ${email} (Password: ${testPassword})`);
      } catch (userError) {
        console.error('Failed to create test user account:', userError);
        // Don't fail the invitation if test user creation fails
      }
    }

    // In a real app, you would send an email here
    // For now, we'll return the invitation token
    const response = {
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email,
        role,
        message,
        invitation_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${invitation.invitation_token}`
      }
    };

    // Add test user credentials to response in development
    if (testUserCreated && testUserCredentials) {
      response.testUser = {
        message: 'Test user account created for development',
        credentials: testUserCredentials,
        note: 'Use these credentials to log in and test the invitation acceptance flow'
      };
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending invitations for a family (admin only)
router.get('/:familyId/invitations', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { familyId } = req.params;

    const result = await db.query(
      `SELECT fi.id, fi.email, fi.role, fi.message, fi.created_at, fi.status,
              u.first_name, u.last_name
       FROM family_invitations fi
       LEFT JOIN users u ON fi.email = u.email
       WHERE fi.family_id = $1
       ORDER BY fi.created_at DESC`,
      [familyId]
    );

    res.json({ invitations: result.rows });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel invitation (admin only)
router.delete('/:familyId/invitations/:invitationId', authenticateToken, requireFamilyAccess, requireAdminRole, async (req, res) => {
  try {
    const { familyId, invitationId } = req.params;

    const result = await db.query(
      'DELETE FROM family_invitations WHERE id = $1 AND family_id = $2 RETURNING id',
      [invitationId, familyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept invitation (public endpoint)
router.post('/invite/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { userId } = req.body; // User must be logged in

    if (!userId) {
      return res.status(401).json({ error: 'User must be logged in to accept invitation' });
    }

    // Find invitation
    const invitationResult = await db.query(
      'SELECT * FROM family_invitations WHERE invitation_token = $1 AND status = $2',
      [token, 'pending']
    );

    if (invitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = invitationResult.rows[0];

    // Check if user email matches invitation email
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].email !== invitation.email) {
      return res.status(403).json({ error: 'Invitation email does not match your account email' });
    }

    // Check if user is already a member
    const existingMember = await db.query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [invitation.family_id, userId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: 'You are already a member of this family' });
    }

    // Add user to family
    await db.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [invitation.family_id, userId, invitation.role]
    );

    // Update invitation status
    await db.query(
      'UPDATE family_invitations SET status = $1, accepted_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['accepted', invitation.id]
    );

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invitation details (public endpoint)
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await db.query(
      `SELECT fi.*, f.name as family_name, f.description as family_description
       FROM family_invitations fi
       JOIN families f ON fi.family_id = f.id
       WHERE fi.invitation_token = $1 AND fi.status = $2`,
      [token, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = result.rows[0];
    res.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        message: invitation.message,
        family_name: invitation.family_name,
        family_description: invitation.family_description,
        created_at: invitation.created_at
      }
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 