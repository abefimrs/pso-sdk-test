/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for payment creation
 * Allows 10 requests per minute per IP
 */
const paymentCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: {
    success: false,
    message: 'Too many payment requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for payment verification
 * Allows 20 requests per minute per IP
 */
const paymentVerificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window
  message: {
    success: false,
    message: 'Too many verification requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for IPN callbacks
 * Allows 50 requests per minute per IP
 */
const ipnLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per window
  message: {
    success: false,
    message: 'Too many IPN requests',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Allows 100 requests per minute per IP
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  paymentCreationLimiter,
  paymentVerificationLimiter,
  ipnLimiter,
  generalLimiter
};
