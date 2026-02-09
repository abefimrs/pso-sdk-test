<?php
/**
 * Transaction Model
 * Handles transaction data storage and retrieval
 */

namespace PSO\Gateway\Models;

class Transaction {
    private $dbFile;

    public function __construct() {
        $this->dbFile = __DIR__ . '/../data/transactions.json';
        
        // Ensure data directory exists
        $dataDir = dirname($this->dbFile);
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }

        // Initialize empty database if doesn't exist
        if (!file_exists($this->dbFile)) {
            file_put_contents($this->dbFile, json_encode([]));
        }
    }

    /**
     * Create a new transaction
     * @param array $transaction Transaction data
     * @return array Created transaction
     */
    public function create($transaction) {
        $transactions = $this->getAll();
        
        if (!isset($transaction['id'])) {
            $transaction['id'] = $this->generateId();
        }
        
        $transaction['createdAt'] = date('c');
        $transaction['updatedAt'] = date('c');
        
        $transactions[$transaction['id']] = $transaction;
        $this->save($transactions);
        
        return $transaction;
    }

    /**
     * Find transaction by ID
     * @param string $id Transaction ID
     * @return array|null Transaction data or null
     */
    public function findById($id) {
        $transactions = $this->getAll();
        return $transactions[$id] ?? null;
    }

    /**
     * Find transaction by order ID
     * @param string $orderId Order ID
     * @return array|null Transaction data or null
     */
    public function findByOrderId($orderId) {
        $transactions = $this->getAll();
        
        foreach ($transactions as $transaction) {
            if (isset($transaction['orderId']) && $transaction['orderId'] === $orderId) {
                return $transaction;
            }
        }
        
        return null;
    }

    /**
     * Find transactions by merchant ID
     * @param string $merchantId Merchant ID
     * @return array Array of transactions
     */
    public function findByMerchantId($merchantId) {
        $transactions = $this->getAll();
        $result = [];
        
        foreach ($transactions as $transaction) {
            if (isset($transaction['merchantId']) && $transaction['merchantId'] === $merchantId) {
                $result[] = $transaction;
            }
        }
        
        return $result;
    }

    /**
     * Update transaction
     * @param string $id Transaction ID
     * @param array $updates Update data
     * @return array|null Updated transaction or null
     */
    public function update($id, $updates) {
        $transactions = $this->getAll();
        
        if (!isset($transactions[$id])) {
            return null;
        }
        
        $transactions[$id] = array_merge($transactions[$id], $updates);
        $transactions[$id]['updatedAt'] = date('c');
        
        $this->save($transactions);
        
        return $transactions[$id];
    }

    /**
     * Delete transaction
     * @param string $id Transaction ID
     * @return bool Success
     */
    public function delete($id) {
        $transactions = $this->getAll();
        
        if (!isset($transactions[$id])) {
            return false;
        }
        
        unset($transactions[$id]);
        $this->save($transactions);
        
        return true;
    }

    /**
     * Get all transactions
     * @return array All transactions
     */
    public function getAll() {
        if (!file_exists($this->dbFile)) {
            return [];
        }
        
        $content = file_get_contents($this->dbFile);
        $data = json_decode($content, true);
        
        return is_array($data) ? $data : [];
    }

    /**
     * Save transactions to file
     * @param array $transactions Transactions data
     */
    private function save($transactions) {
        file_put_contents($this->dbFile, json_encode($transactions, JSON_PRETTY_PRINT));
    }

    /**
     * Generate unique ID
     * @return string UUID
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
     * Get statistics
     * @return array Statistics data
     */
    public function getStats() {
        $transactions = $this->getAll();
        
        $stats = [
            'total' => count($transactions),
            'success' => 0,
            'failed' => 0,
            'pending' => 0,
            'totalAmount' => 0
        ];
        
        foreach ($transactions as $transaction) {
            $status = strtoupper($transaction['status'] ?? 'UNKNOWN');
            
            if ($status === 'SUCCESS' || $status === 'COMPLETED') {
                $stats['success']++;
            } elseif ($status === 'FAILED' || $status === 'DECLINED') {
                $stats['failed']++;
            } elseif ($status === 'PENDING') {
                $stats['pending']++;
            }
            
            if (isset($transaction['amount'])) {
                $stats['totalAmount'] += $transaction['amount'];
            }
        }
        
        return $stats;
    }
}
