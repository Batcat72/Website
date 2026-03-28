const express = require('express');
const { query } = require('../../config/database');
const { authorizeSupervisor } = require('../../middleware/authMiddleware');
const { logSecurityEvent } = require('../security-monitoring/securityLogger');

const router = express.Router();

// Check-in endpoint
router.post('/check-in', async (req, res) => {
  try {
    const { location, imageData } = req.body;
    const employeeId = req.user.id;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        error: 'Location data required',
        code: 'LOCATION_REQUIRED'
      });
    }

    // Check geo-fence status
    const geoFenceResult = await query(
      `SELECT * FROM check_geo_fence($1, $2)`,
      [location.latitude, location.longitude]
    );

    if (geoFenceResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No active office location configured',
        code: 'NO_OFFICE_CONFIG'
      });
    }

    const { within_fence, distance, office_name } = geoFenceResult.rows[0];

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckin = await query(
      `SELECT id FROM attendance_records 
       WHERE employee_id = $1 AND check_in_time >= $2 AND check_in_time < $3`,
      [employeeId, today, tomorrow]
    );

    if (existingCheckin.rows.length > 0) {
      return res.status(400).json({
        error: 'Already checked in today',
        code: 'ALREADY_CHECKED_IN'
      });
    }

    // Record attendance
    const result = await query(
      `INSERT INTO attendance_records 
       (employee_id, check_in_time, location, geo_fence_status, distance_from_office, check_in_image_url)
       VALUES ($1, NOW(), POINT($2, $3), $4, $5, $6)
       RETURNING id, check_in_time`,
      [
        employeeId,
        location.latitude,
        location.longitude,
        within_fence,
        distance,
        imageData || null
      ]
    );

    // Log geo-fence violation if applicable
    if (!within_fence) {
      await logSecurityEvent({
        employeeId: req.user.employeeId,
        eventType: 'GEOFENCE_VIOLATION',
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
        details: JSON.stringify({
          distance: distance,
          office: office_name,
          location: location
        }),
        severity: 'medium'
      });
    }

    res.json({
      success: true,
      message: 'Check-in successful',
      record: result.rows[0],
      geoFence: {
        withinFence: within_fence,
        distance: distance,
        officeName: office_name
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Check-out endpoint
router.post('/check-out', async (req, res) => {
  try {
    const { location, imageData } = req.body;
    const employeeId = req.user.id;

    // Get today's check-in record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkinResult = await query(
      `SELECT id, check_in_time FROM attendance_records 
       WHERE employee_id = $1 AND check_in_time >= $2 AND check_in_time < $3
       AND check_out_time IS NULL`,
      [employeeId, today, tomorrow]
    );

    if (checkinResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No active check-in found for today',
        code: 'NO_ACTIVE_CHECKIN'
      });
    }

    const checkinRecord = checkinResult.rows[0];
    const checkOutTime = new Date();
    
    // Calculate work hours
    const workHoursMs = checkOutTime - checkinRecord.check_in_time;
    const workHours = new Date(workHoursMs).toISOString().substr(11, 8); // HH:MM:SS

    // Update record
    const result = await query(
      `UPDATE attendance_records 
       SET check_out_time = NOW(), 
           work_hours = $1,
           check_out_image_url = $2,
           location = CASE WHEN $3 IS NOT NULL THEN POINT($4, $5) ELSE location END
       WHERE id = $6
       RETURNING *`,
      [
        workHours,
        imageData || null,
        location ? location.latitude : null,
        location ? location.latitude : null,
        location ? location.longitude : null,
        checkinRecord.id
      ]
    );

    res.json({
      success: true,
      message: 'Check-out successful',
      record: result.rows[0]
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get attendance history
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, employeeId: targetEmployeeId } = req.query;
    const requestingEmployeeId = req.user.id;
    const isSupervisor = req.user.role === 'supervisor' || req.user.role === 'admin';

    let queryText = `
      SELECT ar.*, e.employee_id, e.first_name, e.last_name, e.department
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // Date filter
    if (startDate) {
      paramCount++;
      queryText += ` AND ar.check_in_time >= $${paramCount}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND ar.check_in_time <= $${paramCount}`;
      params.push(new Date(endDate));
    }

    // Employee filter
    if (targetEmployeeId && isSupervisor) {
      paramCount++;
      queryText += ` AND e.employee_id = $${paramCount}`;
      params.push(targetEmployeeId);
    } else if (!isSupervisor) {
      // Regular employees can only see their own records
      paramCount++;
      queryText += ` AND ar.employee_id = $${paramCount}`;
      params.push(requestingEmployeeId);
    }

    // Department filter for supervisors
    if (isSupervisor && req.user.department && !targetEmployeeId) {
      paramCount++;
      queryText += ` AND e.department = $${paramCount}`;
      params.push(req.user.department);
    }

    queryText += ' ORDER BY ar.check_in_time DESC';

    // Pagination
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(queryText, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      WHERE 1=1
    `;
    let countParams = [];
    let countParamCount = 0;

    // Apply same filters
    if (startDate) {
      countParamCount++;
      countQuery += ` AND ar.check_in_time >= $${countParamCount}`;
      countParams.push(new Date(startDate));
    }

    if (endDate) {
      countParamCount++;
      countQuery += ` AND ar.check_in_time <= $${countParamCount}`;
      countParams.push(new Date(endDate));
    }

    if (targetEmployeeId && isSupervisor) {
      countParamCount++;
      countQuery += ` AND e.employee_id = $${countParamCount}`;
      countParams.push(targetEmployeeId);
    } else if (!isSupervisor) {
      countParamCount++;
      countQuery += ` AND ar.employee_id = $${countParamCount}`;
      countParams.push(requestingEmployeeId);
    }

    if (isSupervisor && req.user.department && !targetEmployeeId) {
      countParamCount++;
      countQuery += ` AND e.department = $${countParamCount}`;
      countParams.push(req.user.department);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Attendance history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get attendance statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const employeeId = req.user.id;

    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "check_in_time >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "check_in_time >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "check_in_time >= NOW() - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "check_in_time >= NOW() - INTERVAL '30 days'";
    }

    // Total check-ins
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM attendance_records 
       WHERE employee_id = $1 AND ${dateFilter}`,
      [employeeId]
    );

    // Average work hours
    const avgHoursResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM work_hours)) as avg_seconds 
       FROM attendance_records 
       WHERE employee_id = $1 AND work_hours IS NOT NULL AND ${dateFilter}`,
      [employeeId]
    );

    // Geo-fence compliance
    const geoFenceResult = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN geo_fence_status = TRUE THEN 1 ELSE 0 END) as within_fence
       FROM attendance_records 
       WHERE employee_id = $1 AND ${dateFilter}`,
      [employeeId]
    );

    // Late arrivals (after 9:30 AM)
    const lateArrivalsResult = await query(
      `SELECT COUNT(*) as late_count
       FROM attendance_records 
       WHERE employee_id = $1 AND ${dateFilter}
         AND EXTRACT(HOUR FROM check_in_time) >= 9 
         AND EXTRACT(MINUTE FROM check_in_time) >= 30`,
      [employeeId]
    );

    const stats = {
      totalCheckins: parseInt(totalResult.rows[0].total),
      averageHours: avgHoursResult.rows[0].avg_seconds 
        ? (avgHoursResult.rows[0].avg_seconds / 3600).toFixed(1) 
        : 0,
      geoFenceCompliance: geoFenceResult.rows[0].total > 0 
        ? ((geoFenceResult.rows[0].within_fence / geoFenceResult.rows[0].total) * 100).toFixed(1)
        : 0,
      lateArrivals: parseInt(lateArrivalsResult.rows[0].late_count)
    };

    res.json({
      success: true,
      stats,
      period
    });

  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;