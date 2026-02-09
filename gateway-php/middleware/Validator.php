<?php
/**
 * Request Validation Middleware
 * Validates incoming request data
 */

namespace PSO\Gateway\Middleware;

class Validator {
    /**
     * Validate payment creation request
     * @param array $data Request data
     * @return array|null Error response or null if valid
     */
    public function validatePaymentCreation($data) {
        $errors = [];

        if (!isset($data['orderId']) || !is_string($data['orderId'])) {
            $errors[] = 'orderId is required and must be a string';
        }

        if (!isset($data['amount']) || !is_numeric($data['amount']) || $data['amount'] <= 0) {
            $errors[] = 'amount is required and must be a positive number';
        }

        if (isset($data['currency']) && !is_string($data['currency'])) {
            $errors[] = 'currency must be a string';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors
            ];
        }

        return null;
    }

    /**
     * Validate payment verification request
     * @param array $data Request data
     * @return array|null Error response or null if valid
     */
    public function validatePaymentVerification($data) {
        $errors = [];

        if (!isset($data['paymentOrderId']) || !is_string($data['paymentOrderId'])) {
            $errors[] = 'paymentOrderId is required and must be a string';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors
            ];
        }

        return null;
    }

    /**
     * Sanitize input to prevent XSS
     * @param mixed $data Input data
     * @return mixed Sanitized data
     */
    public function sanitizeInput($data) {
        if (is_array($data)) {
            return $this->sanitizeArray($data);
        }

        if (is_string($data)) {
            return trim($data);
        }

        return $data;
    }

    /**
     * Recursively sanitize array
     * @param array $arr Array to sanitize
     * @return array Sanitized array
     */
    private function sanitizeArray($arr) {
        $sanitized = [];
        
        foreach ($arr as $key => $value) {
            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeArray($value);
            } elseif (is_string($value)) {
                $sanitized[$key] = trim($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }
}
