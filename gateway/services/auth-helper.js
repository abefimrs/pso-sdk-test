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
   * @param {string} timestamp - GMT timestamp
   * @param {string} host - Gateway host with protocol (e.g., http://192.168.169.162:8094)
   * @param {string} targetApi - API method and path (e.g., POST /p/service/api/payment/processing/payment-order)
   * @param {string} merchantId - Merchant ID
   * @param {string} apiKey - API Key
   * @param {string} apiSecret - API Secret (used for HMAC)
   * @returns {string} - HMAC-SHA256 signature (base64)
   */
  generateSignature(timestamp, host, targetApi, merchantId, apiKey, apiSecret) {
    // Create signature string: timestamp|host|targetApi|merchantId|apiKey
    const signatureString = `${timestamp}|${host}|${targetApi}|${merchantId}|${apiKey}`;
    
    // Generate HMAC-SHA256 signature and encode as base64
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signatureString)
      .digest('base64');
    
    return signature;
  }

  /**
   * Generate SHA256 digest of request body
   * 
   * @param {Object} requestBody - Request body object
   * @returns {string} - SHA256 hash with SHA-256= prefix (base64)
   */
  generateDigest(requestBody) {
    // Convert request body to JSON string
    const bodyString = JSON.stringify(requestBody);
    
    // Generate SHA256 hash and encode as base64
    const digest = crypto
      .createHash('sha256')
      .update(bodyString)
      .digest('base64');
    
    return `SHA-256=${digest}`;
  }

  /**
   * Generate all required headers for gateway API authentication
   * 
   * @param {string} targetApi - API endpoint path (e.g., /p/service/api/payment/processing/payment-order)
   * @param {Object} requestBody - Request body object
   * @param {Object} config - Configuration object with credentials
   * @returns {Object} - Headers object with all required authentication headers
   */
  generateGatewayHeaders(targetApi, requestBody, config) {
    // Generate GMT timestamp (e.g., "Mon, 09 Feb 2026 07:47:49 GMT")
    const timestamp = new Date().toUTCString();
    
    // Extract configuration
    const baseHost = config.host || 'api-stage.tnextpay.com';
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

    // Build host with protocol (e.g., "http://192.168.169.162:8094")
    let host;
    if (baseHost.startsWith('http://') || baseHost.startsWith('https://')) {
      host = baseHost;
    } else {
      // Default to https for domain names, http for IP addresses
      const isLocalIp = /^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(baseHost);
      host = isLocalIp ? `http://${baseHost}` : `https://${baseHost}`;
    }

    // Build target API with method (e.g., "POST /p/service/api/payment/processing/payment-order")
    const targetApiWithMethod = `POST ${targetApi}`;

    // Generate signature and digest
    const signature = this.generateSignature(
      timestamp,
      host,
      targetApiWithMethod,
      merchantId,
      apiKey,
      apiSecret
    );
    const digest = this.generateDigest(requestBody);

    // Return headers object
    return {
      'X-TNPG-TIMESTAMP': timestamp,
      'X-TNPG-HOST': host,
      'X-TNPG-TARGET-API': targetApiWithMethod,
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
