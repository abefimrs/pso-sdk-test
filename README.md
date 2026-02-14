# PSO Payment Gateway SDK

A comprehensive payment gateway solution with client-side SDK and test gateway for secure payment processing.

⚠️ **IMPORTANT**: This is a test/demo implementation for educational purposes only. **Do not use for real payment processing.**

## Features

- 💳 **Payment Gateway SDK**: JavaScript library for merchant integration
- 🔐 **Header-Based Authentication**: Secure HMAC-SHA256 signature authentication
- 🧪 **Test Gateway**: Mock payment processor for development
- 📱 **In-Host Pop-up**: Secure payment form overlay with responsive design
- ✅ **Form Validation**: Real-time validation with user-friendly error messages
- 🛡️ **Security**: Input validation, XSS protection, Luhn algorithm checks
- 🎨 **Customizable**: Clean, modern UI that works on all devices
- 📊 **Admin Dashboard**: View test transactions and statistics
- 📚 **Documentation**: Complete integration guides and examples
- 🔒 **Backend Proxy**: Secure credential management and API communication

## Installation via NPM

```bash
npm install @pso/payment-sdk
```

### Usage

```javascript
import PSOPayment from '@pso/payment-sdk';

const pso = new PSOPayment({
  merchantId: 'your-merchant-id',
  environment: 'production'
});

await pso.showPaymentForm({
  amount: 1000,
  currency: 'BDT',
  customer: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+880123456789'
  },
  onSuccess: (data) => console.log('Success!', data),
  onError: (error) => console.error('Error:', error),
  onCancel: () => console.log('Payment cancelled')
});
```

### CDN Usage

```html
<!-- Include SDK from CDN -->
<script src="https://unpkg.com/@pso/payment-sdk@1.0.0/dist/pso-sdk.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@pso/payment-sdk@1.0.0/dist/pso-sdk.css">

<script>
  const pso = new PSOPayment({
    merchantId: 'your-merchant-id',
    environment: 'production'
  });
</script>
```

**Alternative CDN (jsDelivr):**

```html
<script src="https://cdn.jsdelivr.net/npm/@pso/payment-sdk@1.0.0/dist/pso-sdk.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@pso/payment-sdk@1.0.0/dist/pso-sdk.css">
```

## Quick Start (Development)

### 1. Install Dependencies

```bash
npm run install:all
```

Or install individually:
```bash
cd sdk && npm install
cd gateway && npm install
```

### 2. Build the SDK

```bash
npm run build:sdk
```

This creates the bundled SDK at `sdk/dist/pso-sdk.js`

### 3. Start the Test Gateway

```bash
npm run start:gateway
```

The gateway will start on http://localhost:3000

**Gateway Endpoints:**
- 🏠 Home: http://localhost:3000
- 📊 Admin Dashboard: http://localhost:3000/admin
- ⚡ Health Check: http://localhost:3000/health
- 💰 Payment API: http://localhost:3000/api/payments/process

### 4. View the Demo

Open the demo files in your browser:
- **Main Demo**: `demo/index.html`
- **E-Commerce Example**: `demo/merchant-example.html`

You can use a simple HTTP server:
```bash
# Python
python3 -m http.server 8000

# Node.js
npx http-server
```

Then navigate to http://localhost:8000/demo/

## SDK Integration Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
</head>
<body>
  <button onclick="checkout()">Buy Now - $29.99</button>

  <!-- Include the SDK -->
  <script src="sdk/dist/pso-sdk.js"></script>
  
  <script>
    // Initialize the SDK
    const pso = new PSOPayment({
      merchantId: 'your-merchant-id',
      environment: 'test',
      gatewayUrl: 'http://localhost:3000'
    });

    // Show payment form
    function checkout() {
      pso.showPaymentForm({
        amount: 2999, // $29.99 in cents
        currency: 'USD',
        onSuccess: (result) => {
          console.log('Payment successful:', result);
          alert('Payment successful! Transaction ID: ' + result.transactionId);
        },
        onError: (error) => {
          console.error('Payment failed:', error);
          alert('Payment failed: ' + error.message);
        }
      });
    }
  </script>
</body>
</html>
```

## Repository Structure

```
/
├── sdk/                    # Payment SDK
│   ├── src/
│   │   ├── payment-sdk.js  # Main SDK class
│   │   ├── popup.js        # Pop-up manager
│   │   ├── validation.js   # Form validation
│   │   └── styles.css      # Pop-up styles
│   ├── dist/               # Built SDK (generated)
│   ├── webpack.config.js   # Build configuration
│   └── package.json
├── gateway/                # Payment Gateway Backend
│   ├── server.js           # Express server
│   ├── routes/
│   │   ├── payments.js     # Test payment endpoints
│   │   ├── payment-gateway.js  # Real gateway integration
│   │   └── tokens.js       # Token endpoints
│   ├── services/
│   │   ├── gateway-client.js   # Gateway API client
│   │   ├── auth-helper.js      # Authentication & signatures
│   │   └── signature.js        # Signature utilities
│   ├── middleware/
│   │   ├── auth.js         # Authentication middleware
│   │   ├── validator.js    # Input validation
│   │   └── rate-limit.js   # Rate limiting
│   ├── models/
│   │   └── transaction.js  # Transaction storage
│   ├── config/
│   │   └── config.js       # Configuration
│   └── package.json
├── demo/                   # Demo and Examples
│   ├── index.html          # Main demo
│   └── merchant-example.html
├── docs/                   # Documentation
│   ├── README.md           # SDK documentation
│   ├── API.md              # API reference
│   ├── INTEGRATION.md      # Integration guide
│   └── AUTHENTICATION.md   # Authentication guide
├── test/                   # Tests
│   ├── test-auth-helper.js # Auth helper tests
│   └── test-gateway-client.js  # Gateway client tests
├── .env.example            # Environment variables template
└── package.json            # Root package.json
```

## Test Cards

Use these test card numbers to simulate different payment scenarios:

| Card Number         | Scenario              | Description                        |
|--------------------|-----------------------|------------------------------------|
| 4111111111111111   | ✅ Success            | Payment processes successfully     |
| 4242424242424242   | ✅ Success            | Payment processes successfully     |
| 5555555555554444   | ✅ Success            | Mastercard - Success               |
| 4000000000000002   | ❌ Declined           | Insufficient funds                 |
| 4000000000000069   | ❌ Declined           | Expired card                       |
| 4000000000000127   | ❌ Declined           | Incorrect CVC                      |
| 4000000000000119   | ⚠️ Error             | Processing error                   |
| 4000000000000341   | ⚠️ Error             | Lost card                          |
| 4000000000000259   | ⚠️ Error             | Restricted card                    |

**Additional Requirements:**
- **Expiry**: Any future date (e.g., `12/25`)
- **CVV**: Any 3-4 digits (e.g., `123`)
- **Name**: Minimum 3 characters (e.g., `John Doe`)

## API Reference

### Initialize SDK

```javascript
const pso = new PSOPayment({
  merchantId: 'merchant-001',      // Required
  environment: 'test',              // 'test' or 'production'
  gatewayUrl: 'http://localhost:3000', // Optional
  debug: true                       // Optional, enables logging
});
```

### Show Payment Form

```javascript
pso.showPaymentForm({
  amount: 2999,           // Required: Amount in cents
  currency: 'USD',        // Optional: Default 'USD'
  onSuccess: (result) => {
    // Handle success
    console.log(result.transactionId);
  },
  onError: (error) => {
    // Handle error
    console.error(error.message);
  }
});
```

### API Endpoints

#### Backend Proxy Endpoints

**Create Payment Order**
```bash
POST /api/payment/create
Content-Type: application/json

{
  "orderId": "order-123",
  "amount": 1000.00,
  "currency": "BDT",
  "customerInfo": {
    "name": "Customer Name",
    "email": "customer@email.com",
    "phone": "+8801234567890"
  }
}
```

**Verify Payment**
```bash
POST /api/payment/verify
Content-Type: application/json

{
  "paymentOrderId": "pso-payment-order-id"
}
```

**IPN Endpoint**
```bash
POST /api/payment/ipn
Content-Type: application/json

{
  "order_id": "order-123",
  "status": "APPROVED",
  "status_code": "1002",
  "transaction_id": "bank-txn-id"
}
```

See [docs/API.md](./docs/API.md) for complete API reference.

## Security Features

- ✅ **Header-Based Authentication**: HMAC-SHA256 signature authentication
- ✅ **Signature Generation**: Dynamic per-request signatures
- ✅ **Digest Validation**: SHA256 hash of request body
- ✅ **Input Validation**: All payment data validated before processing
- ✅ **Luhn Algorithm**: Card number validation using industry-standard algorithm
- ✅ **XSS Protection**: All inputs sanitized to prevent cross-site scripting
- ✅ **HTTPS Enforcement**: Production mode requires HTTPS
- ✅ **CORS Support**: Configured for cross-domain requests
- ✅ **Rate Limiting**: Protects against abuse and DDoS
- ✅ **Backend Proxy**: Credentials never exposed to frontend

## Development

### Build SDK
```bash
cd sdk
npm run build       # Production build
npm run dev         # Development build with watch
```

### Run Gateway
```bash
cd gateway
npm start          # Start server
npm run dev        # Start with auto-reload
```

### Run All
```bash
npm run dev        # Build SDK and start gateway
```

## Testing

### Run Authentication Tests
```bash
# Test signature and digest generation
node test/test-auth-helper.js

# Test gateway client integration
node test/test-gateway-client.js
```

### Manual Testing

The SDK includes comprehensive validation:
- Card number validation (Luhn algorithm)
- Expiry date validation (format and future date)
- CVV validation (3-4 digits)
- Cardholder name validation (minimum length)

Test the gateway with:
```bash
# Health check
curl http://localhost:3000/health

# Test payment (mock endpoint)
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -H "X-Merchant-ID: test" \
  -d '{"cardNumber":"4111111111111111","expiry":"12/25","cvv":"123","cardholderName":"Test User","amount":1000,"currency":"USD"}'
```

## Documentation

Full documentation is available in the `docs/` directory:
- 📖 [Complete SDK Documentation](docs/README.md)
- 🔐 [Authentication Guide](docs/AUTHENTICATION.md) - Header-based authentication
- 📡 [API Reference](docs/API.md) - Complete API documentation
- 🔧 [Integration Guide](docs/INTEGRATION.md) - Step-by-step integration
- ❓ [Troubleshooting Guide](docs/README.md#troubleshooting)

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License

---

**⚠️ Security Notice**: This is a test/demo implementation for educational purposes. For production payment processing:
- Use certified payment processors (Stripe, PayPal, etc.)
- Never store raw card numbers
- Implement proper PCI DSS compliance
- Use secure tokenization
- Follow industry security standards
