/**
 * PSO Payment SDK TypeScript Definitions
 * 
 * @packageDocumentation
 */

/**
 * Configuration options for initializing the PSO Payment SDK
 */
export interface PSOPaymentConfig {
  /**
   * Merchant ID provided by PSO
   */
  merchantId: string;

  /**
   * Environment to use: 'test' for testing, 'production' for live transactions
   * @default 'test'
   */
  environment?: 'test' | 'production';

  /**
   * Custom gateway URL (optional, defaults to PSO gateway)
   */
  gatewayUrl?: string;

  /**
   * Theme customization options
   */
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
    borderRadius?: string;
  };

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Use popup window instead of iframe overlay
   * @default false
   */
  usePopupWindow?: boolean;
}

/**
 * Customer information for payment
 */
export interface CustomerInfo {
  /**
   * Customer's full name
   */
  name: string;

  /**
   * Customer's email address
   */
  email: string;

  /**
   * Customer's phone number
   */
  phone: string;

  /**
   * Customer's address (optional)
   */
  address?: string;

  /**
   * Customer's city (optional)
   */
  city?: string;

  /**
   * Customer's state/province (optional)
   */
  state?: string;

  /**
   * Customer's postal/zip code (optional)
   */
  postalCode?: string;

  /**
   * Customer's country (optional)
   */
  country?: string;
}

/**
 * Product information for payment
 */
export interface ProductInfo {
  /**
   * Product name or description
   */
  name: string;

  /**
   * Product category (optional)
   */
  category?: string;

  /**
   * Product quantity
   * @default 1
   */
  quantity?: number;

  /**
   * Unit price
   */
  unitPrice?: number;
}

/**
 * Promotion/discount information
 */
export interface PromotionInfo {
  /**
   * Promotion code
   */
  code?: string;

  /**
   * Discount amount
   */
  discount?: number;

  /**
   * Promotion description
   */
  description?: string;
}

/**
 * Payment options for showing the payment form
 */
export interface PaymentOptions {
  /**
   * Payment amount in smallest currency unit (e.g., cents for USD, paisa for BDT)
   */
  amount: number;

  /**
   * Currency code (ISO 4217)
   * @default 'BDT'
   */
  currency?: string;

  /**
   * Customer information
   */
  customer?: CustomerInfo;

  /**
   * Product information
   */
  product?: ProductInfo;

  /**
   * Promotion/discount information
   */
  promotion?: PromotionInfo;

  /**
   * Merchant's order ID (optional, will be auto-generated if not provided)
   */
  orderId?: string;

  /**
   * Callback URL for payment completion notification
   */
  callbackUrl?: string;

  /**
   * Cancel URL to redirect after payment cancellation
   */
  cancelUrl?: string;

  /**
   * Additional metadata to attach to the transaction
   */
  metadata?: Record<string, any>;

  /**
   * Callback function invoked on successful payment
   */
  onSuccess?: (data: PaymentSuccessData) => void;

  /**
   * Callback function invoked on payment error
   */
  onError?: (error: PaymentError) => void;

  /**
   * Callback function invoked when payment is cancelled
   */
  onCancel?: () => void;

  /**
   * Callback function invoked when popup/modal is closed
   */
  onClose?: () => void;
}

/**
 * Response from creating a payment order
 */
export interface PaymentOrderResponse {
  /**
   * Whether the order creation was successful
   */
  success: boolean;

  /**
   * Order ID
   */
  orderId: string;

  /**
   * Payment token
   */
  token: string;

  /**
   * Gateway URL to redirect for payment
   */
  gatewayUrl: string;

  /**
   * Error message if creation failed
   */
  error?: string;
}

/**
 * Data returned on successful payment
 */
export interface PaymentSuccessData {
  /**
   * Order ID
   */
  orderId: string;

  /**
   * Transaction ID from payment gateway
   */
  transactionId: string;

  /**
   * Payment amount
   */
  amount: number;

  /**
   * Currency code
   */
  currency: string;

  /**
   * Payment status
   */
  status: 'success' | 'pending';

  /**
   * Additional data from gateway
   */
  metadata?: Record<string, any>;
}

/**
 * Payment error information
 */
export interface PaymentError {
  /**
   * Error code
   */
  code: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Additional error details
   */
  details?: any;
}

/**
 * Response from verifying a payment
 */
export interface VerificationResponse {
  /**
   * Whether the verification was successful
   */
  success: boolean;

  /**
   * Transaction status
   */
  status: 'success' | 'pending' | 'failed' | 'cancelled';

  /**
   * Transaction ID
   */
  transactionId?: string;

  /**
   * Order ID
   */
  orderId?: string;

  /**
   * Payment amount
   */
  amount?: number;

  /**
   * Currency code
   */
  currency?: string;

  /**
   * Payment timestamp
   */
  timestamp?: string;

  /**
   * Error message if verification failed
   */
  error?: string;
}

/**
 * Main PSO Payment SDK class
 */
export default class PSOPayment {
  /**
   * Create a new PSO Payment SDK instance
   * 
   * @param config - Configuration options
   * @throws {Error} If merchantId is not provided or environment is invalid
   * 
   * @example
   * ```typescript
   * const pso = new PSOPayment({
   *   merchantId: 'your-merchant-id',
   *   environment: 'production'
   * });
   * ```
   */
  constructor(config: PSOPaymentConfig);

  /**
   * Show payment form in a popup/modal
   * 
   * @param options - Payment options
   * @returns Promise that resolves when payment flow completes
   * @throws {Error} If required options are missing or invalid
   * 
   * @example
   * ```typescript
   * await pso.showPaymentForm({
   *   amount: 1000,
   *   currency: 'BDT',
   *   customer: {
   *     name: 'John Doe',
   *     email: 'john@example.com',
   *     phone: '+880123456789'
   *   },
   *   onSuccess: (data) => {
   *     console.log('Payment successful!', data);
   *   },
   *   onError: (error) => {
   *     console.error('Payment failed:', error);
   *   }
   * });
   * ```
   */
  showPaymentForm(options: PaymentOptions): Promise<void>;

  /**
   * Create a payment order
   * 
   * @param options - Payment options
   * @returns Promise resolving to order creation response
   * 
   * @example
   * ```typescript
   * const order = await pso.createPaymentOrder({
   *   amount: 1000,
   *   currency: 'BDT'
   * });
   * console.log('Order created:', order.orderId);
   * ```
   */
  createPaymentOrder(options: PaymentOptions): Promise<PaymentOrderResponse>;

  /**
   * Verify a payment transaction
   * 
   * @param orderId - Order ID to verify
   * @returns Promise resolving to verification response
   * 
   * @example
   * ```typescript
   * const verification = await pso.verifyPayment('order-123');
   * if (verification.success && verification.status === 'success') {
   *   console.log('Payment verified successfully!');
   * }
   * ```
   */
  verifyPayment(orderId: string): Promise<VerificationResponse>;

  /**
   * Generate a unique order ID
   * 
   * @returns Unique order ID string
   * 
   * @example
   * ```typescript
   * const orderId = pso.generateOrderId();
   * console.log('Generated order ID:', orderId);
   * ```
   */
  generateOrderId(): string;

  /**
   * Validate payment options
   * 
   * @param options - Payment options to validate
   * @throws {Error} If options are invalid
   */
  validatePaymentOptions(options: PaymentOptions): void;

  /**
   * Validate configuration
   * 
   * @param config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config: PSOPaymentConfig): void;
}

export { PSOPayment };
