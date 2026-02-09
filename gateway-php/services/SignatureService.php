<?php
/**
 * Signature Service
 * Generates and validates request signatures for security
 */

namespace PSO\Gateway\Services;

use PSO\Gateway\Config\Config;

class SignatureService {
    private $config;

    public function __construct() {
        $this->config = Config::getInstance();
    }

    /**
     * Generate signature for a payload
     * @param array $payload Data to sign
     * @return string Generated signature
     */
    public function generateSignature($payload) {
        // Convert payload to string (sorted keys for consistency)
        $dataString = $this->stringifyPayload($payload);
        
        // Create HMAC signature
        $secret = $this->config->get('security.jwtSecret');
        $signature = hash_hmac('sha256', $dataString, $secret);
        
        return $signature;
    }

    /**
     * Validate signature
     * @param array $payload Data to validate
     * @param string $signature Signature to check
     * @return bool Whether signature is valid
     */
    public function validateSignature($payload, $signature) {
        $expectedSignature = $this->generateSignature($payload);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Stringify payload with sorted keys
     * @param array $payload Array to stringify
     * @return string Stringified payload
     */
    public function stringifyPayload($payload) {
        // Sort keys recursively
        $sortedPayload = $this->sortKeys($payload);
        return json_encode($sortedPayload);
    }

    /**
     * Recursively sort array keys
     * @param mixed $obj Array to sort
     * @return mixed Sorted array
     */
    public function sortKeys($obj) {
        if (!is_array($obj) || empty($obj)) {
            return $obj;
        }

        // Check if it's an associative array
        if (array_keys($obj) !== range(0, count($obj) - 1)) {
            ksort($obj);
            foreach ($obj as $key => $value) {
                $obj[$key] = $this->sortKeys($value);
            }
        } else {
            foreach ($obj as $key => $value) {
                $obj[$key] = $this->sortKeys($value);
            }
        }

        return $obj;
    }

    /**
     * Generate unique order ID
     * @return string UUID
     */
    public function generateOrderId() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Generate session token
     * @param array $data Data to include in token
     * @return string JWT token
     */
    public function generateSessionToken($data) {
        $payload = array_merge($data, [
            'iat' => time(),
            'exp' => time() + (60 * 60) // 1 hour
        ]);

        // Simple JWT encoding
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body = $this->base64UrlEncode(json_encode($payload));
        
        $secret = $this->config->get('security.jwtSecret');
        $signature = $this->base64UrlEncode(hash_hmac('sha256', "$header.$body", $secret, true));

        return "$header.$body.$signature";
    }

    /**
     * Verify session token
     * @param string $token JWT token to verify
     * @return array|null Payload if valid, null otherwise
     */
    public function verifySessionToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($header, $body, $signature) = $parts;

        // Verify signature
        $secret = $this->config->get('security.jwtSecret');
        $expectedSignature = $this->base64UrlEncode(hash_hmac('sha256', "$header.$body", $secret, true));

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        // Decode payload
        $payload = json_decode($this->base64UrlDecode($body), true);

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * Base64 URL encode
     * @param string $data Data to encode
     * @return string Encoded data
     */
    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     * @param string $data Data to decode
     * @return string Decoded data
     */
    private function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
