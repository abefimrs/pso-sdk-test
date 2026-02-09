/**
 * Authentication Helper Service
 * Handles signature and digest generation for Payment Gateway API authentication
 * 
 * Authentication is performed via HTTP Headers:
 * - X-TNPG-TIMESTAMP: ISO 8601 timestamp
 * - X-TNPG-HOST: Gateway host (e.g., api-stage.tnextpay.com)
 * - X-TNPG-TARGET-API: Full API endpoint path
 * - X-TNPG-MERCHANT-ID: Merchant identifier
 * - X-TNPG-API-KEY: API key (public identifier)
 * - X-TNPG-SIGNATURE: HMAC-SHA256 signature
 * - X-TNPG-DIGEST: SHA256 hash of request body
 */

const crypto = require('crypto');

class AuthHelper {
  /**
   * Generate HMAC-SHA256 signature for gateway authentication
   * 
   * @param {string} timestamp - ISO 8601 timestamp
   * @param {string} host - Gateway host (e.g., api-stage.tnextpay.com)
   * @param {string} targetApi - Full API endpoint path
   * @param {string} merchantId - Merchant ID
   * @param {string} apiKey - API Key
   * @param {string} apiSecret - API Secret (used for HMAC)
   * @returns {string} - HMAC-SHA256 signature (hex)
   */
  generateSignature(timestamp, host, targetApi, merchantId, apiKey, apiSecret) {
    // Create signature string: timestamp|host|targetApi|merchantId|apiKey
    const signatureString = `${timestamp}|${host}|${targetApi}|${merchantId}|${apiKey}`;
    
    // Generate HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signatureString)
      .digest('hex');
    
    return signature;
  }

  /**
   * Generate SHA256 digest of request body
   * 
   * @param {Object} requestBody - Request body object
   * @returns {string} - SHA256 hash (hex)
   */
  generateDigest(requestBody) {
    // Convert request body to JSON string
    const bodyString = JSON.stringify(requestBody);
    
    // Generate SHA256 hash
    const digest = crypto
      .createHash('sha256')
      .update(bodyString)
      .digest('hex');
    
    return digest;
  }

  /**
   * Generate all required headers for gateway API authentication
   * 
   * @param {string} targetApi - Full API endpoint path
   * @param {Object} requestBody - Request body object
   * @param {Object} config - Configuration object with credentials
   * @returns {Object} - Headers object with all required authentication headers
   */
  generateGatewayHeaders(targetApi, requestBody, config) {
    // Generate ISO 8601 timestamp
    const timestamp = new Date().toISOString();
    
    // Extract configuration
    const host = config.host || 'api-stage.tnextpay.com';
    const merchantId = config.merchantId;
    const apiKey = config.apiKey;
    const apiSecret = config.apiSecret;

    // Validate required configuration
    if (!merchantId) {
      throw new Error('MERCHANT_ID is required for gateway authentication');
    }
    if (!apiKey) {
      throw new Error('API_KEY is required for gateway authentication');
    }
    if (!apiSecret) {
      throw new Error('API_SECRET is required for gateway authentication');
    }

    // Generate signature and digest
    const signature = this.generateSignature(
      timestamp,
      host,
      targetApi,
      merchantId,
      apiKey,
      apiSecret
    );
    const digest = this.generateDigest(requestBody);

    // Return headers object
    return {
      'X-TNPG-TIMESTAMP': timestamp,
      'X-TNPG-HOST': host,
      'X-TNPG-TARGET-API': targetApi,
      'X-TNPG-MERCHANT-ID': merchantId,
      'X-TNPG-API-KEY': apiKey,
      'X-TNPG-SIGNATURE': signature,
      'X-TNPG-DIGEST': digest,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate timestamp to prevent replay attacks
   * 
   * @param {string} timestamp - ISO 8601 timestamp to validate
   * @param {number} maxAgeSeconds - Maximum age in seconds (default: 300 = 5 minutes)
   * @returns {boolean} - Whether timestamp is valid
   */
  validateTimestamp(timestamp, maxAgeSeconds = 300) {
    try {
      const requestTime = new Date(timestamp).getTime();
      const currentTime = Date.now();
      const ageSeconds = (currentTime - requestTime) / 1000;
      
      return ageSeconds >= 0 && ageSeconds <= maxAgeSeconds;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate signature for incoming requests
   * 
   * @param {Object} headers - Request headers
   * @param {Object} requestBody - Request body
   * @param {string} apiSecret - API Secret for validation
   * @returns {boolean} - Whether signature is valid
   */
  validateSignature(headers, requestBody, apiSecret) {
    try {
      const {
        'x-tnpg-timestamp': timestamp,
        'x-tnpg-host': host,
        'x-tnpg-target-api': targetApi,
        'x-tnpg-merchant-id': merchantId,
        'x-tnpg-api-key': apiKey,
        'x-tnpg-signature': providedSignature,
        'x-tnpg-digest': providedDigest
      } = headers;

      // Validate all required headers are present
      if (!timestamp || !host || !targetApi || !merchantId || !apiKey || !providedSignature || !providedDigest) {
        return false;
      }

      // Validate timestamp
      if (!this.validateTimestamp(timestamp)) {
        return false;
      }

      // Generate expected signature
      const expectedSignature = this.generateSignature(
        timestamp,
        host,
        targetApi,
        merchantId,
        apiKey,
        apiSecret
      );

      // Generate expected digest
      const expectedDigest = this.generateDigest(requestBody);

      // Compare signatures using timing-safe comparison
      let signatureValid = false;
      try {
        signatureValid = crypto.timingSafeEqual(
          Buffer.from(providedSignature),
          Buffer.from(expectedSignature)
        );
      } catch (error) {
        // Buffer lengths don't match, signatures are different
        signatureValid = false;
      }

      // Compare digests using timing-safe comparison
      let digestValid = false;
      try {
        digestValid = crypto.timingSafeEqual(
          Buffer.from(providedDigest),
          Buffer.from(expectedDigest)
        );
      } catch (error) {
        // Buffer lengths don't match, digests are different
        digestValid = false;
      }

      return signatureValid && digestValid;
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }
}

module.exports = new AuthHelper();
