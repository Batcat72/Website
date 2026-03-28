const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../config/redis');

// Verify JWT token middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    // Check if token is blacklisted
    const blacklisted = await isBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ 
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Add user info to request
    req.user = {
      id: decoded.id,
      employeeId: decoded.employeeId,
      email: decoded.email,
      role: decoded.role,
      department: decoded.department
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('Token verification error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

// Generate JWT tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role,
      department: user.department
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, employeeId: user.employee_id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
}

// Verify refresh token
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

// Role-based authorization middleware
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
}

// Supervisor authorization (for employee-supervisor hierarchy)
function authorizeSupervisor() {
  return async (req, res, next) => {
    try {
      const { query } = require('../config/database');
      
      // Check if user is supervisor of the requested employee
      const result = await query(
        `SELECT supervisor_id FROM employees WHERE id = $1`,
        [req.params.employeeId || req.body.employeeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        });
      }

      const supervisorId = result.rows[0].supervisor_id;
      
      if (supervisorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Not authorized to manage this employee',
          code: 'NOT_SUPERVISOR'
        });
      }

      next();
    } catch (error) {
      console.error('Supervisor authorization error:', error);
      return res.status(500).json({ 
        error: 'Authorization failed',
        code: 'AUTH_FAILED'
      });
    }
  };
}

module.exports = {
  authenticateToken,
  generateTokens,
  verifyRefreshToken,
  authorizeRole,
  authorizeSupervisor
};