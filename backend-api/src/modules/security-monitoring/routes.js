const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { logSecurityEvent, getSecurityEvents, getSecurityStats } = require('./securityLogger');

// GET /api/security/events - Get security events (supervisor only)
router.get('/events', async (req, res) => {
  try {
    const { employeeId, eventType, startDate, endDate, severity, limit = 50 } = req.query;

    const events = await getSecurityEvents({
      employeeId,
      eventType,
      startDate,
      endDate,
      severity,
      limit: parseInt(limit)
    });

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Security events fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch security events' });
  }
});

// GET /api/security/stats - Get security statistics
router.get('/stats', async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    const stats = await getSecurityStats(range);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Security stats fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch security stats' });
  }
});

// POST /api/security/log - Log a security event
router.post('/log', async (req, res) => {
  try {
    const { employeeId, eventType, ipAddress, deviceInfo, details, severity } = req.body;

    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType is required' });
    }

    await logSecurityEvent({
      employeeId,
      eventType,
      ipAddress: ipAddress || req.ip,
      deviceInfo: deviceInfo || req.headers['user-agent'],
      details,
      severity: severity || 'medium'
    });

    res.json({ success: true, message: 'Security event logged' });
  } catch (error) {
    console.error('Security log error:', error);
    res.status(500).json({ success: false, message: 'Failed to log security event' });
  }
});

// GET /api/security/health - Security system health check
router.get('/health', async (req, res) => {
  res.json({ success: true, status: 'Security monitoring active', timestamp: new Date().toISOString() });
});

module.exports = router;
