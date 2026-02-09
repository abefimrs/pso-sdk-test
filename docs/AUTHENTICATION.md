# Header-Based Authentication Guide

This document explains the header-based authentication system used by the PSO Payment Gateway SDK.

## Overview

The Payment Gateway API uses **HTTP header-based authentication** instead of including credentials in the request body. This approach follows REST API best practices and provides better security separation.

## Authentication Headers

All API requests to the payment gateway must include the following HTTP headers:

```
X-TNPG-TIMESTAMP: 2026-02-09T10:30:45Z
X-TNPG-HOST: api-stage.tnextpay.com
X-TNPG-TARGET-API: /payment/api/v1/p/service/api/payment/processing/payment-order
X-TNPG-MERCHANT-ID: your-merchant-id
X-TNPG-API-KEY: your-api-key
X-TNPG-SIGNATURE: generated-hmac-signature
X-TNPG-DIGEST: generated-sha256-digest
Content-Type: application/json
```

### Header Descriptions

| Header | Description | Example |
|--------|-------------|---------|
| `X-TNPG-TIMESTAMP` | ISO 8601 timestamp of the request | `2026-02-09T10:30:45Z` |
| `X-TNPG-HOST` | The gateway host (domain only) | `api-stage.tnextpay.com` |
| `X-TNPG-TARGET-API` | The full API endpoint path | `/payment/api/v1/p/service/api/payment/processing/payment-order` |
| `X-TNPG-MERCHANT-ID` | Your merchant identifier | `merchant-12345` |
| `X-TNPG-API-KEY` | Your API key (public identifier) | `pk_live_abc123xyz` |
| `X-TNPG-SIGNATURE` | HMAC-SHA256 signature (hex) | `a1b2c3d4...` |
| `X-TNPG-DIGEST` | SHA256 hash of request body (hex) | `e5f6g7h8...` |

## Signature Generation

The `X-TNPG-SIGNATURE` is an HMAC-SHA256 signature that proves you possess the API secret without transmitting it.

### Signature Algorithm

```javascript
// 1. Create signature string by concatenating with pipe delimiter
const signatureString = `${timestamp}|${host}|${targetApi}|${merchantId}|${apiKey}`;

// Example:
// "2026-02-09T10:30:45Z|api-stage.tnextpay.com|/payment/api/v1/p/service/api/payment/processing/payment-order|merchant-12345|pk_live_abc123xyz"

// 2. Generate HMAC-SHA256 signature using API secret
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(signatureString)
  .digest('hex');
```

### Code Example (Node.js)

```javascript
const crypto = require('crypto');

function generateSignature(timestamp, host, targetApi, merchantId, apiKey, apiSecret) {
  const signatureString = `${timestamp}|${host}|${targetApi}|${merchantId}|${apiKey}`;
  
  return crypto
    .createHmac('sha256', apiSecret)
    .update(signatureString)
    .digest('hex');
}

// Usage
const signature = generateSignature(
  '2026-02-09T10:30:45Z',
  'api-stage.tnextpay.com',
  '/payment/api/v1/p/service/api/payment/processing/payment-order',
  'merchant-12345',
  'pk_live_abc123xyz',
  'sk_live_secret123' // API Secret - never expose in frontend
);
```

## Digest Generation

The `X-TNPG-DIGEST` is a SHA256 hash of the request body that ensures data integrity.

### Digest Algorithm

```javascript
// 1. Convert request body to JSON string
const bodyString = JSON.stringify(requestBody);

// 2. Generate SHA256 hash
const digest = crypto
  .createHash('sha256')
  .update(bodyString)
  .digest('hex');
```

### Code Example (Node.js)

```javascript
const crypto = require('crypto');

function generateDigest(requestBody) {
  const bodyString = JSON.stringify(requestBody);
  
  return crypto
    .createHash('sha256')
    .update(bodyString)
    .digest('hex');
}

// Usage
const requestBody = {
  order_id: 'order-123',
  order_information: {
    payable_amount: 1000.00,
    currency_code: 'BDT'
  },
  // ... other fields
};

const digest = generateDigest(requestBody);
```

## Complete Example

Here's a complete example of making a payment order creation request:

```javascript
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const config = {
  baseUrl: 'https://api-stage.tnextpay.com',
  host: 'api-stage.tnextpay.com',
  merchantId: 'merchant-12345',
  apiKey: 'pk_live_abc123xyz',
  apiSecret: 'sk_live_secret123' // Keep this secret!
};

// Request body (NO authentication credentials here)
const requestBody = {
  order_id: 'order-123',
  order_information: {
    payable_amount: 1000.00,
    currency_code: 'BDT'
  },
  ipn_url: 'https://merchant.com/ipn',
  success_url: 'https://merchant.com/success',
  cancel_url: 'https://merchant.com/cancel',
  failure_url: 'https://merchant.com/failure',
  customer_information: {
    name: 'Customer Name',
    email: 'customer@email.com',
    phone: '+8801234567890'
  }
};

// Generate timestamp
const timestamp = new Date().toISOString();

// Target API endpoint
const targetApi = '/payment/api/v1/p/service/api/payment/processing/payment-order';

// Generate signature
const signatureString = `${timestamp}|${config.host}|${targetApi}|${config.merchantId}|${config.apiKey}`;
const signature = crypto
  .createHmac('sha256', config.apiSecret)
  .update(signatureString)
  .digest('hex');

// Generate digest
const digest = crypto
  .createHash('sha256')
  .update(JSON.stringify(requestBody))
  .digest('hex');

// Prepare headers
const headers = {
  'X-TNPG-TIMESTAMP': timestamp,
  'X-TNPG-HOST': config.host,
  'X-TNPG-TARGET-API': targetApi,
  'X-TNPG-MERCHANT-ID': config.merchantId,
  'X-TNPG-API-KEY': config.apiKey,
  'X-TNPG-SIGNATURE': signature,
  'X-TNPG-DIGEST': digest,
  'Content-Type': 'application/json'
};

// Make request
async function createPaymentOrder() {
  try {
    const response = await axios.post(
      `${config.baseUrl}${targetApi}`,
      requestBody,
      { headers }
    );
    
    console.log('Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

createPaymentOrder();
```

## Security Best Practices

### 1. Keep API Secret Confidential
- **NEVER** expose `API_SECRET` in frontend code
- Store it in environment variables on the server
- Use backend proxy to handle all gateway API calls

### 2. Validate Timestamps
- Reject requests with timestamps older than 5 minutes
- Prevents replay attacks
- Gateway validates timestamp freshness

### 3. Use HTTPS
- Always use HTTPS in production
- Prevents header interception
- Encrypts all communication

### 4. Signature Validation
- Gateway validates both signature and digest
- Invalid signature = authentication failure (401)
- Invalid digest = data tampering detected (400)

### 5. Rate Limiting
- Implement rate limiting on your backend
- Prevents brute force attacks
- Protects against DDoS

## Environment Configuration

Set these environment variables in your `.env` file:

```bash
# Gateway Configuration
GATEWAY_BASE_URL=https://api-stage.tnextpay.com
GATEWAY_HOST=api-stage.tnextpay.com
MERCHANT_ID=your-merchant-id
API_KEY=your-api-key
API_SECRET=your-api-secret

# Never commit .env file to version control!
```

## Verification Request Changes

The verification endpoint now uses a simplified request structure:

### Old Format (Deprecated)
```json
{
  "security": {
    "username": "user",
    "password": "pass"
  },
  "signature": "static-sig",
  "order_id": "order-123",
  "order_tracking_id": "pso-tracking-123",
  "merchant_code": "merchant-code"
}
```

### New Format (Current)
**Headers:** (All authentication headers as shown above)

**Body:**
```json
{
  "paymentOrderId": "payment-order-id-from-gateway"
}
```

## Error Responses

### Invalid Signature
```json
{
  "statusCode": 401,
  "statusText": "UNAUTHORIZED",
  "message": "Invalid signature",
  "reason": "Authentication failed"
}
```

### Invalid Digest
```json
{
  "statusCode": 400,
  "statusText": "BAD_REQUEST",
  "message": "Invalid digest",
  "reason": "Request body has been tampered with"
}
```

### Expired Timestamp
```json
{
  "statusCode": 401,
  "statusText": "UNAUTHORIZED",
  "message": "Expired timestamp",
  "reason": "Request timestamp is too old"
}
```

## Testing

### Test Credentials
Use these test credentials for development:

```bash
MERCHANT_ID=test-merchant-001
API_KEY=pk_test_abc123
API_SECRET=sk_test_secret456
```

### Verify Your Implementation
1. Generate signature and digest
2. Make API request with headers
3. Check response for errors
4. Verify signature generation is correct
5. Test with expired timestamp (should fail)

## Migration from Body-Based Auth

If you're migrating from the old body-based authentication:

### Before (Body-Based)
```javascript
const payload = {
  security: {
    username: 'user',
    password: 'pass'
  },
  signature: 'static-sig',
  order_id: 'order-123',
  // ... business data
};

axios.post(url, payload);
```

### After (Header-Based)
```javascript
const requestBody = {
  order_id: 'order-123',
  // ... business data only
};

const headers = generateGatewayHeaders(targetApi, requestBody, config);

axios.post(url, requestBody, { headers });
```

### Key Changes
1. Remove `security` object from request body
2. Remove static `signature` from request body
3. Generate dynamic signature per request
4. Add all authentication headers
5. Generate digest of request body
6. Use only `paymentOrderId` for verification

## Support

For authentication issues, check:
1. Signature generation algorithm
2. Timestamp format (must be ISO 8601)
3. API secret is correct
4. All required headers are present
5. Request body matches digest

For further assistance, contact PSO Support.
