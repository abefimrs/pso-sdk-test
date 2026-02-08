/**
 * Signature Service
 * Generates and validates request signatures for security
 */

const crypto = require('crypto');
const config = require('../config/config');

class SignatureService {
  /**
   * Generate signature for a payload
   * @param {Object} payload - Data to sign
   * @returns {string} - Generated signature
   */
  generateSignature(payload) {
    // Convert payload to string (sorted keys for consistency)
    const dataString = this.stringifyPayload(payload);
    
    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', config.security.jwtSecret);
    hmac.update(dataString);
    
    return hmac.digest('hex');
  }

  /**
   * Validate signature
   * @param {Object} payload - Data to validate
   * @param {string} signature - Signature to check
   * @returns {boolean} - Whether signature is valid
   */
  validateSignature(payload, signature) {
    const expectedSignature = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Stringify payload with sorted keys
   * @param {Object} payload - Object to stringify
   * @returns {string} - Stringified payload
   */
  stringifyPayload(payload) {
    // Sort keys recursively
    const sortedPayload = this.sortKeys(payload);
    return JSON.stringify(sortedPayload);
  }

  /**
   * Recursively sort object keys
   * @param {*} obj - Object to sort
   * @returns {*} - Sorted object
   */
  sortKeys(obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }

    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortKeys(obj[key]);
    });

    return sorted;
  }

  /**
   * Generate unique order ID
   * @returns {string} - UUID
   */
  generateOrderId() {
    return crypto.randomUUID();
  }

  /**
   * Generate session token
   * @param {Object} data - Data to include in token
   * @returns {string} - JWT token
   */
  generateSessionToken(data) {
    const payload = {
      ...data,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };

    // Simple JWT encoding (for production, use a proper JWT library)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.security.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verify session token
   * @param {string} token - JWT token
   * @returns {Object|null} - Decoded payload or null if invalid
   */
  verifySessionToken(token) {
    try {
      const [header, body, signature] = token.split('.');
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', config.security.jwtSecret)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new SignatureService();
