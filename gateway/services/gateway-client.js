/**
 * Payment Gateway API Client
 * Handles communication with the real payment gateway API
 */

const axios = require('axios');
const config = require('../config/config');

class GatewayClient {
  constructor() {
    this.baseUrl = config.gateway.baseUrl;
    this.username = config.gateway.username;
    this.password = config.gateway.password;
    this.signature = config.gateway.signature;
    this.merchantCode = config.gateway.merchantCode;
  }

  /**
   * Get authentication object for API requests
   */
  getAuthPayload() {
    return {
      security: {
        username: this.username,
        password: this.password
      },
      signature: this.signature
    };
  }

  /**
   * Create a payment order
   * @param {Object} orderData - Payment order details
   * @returns {Promise<Object>} - Gateway response
   */
  async createPaymentOrder(orderData) {
    const endpoint = `${this.baseUrl}${config.gateway.endpoints.createOrder}`;
    
    const payload = {
      ...this.getAuthPayload(),
      order_id: orderData.orderId,
      order_information: {
        payable_amount: orderData.amount,
        currency_code: orderData.currency || 'BDT'
      },
      ipn_url: orderData.ipnUrl,
      success_url: orderData.successUrl,
      cancel_url: orderData.cancelUrl,
      failure_url: orderData.failureUrl,
      promotion_information: orderData.promotionInfo || {},
      discount_detail: orderData.discountDetail || {},
      mdf_1: orderData.customFields?.mdf_1 || '',
      mdf_2: orderData.customFields?.mdf_2 || '',
      mdf_3: orderData.customFields?.mdf_3 || '',
      mdf_4: orderData.customFields?.mdf_4 || '',
      mdf_5: orderData.customFields?.mdf_5 || '',
      mdf_6: orderData.customFields?.mdf_6 || '',
      customer_information: orderData.customerInfo || {},
      product_information: orderData.productInfo || {},
      shipment_information: orderData.shipmentInfo || {}
    };

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Gateway API Error (Create Order):', error.response?.data || error.message);
      
      if (error.response) {
        return {
          success: false,
          error: {
            statusCode: error.response.status,
            statusText: error.response.statusText,
            message: error.response.data?.message || 'Unknown error',
            reason: error.response.data?.reason || error.response.statusText
          }
        };
      }
      
      return {
        success: false,
        error: {
          statusCode: 500,
          statusText: 'NETWORK_ERROR',
          message: 'Failed to connect to payment gateway',
          reason: error.message
        }
      };
    }
  }

  /**
   * Verify a payment
   * @param {Object} verificationData - Verification details
   * @returns {Promise<Object>} - Gateway response
   */
  async verifyPayment(verificationData) {
    const endpoint = `${this.baseUrl}${config.gateway.endpoints.verify}`;
    
    const payload = {
      ...this.getAuthPayload(),
      order_id: verificationData.orderId,
      order_tracking_id: verificationData.orderTrackingId,
      merchant_code: this.merchantCode
    };

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Gateway API Error (Verify Payment):', error.response?.data || error.message);
      
      if (error.response) {
        return {
          success: false,
          error: {
            statusCode: error.response.status,
            statusText: error.response.statusText,
            message: error.response.data?.message || 'Verification failed',
            reason: error.response.data?.reason || error.response.statusText
          }
        };
      }
      
      return {
        success: false,
        error: {
          statusCode: 500,
          statusText: 'NETWORK_ERROR',
          message: 'Failed to verify payment',
          reason: error.message
        }
      };
    }
  }

  /**
   * Inquire payment status
   * @param {Object} inquiryData - Inquiry details
   * @returns {Promise<Object>} - Gateway response
   */
  async inquirePayment(inquiryData) {
    const endpoint = `${this.baseUrl}${config.gateway.endpoints.inquiry}`;
    
    const payload = {
      ...this.getAuthPayload(),
      order_id: inquiryData.orderId,
      merchant_code: this.merchantCode
    };

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Gateway API Error (Inquiry):', error.response?.data || error.message);
      
      if (error.response) {
        return {
          success: false,
          error: {
            statusCode: error.response.status,
            statusText: error.response.statusText,
            message: error.response.data?.message || 'Inquiry failed',
            reason: error.response.data?.reason || error.response.statusText
          }
        };
      }
      
      return {
        success: false,
        error: {
          statusCode: 500,
          statusText: 'NETWORK_ERROR',
          message: 'Failed to inquire payment status',
          reason: error.message
        }
      };
    }
  }

  /**
   * Parse payment status from status code
   * @param {string} statusCode - Status code from gateway
   * @returns {string} - Normalized status
   */
  parsePaymentStatus(statusCode) {
    const statusMap = {
      '1002': 'APPROVED',
      '1003': 'DECLINED',
      '1004': 'CANCELLED',
      '1005': 'FAILED'
    };
    
    return statusMap[statusCode] || 'UNKNOWN';
  }
}

module.exports = new GatewayClient();
