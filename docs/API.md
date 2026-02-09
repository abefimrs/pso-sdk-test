# Payment Gateway API Documentation

## Overview

This document describes the Payment Gateway API endpoints, request/response formats, and integration patterns.

**Base URLs:**
- **Staging**: `https://api-stage.tnextpay.com`
- **Local Development**: `http://192.168.169.162:8094`

**Authentication**: Header-based authentication using HMAC-SHA256 signatures. See [AUTHENTICATION.md](./AUTHENTICATION.md) for details.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Create Payment Order](#create-payment-order)
3. [Verify Payment](#verify-payment)
4. [Payment Status Inquiry](#payment-status-inquiry)
5. [IPN (Instant Payment Notification)](#ipn-instant-payment-notification)
6. [Error Responses](#error-responses)
7. [Status Codes](#status-codes)

---

## Authentication

All API requests require the following HTTP headers:

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

**See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed signature and digest generation.**

---

## Create Payment Order

Creates a new payment order and returns a gateway page URL for customer payment.

### Endpoint

```
POST /payment/api/v1/p/service/api/payment/processing/payment-order
```

### Request Headers

All [authentication headers](#authentication) are required.

### Request Body

```json
{
  "order_id": "merchant-order-123",
  "order_information": {
    "payable_amount": 1000.00,
    "currency_code": "BDT"
  },
  "ipn_url": "https://merchant.com/ipn",
  "success_url": "https://merchant.com/success",
  "cancel_url": "https://merchant.com/cancel",
  "failure_url": "https://merchant.com/failure",
  "promotion_information": {
    "preferred_channel": "VISA",
    "allowed_bin": "123456,234567"
  },
  "discount_detail": {},
  "mdf_1": "custom-data-1",
  "mdf_2": "custom-data-2",
  "mdf_3": "custom-data-3",
  "mdf_4": "custom-data-4",
  "mdf_5": "custom-data-5",
  "mdf_6": "custom-data-6",
  "customer_information": {
    "name": "Customer Name",
    "email": "customer@email.com",
    "phone": "+8801234567890"
  },
  "product_information": {
    "name": "Product Name",
    "description": "Product Description",
    "quantity": 1
  },
  "shipment_information": {
    "address": "Shipping Address",
    "city": "City",
    "country": "Country"
  }
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | String | Yes | Unique order identifier from merchant |
| `order_information` | Object | Yes | Order amount and currency details |
| `order_information.payable_amount` | Number | Yes | Amount to be paid |
| `order_information.currency_code` | String | Yes | Currency code (BDT, USD, etc.) |
| `ipn_url` | String | Yes | URL for payment notifications |
| `success_url` | String | Yes | Redirect URL on successful payment |
| `cancel_url` | String | Yes | Redirect URL when payment is cancelled |
| `failure_url` | String | Yes | Redirect URL when payment fails |
| `promotion_information` | Object | No | Promotion and channel preferences |
| `discount_detail` | Object | No | Discount details |
| `mdf_1` to `mdf_6` | String | No | Custom merchant-defined fields |
| `customer_information` | Object | No | Customer details |
| `product_information` | Object | No | Product details |
| `shipment_information` | Object | No | Shipping details |

### Success Response (200 OK)

```json
{
  "order_detail": {
    "payment_order_id": "pso-12345678",
    "order_status": "UNATTEMPTED",
    "session_id": "session-abc123"
  },
  "gateway_page_url": "https://payment-gateway.com/pay/session-abc123",
  "token_response": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "reason": "Order ID already exists",
  "message": "DUPLICATE_PAYMENT_ORDER",
  "statusText": "BAD_REQUEST",
  "statusCode": 400
}
```

### Example (Node.js)

```javascript
const axios = require('axios');
const authHelper = require('./auth-helper');

const config = {
  baseUrl: 'https://api-stage.tnextpay.com',
  host: 'api-stage.tnextpay.com',
  merchantId: 'merchant-123',
  apiKey: 'pk_live_abc123',
  apiSecret: 'sk_live_secret456'
};

const targetApi = '/payment/api/v1/p/service/api/payment/processing/payment-order';

const requestBody = {
  order_id: 'order-' + Date.now(),
  order_information: {
    payable_amount: 1000.00,
    currency_code: 'BDT'
  },
  ipn_url: 'https://merchant.com/ipn',
  success_url: 'https://merchant.com/success',
  cancel_url: 'https://merchant.com/cancel',
  failure_url: 'https://merchant.com/failure',
  customer_information: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+8801234567890'
  }
};

// Generate headers
const headers = authHelper.generateGatewayHeaders(targetApi, requestBody, config);

// Make request
const response = await axios.post(
  `${config.baseUrl}${targetApi}`,
  requestBody,
  { headers }
);

console.log('Payment Order ID:', response.data.order_detail.payment_order_id);
console.log('Gateway URL:', response.data.gateway_page_url);
```

---

## Verify Payment

Verifies the status of a payment after completion.

### Endpoint

```
POST /payment/api/v1/p/service/api/payment/processing/verify
```

### Request Headers

All [authentication headers](#authentication) are required.

### Request Body

```json
{
  "paymentOrderId": "pso-12345678"
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentOrderId` | String | Yes | Payment order ID from create order response |

### Success Response (200 OK)

```json
{
  "transaction_info": {
    "status": "APPROVED",
    "status_code": "1002",
    "order_id": "merchant-order-123",
    "order_tracking_id": "pso-12345678",
    "transaction_date": "2026-02-08 12:30:45",
    "bank_transaction_id": "bank-txn-789",
    "amount": 1000.00,
    "currency": "BDT",
    "currency_amount": 1000.00,
    "currency_type": "BDT",
    "merchant_amount": 1000.00
  }
}
```

### Error Response (404 Not Found)

```json
{
  "reason": "Payment order not found",
  "message": "PAYMENT_ORDER_NOT_FOUND",
  "statusText": "NOT_FOUND",
  "statusCode": 404
}
```

### Example (Node.js)

```javascript
const targetApi = '/payment/api/v1/p/service/api/payment/processing/verify';

const requestBody = {
  paymentOrderId: 'pso-12345678'
};

const headers = authHelper.generateGatewayHeaders(targetApi, requestBody, config);

const response = await axios.post(
  `${config.baseUrl}${targetApi}`,
  requestBody,
  { headers }
);

console.log('Payment Status:', response.data.transaction_info.status);
console.log('Status Code:', response.data.transaction_info.status_code);
```

---

## Payment Status Inquiry

Inquires about the current status of a payment using the merchant's order ID.

### Endpoint

```
POST /payment/api/v1/p/service/api/payment/processing/inquiry
```

### Request Headers

All [authentication headers](#authentication) are required.

### Request Body

```json
{
  "order_id": "merchant-order-123",
  "merchant_code": "merchant-123"
}
```

### Success Response (200 OK)

Similar to verify payment response.

---

## IPN (Instant Payment Notification)

The gateway sends payment status updates to your IPN URL.

### Your IPN Endpoint

You must implement an endpoint to receive IPN notifications:

```
POST https://merchant.com/ipn
```

### IPN Request Body

```json
{
  "order_id": "merchant-order-123",
  "order_tracking_id": "pso-12345678",
  "status": "APPROVED",
  "status_code": "1002",
  "transaction_id": "bank-txn-789",
  "amount": 1000.00,
  "currency": "BDT",
  "transaction_date": "2026-02-08 12:30:45"
}
```

### IPN Response

Your endpoint should respond with:

```json
{
  "success": true,
  "message": "IPN received"
}
```

### IPN Best Practices

1. **Acknowledge immediately**: Respond with 200 OK as quickly as possible
2. **Validate signature**: Verify the IPN is from the gateway (if signature provided)
3. **Prevent duplicates**: Check if the IPN was already processed
4. **Process asynchronously**: Queue the IPN for background processing
5. **Update order status**: Update your database with the payment status
6. **Log everything**: Keep detailed logs for debugging

### Example IPN Handler (Express.js)

```javascript
app.post('/ipn', async (req, res) => {
  try {
    const { order_id, status, transaction_id } = req.body;
    
    // Log IPN
    console.log('IPN received:', req.body);
    
    // Check for duplicate
    const existing = await db.getIPNRecord(transaction_id);
    if (existing) {
      return res.json({ success: true, message: 'Already processed' });
    }
    
    // Update order status
    await db.updateOrderStatus(order_id, status);
    
    // Record IPN
    await db.recordIPN(req.body);
    
    // Acknowledge
    res.json({ success: true, message: 'IPN received' });
    
  } catch (error) {
    console.error('IPN error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Error Responses

### Common Error Codes

| Status Code | Message | Description |
|-------------|---------|-------------|
| 400 | BAD_REQUEST | Invalid request format or parameters |
| 401 | UNAUTHORIZED | Invalid signature or authentication |
| 404 | NOT_FOUND | Payment order not found |
| 409 | CONFLICT | Duplicate order ID |
| 500 | INTERNAL_SERVER_ERROR | Gateway error |

### Error Response Format

```json
{
  "statusCode": 400,
  "statusText": "BAD_REQUEST",
  "message": "DUPLICATE_PAYMENT_ORDER",
  "reason": "Order ID already exists"
}
```

---

## Status Codes

### Payment Status Codes

| Status | Code | Description |
|--------|------|-------------|
| APPROVED | 1002 | Payment successful |
| DECLINED | 1003 | Payment declined by bank |
| CANCELLED | 1004 | Payment cancelled by customer |
| FAILED | 1005 | Payment failed |
| UNATTEMPTED | - | Payment not yet attempted |
| PENDING | - | Payment processing |

### Order Status Flow

```
UNATTEMPTED → PENDING → APPROVED/DECLINED/CANCELLED/FAILED
```

---

## Rate Limits

- **Create Payment Order**: 100 requests per minute
- **Verify Payment**: 200 requests per minute
- **Payment Inquiry**: 200 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1612345678
```

---

## Testing

### Test Credentials

```
MERCHANT_ID=test-merchant-001
API_KEY=pk_test_abc123
API_SECRET=sk_test_secret456
```

### Test Environment

Use the staging URL for testing:
```
https://api-stage.tnextpay.com
```

---

## Support

For API support and issues:
- Email: support@pso-gateway.com
- Documentation: https://docs.pso-gateway.com
- Status Page: https://status.pso-gateway.com
