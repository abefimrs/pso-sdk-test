<?php
/**
 * Real Payment Gateway Routes
 * API endpoints for payment processing with real gateway integration
 */

namespace PSO\Gateway\Routes;

use PSO\Gateway\Services\GatewayClient;
use PSO\Gateway\Models\Transaction;
use PSO\Gateway\Middleware\Auth;
use PSO\Gateway\Middleware\Validator;
use PSO\Gateway\Middleware\RateLimit;

class PaymentGatewayRoutes {
    private $gatewayClient;
    private $transactionStore;
    private $auth;
    private $validator;
    private $rateLimit;

    public function __construct() {
        $this->gatewayClient = new GatewayClient();
        $this->transactionStore = new Transaction();
        $this->auth = new Auth();
        $this->validator = new Validator();
        $this->rateLimit = new RateLimit();
    }

    /**
     * Create Payment Order
     * POST /api/payment/create
     * 
     * Accepts payment details from SDK, adds credentials, and calls real gateway API
     */
    public function createPayment($request) {
        // Rate limiting
        $limitError = $this->rateLimit->paymentCreationLimiter();
        if ($limitError) {
            return $this->jsonResponse($limitError, 429);
        }

        // Merchant validation
        $authError = $this->auth->validateMerchant($request);
        if ($authError) {
            return $this->jsonResponse($authError, 401);
        }

        // Sanitize input
        $body = $this->validator->sanitizeInput($request['body']);

        // Validate request
        $validationError = $this->validator->validatePaymentCreation($body);
        if ($validationError) {
            return $this->jsonResponse($validationError, 400);
        }

        try {
            $orderId = $body['orderId'];
            $amount = $body['amount'];
            $currency = $body['currency'] ?? 'BDT';
            $customerInfo = $body['customerInfo'] ?? [];
            $productInfo = $body['productInfo'] ?? [];
            $ipnUrl = $body['ipnUrl'] ?? $this->getBaseUrl() . '/api/payment/ipn';
            $successUrl = $body['successUrl'] ?? $this->getBaseUrl() . '/payment/success';
            $cancelUrl = $body['cancelUrl'] ?? $this->getBaseUrl() . '/payment/cancel';
            $failureUrl = $body['failureUrl'] ?? $this->getBaseUrl() . '/payment/failure';
            $customFields = $body['customFields'] ?? [];
            $promotionInfo = $body['promotionInfo'] ?? [];
            $discountDetail = $body['discountDetail'] ?? [];
            $shipmentInfo = $body['shipmentInfo'] ?? [];

            error_log("[Payment Create] Merchant: {$request['merchantId']}, Order: $orderId");

            // Prepare order data for gateway
            $orderData = [
                'orderId' => $orderId,
                'amount' => $amount,
                'currency' => $currency,
                'customerInfo' => $customerInfo,
                'productInfo' => $productInfo,
                'ipnUrl' => $ipnUrl,
                'successUrl' => $successUrl,
                'cancelUrl' => $cancelUrl,
                'failureUrl' => $failureUrl,
                'customFields' => $customFields,
                'promotionInfo' => $promotionInfo,
                'discountDetail' => $discountDetail,
                'shipmentInfo' => $shipmentInfo
            ];

            // Call real gateway API
            $gatewayResponse = $this->gatewayClient->createPaymentOrder($orderData);

            if (!$gatewayResponse['success']) {
                error_log('[Payment Create] Gateway error: ' . json_encode($gatewayResponse['error']));
                
                return $this->jsonResponse([
                    'success' => false,
                    'message' => $gatewayResponse['error']['message'],
                    'reason' => $gatewayResponse['error']['reason'],
                    'statusCode' => $gatewayResponse['error']['statusCode'],
                    'statusText' => $gatewayResponse['error']['statusText']
                ], $gatewayResponse['error']['statusCode'] ?? 500);
            }

            // Store transaction locally
            $transaction = [
                'id' => $gatewayResponse['data']['order_detail']['payment_order_id'] ?? $this->generateId(),
                'merchantId' => $request['merchantId'],
                'orderId' => $orderId,
                'amount' => $amount,
                'currency' => $currency,
                'status' => $gatewayResponse['data']['order_detail']['order_status'] ?? 'PENDING',
                'sessionId' => $gatewayResponse['data']['order_detail']['session_id'] ?? null,
                'gatewayPageUrl' => $gatewayResponse['data']['gateway_page_url'] ?? null,
                'token' => $gatewayResponse['data']['token_response']['token'] ?? null,
                'timestamp' => date('c'),
                'customerInfo' => $customerInfo,
                'productInfo' => $productInfo
            ];

            $this->transactionStore->create($transaction);

            error_log("[Payment Create] Success - Transaction: {$transaction['id']}");

            // Return gateway response to SDK
            return $this->jsonResponse([
                'success' => true,
                'transactionId' => $transaction['id'],
                'sessionId' => $transaction['sessionId'],
                'gatewayPageUrl' => $transaction['gatewayPageUrl'],
                'token' => $transaction['token'],
                'orderDetail' => $gatewayResponse['data']['order_detail'] ?? null
            ]);

        } catch (\Exception $error) {
            error_log('[Payment Create] Error: ' . $error->getMessage());
            
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Internal server error during payment creation',
                'error' => $error->getMessage()
            ], 500);
        }
    }

    /**
     * Verify Payment
     * POST /api/payment/verify
     * 
     * Verifies payment status with the gateway
     */
    public function verifyPayment($request) {
        // Rate limiting
        $limitError = $this->rateLimit->paymentVerificationLimiter();
        if ($limitError) {
            return $this->jsonResponse($limitError, 429);
        }

        // Merchant validation
        $authError = $this->auth->validateMerchant($request);
        if ($authError) {
            return $this->jsonResponse($authError, 401);
        }

        // Sanitize input
        $body = $this->validator->sanitizeInput($request['body']);

        // Validate request
        $validationError = $this->validator->validatePaymentVerification($body);
        if ($validationError) {
            return $this->jsonResponse($validationError, 400);
        }

        try {
            $paymentOrderId = $body['paymentOrderId'];

            error_log("[Payment Verify] Merchant: {$request['merchantId']}, PaymentOrderId: $paymentOrderId");

            // Call gateway verification API
            $gatewayResponse = $this->gatewayClient->verifyPayment([
                'paymentOrderId' => $paymentOrderId
            ]);

            if (!$gatewayResponse['success']) {
                error_log('[Payment Verify] Gateway error: ' . json_encode($gatewayResponse['error']));
                
                return $this->jsonResponse([
                    'success' => false,
                    'message' => $gatewayResponse['error']['message'],
                    'reason' => $gatewayResponse['error']['reason']
                ], $gatewayResponse['error']['statusCode'] ?? 500);
            }

            // Update local transaction using order_id from response
            $orderId = $gatewayResponse['data']['transaction_info']['order_id'] ?? null;
            if ($orderId) {
                $transaction = $this->transactionStore->findByOrderId($orderId);
                if ($transaction) {
                    $this->transactionStore->update($transaction['id'], [
                        'status' => $gatewayResponse['data']['transaction_info']['status'] ?? 'UNKNOWN',
                        'verifiedAt' => date('c'),
                        'transactionInfo' => $gatewayResponse['data']['transaction_info']
                    ]);
                }
            }

            error_log("[Payment Verify] Status: " . ($gatewayResponse['data']['transaction_info']['status'] ?? 'UNKNOWN'));

            // Return verification result
            return $this->jsonResponse([
                'success' => true,
                'transactionInfo' => $gatewayResponse['data']['transaction_info'] ?? null
            ]);

        } catch (\Exception $error) {
            error_log('[Payment Verify] Error: ' . $error->getMessage());
            
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Internal server error during payment verification',
                'error' => $error->getMessage()
            ], 500);
        }
    }

    /**
     * Handle IPN (Instant Payment Notification)
     * POST /api/payment/ipn
     * 
     * Receives payment notifications from the gateway
     */
    public function handleIPN($request) {
        // Rate limiting
        $limitError = $this->rateLimit->ipnLimiter();
        if ($limitError) {
            return $this->jsonResponse($limitError, 429);
        }

        // Sanitize input
        $body = $this->validator->sanitizeInput($request['body']);

        try {
            error_log('[IPN] Received notification: ' . json_encode($body));

            // Validate IPN data
            $orderId = $body['order_id'] ?? null;
            $status = $body['status'] ?? null;

            if (!$orderId || !$status) {
                error_log('[IPN] Invalid data - missing required fields');
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Invalid IPN data'
                ], 400);
            }

            // Find and update transaction
            $transaction = $this->transactionStore->findByOrderId($orderId);
            
            if (!$transaction) {
                error_log("[IPN] Transaction not found for order: $orderId");
                // Still acknowledge to prevent retries
                return $this->jsonResponse([
                    'success' => true,
                    'message' => 'IPN received but transaction not found'
                ]);
            }

            // Update transaction status
            $this->transactionStore->update($transaction['id'], [
                'status' => $status,
                'statusCode' => $body['status_code'] ?? null,
                'bankTransactionId' => $body['transaction_id'] ?? null,
                'ipnReceivedAt' => date('c'),
                'ipnData' => $body
            ]);

            error_log("[IPN] Updated transaction {$transaction['id']} - Status: $status");

            // Acknowledge receipt
            return $this->jsonResponse([
                'success' => true,
                'message' => 'IPN processed successfully'
            ]);

        } catch (\Exception $error) {
            error_log('[IPN] Error: ' . $error->getMessage());
            
            // Return 200 to prevent gateway retries for processing errors
            return $this->jsonResponse([
                'success' => true,
                'message' => 'IPN received with errors',
                'error' => $error->getMessage()
            ]);
        }
    }

    /**
     * Get transaction details
     * GET /api/payment/transaction/:id
     */
    public function getTransaction($request, $id) {
        // Merchant validation
        $authError = $this->auth->validateMerchant($request);
        if ($authError) {
            return $this->jsonResponse($authError, 401);
        }

        $transaction = $this->transactionStore->findById($id);

        if (!$transaction) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Transaction not found'
            ], 404);
        }

        return $this->jsonResponse([
            'success' => true,
            'transaction' => $transaction
        ]);
    }

    /**
     * Helper: Generate UUID
     */
    private function generateId() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Helper: Get base URL
     */
    private function getBaseUrl() {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return "$protocol://$host";
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
