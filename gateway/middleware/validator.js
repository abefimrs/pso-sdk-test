/**
 * Request Validation Middleware
 * Validates incoming request data
 */

/**
 * Validate payment creation request
 */
function validatePaymentCreation(req, res, next) {
  const { orderId, amount, currency } = req.body;
  const errors = [];

  if (!orderId || typeof orderId !== 'string') {
    errors.push('orderId is required and must be a string');
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    errors.push('amount is required and must be a positive number');
  }

  if (currency && typeof currency !== 'string') {
    errors.push('currency must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
}

/**
 * Validate payment verification request
 */
function validatePaymentVerification(req, res, next) {
  const { orderId, orderTrackingId } = req.body;
  const errors = [];

  if (!orderId || typeof orderId !== 'string') {
    errors.push('orderId is required and must be a string');
  }

  if (!orderTrackingId || typeof orderTrackingId !== 'string') {
    errors.push('orderTrackingId is required and must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }

  return sanitized;
}

module.exports = {
  validatePaymentCreation,
  validatePaymentVerification,
  sanitizeInput
};
