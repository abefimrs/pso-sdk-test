# SDK Update - Gateway Redirect Integration

## Changes Summary

The SDK has been updated to work with the real payment gateway flow instead of collecting card data directly.

## What Changed

### Before (Card Collection Mode)
- SDK displayed a card entry form in popup
- Collected card number, expiry, CVV directly
- Sent card data to test gateway endpoint

### After (Gateway Redirect Mode)
- SDK creates payment order with gateway
- Gets `gatewayPageUrl` from gateway API
- Opens gateway URL in iframe/popup
- Gateway handles card collection and 3DS
- Listens for payment completion via postMessage

## Updated SDK API

### Initialize SDK
```javascript
const pso = new PSOPayment({
  merchantId: 'your-merchant-id',
  environment: 'test', // or 'production'
  gatewayUrl: 'http://localhost:3000', // Gateway API URL
  usePopupWindow: false, // true = popup window, false = iframe (default)
  debug: true
});
```

### Show Payment Form
```javascript
pso.showPaymentForm({
  // Required
  amount: 1000,              // Amount in currency units (BDT 1000)
  currency: 'BDT',           // Currency code
  
  // Optional
  orderId: 'ORDER-123',      // Auto-generated if not provided
  
  // Customer Information
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+8801712345678',
    address: 'Dhaka, Bangladesh'
  },
  
  // Product Information
  productInfo: {
    name: 'Product Name',
    description: 'Product Description',
    quantity: 1
  },
  
  // Custom URLs (optional)
  successUrl: 'https://yoursite.com/payment/success',
  cancelUrl: 'https://yoursite.com/payment/cancel',
  failureUrl: 'https://yoursite.com/payment/failure',
  ipnUrl: 'https://yoursite.com/payment/ipn',
  
  // Custom Fields
  customFields: {
    mdf_1: 'custom value 1',
    mdf_2: 'custom value 2'
  },
  
  // Callbacks
  onSuccess: (result) => {
    console.log('Payment successful:', result);
    // result contains: transactionId, sessionId, status, etc.
  },
  
  onError: (error) => {
    console.error('Payment failed:', error);
    // error contains: message, transactionId, etc.
  },
  
  onCancel: () => {
    console.log('Payment cancelled by user');
  }
});
```

## Payment Flow

1. **Merchant initiates payment**
   ```javascript
   pso.showPaymentForm({ amount: 1000, currency: 'BDT', ... })
   ```

2. **SDK calls gateway API**
   ```
   POST /api/payment/create
   {
     orderId, amount, currency, customerInfo, productInfo, ...
   }
   ```

3. **Gateway returns**
   ```json
   {
     "success": true,
     "transactionId": "TXN-123",
     "sessionId": "SESSION-456",
     "gatewayPageUrl": "https://gateway.example.com/payment/SESSION-456"
   }
   ```

4. **SDK opens gateway URL**
   - In iframe (default) - embedded in popup overlay
   - Or popup window (if `usePopupWindow: true`)

5. **Customer completes payment**
   - Enters payment details on gateway page
   - Completes 3DS authentication if required
   - Gateway processes payment

6. **Gateway sends completion message**
   - Via `postMessage` to parent window
   - Or redirects to success/failure URL

7. **SDK triggers callback**
   - `onSuccess()` - Payment completed
   - `onError()` - Payment failed
   - `onCancel()` - User cancelled

## Verify Payment Status

```javascript
// Verify payment after completion
const result = await pso.verifyPaymentStatus(paymentOrderId);

if (result.success) {
  console.log('Transaction Info:', result.transactionInfo);
  // status, amount, currency, timestamp, etc.
}
```

## Gateway Integration Requirements

The gateway page should send postMessage on completion:

```javascript
// On payment success
window.parent.postMessage({
  type: 'PAYMENT_SUCCESS',
  success: true,
  transactionId: 'TXN-123',
  status: 'SUCCESS'
}, '*');

// On payment failure
window.parent.postMessage({
  type: 'PAYMENT_FAILURE',
  success: false,
  message: 'Payment declined'
}, '*');

// On cancellation
window.parent.postMessage({
  type: 'PAYMENT_CANCEL',
  success: false
}, '*');
```

## Features

✅ **Gateway Redirect Support** - Opens real gateway URL  
✅ **3DS Authentication** - Gateway handles all authentication  
✅ **Iframe/Popup Modes** - Choose between embedded or popup  
✅ **Automatic Message Listening** - Detects payment completion  
✅ **URL Redirect Detection** - Monitors success/failure URLs  
✅ **Clean Callbacks** - Simple onSuccess/onError/onCancel  
✅ **Transaction Tracking** - Get transactionId and sessionId  
✅ **Full Security** - No card data touches merchant site  

## Migration Guide

### Old Code
```javascript
pso.showPaymentForm({
  amount: 2999,
  currency: 'USD',
  onSuccess: (result) => { ... }
});
```

### New Code
```javascript
pso.showPaymentForm({
  orderId: 'ORDER-' + Date.now(),
  amount: 2999,
  currency: 'BDT',
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  productInfo: {
    name: 'Product Name'
  },
  onSuccess: (result) => { ... }
});
```

## Testing

1. **Start Gateway (PHP)**
   ```bash
   cd gateway-php
   php -S localhost:3000 index.php
   ```

2. **Build SDK**
   ```bash
   cd sdk
   npm run build
   ```

3. **Open Demo**
   ```bash
   # Open demo/index.html in browser
   # Or serve with:
   python3 -m http.server 8000
   # Then visit: http://localhost:8000/demo/
   ```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `merchantId` | string | required | Your merchant ID |
| `environment` | string | 'test' | 'test' or 'production' |
| `gatewayUrl` | string | auto | Gateway API base URL |
| `usePopupWindow` | boolean | false | Use popup window instead of iframe |
| `debug` | boolean | false | Enable debug logging |

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers supported

## Notes

- Gateway URL must allow iframe embedding (X-Frame-Options)
- For popup window mode, popup blockers must allow popups
- postMessage is used for cross-origin communication
- Success/failure URLs are used as fallback detection
