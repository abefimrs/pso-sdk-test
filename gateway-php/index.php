<?php
/**
 * PSO Test Payment Gateway Server (PHP)
 * Mock payment processor for development and testing
 */

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('UTC');

// Autoloader
spl_autoload_register(function ($class) {
    $prefix = 'PSO\\Gateway\\';
    $baseDir = __DIR__ . '/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

use PSO\Gateway\Config\Config;
use PSO\Gateway\Routes\PaymentGatewayRoutes;
use PSO\Gateway\Routes\PaymentRoutes;
use PSO\Gateway\Routes\TokenRoutes;
use PSO\Gateway\Models\Transaction;

// Initialize config
$config = Config::getInstance();

// CORS handling
$allowedOrigins = $config->get('security.allowedOrigins', []);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins) || in_array('*', $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Merchant-Id, X-Signature, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Get request body
$body = [];
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $rawBody = file_get_contents('php://input');
    $body = json_decode($rawBody, true) ?? [];
}

// Build request object
$request = [
    'method' => $method,
    'path' => $path,
    'body' => $body,
    'query' => $_GET,
    'headers' => getallheaders() ?: []
];

// Log request
error_log(date('c') . " - $method $path");

// Initialize route handlers
$paymentGatewayRoutes = new PaymentGatewayRoutes();
$paymentRoutes = new PaymentRoutes();
$tokenRoutes = new TokenRoutes();

// Router
try {
    // Payment Gateway Routes (Real gateway integration)
    if ($path === '/api/payment/create' && $method === 'POST') {
        $paymentGatewayRoutes->createPayment($request);
    }
    elseif ($path === '/api/payment/verify' && $method === 'POST') {
        $paymentGatewayRoutes->verifyPayment($request);
    }
    elseif ($path === '/api/payment/ipn' && $method === 'POST') {
        $paymentGatewayRoutes->handleIPN($request);
    }
    elseif (preg_match('#^/api/payment/transaction/([a-zA-Z0-9-]+)$#', $path, $matches) && $method === 'GET') {
        $paymentGatewayRoutes->getTransaction($request, $matches[1]);
    }

    // Legacy Payment Routes (Test routes)
    elseif ($path === '/api/payments/process' && $method === 'POST') {
        $paymentRoutes->process($request);
    }
    elseif (preg_match('#^/api/payments/verify/([a-zA-Z0-9-]+)$#', $path, $matches) && $method === 'GET') {
        $paymentRoutes->verify($request, $matches[1]);
    }
    elseif ($path === '/api/payments/transactions' && $method === 'GET') {
        $paymentRoutes->getTransactions($request);
    }

    // Token Routes
    elseif ($path === '/api/tokens/create' && $method === 'POST') {
        $tokenRoutes->create($request);
    }

    // Admin interface
    elseif ($path === '/admin') {
        require __DIR__ . '/views/admin.php';
    }

    // API Stats
    elseif ($path === '/api/stats' && $method === 'GET') {
        $transactionStore = new Transaction();
        $stats = $transactionStore->getStats();
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'stats' => $stats,
            'timestamp' => date('c')
        ]);
    }

    // Health check
    elseif ($path === '/health' || $path === '/') {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'ok',
            'service' => 'PSO Payment Gateway (PHP)',
            'version' => '1.0.0',
            'timestamp' => date('c')
        ]);
    }

    // 404 Not Found
    else {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Route not found',
            'path' => $path
        ]);
    }

} catch (\Exception $e) {
    error_log('Server error: ' . $e->getMessage());
    error_log($e->getTraceAsString());
    
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
