/**
 * Configuration Module
 * Loads and validates environment configuration
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  // Server Configuration
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // Gateway API Configuration
  gateway: {
    baseUrl: process.env.GATEWAY_BASE_URL || 'https://api-stage.tnextpay.com',
    username: process.env.GATEWAY_USERNAME || '',
    password: process.env.GATEWAY_PASSWORD || '',
    signature: process.env.GATEWAY_SIGNATURE || '',
    merchantCode: process.env.MERCHANT_CODE || '',
    
    // Endpoints
    endpoints: {
      createOrder: process.env.PAYMENT_ORDER_ENDPOINT || '/payment/api/v1/p/service/api/payment/processing/payment-order',
      verify: process.env.PAYMENT_VERIFY_ENDPOINT || '/payment/api/v1/p/service/api/payment/processing/verify',
      inquiry: process.env.PAYMENT_INQUIRY_ENDPOINT || '/payment/api/v1/p/service/api/payment/processing/inquiry'
    }
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:8000', 'http://127.0.0.1:8000']
  },
  
  // Database
  database: {
    path: process.env.DB_PATH || './data/transactions.db'
  },
  
  // Validate configuration
  validate() {
    const errors = [];
    
    if (this.env === 'production') {
      if (!this.gateway.username) errors.push('GATEWAY_USERNAME is required in production');
      if (!this.gateway.password) errors.push('GATEWAY_PASSWORD is required in production');
      if (!this.gateway.signature) errors.push('GATEWAY_SIGNATURE is required in production');
      if (!this.gateway.merchantCode) errors.push('MERCHANT_CODE is required in production');
      if (this.security.jwtSecret === 'change-this-secret-in-production') {
        errors.push('JWT_SECRET must be changed in production');
      }
    }
    
    if (errors.length > 0) {
      console.error('Configuration errors:');
      errors.forEach(err => console.error(`  - ${err}`));
      if (this.env === 'production') {
        throw new Error('Invalid configuration for production environment');
      } else {
        console.warn('⚠️  Configuration warnings (OK for development)');
      }
    }
    
    return true;
  }
};

// Validate on load
config.validate();

module.exports = config;
