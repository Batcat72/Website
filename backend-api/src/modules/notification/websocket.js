const { query } = require('../../config/database');

/**
 * Setup WebSocket handlers for real-time notifications
 * @param {import('socket.io').Server} io 
 */
function setupWebSocket(io) {
  // Namespace for attendance/notification events
  const attendanceNS = io.of('/');

  // Map to track connected employees: employeeId -> socket
  const connectedEmployees = new Map();

  attendanceNS.on('connection', (socket) => {
    console.log(`🔌 WebSocket client connected: ${socket.id}`);

    // Employee joins their notification room
    socket.on('join', (data) => {
      const { employeeId, token } = data;
      if (employeeId) {
        socket.join(`employee:${employeeId}`);
        connectedEmployees.set(employeeId, socket.id);
        console.log(`👤 Employee ${employeeId} joined notification room`);
        socket.emit('joined', { status: 'connected', employeeId });
      }
    });

    // Supervisor joins the supervisor room for live monitoring
    socket.on('join-supervisor', () => {
      socket.join('supervisors');
      console.log(`🛡️ Supervisor joined monitoring room`);
      socket.emit('joined', { status: 'connected', role: 'supervisor' });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      // Clean up connected employees map
      for (const [empId, socketId] of connectedEmployees.entries()) {
        if (socketId === socket.id) {
          connectedEmployees.delete(empId);
          console.log(`👤 Employee ${empId} disconnected`);
          break;
        }
      }
      console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
    });
  });

  // Helper: emit notification to specific employee
  function notifyEmployee(employeeId, event, data) {
    attendanceNS.to(`employee:${employeeId}`).emit(event, data);
  }

  // Helper: broadcast security alert to all supervisors
  function notifySupervisors(event, data) {
    attendanceNS.to('supervisors').emit(event, data);
  }

  // Expose helpers globally through io for use in routes
  io.notifyEmployee = notifyEmployee;
  io.notifySupervisors = notifySupervisors;

  console.log('📡 WebSocket handler initialized');
}

module.exports = { setupWebSocket };
