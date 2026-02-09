<?php
/**
 * Payment Gateway API Client
 * Handles communication with the real payment gateway API using header-based authentication
 */

namespace PSO\Gateway\Services;

use PSO\Gateway\Config\Config;

class GatewayClient {
    private $baseUrl;
    private $host;
    private $merchantId;
    private $apiKey;
    private $apiSecret;
    private $authHelper;
    private $config;

    public function __construct() {
        $this->config = Config::getInstance();
        $this->baseUrl = $this->config->get('gateway.baseUrl');
        $this->host = $this->config->get('gateway.host');
        $this->merchantId = $this->config->get('gateway.merchantId');
        $this->apiKey = $this->config->get('gateway.apiKey');
        $this->apiSecret = $this->config->get('gateway.apiSecret');
        $this->authHelper = new AuthHelper();
    }

    /**
     * Get configuration object for auth helper
     * @return array Configuration array
     */
    private function getAuthConfig() {
        return [
            'host' => $this->host,
            'merchantId' => $this->merchantId,
            'apiKey' => $this->apiKey,
            'apiSecret' => $this->apiSecret
        ];
    }

    /**
     * Create a payment order
     * @param array $orderData Payment order details
     * @return array Gateway response
     */
    public function createPaymentOrder($orderData) {
        $endpoint = $this->config->get('gateway.endpoints.createOrder');
        $fullUrl = $this->baseUrl . $endpoint;
        
        // Build request body matching exact API specification
        $requestBody = [
            'order_id' => $orderData['orderId'],
            'order_information' => [
                'payable_amount' => (float)$orderData['amount'],
                'currency_code' => $orderData['currency'] ?? 'BDT'
            ],
            'ipn_url' => $orderData['ipnUrl'],
            'success_url' => $orderData['successUrl'],
            'cancel_url' => $orderData['cancelUrl'],
            'failure_url' => $orderData['failureUrl'],
            'promotion_information' => $orderData['promotionInfo'] ?? (object)[],
            'discount_detail' => $orderData['discountDetail'] ?? (object)[],
            'mdf_1' => $orderData['customFields']['mdf_1'] ?? '',
            'mdf_2' => $orderData['customFields']['mdf_2'] ?? '',
            'mdf_3' => $orderData['customFields']['mdf_3'] ?? '',
            'mdf_4' => $orderData['customFields']['mdf_4'] ?? '',
            'mdf_5' => $orderData['customFields']['mdf_5'] ?? '',
            'mdf_6' => $orderData['customFields']['mdf_6'] ?? '',
            'customer_information' => $orderData['customerInfo'] ?? (object)[],
            'product_information' => $orderData['productInfo'] ?? (object)[],
            'shipment_information' => $orderData['shipmentInfo'] ?? (object)[]
        ];

        try {
            // Generate authentication headers
            $headers = $this->authHelper->generateGatewayHeaders(
                $endpoint,
                $requestBody,
                $this->getAuthConfig()
            );

            $response = $this->makeRequest('POST', $fullUrl, $requestBody, $headers);

            return [
                'success' => true,
                'data' => $response
            ];
        } catch (\Exception $error) {
            error_log('Gateway API Error (Create Order): ' . $error->getMessage());
            
            return [
                'success' => false,
                'error' => [
                    'statusCode' => $error->getCode() ?: 500,
                    'statusText' => 'GATEWAY_ERROR',
                    'message' => $error->getMessage(),
                    'reason' => 'Failed to create payment order'
                ]
            ];
        }
    }

    /**
     * Verify payment
     * @param array $verificationData Verification details
     * @return array Gateway response
     */
    public function verifyPayment($verificationData) {
        $endpoint = $this->config->get('gateway.endpoints.verify');
        $fullUrl = $this->baseUrl . $endpoint;
        
        // Build request body matching exact API specification
        $requestBody = [
            'paymentOrderId' => $verificationData['paymentOrderId']
        ];

        try {
            // Generate authentication headers
            $headers = $this->authHelper->generateGatewayHeaders(
                $endpoint,
                $requestBody,
                $this->getAuthConfig()
            );

            $response = $this->makeRequest('POST', $fullUrl, $requestBody, $headers);

            return [
                'success' => true,
                'data' => $response
            ];
        } catch (\Exception $error) {
            error_log('Gateway API Error (Verify Payment): ' . $error->getMessage());
            
            return [
                'success' => false,
                'error' => [
                    'statusCode' => $error->getCode() ?: 500,
                    'statusText' => 'GATEWAY_ERROR',
                    'message' => $error->getMessage(),
                    'reason' => 'Failed to verify payment'
                ]
            ];
        }
    }

    /**
     * Inquiry payment status
     * @param array $inquiryData Inquiry details
     * @return array Gateway response
     */
    public function inquiryPayment($inquiryData) {
        $endpoint = $this->config->get('gateway.endpoints.inquiry');
        $fullUrl = $this->baseUrl . $endpoint;
        
        // Build request body
        $requestBody = [
            'order_id' => $inquiryData['orderId']
        ];

        try {
            // Generate authentication headers
            $headers = $this->authHelper->generateGatewayHeaders(
                $endpoint,
                $requestBody,
                $this->getAuthConfig()
            );

            $response = $this->makeRequest('POST', $fullUrl, $requestBody, $headers);

            return [
                'success' => true,
                'data' => $response
            ];
        } catch (\Exception $error) {
            error_log('Gateway API Error (Inquiry Payment): ' . $error->getMessage());
            
            return [
                'success' => false,
                'error' => [
                    'statusCode' => $error->getCode() ?: 500,
                    'statusText' => 'GATEWAY_ERROR',
                    'message' => $error->getMessage(),
                    'reason' => 'Failed to inquiry payment status'
                ]
            ];
        }
    }

    /**
     * Make HTTP request
     * @param string $method HTTP method
     * @param string $url Full URL
     * @param array $body Request body
     * @param array $headers Headers
     * @return array Response data
     */
    private function makeRequest($method, $url, $body, $headers) {
        $ch = curl_init();

        // Convert headers array to cURL format
        $curlHeaders = [];
        foreach ($headers as $key => $value) {
            $curlHeaders[] = "$key: $value";
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \Exception("cURL Error: $error", 500);
        }

        $responseData = json_decode($response, true);

        if ($httpCode >= 400) {
            $message = $responseData['message'] ?? 'Unknown error';
            throw new \Exception($message, $httpCode);
        }

        return $responseData;
    }
}
