# SDK API Specification Update

## Date: February 9, 2026

## Summary
Updated the PSO Payment SDK to match the exact Payment Gateway API Integration Documentation specifications with TNPG authentication headers.

## Changes Made

### 1. Correct API Endpoint

**SDK Endpoint:**
```
POST /payment/api/v1/p/service/api/payment/processing/payment-order
```

**Gateway Routes:**
- Legacy: `/api/payment/create` (still supported)
- TNPG: `/payment/api/v1/p/service/api/payment/processing/payment-order` (new)

### 2. TNPG Authentication Headers

The gateway automatically generates these headers when calling the real payment gateway:

```http
X-TNPG-TIMESTAMP: Mon, 09 Feb 2026 07:47:49 GMT
X-TNPG-HOST: http://192.168.169.162:8094
X-TNPG-TARGET-API: POST /p/service/api/payment/processing/payment-order
X-TNPG-MERCHANT-ID: M12345
X-TNPG-API-KEY: test
X-TNPG-SIGNATURE: kh1Z3x+wZYAJxoZ1dMHqXpAfsl2FLiUuj28WcVIs1/A=
X-TNPG-DIGEST: SHA-256=3jAQ+6GzudFl4RFEvj6KAOlRmTF8D9FJR0Dz5vIhWQ8=
```

**Header Generation Details:**
- **TIMESTAMP**: GMT format (e.g., `Mon, 09 Feb 2026 07:47:49 GMT`)
- **HOST**: Full URL with protocol (e.g., `http://192.168.169.162:8094`)
- **TARGET-API**: HTTP method + path (e.g., `POST /p/service/api/payment/processing/payment-order`)
- **SIGNATURE**: Base64-encoded HMAC-SHA256 of `timestamp|host|targetApi|merchantId|apiKey`
- **DIGEST**: `SHA-256=` prefix + base64-encoded SHA256 hash of request body

### 3. SDK Request Body Structure ([sdk/src/payment-sdk.js](sdk/src/payment-sdk.js))

**Before:**
```javascript
{
  orderId: "ORDER-123",
  amount: 1000,
  currency: "BDT",
  customerInfo: {...},
  productInfo: {...}
}
```

**After (matches API spec):**
```javascript
{
  order_id: "ORDER-123",
  order_information: {
    payable_amount: 1000.00,  // float
    currency_code: "BDT"
  },
  customer_information: {...},
  product_information: {...},
  promotion_information: {...},  // optional
  discount_detail: {...},        // optional
  mdf_1: "",                     // merchant defined fields
  mdf_2: "",
  mdf_3: "",
  ipn_url: "...",
  success_url: "...",
  cancel_url: "...",
  failure_url: "..."
}
```

### 2. SDK Payment Options

Added support for:
- `promotionInfo` - Promotion information (preferred_channel, allowed_bin)
- `discountDetail` - Discount details (discount_amount)
- Merchant Defined Fields (MDF 1-6) via `customFields`

### 3. Gateway Route Handler ([gateway/routes/payment-gateway.js](gateway/routes/payment-gateway.js))

Updated `/api/payment/create` endpoint to:
- Accept request body in exact API specification format
- Parse `order_information.payable_amount` and `order_information.currency_code`
- Extract customer_information, product_information, promotion_information, discount_detail
- Handle merchant defined fields (mdf_1 through mdf_6)

### 4. Response Structure

The SDK now properly handles the API response:
```javascript
{
  success: true,
  transactionId: "payment_order_id",    // from order_detail.payment_order_id
  sessionId: "session_id",              // from order_detail.session_id
  gatewayPageUrl: "https://...",        // gateway_page_url
  orderDetail: {                        // complete order_detail object
    payment_order_id: "...",
    order_status: "UNATTEMPTED",
    session_id: "..."
  }
}
```

### 5. Data Type Handling

- `payable_amount`: Converted to float using `parseFloat()`
- Empty optional objects: Sent as `{}` not `[]`
- Field names: Use snake_case as per API specification

## Integration Example

A complete integration example is available at [demo/complete-integration.html](demo/complete-integration.html) that demonstrates:

- All required fields (order_id, order_information)
- Optional fields (promotion_information, discount_detail)
- Customer and product information
- Merchant defined fields (MDF 1-6)
- Full request/response structure

## Testing

To test the updated SDK:

1. Start the gateway:
```bash
cd gateway && npm start
```

2. Open the demo:
```bash
open demo/complete-integration.html
```

3. Fill in the form and click "Initiate Payment"

## API Endpoints

- **Create Order**: `POST /api/payment/create`
- **Verify Payment**: `POST /api/payment/verify`
- **Staging Base URL**: `https://api-stage.tnextpay.com`
- **Local Base URL**: `http://localhost:3000`

## Status Codes

Payment verification returns transaction_info with:
- `APPROVED` - status_code: 1002
- `DECLINED` - status_code: 1003
- `CANCELLED` - status_code: 1004
- `FAILED` - status_code: 1005

## Files Modified

1. [sdk/src/payment-sdk.js](sdk/src/payment-sdk.js) - Updated to use correct TNPG endpoint
2. [gateway/routes/payment-gateway.js](gateway/routes/payment-gateway.js) - Added `/payment-order` route handler
3. [gateway/server.js](gateway/server.js) - Mounted TNPG endpoint path
4. [gateway/services/auth-helper.js](gateway/services/auth-helper.js) - Updated header generation:
   - GMT timestamp format
   - Base64-encoded signature
   - SHA-256= prefixed digest
   - Protocol in host header
   - POST method in target-api header
5. [sdk/src/styles.css](sdk/src/styles.css) - Fixed CSS syntax error
6. [demo/complete-integration.html](demo/complete-integration.html) - Created comprehensive integration example
7. [test-tnpg-headers.js](test-tnpg-headers.js) - Created test script for header validation

## Build

SDK rebuilt successfully with webpack:
```bash
cd sdk && npm run build
# Output: sdk/dist/pso-sdk.js (19.9 KiB)
```

## Testing

### Test TNPG Headers
```bash
node test-tnpg-headers.js
```

**Output:**
```
✓ Timestamp format: PASS
✓ Host includes protocol: PASS
✓ Target API includes POST: PASS
✓ Digest has SHA-256= prefix: PASS
✓ Signature is base64: PASS
```

### Test Integration

1. Test end-to-end payment flow with staging gateway
2. Verify all optional fields are properly handled
3. Test payment verification endpoint
4. Implement IPN (Instant Payment Notification) handling
