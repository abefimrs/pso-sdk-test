<?php
/**
 * Payment Routes (Legacy Test Routes)
 * API endpoints for payment processing
 */

namespace PSO\Gateway\Routes;

use PSO\Gateway\Models\Transaction;
use PSO\Gateway\Middleware\Auth;

class PaymentRoutes {
    private $transactionStore;
    private $auth;

    // Test card numbers and their behaviors
    private const TEST_CARDS = [
        '4111111111111111' => ['status' => 'success', 'message' => 'Payment successful'],
        '4242424242424242' => ['status' => 'success', 'message' => 'Payment successful'],
        '5555555555554444' => ['status' => 'success', 'message' => 'Payment successful'],
        '4000000000000002' => ['status' => 'declined', 'message' => 'Card declined - Insufficient funds'],
        '4000000000000069' => ['status' => 'declined', 'message' => 'Card declined - Expired card'],
        '4000000000000127' => ['status' => 'declined', 'message' => 'Card declined - Incorrect CVC'],
        '4000000000000119' => ['status' => 'error', 'message' => 'Processing error occurred'],
        '4000000000000341' => ['status' => 'error', 'message' => 'Card declined - Lost card'],
        '4000000000000259' => ['status' => 'error', 'message' => 'Card declined - Restricted card']
    ];

    public function __construct() {
        $this->transactionStore = new Transaction();
        $this->auth = new Auth();
    }

    /**
     * Process a payment
     * POST /api/payments/process
     */
    public function process($request) {
        $authError = $this->auth->validateMerchant($request);
        if ($authError) {
            return $this->jsonResponse($authError, 401);
        }

        try {
            $body = $request['body'];
            $merchantId = $request['merchantId'];

            // Validate card data
            $validationErrors = $this->validateCardData($body);
            if (!empty($validationErrors)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => implode(', ', $validationErrors)
                ], 400);
            }

            $cardNumber = $body['cardNumber'];

            // Check Luhn algorithm
            if (!$this->luhnCheck($cardNumber)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Invalid card number (failed Luhn check)'
                ], 400);
            }

            // Simulate processing delay
            usleep(1500000); // 1.5 seconds

            // Get test card behavior
            $behavior = self::TEST_CARDS[$cardNumber] ?? ['status' => 'success', 'message' => 'Payment successful'];

            // Create transaction
            $transaction = [
                'merchantId' => $merchantId,
                'cardNumber' => '****' . substr($cardNumber, -4),
                'cardholderName' => $body['cardholderName'],
                'amount' => $body['amount'],
                'currency' => $body['currency'] ?? 'USD',
                'status' => $behavior['status'],
                'message' => $behavior['message'],
                'timestamp' => date('c')
            ];

            $transaction = $this->transactionStore->create($transaction);

            // Return response based on status
            if ($behavior['status'] === 'success') {
                return $this->jsonResponse([
                    'success' => true,
                    'transactionId' => $transaction['id'],
                    'message' => $behavior['message'],
                    'amount' => $transaction['amount'],
                    'currency' => $transaction['currency'],
                    'timestamp' => $transaction['timestamp']
                ]);
            } else {
                return $this->jsonResponse([
                    'success' => false,
                    'transactionId' => $transaction['id'],
                    'message' => $behavior['message'],
                    'status' => $behavior['status']
                ], 400);
            }
        } catch (\Exception $error) {
            error_log('Payment processing error: ' . $error->getMessage());
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Verify a payment
     * GET /api/payments/verify/:transactionId
     */
    public function verify($request, $transactionId) {
        $authError = $this->auth->validateMerchant($request);
        if ($authError) {
            return $this->jsonResponse($authError, 401);
        }

        $merchantId = $request['merchantId'];
        $transaction = $this->transactionStore->findById($transactionId);

        if (!$transaction) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Transaction not found'
            ], 404);
        }

        if ($transaction['merchantId'] !== $merchantId) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        return $this->jsonResponse([
            'success' => true,
            'transaction' => $transaction
        ]);
    }

    /**
     * Get all transactions (for admin)
     * GET /api/payments/transactions
     */
    public function getTransactions($request) {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        $transactions = array_values($this->transactionStore->getAll());
        $transactions = array_slice($transactions, 0, $limit);
        $stats = $this->transactionStore->getStats();

        return $this->jsonResponse([
            'success' => true,
            'transactions' => $transactions,
            'stats' => $stats
        ]);
    }

    /**
     * Validate card data
     */
    private function validateCardData($data) {
        $errors = [];

        if (!isset($data['cardNumber']) || !preg_match('/^\d{13,19}$/', $data['cardNumber'])) {
            $errors[] = 'Invalid card number';
        }

        if (!isset($data['expiry']) || !preg_match('/^\d{2}\/\d{2}$/', $data['expiry'])) {
            $errors[] = 'Invalid expiry date';
        }

        if (!isset($data['cvv']) || !preg_match('/^\d{3,4}$/', $data['cvv'])) {
            $errors[] = 'Invalid CVV';
        }

        if (!isset($data['cardholderName']) || strlen(trim($data['cardholderName'])) < 3) {
            $errors[] = 'Invalid cardholder name';
        }

        if (!isset($data['amount']) || $data['amount'] <= 0) {
            $errors[] = 'Invalid amount';
        }

        return $errors;
    }

    /**
     * Luhn algorithm for card validation
     */
    private function luhnCheck($cardNumber) {
        $sum = 0;
        $isEven = false;

        for ($i = strlen($cardNumber) - 1; $i >= 0; $i--) {
            $digit = (int)$cardNumber[$i];

            if ($isEven) {
                $digit *= 2;
                if ($digit > 9) {
                    $digit -= 9;
                }
            }

            $sum += $digit;
            $isEven = !$isEven;
        }

        return $sum % 10 === 0;
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
