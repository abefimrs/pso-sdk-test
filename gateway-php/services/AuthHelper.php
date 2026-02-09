<?php
/**
 * Authentication Helper Service
 * Handles signature and digest generation for Payment Gateway API authentication
 * 
 * Authentication is performed via HTTP Headers:
 * - X-TNPG-TIMESTAMP: ISO 8601 timestamp
 * - X-TNPG-HOST: Gateway host (e.g., api-stage.tnextpay.com)
 * - X-TNPG-TARGET-API: Full API endpoint path
 * - X-TNPG-MERCHANT-ID: Merchant identifier
 * - X-TNPG-API-KEY: API key (public identifier)
 * - X-TNPG-SIGNATURE: HMAC-SHA256 signature
 * - X-TNPG-DIGEST: SHA256 hash of request body
 */

namespace PSO\Gateway\Services;

class AuthHelper {
    /**
     * Generate HMAC-SHA256 signature for gateway authentication
     * 
     * @param string $timestamp ISO 8601 timestamp
     * @param string $host Gateway host (e.g., api-stage.tnextpay.com)
     * @param string $targetApi Full API endpoint path
     * @param string $merchantId Merchant ID
     * @param string $apiKey API Key
     * @param string $apiSecret API Secret (used for HMAC)
     * @return string HMAC-SHA256 signature (hex)
     */
    public function generateSignature($timestamp, $host, $targetApi, $merchantId, $apiKey, $apiSecret) {
        // Create signature string: timestamp|host|targetApi|merchantId|apiKey
        $signatureString = "$timestamp|$host|$targetApi|$merchantId|$apiKey";
        
        // Generate HMAC-SHA256 signature
        $signature = hash_hmac('sha256', $signatureString, $apiSecret);
        
        return $signature;
    }

    /**
     * Generate SHA256 digest of request body
     * 
     * @param array $requestBody Request body array
     * @return string SHA256 hash (hex)
     */
    public function generateDigest($requestBody) {
        // Convert request body to JSON string
        $bodyString = json_encode($requestBody);
        
        // Generate SHA256 hash
        $digest = hash('sha256', $bodyString);
        
        return $digest;
    }

    /**
     * Generate all required headers for gateway API authentication
     * 
     * @param string $targetApi Full API endpoint path
     * @param array $requestBody Request body array
     * @param array $config Configuration array with credentials
     * @return array Headers array with all required authentication headers
     */
    public function generateGatewayHeaders($targetApi, $requestBody, $config) {
        // Generate ISO 8601 timestamp
        $timestamp = gmdate('Y-m-d\TH:i:s\Z');
        
        // Extract configuration
        $host = $config['host'] ?? 'api-stage.tnextpay.com';
        $merchantId = $config['merchantId'] ?? '';
        $apiKey = $config['apiKey'] ?? '';
        $apiSecret = $config['apiSecret'] ?? '';

        // Validate required configuration
        if (empty($merchantId)) {
            throw new \Exception('MERCHANT_ID is required for gateway authentication');
        }
        if (empty($apiKey)) {
            throw new \Exception('API_KEY is required for gateway authentication');
        }
        if (empty($apiSecret)) {
            throw new \Exception('API_SECRET is required for gateway authentication');
        }

        // Generate signature and digest
        $signature = $this->generateSignature(
            $timestamp,
            $host,
            $targetApi,
            $merchantId,
            $apiKey,
            $apiSecret
        );
        $digest = $this->generateDigest($requestBody);

        // Return headers object
        return [
            'X-TNPG-TIMESTAMP' => $timestamp,
            'X-TNPG-HOST' => $host,
            'X-TNPG-TARGET-API' => $targetApi,
            'X-TNPG-MERCHANT-ID' => $merchantId,
            'X-TNPG-API-KEY' => $apiKey,
            'X-TNPG-SIGNATURE' => $signature,
            'X-TNPG-DIGEST' => $digest,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ];
    }

    /**
     * Verify gateway callback signature
     * 
     * @param array $payload IPN payload data
     * @param string $receivedSignature Signature from gateway
     * @param string $apiSecret API Secret for verification
     * @return bool Whether signature is valid
     */
    public function verifyCallbackSignature($payload, $receivedSignature, $apiSecret) {
        // Sort payload keys
        ksort($payload);
        
        // Create string from payload
        $signatureString = http_build_query($payload);
        
        // Generate expected signature
        $expectedSignature = hash_hmac('sha256', $signatureString, $apiSecret);
        
        // Timing-safe comparison
        return hash_equals($expectedSignature, $receivedSignature);
    }
}
