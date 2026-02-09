<?php
/**
 * Token Routes
 * API endpoints for creating payment tokens
 */

namespace PSO\Gateway\Routes;

use PSO\Gateway\Middleware\Auth;

class TokenRoutes {
    private $auth;

    public function __construct() {
        $this->auth = new Auth();
    }

    /**
     * Create a payment token
     * POST /api/tokens/create
     */
    public function create($request) {
        $authError = $this->auth->validateMerchant($request);
        if ($authError) {
            return $this->jsonResponse($authError, 401);
        }

        try {
            $body = $request['body'];
            $cardNumber = $body['cardNumber'] ?? null;
            $expiry = $body['expiry'] ?? null;
            $cvv = $body['cvv'] ?? null;

            // Basic validation
            if (!$cardNumber || !$expiry || !$cvv) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Card number, expiry, and CVV are required'
                ], 400);
            }

            // Generate token
            $token = 'tok_' . str_replace('-', '', $this->generateUuid());

            return $this->jsonResponse([
                'success' => true,
                'token' => $token,
                'cardLast4' => substr($cardNumber, -4),
                'expiresAt' => date('c', time() + 3600) // 1 hour
            ]);
        } catch (\Exception $error) {
            error_log('Token creation error: ' . $error->getMessage());
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Helper: Generate UUID
     */
    private function generateUuid() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Helper: Send JSON response
     */
    private function jsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
