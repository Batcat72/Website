const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');

// GET /api/notifications - Get notifications for authenticated employee
router.get('/', async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { limit = 20, offset = 0, unread_only } = req.query;

    let queryText = `
      SELECT * FROM notifications
      WHERE employee_id = $1
    `;
    const params = [employeeId];
    let paramCount = 1;

    if (unread_only === 'true') {
      queryText += ` AND is_read = false`;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get unread count
    const unreadResult = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE employee_id = $1 AND is_read = false`,
      [employeeId]
    );

    res.json({
      success: true,
      data: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count)
    });
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND employee_id = $2`,
      [id, employeeId]
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', async (req, res) => {
  try {
    const employeeId = req.user.id;

    await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE employee_id = $1 AND is_read = false`,
      [employeeId]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

module.exports = router;
