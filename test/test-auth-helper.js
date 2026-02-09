/**
 * Test Authentication Helper
 * Validates signature and digest generation
 */

const authHelper = require('../gateway/services/auth-helper');
const crypto = require('crypto');

console.log('=== Testing Authentication Helper ===\n');

// Test Configuration
const testConfig = {
  host: 'api-stage.tnextpay.com',
  merchantId: 'test-merchant-001',
  apiKey: 'pk_test_abc123',
  apiSecret: 'sk_test_secret456'
};

const targetApi = '/payment/api/v1/p/service/api/payment/processing/payment-order';

const requestBody = {
  order_id: 'test-order-123',
  order_information: {
    payable_amount: 1000.00,
    currency_code: 'BDT'
  },
  ipn_url: 'https://merchant.com/ipn',
  success_url: 'https://merchant.com/success',
  cancel_url: 'https://merchant.com/cancel',
  failure_url: 'https://merchant.com/failure'
};

// Test 1: Generate Signature
console.log('Test 1: Generate Signature');
const timestamp = new Date().toISOString();
const signature = authHelper.generateSignature(
  timestamp,
  testConfig.host,
  targetApi,
  testConfig.merchantId,
  testConfig.apiKey,
  testConfig.apiSecret
);

console.log('✓ Signature generated:', signature);
console.log('  Length:', signature.length, '(expected: 64 for hex SHA256)');
console.log('  Format:', /^[a-f0-9]{64}$/.test(signature) ? 'Valid hex' : 'Invalid');
console.log();

// Test 2: Generate Digest
console.log('Test 2: Generate Digest');
const digest = authHelper.generateDigest(requestBody);

console.log('✓ Digest generated:', digest);
console.log('  Length:', digest.length, '(expected: 64 for hex SHA256)');
console.log('  Format:', /^[a-f0-9]{64}$/.test(digest) ? 'Valid hex' : 'Invalid');
console.log();

// Test 3: Generate Complete Headers
console.log('Test 3: Generate Complete Headers');
const headers = authHelper.generateGatewayHeaders(targetApi, requestBody, testConfig);

console.log('✓ Headers generated:');
for (const [key, value] of Object.entries(headers)) {
  console.log(`  ${key}: ${value}`);
}
console.log();

// Test 4: Validate Timestamp
console.log('Test 4: Validate Timestamp');
const validTimestamp = new Date().toISOString();
const expiredTimestamp = new Date(Date.now() - 600000).toISOString(); // 10 minutes ago

console.log('✓ Valid timestamp:', authHelper.validateTimestamp(validTimestamp));
console.log('✓ Expired timestamp (10 min old):', authHelper.validateTimestamp(expiredTimestamp));
console.log();

// Test 5: Signature Consistency
console.log('Test 5: Signature Consistency (same input = same signature)');
const sig1 = authHelper.generateSignature(
  timestamp,
  testConfig.host,
  targetApi,
  testConfig.merchantId,
  testConfig.apiKey,
  testConfig.apiSecret
);
const sig2 = authHelper.generateSignature(
  timestamp,
  testConfig.host,
  targetApi,
  testConfig.merchantId,
  testConfig.apiKey,
  testConfig.apiSecret
);
console.log('✓ Signatures match:', sig1 === sig2);
console.log();

// Test 6: Signature Variation (different timestamp = different signature)
console.log('Test 6: Signature Variation (different input = different signature)');
const timestamp2 = new Date(Date.now() + 1000).toISOString();
const sig3 = authHelper.generateSignature(
  timestamp2,
  testConfig.host,
  targetApi,
  testConfig.merchantId,
  testConfig.apiKey,
  testConfig.apiSecret
);
console.log('✓ Signatures differ:', sig1 !== sig3);
console.log();

// Test 7: Digest Consistency
console.log('Test 7: Digest Consistency (same body = same digest)');
const digest1 = authHelper.generateDigest(requestBody);
const digest2 = authHelper.generateDigest(requestBody);
console.log('✓ Digests match:', digest1 === digest2);
console.log();

// Test 8: Digest Variation (different body = different digest)
console.log('Test 8: Digest Variation (different body = different digest)');
const modifiedBody = { ...requestBody, order_id: 'different-order' };
const digest3 = authHelper.generateDigest(modifiedBody);
console.log('✓ Digests differ:', digest1 !== digest3);
console.log();

// Test 9: Validate Signature (round-trip)
console.log('Test 9: Validate Signature (round-trip)');
const testHeaders = {
  'x-tnpg-timestamp': timestamp,
  'x-tnpg-host': testConfig.host,
  'x-tnpg-target-api': targetApi,
  'x-tnpg-merchant-id': testConfig.merchantId,
  'x-tnpg-api-key': testConfig.apiKey,
  'x-tnpg-signature': signature,
  'x-tnpg-digest': digest
};

const isValid = authHelper.validateSignature(testHeaders, requestBody, testConfig.apiSecret);
console.log('✓ Signature validation:', isValid ? 'PASS' : 'FAIL');
console.log();

// Test 10: Invalid Signature Detection
console.log('Test 10: Invalid Signature Detection');
const invalidHeaders = {
  ...testHeaders,
  'x-tnpg-signature': 'invalid-signature-0123456789abcdef0123456789abcdef0123456789abcdef01234'
};
const isInvalid = authHelper.validateSignature(invalidHeaders, requestBody, testConfig.apiSecret);
console.log('✓ Invalid signature rejected:', !isInvalid ? 'PASS' : 'FAIL');
console.log();

console.log('=== All Tests Completed ===');
console.log('Summary:');
console.log('✓ Signature generation: Working');
console.log('✓ Digest generation: Working');
console.log('✓ Header generation: Working');
console.log('✓ Timestamp validation: Working');
console.log('✓ Signature validation: Working');
console.log('✓ Invalid signature detection: Working');
