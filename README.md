# PSO Payment Gateway SDK

A complete payment gateway solution with client-side SDK and test gateway for secure payment processing.

## Features

- 🔧 **Payment Gateway SDK**: JavaScript library for merchant integration
- 🧪 **Test Gateway**: Mock payment processor for development
- 📱 **In-Host Pop-up**: Secure payment form overlay
- 🛡️ **Security**: Input validation and XSS protection
- 📚 **Documentation**: Complete integration guides

## Quick Start

### SDK Integration

```html
<script src="https://your-domain.com/pso-sdk.js"></script>
<script>
  const pso = new PSOPayment({
    merchantId: 'your-merchant-id',
    environment: 'test' // or 'production'
  });

  pso.showPaymentForm({
    amount: 1000, // amount in cents
    currency: 'USD',
    onSuccess: (result) => {
      console.log('Payment successful:', result);
    },
    onError: (error) => {
      console.error('Payment failed:', error);
    }
  });
</script>
```

### Test Gateway

```bash
cd gateway
npm install
npm start
```

## Repository Structure

```
/
├── sdk/                 # Payment SDK source code
├── gateway/            # Test payment gateway
├── demo/              # Demo and example pages
├── docs/              # Documentation
└── tests/             # Test suites
```

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Run tests: `npm test`

## Test Cards

| Card Number         | Description           |
|--------------------|-----------------------|
| 4111111111111111   | Visa - Success        |
| 4000000000000002   | Visa - Declined       |
| 4000000000000119   | Visa - Processing Error|
| 5555555555554444   | Mastercard - Success  |

## License

MIT License - see LICENSE file for details.
