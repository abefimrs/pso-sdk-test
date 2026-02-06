# PSO Payment SDK Documentation

## Table of Contents
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [SDK Reference](#sdk-reference)
- [Test Gateway](#test-gateway)
- [Security](#security)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Introduction

The PSO Payment SDK is a comprehensive payment gateway solution designed for easy integration into merchant websites. It provides:

- **In-host pop-up** for secure payment processing
- **Real-time validation** of payment information
- **Test gateway** for development and testing
- **Responsive design** that works on all devices
- **Security features** including XSS protection and input sanitization

⚠️ **IMPORTANT**: This is a test/demo implementation for educational purposes only. Do not use for real payment processing.

## Getting Started

### Prerequisites

- Node.js 14+ (for building the SDK)
- Modern web browser with JavaScript enabled
- Basic understanding of JavaScript and HTML

### Quick Start

1. **Start the Test Gateway**:
```bash
cd gateway
npm install
npm start
```

The gateway will start on http://localhost:3000

2. **Build the SDK**:
```bash
cd sdk
npm install
npm run build
```

This creates the bundled SDK at `sdk/dist/pso-sdk.js`

3. **Open the Demo**:
Open `demo/index.html` in your browser (you may need to use a local web server)

## Installation

### Option 1: CDN (Script Tag)

```html
<script src="https://cdn.pso-gateway.com/sdk/pso-sdk.js"></script>
```

### Option 2: NPM Package

```bash
npm install @pso/payment-sdk
```

```javascript
import PSOPayment from '@pso/payment-sdk';
```

### Option 3: Local Build

Copy `sdk/dist/pso-sdk.js` to your project and include it:

```html
<script src="path/to/pso-sdk.js"></script>
```

## SDK Reference

### Initialization

```javascript
const pso = new PSOPayment({
  merchantId: 'your-merchant-id',  // Required
  environment: 'test',              // 'test' or 'production'
  gatewayUrl: 'http://localhost:3000', // Optional, defaults based on environment
  debug: true                       // Optional, enables console logging
});
```

#### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `merchantId` | String | Yes | Your unique merchant identifier |
| `environment` | String | No | 'test' or 'production' (default: 'test') |
| `gatewayUrl` | String | No | Custom gateway URL |
| `debug` | Boolean | No | Enable debug logging (default: false) |

### Methods

#### showPaymentForm(options)

Display the payment form pop-up.

```javascript
pso.showPaymentForm({
  amount: 2999,           // Required: Amount in cents
  currency: 'USD',        // Optional: Currency code (default: 'USD')
  onSuccess: (result) => {
    // Handle successful payment
    console.log('Transaction ID:', result.transactionId);
    console.log('Amount:', result.amount);
  },
  onError: (error) => {
    // Handle payment failure
    console.error('Error:', error.message);
  },
  onCancel: () => {
    // Handle user cancellation
    console.log('Payment cancelled');
  },
  metadata: {            // Optional: Additional data
    orderId: '12345',
    customerId: 'user-001'
  }
});
```

##### Payment Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `amount` | Number | Yes | Payment amount in cents (e.g., 2999 = $29.99) |
| `currency` | String | No | Currency code (default: 'USD') |
| `onSuccess` | Function | No | Callback for successful payment |
| `onError` | Function | No | Callback for payment errors |
| `onCancel` | Function | No | Callback when user closes the form |
| `metadata` | Object | No | Additional data to attach to the transaction |

##### Success Response

```javascript
{
  success: true,
  transactionId: "550e8400-e29b-41d4-a716-446655440000",
  amount: 2999,
  currency: "USD",
  message: "Payment successful",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

##### Error Response

```javascript
{
  success: false,
  transactionId: "550e8400-e29b-41d4-a716-446655440000",
  message: "Card declined - Insufficient funds",
  status: "declined"
}
```

#### closePaymentForm()

Programmatically close the payment form.

```javascript
pso.closePaymentForm();
```

#### createPaymentToken(cardData)

Create a payment token for advanced integrations (returns a Promise).

```javascript
const token = await pso.createPaymentToken({
  cardNumber: '4111111111111111',
  expiry: '12/25',
  cvv: '123'
});
```

#### verifyPayment(transactionId)

Verify a payment transaction (returns a Promise).

```javascript
const verification = await pso.verifyPayment('transaction-id');
console.log(verification.transaction);
```

## Test Gateway

### Starting the Gateway

```bash
cd gateway
npm install
npm start
```

The gateway runs on port 3000 by default.

### API Endpoints

#### POST /api/payments/process

Process a payment transaction.

**Request:**
```json
{
  "cardNumber": "4111111111111111",
  "expiry": "12/25",
  "cvv": "123",
  "cardholderName": "John Doe",
  "amount": 2999,
  "currency": "USD"
}
```

**Headers:**
```
Content-Type: application/json
X-Merchant-ID: your-merchant-id
```

#### GET /api/payments/verify/:transactionId

Verify a payment transaction.

**Headers:**
```
X-Merchant-ID: your-merchant-id
```

#### GET /api/payments/transactions

Get all transactions (admin endpoint).

#### POST /api/tokens/create

Create a payment token.

### Admin Interface

Access the admin interface at http://localhost:3000/admin to view:
- Transaction statistics
- Recent transactions
- Success/failure rates
- Transaction details

### Test Card Numbers

Use these test card numbers to simulate different scenarios:

| Card Number | Scenario | Description |
|-------------|----------|-------------|
| 4111111111111111 | Success | Payment processes successfully |
| 4242424242424242 | Success | Payment processes successfully |
| 5555555555554444 | Success | Mastercard - Success |
| 4000000000000002 | Declined | Insufficient funds |
| 4000000000000069 | Declined | Expired card |
| 4000000000000127 | Declined | Incorrect CVC |
| 4000000000000119 | Error | Processing error |
| 4000000000000341 | Error | Lost card |
| 4000000000000259 | Error | Restricted card |

**Notes:**
- Any future expiry date works (e.g., 12/25)
- Any 3-4 digit CVV works (e.g., 123)
- Any cardholder name with 3+ characters works

## Security

### Input Validation

The SDK validates all payment information:
- **Card Number**: Luhn algorithm check + length validation
- **Expiry Date**: Format and date validation
- **CVV**: Length validation (3-4 digits)
- **Cardholder Name**: Minimum length and character validation

### XSS Protection

All user inputs are sanitized before display to prevent cross-site scripting attacks.

### HTTPS Enforcement

Production environments require HTTPS. The SDK will warn if used over HTTP in production mode.

### Data Transmission

Payment data is transmitted using:
- HTTPS encryption (in production)
- JSON format
- Merchant ID authentication

### PCI DSS Considerations

⚠️ This is a test implementation. For real payment processing:
- Never store raw card numbers
- Use tokenization
- Implement proper encryption
- Follow PCI DSS compliance requirements
- Use certified payment processors

## Examples

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
</head>
<body>
  <button onclick="checkout()">Buy Now - $29.99</button>

  <script src="pso-sdk.js"></script>
  <script>
    const pso = new PSOPayment({
      merchantId: 'merchant-001',
      environment: 'test'
    });

    function checkout() {
      pso.showPaymentForm({
        amount: 2999,
        currency: 'USD',
        onSuccess: (result) => {
          alert('Payment successful! Transaction: ' + result.transactionId);
          // Redirect to success page or update UI
        },
        onError: (error) => {
          alert('Payment failed: ' + error.message);
        }
      });
    }
  </script>
</body>
</html>
```

### E-Commerce Integration

```javascript
// Product catalog
const products = {
  'prod-001': { name: 'Laptop', price: 99999 },
  'prod-002': { name: 'Mouse', price: 2999 }
};

// Initialize SDK
const pso = new PSOPayment({
  merchantId: 'store-merchant-id',
  environment: 'production',
  debug: false
});

// Checkout function
function checkout(productId) {
  const product = products[productId];
  
  pso.showPaymentForm({
    amount: product.price,
    currency: 'USD',
    metadata: {
      productId: productId,
      productName: product.name
    },
    onSuccess: async (result) => {
      // Call your backend to fulfill the order
      await fetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: result.transactionId,
          productId: productId,
          amount: result.amount
        })
      });
      
      // Redirect to success page
      window.location.href = '/order-success';
    },
    onError: (error) => {
      // Show error message to user
      showErrorMessage(error.message);
    }
  });
}
```

### Subscription Payment

```javascript
function subscribeMonthly() {
  pso.showPaymentForm({
    amount: 999, // $9.99
    currency: 'USD',
    metadata: {
      type: 'subscription',
      plan: 'monthly'
    },
    onSuccess: async (result) => {
      // Save transaction and create subscription
      await createSubscription({
        transactionId: result.transactionId,
        plan: 'monthly'
      });
      
      alert('Subscription activated!');
    },
    onError: (error) => {
      alert('Subscription failed: ' + error.message);
    }
  });
}
```

## Troubleshooting

### Common Issues

#### SDK not loading
- Check that the script path is correct
- Verify the file exists at the specified location
- Check browser console for errors

#### Payment form not showing
- Ensure SDK is initialized before calling `showPaymentForm()`
- Check that amount is a positive number
- Verify merchantId is provided

#### CORS errors
- Make sure gateway is running on localhost:3000
- Check that CORS is enabled in gateway configuration
- Verify the gatewayUrl in SDK config matches the actual gateway URL

#### Payment always fails
- Check that the test gateway is running
- Verify you're using valid test card numbers
- Check browser console for network errors
- Ensure merchantId is being sent in headers

### Debug Mode

Enable debug mode to see detailed console logs:

```javascript
const pso = new PSOPayment({
  merchantId: 'test',
  environment: 'test',
  debug: true  // Enable debug logging
});
```

### Getting Help

1. Check the browser console for error messages
2. Verify gateway is running: http://localhost:3000/health
3. Test with known-good test card: 4111111111111111
4. Review the demo files for working examples

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - This is a test/demo implementation for educational purposes only.
