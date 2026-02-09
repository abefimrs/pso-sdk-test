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
   * Show payment form (opens gateway in popup)
   */
  async showPaymentForm(options = {}) {
    this.validatePaymentOptions(options);

    const paymentOptions = {
      orderId: options.orderId || this.generateOrderId(),
      amount: options.amount,
      currency: options.currency || 'BDT',
      customerInfo: options.customerInfo || {},
      productInfo: options.productInfo || {},
      promotionInfo: options.promotionInfo,
      discountDetail: options.discountDetail,
      ipnUrl: options.ipnUrl,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      failureUrl: options.failureUrl,
      customFields: options.customFields || {},
      onSuccess: options.onSuccess,
      onError: options.onError,
      onCancel: options.onCancel,
      metadata: options.metadata || {}
    };

    if (this.config.debug) {
      console.log('[PSO SDK] Creating payment order:', paymentOptions);
    }

    try {
      // Create payment order and get gateway URL
      const orderResult = await this.createPaymentOrder(paymentOptions);
      
      if (orderResult.success && orderResult.gatewayPageUrl) {
        // Open gateway URL in popup
        this.popup.show({
          gatewayUrl: orderResult.gatewayPageUrl,
          transactionId: orderResult.transactionId,
          sessionId: orderResult.sessionId,
          onSuccess: paymentOptions.onSuccess,
          onError: paymentOptions.onError,
          onCancel: paymentOptions.onCancel
        });
      } else {
        throw new Error(orderResult.message || 'Failed to create payment order');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[PSO SDK] Payment initialization failed:', error);
      }
      if (paymentOptions.onError) {
        paymentOptions.onError(error);
      }
      throw error;
    }
  }

  /**
   * Create payment order with gateway
   */
  async createPaymentOrder(options) {
    const gatewayUrl = this.config.environment === 'production'
      ? this.config.gatewayUrl || 'https://api.pso-gateway.com'
      : this.config.gatewayUrl || 'http://localhost:3000';

    try {
      // Build request body matching exact API specification
      const requestBody = {
        order_id: options.orderId,
        order_information: {
          payable_amount: parseFloat(options.amount),
          currency_code: options.currency
        },
        customer_information: options.customerInfo,
        product_information: options.productInfo,
        ipn_url: options.ipnUrl,
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        failure_url: options.failureUrl
      };

      // Add optional fields if provided
      if (options.promotionInfo) {
        requestBody.promotion_information = options.promotionInfo;
      }
      if (options.discountDetail) {
        requestBody.discount_detail = options.discountDetail;
      }
      if (options.customFields) {
        Object.assign(requestBody, options.customFields);
      }

      // Gateway proxy will add TNPG authentication headers:
      // X-TNPG-TIMESTAMP, X-TNPG-HOST, X-TNPG-TARGET-API,
      // X-TNPG-MERCHANT-ID, X-TNPG-API-KEY, X-TNPG-SIGNATURE, X-TNPG-DIGEST
      const response = await fetch(`${gatewayUrl}/payment/api/v1/p/service/api/payment/processing/payment-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': this.config.merchantId
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const result = await response.json();
      
      // Parse response according to API specification
      // Response contains: order_detail, gateway_page_url, token_response
      if (this.config.debug) {
        console.log('[PSO SDK] Payment order created:', result);
      }
      
      return result;
    } catch (error) {
      if (this.config.debug) {
        console.error('[PSO SDK] Payment order creation failed:', error);
      }
      throw error;
    }
  }

  /**
   * Generate unique order ID
   */
  generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Validate payment options
   */
  validatePaymentOptions(options) {
    if (!options.amount || typeof options.amount !== 'number' || options.amount <= 0) {
      throw new Error('PSOPayment: amount must be a positive number');
    }

    if (options.currency && typeof options.currency !== 'string') {
      throw new Error('PSOPayment: currency must be a string');
    }
  }

  /**
   * Verify payment status
   */
  async verifyPaymentStatus(paymentOrderId) {
    const gatewayUrl = this.config.environment === 'production'
      ? this.config.gatewayUrl || 'https://api.pso-gateway.com'
      : this.config.gatewayUrl || 'http://localhost:3000';

    try {
      // Gateway proxy will add TNPG authentication headers
      const response = await fetch(`${gatewayUrl}/payment/api/v1/p/service/api/payment/processing/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': this.config.merchantId
        },
        body: JSON.stringify({
          paymentOrderId: paymentOrderId
        })
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
