const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist
    const result = await db.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireFamilyAccess = async (req, res, next) => {
  const { familyId } = req.params;
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Not a family member' });
    }

    req.familyRole = result.rows[0].role;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Database error' });
  }
};

const requireAdminRole = (req, res, next) => {
  if (req.familyRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }
  next();
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = {
  authenticateToken,
  requireFamilyAccess,
  requireAdminRole,
  generateToken,
}; 