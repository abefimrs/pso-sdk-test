/**
 * Test TNPG Authentication Headers Generation
 */

const authHelper = require('./gateway/services/auth-helper');

// Test configuration
const config = {
  host: 'http://192.168.169.162:8094',
  merchantId: 'M12345',
  apiKey: 'test',
  apiSecret: 'test-secret-key'
};

// Test request body
const requestBody = {
  order_id: 'ORDER-12345',
  order_information: {
    payable_amount: 1000.00,
    currency_code: 'BDT'
  },
  customer_information: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+8801712345678'
  },
  product_information: {
    name: 'Premium Subscription',
    quantity: 1
  },
  ipn_url: 'http://localhost:3000/payment/ipn',
  success_url: 'http://localhost:3000/payment/success',
  cancel_url: 'http://localhost:3000/payment/cancel',
  failure_url: 'http://localhost:3000/payment/failure'
};

// Test endpoint
const targetApi = '/p/service/api/payment/processing/payment-order';

console.log('=== TNPG Authentication Headers Test ===\n');

try {
  const headers = authHelper.generateGatewayHeaders(targetApi, requestBody, config);
  
  console.log('Generated Headers:');
  console.log('------------------');
  Object.keys(headers).forEach(key => {
    console.log(`${key}: ${headers[key]}`);
  });
  
  console.log('\n=== Expected Format ===');
  console.log('X-TNPG-TIMESTAMP: Mon, 09 Feb 2026 07:47:49 GMT');
  console.log('X-TNPG-HOST: http://192.168.169.162:8094');
  console.log('X-TNPG-TARGET-API: POST /p/service/api/payment/processing/payment-order');
  console.log('X-TNPG-MERCHANT-ID: M12345');
  console.log('X-TNPG-API-KEY: test');
  console.log('X-TNPG-SIGNATURE: <base64-encoded-hmac-sha256>');
  console.log('X-TNPG-DIGEST: SHA-256=<base64-encoded-sha256-hash>');
  
  console.log('\n✅ Headers generated successfully!');
  
  // Verify format
  console.log('\n=== Format Verification ===');
  console.log('✓ Timestamp format:', /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(headers['X-TNPG-TIMESTAMP']) ? 'PASS' : 'FAIL');
  console.log('✓ Host includes protocol:', headers['X-TNPG-HOST'].startsWith('http') ? 'PASS' : 'FAIL');
  console.log('✓ Target API includes POST:', headers['X-TNPG-TARGET-API'].startsWith('POST ') ? 'PASS' : 'FAIL');
  console.log('✓ Digest has SHA-256= prefix:', headers['X-TNPG-DIGEST'].startsWith('SHA-256=') ? 'PASS' : 'FAIL');
  console.log('✓ Signature is base64:', /^[A-Za-z0-9+/]+=*$/.test(headers['X-TNPG-SIGNATURE']) ? 'PASS' : 'FAIL');
  
} catch (error) {
  console.error('❌ Error generating headers:', error.message);
  process.exit(1);
}
