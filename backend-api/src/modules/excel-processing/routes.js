const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');

// GET /api/excel/attendance - Download attendance data as JSON (ready for Excel export)
router.get('/attendance', async (req, res) => {
  try {
    const { start_date, end_date, department } = req.query;

    let queryText = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        e.department,
        a.check_in_time,
        a.check_out_time,
        a.status,
        a.location,
        DATE(a.check_in_time) as date
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      queryText += ` AND DATE(a.check_in_time) >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      queryText += ` AND DATE(a.check_in_time) <= $${paramCount}`;
      params.push(end_date);
    }

    if (department) {
      paramCount++;
      queryText += ` AND e.department = $${paramCount}`;
      params.push(department);
    }

    queryText += ' ORDER BY e.employee_id, a.check_in_time DESC';

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Excel attendance export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export attendance data' });
  }
});

// GET /api/excel/leave - Download leave data as JSON (ready for Excel export)
router.get('/leave', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let queryText = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        e.department,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.status,
        l.reason,
        l.created_at
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      queryText += ` AND l.start_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      queryText += ` AND l.end_date <= $${paramCount}`;
      params.push(end_date);
    }

    queryText += ' ORDER BY l.created_at DESC';

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Excel leave export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export leave data' });
  }
});

// POST /api/excel/upload - Upload employee data via Excel (JSON format)
router.post('/upload', async (req, res) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid employee data' });
    }

    const results = { inserted: 0, skipped: 0, errors: [] };

    for (const emp of employees) {
      try {
        await query(
          `INSERT INTO employees (employee_id, first_name, last_name, department, email, role)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (employee_id) DO NOTHING`,
          [emp.employee_id, emp.first_name, emp.last_name, emp.department, emp.email, emp.role || 'employee']
        );
        results.inserted++;
      } catch (err) {
        results.skipped++;
        results.errors.push({ employee_id: emp.employee_id, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to process upload' });
  }
});

module.exports = router;
