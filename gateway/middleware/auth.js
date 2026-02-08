/**
 * Authentication Middleware
 * Validates merchant authentication for API requests
 */

const signatureService = require('../services/signature');

/**
 * Validate merchant ID header
 */
function validateMerchant(req, res, next) {
  const merchantId = req.headers['x-merchant-id'];

  if (!merchantId) {
    return res.status(401).json({
      success: false,
      message: 'Merchant ID is required',
      error: 'MISSING_MERCHANT_ID'
    });
  }

  // Store merchant ID in request for later use
  req.merchantId = merchantId;
  next();
}

/**
 * Validate request signature (optional, for enhanced security)
 */
function validateSignature(req, res, next) {
  const signature = req.headers['x-signature'];

  if (!signature) {
    // Signature is optional in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Request signature is required',
      error: 'MISSING_SIGNATURE'
    });
  }

  try {
    const isValid = signatureService.validateSignature(req.body, signature);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid request signature',
        error: 'INVALID_SIGNATURE'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Signature validation failed',
      error: 'SIGNATURE_VALIDATION_ERROR'
    });
  }
}

/**
 * Validate session token
 */
function validateSessionToken(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Session token is required',
      error: 'MISSING_TOKEN'
    });
  }

  const payload = signatureService.verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token',
      error: 'INVALID_TOKEN'
    });
  }

  req.session = payload;
  next();
}

module.exports = {
  validateMerchant,
  validateSignature,
  validateSessionToken
};
