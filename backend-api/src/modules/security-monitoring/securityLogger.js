const { query } = require('../../config/database');

async function logSecurityEvent(eventData) {
  try {
    const {
      employeeId,
      eventType,
      ipAddress,
      deviceInfo,
      details,
      severity = 'medium'
    } = eventData;

    // Get employee ID if employeeId is provided
    let employeeIdNum = null;
    if (employeeId) {
      const empResult = await query(
        'SELECT id FROM employees WHERE employee_id = $1',
        [employeeId]
      );
      if (empResult.rows.length > 0) {
        employeeIdNum = empResult.rows[0].id;
      }
    }

    await query(
      `INSERT INTO security_events 
       (employee_id, event_type, ip_address, device_info, details, severity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [employeeIdNum, eventType, ipAddress, deviceInfo, details, severity]
    );

    console.log(`Security event logged: ${eventType} for employee ${employeeId}`);

  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

async function logSystemEvent(eventData) {
  try {
    const {
      serviceName,
      logLevel,
      message,
      metadata = null
    } = eventData;

    await query(
      `INSERT INTO system_logs 
       (service_name, log_level, message, metadata)
       VALUES ($1, $2, $3, $4)`,
      [serviceName, logLevel, message, metadata]
    );

  } catch (error) {
    console.error('Failed to log system event:', error);
  }
}

async function getSecurityEvents(filters = {}) {
  try {
    let queryText = `
      SELECT se.*, e.employee_id, e.first_name, e.last_name
      FROM security_events se
      LEFT JOIN employees e ON se.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (filters.employeeId) {
      paramCount++;
      queryText += ` AND e.employee_id = $${paramCount}`;
      params.push(filters.employeeId);
    }

    if (filters.eventType) {
      paramCount++;
      queryText += ` AND se.event_type = $${paramCount}`;
      params.push(filters.eventType);
    }

    if (filters.startDate) {
      paramCount++;
      queryText += ` AND se.timestamp >= $${paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      queryText += ` AND se.timestamp <= $${paramCount}`;
      params.push(filters.endDate);
    }

    if (filters.severity) {
      paramCount++;
      queryText += ` AND se.severity = $${paramCount}`;
      params.push(filters.severity);
    }

    queryText += ' ORDER BY se.timestamp DESC';

    if (filters.limit) {
      paramCount++;
      queryText += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await query(queryText, params);
    return result.rows;

  } catch (error) {
    console.error('Failed to fetch security events:', error);
    throw error;
  }
}

async function getSecurityStats(timeRange = '24h') {
  try {
    let timeFilter = '';
    switch (timeRange) {
      case '24h':
        timeFilter = "timestamp >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeFilter = "timestamp >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        timeFilter = "timestamp >= NOW() - INTERVAL '30 days'";
        break;
      default:
        timeFilter = "timestamp >= NOW() - INTERVAL '24 hours'";
    }

    // Total events
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM security_events WHERE ${timeFilter}`
    );

    // Events by type
    const typeResult = await query(
      `SELECT event_type, COUNT(*) as count 
       FROM security_events 
       WHERE ${timeFilter}
       GROUP BY event_type 
       ORDER BY count DESC`
    );

    // Events by severity
    const severityResult = await query(
      `SELECT severity, COUNT(*) as count 
       FROM security_events 
       WHERE ${timeFilter}
       GROUP BY severity 
       ORDER BY severity`
    );

    // Top employees with security events
    const topEmployeesResult = await query(
      `SELECT e.employee_id, e.first_name, e.last_name, COUNT(*) as count
       FROM security_events se
       JOIN employees e ON se.employee_id = e.id
       WHERE ${timeFilter}
       GROUP BY e.id, e.employee_id, e.first_name, e.last_name
       ORDER BY count DESC
       LIMIT 10`
    );

    return {
      total: parseInt(totalResult.rows[0].count),
      byType: typeResult.rows,
      bySeverity: severityResult.rows,
      topEmployees: topEmployeesResult.rows
    };

  } catch (error) {
    console.error('Failed to fetch security stats:', error);
    throw error;
  }
}

module.exports = {
  logSecurityEvent,
  logSystemEvent,
  getSecurityEvents,
  getSecurityStats
};