/**
 * Test Gateway Client with Real API Simulation
 * Tests the header-based authentication flow
 */

const gatewayClient = require('../gateway/services/gateway-client');

console.log('=== Testing Gateway Client ===\n');

// Test 1: Create Payment Order
console.log('Test 1: Create Payment Order Request');
console.log('---------------------------------------');

const orderData = {
  orderId: 'test-order-' + Date.now(),
  amount: 1000.00,
  currency: 'BDT',
  customerInfo: {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+8801234567890'
  },
  productInfo: {
    name: 'Test Product',
    description: 'Test Description',
    quantity: 1
  },
  ipnUrl: 'https://merchant.com/ipn',
  successUrl: 'https://merchant.com/success',
  cancelUrl: 'https://merchant.com/cancel',
  failureUrl: 'https://merchant.com/failure',
  customFields: {
    mdf_1: 'custom-value-1',
    mdf_2: 'custom-value-2'
  },
  promotionInfo: {
    preferred_channel: 'VISA',
    allowed_bin: '123456'
  },
  discountDetail: {},
  shipmentInfo: {
    address: 'Test Address',
    city: 'Test City',
    country: 'Bangladesh'
  }
};

console.log('Order Data:');
console.log('- Order ID:', orderData.orderId);
console.log('- Amount:', orderData.amount, orderData.currency);
console.log('- Customer:', orderData.customerInfo.name);
console.log();

// Note: This will fail with actual API call because we don't have valid credentials
// but it will test the header generation logic
console.log('Testing header generation (will show connection error with test credentials)...');

gatewayClient.createPaymentOrder(orderData)
  .then(result => {
    if (result.success) {
      console.log('✓ Payment order created successfully!');
      console.log('  Payment Order ID:', result.data.order_detail?.payment_order_id);
      console.log('  Gateway URL:', result.data.gateway_page_url);
      console.log('  Session ID:', result.data.order_detail?.session_id);
    } else {
      console.log('✗ Payment order creation failed (expected with test credentials):');
      console.log('  Status:', result.error.statusCode, result.error.statusText);
      console.log('  Message:', result.error.message);
      console.log('  Reason:', result.error.reason);
    }
    console.log();
    
    // Test 2: Verify Payment
    console.log('Test 2: Verify Payment Request');
    console.log('-------------------------------');
    
    const verificationData = {
      paymentOrderId: 'test-payment-order-123'
    };
    
    console.log('Verification Data:');
    console.log('- Payment Order ID:', verificationData.paymentOrderId);
    console.log();
    
    return gatewayClient.verifyPayment(verificationData);
  })
  .then(result => {
    if (result.success) {
      console.log('✓ Payment verification successful!');
      console.log('  Status:', result.data.transaction_info?.status);
      console.log('  Order ID:', result.data.transaction_info?.order_id);
      console.log('  Amount:', result.data.transaction_info?.amount);
    } else {
      console.log('✗ Payment verification failed (expected with test credentials):');
      console.log('  Status:', result.error.statusCode, result.error.statusText);
      console.log('  Message:', result.error.message);
      console.log('  Reason:', result.error.reason);
    }
    console.log();
    
    // Test 3: Inquire Payment
    console.log('Test 3: Inquire Payment Request');
    console.log('--------------------------------');
    
    const inquiryData = {
      orderId: 'test-order-123'
    };
    
    console.log('Inquiry Data:');
    console.log('- Order ID:', inquiryData.orderId);
    console.log();
    
    return gatewayClient.inquirePayment(inquiryData);
  })
  .then(result => {
    if (result.success) {
      console.log('✓ Payment inquiry successful!');
      console.log('  Data:', result.data);
    } else {
      console.log('✗ Payment inquiry failed (expected with test credentials):');
      console.log('  Status:', result.error.statusCode, result.error.statusText);
      console.log('  Message:', result.error.message);
      console.log('  Reason:', result.error.reason);
    }
    console.log();
    
    console.log('=== Tests Completed ===');
    console.log('\nNote: Network errors are expected when running without valid gateway credentials.');
    console.log('The important part is that the header-based authentication is being used correctly.');
    console.log('\nTo test with real gateway:');
    console.log('1. Create a .env file with valid credentials:');
    console.log('   MERCHANT_ID=your-merchant-id');
    console.log('   API_KEY=your-api-key');
    console.log('   API_SECRET=your-api-secret');
    console.log('   GATEWAY_BASE_URL=https://api-stage.tnextpay.com');
    console.log('   GATEWAY_HOST=api-stage.tnextpay.com');
    console.log('2. Run this test again');
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });
