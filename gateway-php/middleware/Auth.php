<?php
/**
 * Authentication Middleware
 * Validates merchant authentication for API requests
 */

namespace PSO\Gateway\Middleware;

use PSO\Gateway\Services\SignatureService;

class Auth {
    private $signatureService;

    public function __construct() {
        $this->signatureService = new SignatureService();
    }

    /**
     * Validate merchant ID header
     * @param array $request Request data
     * @return array|null Error response or null if valid
     */
    public function validateMerchant(&$request) {
        $merchantId = $this->getHeader('X-Merchant-Id');

        if (!$merchantId) {
            return [
                'success' => false,
                'message' => 'Merchant ID is required',
                'error' => 'MISSING_MERCHANT_ID'
            ];
        }

        // Store merchant ID in request for later use
        $request['merchantId'] = $merchantId;
        return null;
    }

    /**
     * Validate request signature (optional, for enhanced security)
     * @param array $request Request data
     * @return array|null Error response or null if valid
     */
    public function validateSignature($request) {
        $signature = $this->getHeader('X-Signature');

        if (!$signature) {
            // Signature is optional in development
            if (getenv('NODE_ENV') !== 'production') {
                return null;
            }

            return [
                'success' => false,
                'message' => 'Request signature is required',
                'error' => 'MISSING_SIGNATURE'
            ];
        }

        try {
            $isValid = $this->signatureService->validateSignature($request['body'], $signature);
            
            if (!$isValid) {
                return [
                    'success' => false,
                    'message' => 'Invalid request signature',
                    'error' => 'INVALID_SIGNATURE'
                ];
            }

            return null;
        } catch (\Exception $error) {
            return [
                'success' => false,
                'message' => 'Signature validation failed',
                'error' => 'SIGNATURE_VALIDATION_ERROR'
            ];
        }
    }

    /**
     * Validate session token
     * @param array $request Request data
     * @return array|null Error response or null if valid
     */
    public function validateSessionToken(&$request) {
        $authHeader = $this->getHeader('Authorization');
        $token = $authHeader ? str_replace('Bearer ', '', $authHeader) : null;

        if (!$token) {
            return [
                'success' => false,
                'message' => 'Session token is required',
                'error' => 'MISSING_TOKEN'
            ];
        }

        $payload = $this->signatureService->verifySessionToken($token);

        if (!$payload) {
            return [
                'success' => false,
                'message' => 'Invalid or expired session token',
                'error' => 'INVALID_TOKEN'
            ];
        }

        $request['session'] = $payload;
        return null;
    }

    /**
     * Get header value (case-insensitive)
     * @param string $name Header name
     * @return string|null Header value
     */
    private function getHeader($name) {
        // Convert to HTTP_ format
        $httpName = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        
        if (isset($_SERVER[$httpName])) {
            return $_SERVER[$httpName];
        }

        // Alternative: check apache_request_headers if available
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $key => $value) {
                if (strtolower($key) === strtolower($name)) {
                    return $value;
                }
            }
        }

        return null;
    }
}
