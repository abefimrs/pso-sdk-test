/**
 * PSO Payment SDK
 * Main SDK class for payment gateway integration
 */

import { PaymentPopup } from './popup.js';
import './styles.css';

class PSOPayment {
  constructor(config = {}) {
    this.validateConfig(config);
    
    this.config = {
      merchantId: config.merchantId,
      environment: config.environment || 'test',
      gatewayUrl: config.gatewayUrl,
      theme: config.theme || {},
      debug: config.debug || false
    };

    this.popup = new PaymentPopup(this.config);
    
    if (this.config.debug) {
      console.log('[PSO SDK] Initialized with config:', this.config);
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    if (!config.merchantId) {
      throw new Error('PSOPayment: merchantId is required');
    }

    if (config.environment && !['test', 'production'].includes(config.environment)) {
      throw new Error('PSOPayment: environment must be "test" or "production"');
    }

    // Enforce HTTPS in production
    if (config.environment === 'production' && window.location.protocol !== 'https:') {
      console.warn('[PSO SDK] Warning: HTTPS is required for production environment');
    }
  }

  /**
   * Show payment form
   */
  showPaymentForm(options = {}) {
    this.validatePaymentOptions(options);

    const paymentOptions = {
      amount: options.amount,
      currency: options.currency || 'USD',
      onSuccess: options.onSuccess,
      onError: options.onError,
      onCancel: options.onCancel,
      metadata: options.metadata || {}
    };

    this.popup.show(paymentOptions);

    if (this.config.debug) {
      console.log('[PSO SDK] Showing payment form:', paymentOptions);
    }
  }

  /**
   * Validate payment options
   */
  validatePaymentOptions(options) {
    if (!options.amount || typeof options.amount !== 'number' || options.amount <= 0) {
      throw new Error('PSOPayment: amount must be a positive number (in cents)');
    }

    if (options.currency && typeof options.currency !== 'string') {
      throw new Error('PSOPayment: currency must be a string');
    }
  }

  /**
   * Close payment form
   */
  closePaymentForm() {
    this.popup.close();
  }

  /**
   * Get SDK version
   */
  static get version() {
    return '1.0.0';
  }

  /**
   * Create a payment token (for advanced integrations)
   */
  async createPaymentToken(cardData) {
    const gatewayUrl = this.config.environment === 'production'
      ? this.config.gatewayUrl || 'https://api.pso-gateway.com'
      : this.config.gatewayUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${gatewayUrl}/api/tokens/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-ID': this.config.merchantId
        },
        body: JSON.stringify(cardData)
      });

      if (!response.ok) {
        throw new Error('Failed to create payment token');
      }

      return await response.json();
    } catch (error) {
      if (this.config.debug) {
        console.error('[PSO SDK] Token creation failed:', error);
      }
      throw error;
    }
  }

  /**
   * Verify a payment
   */
  async verifyPayment(transactionId) {
    const gatewayUrl = this.config.environment === 'production'
      ? this.config.gatewayUrl || 'https://api.pso-gateway.com'
      : this.config.gatewayUrl || 'http://localhost:3000';

    try {
      const response = await fetch(`${gatewayUrl}/api/payments/verify/${transactionId}`, {
        method: 'GET',
        headers: {
          'X-Merchant-ID': this.config.merchantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      return await response.json();
    } catch (error) {
      if (this.config.debug) {
        console.error('[PSO SDK] Payment verification failed:', error);
      }
      throw error;
    }
  }
}

// Export for different module systems
export default PSOPayment;

// Also attach to window for script tag usage
if (typeof window !== 'undefined') {
  window.PSOPayment = PSOPayment;
}
