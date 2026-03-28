const express = require('express');
const axios = require('axios');
const { query } = require('../../config/database');
const { checkRateLimit, addToBlacklist } = require('../../config/redis');
const { generateTokens, verifyRefreshToken } = require('../../middleware/authMiddleware');
const { logSecurityEvent } = require('../../modules/security-monitoring/securityLogger');

const router = express.Router();

// Face login endpoint
router.post('/face-login', async (req, res) => {
  try {
    const { frames, employeeId, challengeType, location } = req.body;
    
    if (!frames || !employeeId) {
      return res.status(400).json({
        error: 'Missing required fields: frames, employeeId',
        code: 'MISSING_FIELDS'
      });
    }

    // Check rate limiting
    const isRateLimited = await checkRateLimit(
      `login_attempts:${employeeId}:${req.ip}`,
      5, // 5 attempts per minute
      60000 // 1 minute window
    );

    if (isRateLimited) {
      await logSecurityEvent({
        employeeId,
        eventType: 'MULTIPLE_LOGIN_ATTEMPTS',
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
        details: 'Rate limit exceeded for face login'
      });

      return res.status(429).json({
        error: 'Too many login attempts. Please try again in 1 minute.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Call Face AI Service
    const faceAIServiceUrl = process.env.FACE_AI_SERVICE_URL || 'http://face-ai-service:5000';
    
    const response = await axios.post(`${faceAIServiceUrl}/api/face-login`, {
      frames,
      employeeId,
      challengeType
    });

    const authResult = response.data;

    // Log security event
    await logSecurityEvent({
      employeeId,
      eventType: authResult.spoof_detected ? 'SPOOF_ATTEMPT' : 
                authResult.face_matched ? 'LOGIN_ATTEMPT' : 'FACE_MISMATCH',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      details: JSON.stringify({
        authenticated: authResult.authenticated,
        spoofDetected: authResult.spoof_detected,
        spoofConfidence: authResult.spoof_confidence,
        livenessPassed: authResult.liveness_passed,
        faceMatched: authResult.face_matched,
        challengePassed: authResult.challenge_passed,
        errors: authResult.errors
      })
    });

    if (authResult.authenticated) {
      // Get employee details from database
      const employeeResult = await query(
        `SELECT id, employee_id, email, role, department, supervisor_id 
         FROM employees WHERE employee_id = $1 AND is_active = true`,
        [employeeId]
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Employee not found or inactive',
          code: 'EMPLOYEE_NOT_FOUND'
        });
      }

      const employee = employeeResult.rows[0];

      // Generate tokens
      const tokens = generateTokens(employee);

      // Record successful login
      await query(
        `INSERT INTO login_logs 
         (employee_id, success, spoof_detected, spoof_confidence, 
          challenge_passed, face_embedding, ip_address, device_info, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          employee.id,
          true,
          authResult.spoof_detected,
          authResult.spoof_confidence,
          authResult.challenge_passed,
          null, // Would store embedding in production
          req.ip,
          req.headers['user-agent'],
          location ? JSON.stringify(location) : null
        ]
      );

      res.json({
        success: true,
        message: 'Authentication successful',
        tokens,
        employee: {
          id: employee.id,
          employeeId: employee.employee_id,
          email: employee.email,
          role: employee.role,
          department: employee.department
        }
      });

    } else {
      // Record failed login attempt
      await query(
        `INSERT INTO login_logs 
         (employee_id, success, spoof_detected, spoof_confidence, 
          challenge_passed, face_embedding, ip_address, device_info, error_details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          employeeId,
          false,
          authResult.spoof_detected,
          authResult.spoof_confidence,
          authResult.challenge_passed,
          null,
          req.ip,
          req.headers['user-agent'],
          JSON.stringify(authResult.errors)
        ]
      );

      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        details: authResult.errors,
        spoofDetected: authResult.spoof_detected
      });
    }

  } catch (error) {
    console.error('Face login error:', error);
    
    await logSecurityEvent({
      employeeId: req.body.employeeId,
      eventType: 'LOGIN_ERROR',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      details: `Face login error: ${error.message}`
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get employee details
    const employeeResult = await query(
      `SELECT id, employee_id, email, role, department 
       FROM employees WHERE id = $1 AND is_active = true`,
      [decoded.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Employee not found or inactive',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const employee = employeeResult.rows[0];

    // Generate new tokens
    const tokens = generateTokens(employee);

    res.json({
      success: true,
      tokens,
      employee: {
        id: employee.id,
        employeeId: employee.employee_id,
 email: employee.email,
        role: employee.role,
        department: employee.department
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Add token to blacklist with 15-minute expiry (matching access token expiry)
      await addToBlacklist(token, 15 * 60);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Register face endpoint
router.post('/register-face', async (req, res) => {
  try {
    const { frames, employeeId } = req.body;
    
    if (!frames || !employeeId) {
      return res.status(400).json({
        error: 'Missing required fields: frames, employeeId',
        code: 'MISSING_FIELDS'
      });
    }

    // Verify employee exists and is active
    const employeeResult = await query(
      'SELECT id FROM employees WHERE employee_id = $1 AND is_active = true',
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Employee not found or inactive',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Call Face AI Service for registration
    const faceAIServiceUrl = process.env.FACE_AI_SERVICE_URL || 'http://face-ai-service:5000';
    
    const response = await axios.post(`${faceAIServiceUrl}/api/register-face`, {
      frames,
      employeeId
    });

    if (response.data.success) {
      // In production, store the embedding in database
      // For now, just log success
      
      await logSecurityEvent({
        employeeId,
        eventType: 'FACE_REGISTERED',
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
        details: 'Face registration completed successfully'
      });

      res.json({
        success: true,
        message: 'Face registered successfully',
        employeeId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Face registration failed',
        details: response.data.error
      });
    }

  } catch (error) {
    console.error('Face registration error:', error);
    
    await logSecurityEvent({
      employeeId: req.body.employeeId,
      eventType: 'FACE_REGISTRATION_ERROR',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      details: `Face registration error: ${error.message}`
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

module.exports = router;