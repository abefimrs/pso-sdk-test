# PSO Payment Gateway (PHP)

PHP implementation of the PSO Test Payment Gateway - Mock payment processor for development and testing.

## Features

- **Real Gateway Integration**: Connects to real payment gateway APIs with header-based authentication
- **Test Payment Processing**: Mock payment processor for testing different scenarios
- **Token Management**: Payment token creation and management
- **Transaction Storage**: JSON-based transaction storage
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Admin Dashboard**: Web-based interface for monitoring transactions
- **Security**: Request validation, CORS support, and signature verification

## Requirements

- PHP 7.4 or higher
- cURL extension
- JSON extension
- Apache with mod_rewrite (for .htaccess)

## Installation

1. **Clone or copy the gateway-php directory**

2. **Configure environment variables**

   Create a `.env` file in the project root:

   ```env
   # Environment
   NODE_ENV=development
   PORT=3000

   # Gateway API Configuration
   GATEWAY_BASE_URL=https://api-stage.tnextpay.com
   GATEWAY_HOST=api-stage.tnextpay.com
   MERCHANT_ID=your_merchant_id
   API_KEY=your_api_key
   API_SECRET=your_api_secret

   # Payment Endpoints
   PAYMENT_ORDER_ENDPOINT=/payment/api/v1/p/service/api/payment/processing/payment-order
   PAYMENT_VERIFY_ENDPOINT=/payment/api/v1/p/service/api/payment/processing/verify
   PAYMENT_INQUIRY_ENDPOINT=/payment/api/v1/p/service/api/payment/processing/inquiry

   # Security
   JWT_SECRET=change-this-secret-in-production
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000
   ```

3. **Set up Apache Virtual Host** (optional)

   ```apache
   <VirtualHost *:80>
       ServerName payment-gateway.local
       DocumentRoot /path/to/gateway-php
       
       <Directory /path/to/gateway-php>
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```

4. **Or use PHP built-in server**

   ```bash
   php -S localhost:3000 index.php
   ```

## Usage

### Start the Server

```bash
# Using PHP built-in server
php -S localhost:3000 index.php

# Or with composer
composer serve
```

### API Endpoints

#### Real Gateway Integration

- **Create Payment**: `POST /api/payment/create`
- **Verify Payment**: `POST /api/payment/verify`
- **IPN Handler**: `POST /api/payment/ipn`
- **Get Transaction**: `GET /api/payment/transaction/:id`

#### Legacy Test Endpoints

- **Process Payment**: `POST /api/payments/process`
- **Verify Transaction**: `GET /api/payments/verify/:id`
- **Get Transactions**: `GET /api/payments/transactions`

#### Token Management

- **Create Token**: `POST /api/tokens/create`

#### Admin & Monitoring

- **Admin Dashboard**: `GET /admin`
- **Statistics**: `GET /api/stats`
- **Health Check**: `GET /health`

### Example Request

```php
// Create Payment
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, 'http://localhost:3000/api/payment/create');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Merchant-Id: your_merchant_id'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'orderId' => 'ORDER-' . time(),
    'amount' => 1000,
    'currency' => 'BDT',
    'customerInfo' => [
        'name' => 'John Doe',
        'email' => 'john@example.com'
    ],
    'productInfo' => [
        'name' => 'Test Product',
        'description' => 'Test Description'
    ]
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
```

## Project Structure

```
gateway-php/
├── config/
│   └── Config.php              # Configuration management
├── middleware/
│   ├── Auth.php                # Authentication middleware
│   ├── Validator.php           # Request validation
│   └── RateLimit.php           # Rate limiting
├── models/
│   └── Transaction.php         # Transaction storage
├── routes/
│   ├── PaymentGatewayRoutes.php # Real gateway routes
│   ├── PaymentRoutes.php       # Test payment routes
│   └── TokenRoutes.php         # Token management routes
├── services/
│   ├── AuthHelper.php          # Gateway authentication
│   ├── GatewayClient.php       # Gateway API client
│   └── SignatureService.php   # Signature generation/validation
├── views/
│   └── admin.php               # Admin dashboard
├── data/                       # Transaction storage (auto-created)
├── .htaccess                   # Apache rewrite rules
├── index.php                   # Main entry point
├── composer.json               # Dependencies
└── README.md                   # This file
```

## Test Cards

For testing purposes, use these card numbers:

**Successful Transactions:**
- `4111111111111111`
- `4242424242424242`
- `5555555555554444`

**Declined Transactions:**
- `4000000000000002` - Insufficient funds
- `4000000000000069` - Expired card
- `4000000000000127` - Incorrect CVC

**Error Transactions:**
- `4000000000000119` - Processing error
- `4000000000000341` - Lost card
- `4000000000000259` - Restricted card

## Security Considerations

1. **Production Environment:**
   - Change `JWT_SECRET` to a strong, unique value
   - Set `NODE_ENV=production`
   - Configure proper `ALLOWED_ORIGINS`
   - Enable HTTPS
   - Protect `.env` file (included in .htaccess)

2. **File Permissions:**
   - Ensure `data/` directory is writable: `chmod 755 data/`
   - Protect sensitive files: `chmod 600 .env`

3. **Rate Limiting:**
   - Adjust rate limits in `middleware/RateLimit.php` as needed
   - Monitor `data/rate-limits/` directory

## Differences from Node.js Version

- Uses custom autoloader instead of `require()`
- JSON file storage instead of in-memory storage
- cURL instead of axios for HTTP requests
- Custom routing instead of Express.js
- PHP session handling instead of JWT middleware
- .htaccess for URL rewriting instead of Express middleware

## License

MIT

## Support

For issues and questions, please contact the PSO Team.
