/**
 * Real Payment Gateway Routes
 * API endpoints for payment processing with real gateway integration
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const gatewayClient = require('../services/gateway-client');
const signatureService = require('../services/signature');
const transactionStore = require('../models/transaction');
const { validateMerchant } = require('../middleware/auth');
const { validatePaymentCreation, validatePaymentVerification, sanitizeInput } = require('../middleware/validator');
const { paymentCreationLimiter, paymentVerificationLimiter, ipnLimiter } = require('../middleware/rate-limit');

/**
 * Create Payment Order
 * POST /api/payment/create
 * 
 * Accepts payment details from SDK, adds credentials, and calls real gateway API
 */
router.post('/create',
  paymentCreationLimiter,
  validateMerchant,
  sanitizeInput,
  validatePaymentCreation,
  async (req, res) => {
    try {
      // Accept both SDK format and direct API format
      const {
        order_id,
        order_information,
        customer_information,
        product_information,
        promotion_information,
        discount_detail,
        shipment_information,
        ipn_url,
        success_url,
        cancel_url,
        failure_url,
        mdf_1, mdf_2, mdf_3, mdf_4, mdf_5, mdf_6
      } = req.body;

      const orderId = order_id;
      const amount = order_information?.payable_amount;
      const currency = order_information?.currency_code;

      console.log(`[Payment Create] Merchant: ${req.merchantId}, Order: ${orderId}`);

      // Prepare order data for gateway using exact API specification
      const orderData = {
        orderId,
        amount,
        currency: currency || 'BDT',
        customerInfo: customer_information || {},
        productInfo: product_information || {},
        ipnUrl: ipn_url || `${req.protocol}://${req.get('host')}/api/payment/ipn`,
        successUrl: success_url || `${req.protocol}://${req.get('host')}/payment/success`,
        cancelUrl: cancel_url || `${req.protocol}://${req.get('host')}/payment/cancel`,
        failureUrl: failure_url || `${req.protocol}://${req.get('host')}/payment/failure`,
        customFields: {
          mdf_1: mdf_1 || '',
          mdf_2: mdf_2 || '',
          mdf_3: mdf_3 || '',
          mdf_4: mdf_4 || '',
          mdf_5: mdf_5 || '',
          mdf_6: mdf_6 || ''
        },
        promotionInfo: promotion_information,
        discountDetail: discount_detail,
        shipmentInfo: shipment_information
      };

      // Call real gateway API
      const gatewayResponse = await gatewayClient.createPaymentOrder(orderData);

      if (!gatewayResponse.success) {
        console.error('[Payment Create] Gateway error:', gatewayResponse.error);
        
        return res.status(gatewayResponse.error.statusCode || 500).json({
          success: false,
          message: gatewayResponse.error.message,
          reason: gatewayResponse.error.reason,
          statusCode: gatewayResponse.error.statusCode,
          statusText: gatewayResponse.error.statusText
        });
      }

      // Store transaction locally
      const transaction = {
        id: gatewayResponse.data.order_detail?.payment_order_id || uuidv4(),
        merchantId: req.merchantId,
        orderId,
        amount,
        currency: currency || 'BDT',
        status: gatewayResponse.data.order_detail?.order_status || 'PENDING',
        sessionId: gatewayResponse.data.order_detail?.session_id,
        gatewayPageUrl: gatewayResponse.data.gateway_page_url,
        token: gatewayResponse.data.token_response?.token,
        timestamp: new Date().toISOString(),
        customerInfo,
        productInfo
      };

      transactionStore.create(transaction);

      console.log(`[Payment Create] Success - Transaction: ${transaction.id}`);

      // Return gateway response to SDK
      return res.json({
        success: true,
        transactionId: transaction.id,
        sessionId: transaction.sessionId,
        gatewayPageUrl: transaction.gatewayPageUrl,
        token: transaction.token,
        orderDetail: gatewayResponse.data.order_detail
      });

    } catch (error) {
      console.error('[Payment Create] Error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error during payment creation',
        error: error.message
      });
    }
  }
);

/**
 * Verify Payment
 * POST /api/payment/verify
 * 
 * Verifies payment status with the gateway
 */
router.post('/verify',
  paymentVerificationLimiter,
  validateMerchant,
  sanitizeInput,
  validatePaymentVerification,
  async (req, res) => {
    try {
      const { paymentOrderId } = req.body;

      console.log(`[Payment Verify] Merchant: ${req.merchantId}, PaymentOrderId: ${paymentOrderId}`);

      // Call gateway verification API with new simplified request
      const gatewayResponse = await gatewayClient.verifyPayment({
        paymentOrderId
      });

      if (!gatewayResponse.success) {
        console.error('[Payment Verify] Gateway error:', gatewayResponse.error);
        
        return res.status(gatewayResponse.error.statusCode || 500).json({
          success: false,
          message: gatewayResponse.error.message,
          reason: gatewayResponse.error.reason
        });
      }

      // Update local transaction using order_id from response
      const orderId = gatewayResponse.data.transaction_info?.order_id;
      if (orderId) {
        const transaction = transactionStore.getByOrderId(orderId);
        if (transaction) {
          transaction.status = gatewayResponse.data.transaction_info?.status || 'UNKNOWN';
          transaction.verifiedAt = new Date().toISOString();
          transaction.transactionInfo = gatewayResponse.data.transaction_info;
          transactionStore.update(transaction);
        }
      }

      console.log(`[Payment Verify] Status: ${gatewayResponse.data.transaction_info?.status}`);

      // Return verification result
      return res.json({
        success: true,
        transactionInfo: gatewayResponse.data.transaction_info
      });

    } catch (error) {
      console.error('[Payment Verify] Error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error during payment verification',
        error: error.message
      });
    }
  }
);

/**
 * Handle IPN (Instant Payment Notification)
 * POST /api/payment/ipn
 * 
 * Receives payment notifications from the gateway
 */
router.post('/ipn',
  ipnLimiter,
  sanitizeInput,
  async (req, res) => {
    try {
      console.log('[IPN] Received notification:', req.body);

      // Validate IPN data
      const {
        order_id,
        order_tracking_id,
        status,
        status_code,
        transaction_id,
        amount,
        currency
      } = req.body;

      if (!order_id || !status) {
        console.error('[IPN] Invalid data - missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Invalid IPN data'
        });
      }

      // Find and update transaction
      const transaction = transactionStore.getByOrderId(order_id);
      
      if (!transaction) {
        console.warn(`[IPN] Transaction not found for order: ${order_id}`);
        // Still acknowledge to prevent retries
        return res.json({
          success: true,
          message: 'IPN received but transaction not found'
        });
      }

      // Update transaction status
      transaction.status = status;
      transaction.statusCode = status_code;
      transaction.bankTransactionId = transaction_id;
      transaction.ipnReceivedAt = new Date().toISOString();
      transaction.ipnData = req.body;
      
      transactionStore.update(transaction);

      console.log(`[IPN] Updated transaction ${transaction.id} - Status: ${status}`);

      // Acknowledge receipt
      return res.json({
        success: true,
        message: 'IPN processed successfully'
      });

    } catch (error) {
      console.error('[IPN] Error:', error);
      
      // Return 200 to prevent gateway retries for processing errors
      return res.json({
        success: false,
        message: 'IPN processing error',
        error: error.message
      });
    }
  }
);

/**
 * Get Payment Status
 * GET /api/payment/status/:orderId
 * 
 * Returns current payment status for an order
 */
router.get('/status/:orderId',
  validateMerchant,
  async (req, res) => {
    try {
      const { orderId } = req.params;

      console.log(`[Payment Status] Merchant: ${req.merchantId}, Order: ${orderId}`);

      // Get transaction from local store
      const transaction = transactionStore.getByOrderId(orderId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Verify merchant owns this transaction
      if (transaction.merchantId !== req.merchantId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      return res.json({
        success: true,
        transaction: {
          id: transaction.id,
          orderId: transaction.orderId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          statusCode: transaction.statusCode,
          timestamp: transaction.timestamp,
          verifiedAt: transaction.verifiedAt,
          transactionInfo: transaction.transactionInfo
        }
      });

    } catch (error) {
      console.error('[Payment Status] Error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

/**
 * Create Payment Order (TNPG API Endpoint)
 * POST /payment-order
 * 
 * TNPG-compliant endpoint that accepts requests from SDK
 * This route is mounted at: /payment/api/v1/p/service/api/payment/processing/payment-order
 */
router.post('/payment-order',
  paymentCreationLimiter,
  validateMerchant,
  sanitizeInput,
  validatePaymentCreation,
  async (req, res) => {
    try {
      const {
        order_id,
        order_information,
        customer_information,
        product_information,
        promotion_information,
        discount_detail,
        shipment_information,
        ipn_url,
        success_url,
        cancel_url,
        failure_url,
        mdf_1, mdf_2, mdf_3, mdf_4, mdf_5, mdf_6
      } = req.body;

      const orderId = order_id;
      const amount = order_information?.payable_amount;
      const currency = order_information?.currency_code;

      console.log(`[TNPG Payment Order] Merchant: ${req.merchantId}, Order: ${orderId}`);

      // Prepare order data for gateway with TNPG authentication headers
      const orderData = {
        orderId,
        amount,
        currency: currency || 'BDT',
        customerInfo: customer_information || {},
        productInfo: product_information || {},
        ipnUrl: ipn_url || `${req.protocol}://${req.get('host')}/api/payment/ipn`,
        successUrl: success_url || `${req.protocol}://${req.get('host')}/payment/success`,
        cancelUrl: cancel_url || `${req.protocol}://${req.get('host')}/payment/cancel`,
        failureUrl: failure_url || `${req.protocol}://${req.get('host')}/payment/failure`,
        customFields: {
          mdf_1: mdf_1 || '',
          mdf_2: mdf_2 || '',
          mdf_3: mdf_3 || '',
          mdf_4: mdf_4 || '',
          mdf_5: mdf_5 || '',
          mdf_6: mdf_6 || ''
        },
        promotionInfo: promotion_information,
        discountDetail: discount_detail,
        shipmentInfo: shipment_information
      };

      // Call real gateway API with TNPG headers
      const gatewayResponse = await gatewayClient.createPaymentOrder(orderData);

      if (!gatewayResponse.success) {
        console.error('[TNPG Payment Order] Gateway error:', gatewayResponse.error);
        
        return res.status(gatewayResponse.error.statusCode || 500).json({
          success: false,
          message: gatewayResponse.error.message,
          reason: gatewayResponse.error.reason,
          statusCode: gatewayResponse.error.statusCode,
          statusText: gatewayResponse.error.statusText
        });
      }

      // Store transaction locally
      const transaction = {
        id: gatewayResponse.data.order_detail?.payment_order_id || uuidv4(),
        merchantId: req.merchantId,
        orderId,
        amount,
        currency: currency || 'BDT',
        status: gatewayResponse.data.order_detail?.order_status || 'PENDING',
        sessionId: gatewayResponse.data.order_detail?.session_id,
        gatewayPageUrl: gatewayResponse.data.gateway_page_url,
        token: gatewayResponse.data.token_response?.token,
        timestamp: new Date().toISOString(),
        customerInfo: customer_information,
        productInfo: product_information
      };

      transactionStore.create(transaction);

      console.log(`[TNPG Payment Order] Success - Transaction: ${transaction.id}`);

      // Return TNPG-compliant response
      return res.json({
        success: true,
        transactionId: transaction.id,
        sessionId: transaction.sessionId,
        gatewayPageUrl: transaction.gatewayPageUrl,
        token: transaction.token,
        orderDetail: gatewayResponse.data.order_detail
      });

    } catch (error) {
      console.error('[TNPG Payment Order] Error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error during payment creation',
        error: error.message
      });
    }
  }
);

module.exports = router;
