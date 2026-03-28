const { logSystemEvent } = require('../modules/security-monitoring/securityLogger');

function logRequest(req, res, next) {
  const startTime = Date.now();
  
  // Capture response data
  const originalSend = res.send;
  res.send = function(body) {
    res.responseBody = body;
    return originalSend.call(this, body);
  };
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Skip logging for health checks and static files
    if (req.path === '/health' || req.path.startsWith('/static/')) {
      return;
    }
    
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user ? req.user.id : null,
      employeeId: req.user ? req.user.employeeId : null
    };
    
    // Log to system
    logSystemEvent({
      serviceName: 'backend-api',
      logLevel: res.statusCode >= 500 ? 'error' : 
                res.statusCode >= 400 ? 'warn' : 'info',
      message: `${req.method} ${req.url} ${res.statusCode}`, 
      metadata: logData
    });
    
    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logData.timestamp}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    }
  });
  
  next();
}

module.exports = { logRequest };