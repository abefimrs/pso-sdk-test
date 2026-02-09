<?php
/**
 * Configuration Module
 * Loads and validates environment configuration
 */

namespace PSO\Gateway\Config;

class Config {
    private static $instance = null;
    private $config = [];

    private function __construct() {
        $this->loadEnvironment();
        $this->initializeConfig();
        $this->validate();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function loadEnvironment() {
        // Load .env file from project root
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) {
                    continue;
                }
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                $_ENV[$name] = $value;
                putenv("$name=$value");
            }
        }
    }

    private function initializeConfig() {
        $this->config = [
            // Server Configuration
            'env' => $this->getEnv('NODE_ENV', 'development'),
            'port' => $this->getEnv('PORT', 3000),

            // Gateway API Configuration (Header-Based Authentication)
            'gateway' => [
                'baseUrl' => $this->getEnv('GATEWAY_BASE_URL', 'https://api-stage.tnextpay.com'),
                'host' => $this->getEnv('GATEWAY_HOST', 'api-stage.tnextpay.com'),
                'merchantId' => $this->getEnv('MERCHANT_ID', ''),
                'apiKey' => $this->getEnv('API_KEY', ''),
                'apiSecret' => $this->getEnv('API_SECRET', ''),

                // Legacy: Backward compatibility (deprecated)
                'username' => $this->getEnv('GATEWAY_USERNAME', ''),
                'password' => $this->getEnv('GATEWAY_PASSWORD', ''),
                'signature' => $this->getEnv('GATEWAY_SIGNATURE', ''),
                'merchantCode' => $this->getEnv('MERCHANT_CODE', ''),

                // Endpoints
                'endpoints' => [
                    'createOrder' => $this->getEnv('PAYMENT_ORDER_ENDPOINT', '/payment/api/v1/p/service/api/payment/processing/payment-order'),
                    'verify' => $this->getEnv('PAYMENT_VERIFY_ENDPOINT', '/payment/api/v1/p/service/api/payment/processing/verify'),
                    'inquiry' => $this->getEnv('PAYMENT_INQUIRY_ENDPOINT', '/payment/api/v1/p/service/api/payment/processing/inquiry')
                ]
            ],

            // Security
            'security' => [
                'jwtSecret' => $this->getEnv('JWT_SECRET', 'change-this-secret-in-production'),
                'allowedOrigins' => $this->parseAllowedOrigins($this->getEnv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000'))
            ],

            // Database
            'database' => [
                'path' => $this->getEnv('DB_PATH', './data/transactions.db')
            ]
        ];
    }

    private function getEnv($key, $default = null) {
        return getenv($key) ?: ($default ?? '');
    }

    private function parseAllowedOrigins($originsString) {
        return array_map('trim', explode(',', $originsString));
    }

    private function validate() {
        $errors = [];

        if ($this->config['env'] === 'production') {
            // New header-based authentication (required)
            if (empty($this->config['gateway']['merchantId'])) {
                $errors[] = 'MERCHANT_ID is required in production';
            }
            if (empty($this->config['gateway']['apiKey'])) {
                $errors[] = 'API_KEY is required in production';
            }
            if (empty($this->config['gateway']['apiSecret'])) {
                $errors[] = 'API_SECRET is required in production';
            }
            if (empty($this->config['gateway']['host'])) {
                $errors[] = 'GATEWAY_HOST is required in production';
            }

            if ($this->config['security']['jwtSecret'] === 'change-this-secret-in-production') {
                $errors[] = 'JWT_SECRET must be changed in production';
            }
        }

        if (!empty($errors)) {
            error_log('Configuration errors:');
            foreach ($errors as $err) {
                error_log("  - $err");
            }
            if ($this->config['env'] === 'production') {
                throw new \Exception('Invalid configuration for production environment');
            } else {
                error_log('⚠️  Configuration warnings (OK for development)');
            }
        }
    }

    public function get($key, $default = null) {
        $keys = explode('.', $key);
        $value = $this->config;

        foreach ($keys as $k) {
            if (!isset($value[$k])) {
                return $default;
            }
            $value = $value[$k];
        }

        return $value;
    }

    public function all() {
        return $this->config;
    }
}
