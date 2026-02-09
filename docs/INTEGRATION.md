# Integration Guide

This guide walks you through integrating the PSO Payment Gateway SDK into your website.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Backend Setup](#backend-setup)
4. [Frontend Integration](#frontend-integration)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 14+** installed
- **Merchant Credentials** from PSO Payment Gateway:
  - `MERCHANT_ID`
  - `API_KEY`
  - `API_SECRET`
- **HTTPS** enabled (required for production)
- Basic knowledge of JavaScript and Node.js

---

## Architecture Overview

The PSO Payment Gateway SDK uses a **backend proxy architecture** for security:

```
Customer Browser
    ↓
Frontend SDK (JavaScript)
    ↓
Your Backend API (Node.js)
    ↓
PSO Payment Gateway API
```

**Why this architecture?**
- ✅ API credentials never exposed to frontend
- ✅ Signature generation happens securely on server
- ✅ You control the payment flow
- ✅ Easy to add business logic and validation

---

## Backend Setup

### Step 1: Install Dependencies

Create a new Node.js project or add to existing:

```bash
npm install express axios dotenv cors body-parser
```

### Step 2: Create Environment File

Create `.env` file in your project root:

```bash
# Environment
NODE_ENV=development
PORT=3000

# Payment Gateway (Get these from PSO)
GATEWAY_BASE_URL=https://api-stage.tnextpay.com
GATEWAY_HOST=api-stage.tnextpay.com
MERCHANT_ID=your-merchant-id
API_KEY=your-api-key
API_SECRET=your-api-secret

# Security
JWT_SECRET=your-random-jwt-secret
ALLOWED_ORIGINS=http://localhost:3000,https://your-website.com
```

**⚠️ NEVER commit `.env` to version control!**

Add to `.gitignore`:
```
.env
.env.local
.env.production
```

### Step 3: Create Authentication Helper

Create `services/auth-helper.js`:

```javascript
const crypto = require('crypto');

class AuthHelper {
  generateSignature(timestamp, host, targetApi, merchantId, apiKey, apiSecret) {
    const signatureString = `${timestamp}|${host}|${targetApi}|${merchantId}|${apiKey}`;
    return crypto.createHmac('sha256', apiSecret).update(signatureString).digest('hex');
  }

  generateDigest(requestBody) {
    return crypto.createHash('sha256').update(JSON.stringify(requestBody)).digest('hex');
  }

  generateGatewayHeaders(targetApi, requestBody, config) {
    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(
      timestamp, config.host, targetApi, 
      config.merchantId, config.apiKey, config.apiSecret
    );
    const digest = this.generateDigest(requestBody);

    return {
      'X-TNPG-TIMESTAMP': timestamp,
      'X-TNPG-HOST': config.host,
      'X-TNPG-TARGET-API': targetApi,
      'X-TNPG-MERCHANT-ID': config.merchantId,
      'X-TNPG-API-KEY': config.apiKey,
      'X-TNPG-SIGNATURE': signature,
      'X-TNPG-DIGEST': digest,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = new AuthHelper();
```

### Step 4: Create Payment Gateway Client

Create `services/gateway-client.js`:

```javascript
const axios = require('axios');
const authHelper = require('./auth-helper');

class GatewayClient {
  constructor(config) {
    this.config = config;
  }

  async createPaymentOrder(orderData) {
    const endpoint = '/payment/api/v1/p/service/api/payment/processing/payment-order';
    
    const requestBody = {
      order_id: orderData.orderId,
      order_information: {
        payable_amount: orderData.amount,
        currency_code: orderData.currency || 'BDT'
      },
      ipn_url: orderData.ipnUrl,
      success_url: orderData.successUrl,
      cancel_url: orderData.cancelUrl,
      failure_url: orderData.failureUrl,
      customer_information: orderData.customerInfo || {},
      product_information: orderData.productInfo || {},
      shipment_information: orderData.shipmentInfo || {}
    };

    const headers = authHelper.generateGatewayHeaders(endpoint, requestBody, this.config);
    
    try {
      const response = await axios.post(
        `${this.config.baseUrl}${endpoint}`,
        requestBody,
        { headers, timeout: 30000 }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: {
          statusCode: error.response?.status || 500,
          message: error.response?.data?.message || 'Gateway error',
          reason: error.response?.data?.reason || error.message
        }
      };
    }
  }

  async verifyPayment(paymentOrderId) {
    const endpoint = '/payment/api/v1/p/service/api/payment/processing/verify';
    const requestBody = { paymentOrderId };
    const headers = authHelper.generateGatewayHeaders(endpoint, requestBody, this.config);
    
    try {
      const response = await axios.post(
        `${this.config.baseUrl}${endpoint}`,
        requestBody,
        { headers, timeout: 30000 }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: {
          statusCode: error.response?.status || 500,
          message: error.response?.data?.message || 'Verification failed'
        }
      };
    }
  }
}

module.exports = GatewayClient;
```

### Step 5: Create API Routes

Create `routes/payment.js`:

```javascript
const express = require('express');
const router = express.Router();
const GatewayClient = require('../services/gateway-client');

// Initialize gateway client
const gatewayClient = new GatewayClient({
  baseUrl: process.env.GATEWAY_BASE_URL,
  host: process.env.GATEWAY_HOST,
  merchantId: process.env.MERCHANT_ID,
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET
});

// Create payment order
router.post('/create', async (req, res) => {
  try {
    const { orderId, amount, currency, customerInfo, productInfo } = req.body;

    // Validate input
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'orderId and amount are required'
      });
    }

    // Call gateway
    const result = await gatewayClient.createPaymentOrder({
      orderId,
      amount,
      currency: currency || 'BDT',
      customerInfo,
      productInfo,
      ipnUrl: `${req.protocol}://${req.get('host')}/api/payment/ipn`,
      successUrl: `${req.protocol}://${req.get('host')}/payment/success`,
      cancelUrl: `${req.protocol}://${req.get('host')}/payment/cancel`,
      failureUrl: `${req.protocol}://${req.get('host')}/payment/failure`
    });

    if (result.success) {
      res.json({
        success: true,
        paymentOrderId: result.data.order_detail.payment_order_id,
        gatewayPageUrl: result.data.gateway_page_url,
        sessionId: result.data.order_detail.session_id
      });
    } else {
      res.status(result.error.statusCode).json({
        success: false,
        message: result.error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify payment
router.post('/verify', async (req, res) => {
  try {
    const { paymentOrderId } = req.body;

    if (!paymentOrderId) {
      return res.status(400).json({
        success: false,
        message: 'paymentOrderId is required'
      });
    }

    const result = await gatewayClient.verifyPayment(paymentOrderId);

    if (result.success) {
      res.json({
        success: true,
        transactionInfo: result.data.transaction_info
      });
    } else {
      res.status(result.error.statusCode).json({
        success: false,
        message: result.error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// IPN endpoint
router.post('/ipn', async (req, res) => {
  try {
    console.log('IPN received:', req.body);
    
    // Process IPN data
    // Update your database with payment status
    
    res.json({
      success: true,
      message: 'IPN processed'
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'IPN processing error'
    });
  }
});

module.exports = router;
```

### Step 6: Create Server

Create `server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const paymentRoutes = require('./routes/payment');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 7: Start Server

```bash
node server.js
```

Your backend is now ready to handle payment requests!

---

## Frontend Integration

### Step 1: Include SDK

Add the SDK to your HTML page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
</head>
<body>
  <button onclick="checkout()">Buy Now - $29.99</button>

  <!-- Include SDK -->
  <script src="https://cdn.pso-gateway.com/sdk/pso-sdk.js"></script>
  
  <script>
    // Your payment code here
  </script>
</body>
</html>
```

### Step 2: Initialize SDK

```javascript
const psoSDK = new PSOPaymentSDK({
  merchantCode: 'YOUR_MERCHANT_CODE',
  environment: 'staging', // or 'production'
  backendUrl: 'http://localhost:3000' // Your backend URL
});
```

### Step 3: Initiate Payment

```javascript
function checkout() {
  psoSDK.initiatePayment({
    orderId: 'order-' + Date.now(),
    amount: 2999, // $29.99 (amount in cents)
    currency: 'USD',
    customerInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    },
    productInfo: {
      name: 'Premium Subscription',
      description: 'Monthly subscription',
      quantity: 1
    },
    onSuccess: (response) => {
      console.log('Payment successful!', response);
      // Redirect to success page or show confirmation
      window.location.href = '/order-confirmation?id=' + response.orderId;
    },
    onError: (error) => {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    },
    onCancel: () => {
      console.log('Payment cancelled');
      alert('Payment was cancelled.');
    }
  });
}
```

### Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>E-Commerce Store</title>
  <style>
    .product {
      border: 1px solid #ddd;
      padding: 20px;
      margin: 20px;
      max-width: 400px;
    }
    .buy-btn {
      background: #007bff;
      color: white;
      padding: 10px 20px;
      border: none;
      cursor: pointer;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="product">
    <h2>Premium Subscription</h2>
    <p>Access all premium features</p>
    <p><strong>Price: $29.99/month</strong></p>
    <button class="buy-btn" onclick="buyProduct()">Buy Now</button>
  </div>

  <script src="https://cdn.pso-gateway.com/sdk/pso-sdk.js"></script>
  
  <script>
    // Initialize SDK
    const psoSDK = new PSOPaymentSDK({
      merchantCode: 'MERCHANT_001',
      environment: 'staging',
      backendUrl: 'http://localhost:3000'
    });

    function buyProduct() {
      psoSDK.initiatePayment({
        orderId: 'order-' + Date.now(),
        amount: 2999,
        currency: 'USD',
        customerInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        productInfo: {
          name: 'Premium Subscription',
          description: 'Monthly subscription',
          quantity: 1
        },
        onSuccess: function(response) {
          window.location.href = '/success.html?order=' + response.orderId;
        },
        onError: function(error) {
          alert('Payment failed: ' + error.message);
        },
        onCancel: function() {
          alert('Payment cancelled');
        }
      });
    }
  </script>
</body>
</html>
```

---

## Testing

### Test in Staging

1. Use staging credentials
2. Set `environment: 'staging'`
3. Use test card numbers (if provided by gateway)

### Test Scenarios

- ✅ Successful payment
- ✅ Declined payment
- ✅ Cancelled payment
- ✅ Network timeout
- ✅ Invalid card details
- ✅ Duplicate order

### Debug Mode

Enable debug logging:

```javascript
const psoSDK = new PSOPaymentSDK({
  merchantCode: 'MERCHANT_001',
  environment: 'staging',
  backendUrl: 'http://localhost:3000',
  debug: true // Enable console logging
});
```

---

## Production Deployment

### Checklist

- [ ] Use production credentials
- [ ] Set `environment: 'production'`
- [ ] Enable HTTPS (required)
- [ ] Set strong `JWT_SECRET`
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Test IPN endpoint
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up database for transaction logging

### Production Environment Variables

```bash
NODE_ENV=production
PORT=443

GATEWAY_BASE_URL=https://api.tnextpay.com
GATEWAY_HOST=api.tnextpay.com
MERCHANT_ID=your-production-merchant-id
API_KEY=pk_live_your_api_key
API_SECRET=sk_live_your_secret

JWT_SECRET=very-strong-random-secret-here
ALLOWED_ORIGINS=https://your-website.com
```

### Security Best Practices

1. **Never expose credentials** in frontend code
2. **Use HTTPS** for all communication
3. **Validate all inputs** on backend
4. **Implement rate limiting**
5. **Log all transactions** (without sensitive data)
6. **Monitor for fraud** patterns
7. **Keep SDK updated**
8. **Test thoroughly** before going live

---

## Troubleshooting

### Common Issues

**Issue**: "MERCHANT_ID is required"
- **Solution**: Check your `.env` file has all credentials set

**Issue**: "Invalid signature"
- **Solution**: Verify your API_SECRET is correct and signature generation logic matches

**Issue**: "CORS error"
- **Solution**: Add your frontend URL to `ALLOWED_ORIGINS`

**Issue**: "Payment order creation failed"
- **Solution**: Check gateway logs, verify credentials, check network

**Issue**: "IPN not received"
- **Solution**: Ensure IPN URL is publicly accessible, check firewall settings

### Enable Detailed Logging

```javascript
// Backend logging
console.log('Request body:', JSON.stringify(requestBody, null, 2));
console.log('Headers:', headers);
console.log('Gateway response:', response.data);
```

### Contact Support

For integration support:
- Email: support@pso-gateway.com
- Documentation: https://docs.pso-gateway.com
- GitHub Issues: https://github.com/pso/payment-sdk/issues

---

## Next Steps

1. Read [API.md](./API.md) for detailed API reference
2. Read [AUTHENTICATION.md](./AUTHENTICATION.md) for auth details
3. Check example implementations in `/demo` folder
4. Join our Discord community for help

Happy integrating! 🚀
