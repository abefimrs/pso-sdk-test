/**
 * PSO Payment SDK - Unit Tests
 */

import PSOPayment from '../src/payment-sdk.js';

// Mock the popup module
jest.mock('../src/popup.js', () => ({
  PaymentPopup: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    close: jest.fn()
  }))
}));

// Mock window.location
delete window.location;
window.location = { protocol: 'https:' };

describe('PSOPayment SDK', () => {
  describe('Initialization', () => {
    test('should initialize with valid config', () => {
      const config = {
        merchantId: 'TEST_MERCHANT_123',
        environment: 'test'
      };
      
      const pso = new PSOPayment(config);
      
      expect(pso.config.merchantId).toBe('TEST_MERCHANT_123');
      expect(pso.config.environment).toBe('test');
    });

    test('should throw error when merchantId is missing', () => {
      expect(() => {
        new PSOPayment({});
      }).toThrow('PSOPayment: merchantId is required');
    });

    test('should throw error for invalid environment', () => {
      expect(() => {
        new PSOPayment({
          merchantId: 'TEST_MERCHANT_123',
          environment: 'invalid'
        });
      }).toThrow('PSOPayment: environment must be "test" or "production"');
    });

    test('should default to test environment', () => {
      const pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123'
      });
      
      expect(pso.config.environment).toBe('test');
    });

    test('should warn when using production without HTTPS', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      window.location.protocol = 'http:';
      
      new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'production'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PSO SDK] Warning: HTTPS is required for production environment'
      );
      
      consoleSpy.mockRestore();
      window.location.protocol = 'https:';
    });

    test('should initialize with custom theme', () => {
      const pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        theme: {
          primaryColor: '#007bff'
        }
      });
      
      expect(pso.config.theme.primaryColor).toBe('#007bff');
    });
  });

  describe('showPaymentForm validation', () => {
    let pso;

    beforeEach(() => {
      pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'test'
      });
    });

    test('should throw error when amount is missing', async () => {
      await expect(
        pso.showPaymentForm({})
      ).rejects.toThrow('PSOPayment: amount must be a positive number');
    });

    test('should throw error when amount is negative', async () => {
      await expect(
        pso.showPaymentForm({ amount: -100 })
      ).rejects.toThrow('PSOPayment: amount must be a positive number');
    });

    test('should throw error when amount is zero', async () => {
      await expect(
        pso.showPaymentForm({ amount: 0 })
      ).rejects.toThrow('PSOPayment: amount must be a positive number');
    });

    test('should throw error when amount is not a number', async () => {
      await expect(
        pso.showPaymentForm({ amount: '100' })
      ).rejects.toThrow('PSOPayment: amount must be a positive number');
    });

    test('should throw error when currency is not a string', async () => {
      await expect(
        pso.showPaymentForm({ amount: 100, currency: 123 })
      ).rejects.toThrow('PSOPayment: currency must be a string');
    });
  });

  describe('generateOrderId', () => {
    test('should generate unique order IDs', () => {
      const pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123'
      });

      const orderId1 = pso.generateOrderId();
      const orderId2 = pso.generateOrderId();

      expect(orderId1).toMatch(/^ORD-\d+-[A-Z0-9]+$/);
      expect(orderId2).toMatch(/^ORD-\d+-[A-Z0-9]+$/);
      expect(orderId1).not.toBe(orderId2);
    });

    test('should generate order ID with correct prefix', () => {
      const pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123'
      });

      const orderId = pso.generateOrderId();
      expect(orderId).toMatch(/^ORD-/);
    });
  });

  describe('createPaymentOrder', () => {
    let pso;

    beforeEach(() => {
      pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'test',
        debug: false
      });
      
      // Mock fetch globally
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should create payment order successfully', async () => {
      const mockResponse = {
        success: true,
        order_detail: { order_id: 'ORD-123' },
        gateway_page_url: 'https://gateway.example.com/pay/123',
        token_response: { token: 'TOKEN-123' }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await pso.createPaymentOrder({
        orderId: 'ORD-123',
        amount: 1000,
        currency: 'BDT',
        customerInfo: {},
        productInfo: {}
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/payment/api/v1/p/service/api/payment/processing/payment-order'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Merchant-Id': 'TEST_MERCHANT_123'
          })
        })
      );
    });

    test('should handle API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Payment order creation failed' })
      });

      await expect(
        pso.createPaymentOrder({
          orderId: 'ORD-123',
          amount: 1000,
          currency: 'BDT',
          customerInfo: {},
          productInfo: {}
        })
      ).rejects.toThrow('Payment order creation failed');
    });

    test('should use correct gateway URL for production', async () => {
      const psoProd = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'production'
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await psoProd.createPaymentOrder({
        orderId: 'ORD-123',
        amount: 1000,
        currency: 'BDT',
        customerInfo: {},
        productInfo: {}
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.pso-gateway.com'),
        expect.any(Object)
      );
    });

    test('should use correct gateway URL for test', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await pso.createPaymentOrder({
        orderId: 'ORD-123',
        amount: 1000,
        currency: 'BDT',
        customerInfo: {},
        productInfo: {}
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000'),
        expect.any(Object)
      );
    });

    test('should use custom gateway URL if provided', async () => {
      const psoCustom = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'test',
        gatewayUrl: 'https://custom-gateway.example.com'
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await psoCustom.createPaymentOrder({
        orderId: 'ORD-123',
        amount: 1000,
        currency: 'BDT',
        customerInfo: {},
        productInfo: {}
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom-gateway.example.com'),
        expect.any(Object)
      );
    });

    test('should include optional fields in request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await pso.createPaymentOrder({
        orderId: 'ORD-123',
        amount: 1000,
        currency: 'BDT',
        customerInfo: {},
        productInfo: {},
        promotionInfo: { code: 'PROMO10' },
        discountDetail: { amount: 100 },
        customFields: { custom: 'value' }
      });

      const callArgs = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      
      expect(requestBody.promotion_information).toEqual({ code: 'PROMO10' });
      expect(requestBody.discount_detail).toEqual({ amount: 100 });
      expect(requestBody.custom).toBe('value');
    });
  });

  describe('verifyPayment', () => {
    let pso;

    beforeEach(() => {
      pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'test'
      });
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should verify payment successfully', async () => {
      const mockResponse = {
        success: true,
        status: 'completed',
        transactionId: 'TXN-123'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await pso.verifyPayment('TXN-123');
      expect(result).toEqual(mockResponse);
    });

    test('should handle verification errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false
      });

      await expect(
        pso.verifyPayment('TXN-123')
      ).rejects.toThrow('Failed to verify payment');
    });
  });

  describe('createPaymentToken', () => {
    let pso;

    beforeEach(() => {
      pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'test'
      });
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should create payment token successfully', async () => {
      const mockResponse = {
        token: 'TOKEN-123',
        success: true
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await pso.createPaymentToken({
        cardNumber: '4111111111111111'
      });

      expect(result).toEqual(mockResponse);
    });

    test('should handle token creation errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false
      });

      await expect(
        pso.createPaymentToken({})
      ).rejects.toThrow('Failed to create payment token');
    });
  });

  describe('verifyPaymentStatus', () => {
    let pso;

    beforeEach(() => {
      pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        environment: 'test'
      });
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should verify payment status successfully', async () => {
      const mockResponse = {
        status: 'success',
        orderId: 'ORD-123'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await pso.verifyPaymentStatus('ORD-123');
      expect(result).toEqual(mockResponse);
    });

    test('should handle status verification errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false
      });

      await expect(
        pso.verifyPaymentStatus('ORD-123')
      ).rejects.toThrow('Failed to verify payment');
    });
  });

  describe('SDK version', () => {
    test('should have version property', () => {
      expect(PSOPayment.version).toBeDefined();
      expect(typeof PSOPayment.version).toBe('string');
      expect(PSOPayment.version).toBe('1.0.0');
    });
  });

  describe('closePaymentForm', () => {
    test('should call popup close method', () => {
      const pso = new PSOPayment({
        merchantId: 'TEST_MERCHANT_123'
      });

      pso.closePaymentForm();
      expect(pso.popup.close).toHaveBeenCalled();
    });
  });

  describe('Debug mode', () => {
    test('should log when debug is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        debug: true
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PSO SDK] Initialized with config:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    test('should not log when debug is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      new PSOPayment({
        merchantId: 'TEST_MERCHANT_123',
        debug: false
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
