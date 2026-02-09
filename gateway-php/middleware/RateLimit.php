<?php
/**
 * Rate Limiting Middleware
 * Implements rate limiting for API endpoints
 */

namespace PSO\Gateway\Middleware;

class RateLimit {
    private $dataDir;

    public function __construct() {
        $this->dataDir = __DIR__ . '/../data/rate-limits';
        if (!is_dir($this->dataDir)) {
            mkdir($this->dataDir, 0755, true);
        }
    }

    /**
     * General rate limiter (100 requests per 15 minutes)
     * @return array|null Error response or null if within limit
     */
    public function generalLimiter() {
        return $this->checkLimit('general', 100, 900); // 15 minutes
    }

    /**
     * Payment creation rate limiter (10 requests per minute)
     * @return array|null Error response or null if within limit
     */
    public function paymentCreationLimiter() {
        return $this->checkLimit('payment-creation', 10, 60);
    }

    /**
     * Payment verification rate limiter (20 requests per minute)
     * @return array|null Error response or null if within limit
     */
    public function paymentVerificationLimiter() {
        return $this->checkLimit('payment-verification', 20, 60);
    }

    /**
     * IPN rate limiter (50 requests per minute)
     * @return array|null Error response or null if within limit
     */
    public function ipnLimiter() {
        return $this->checkLimit('ipn', 50, 60);
    }

    /**
     * Check rate limit
     * @param string $key Limit key/identifier
     * @param int $maxRequests Maximum number of requests
     * @param int $windowSeconds Time window in seconds
     * @return array|null Error response or null if within limit
     */
    private function checkLimit($key, $maxRequests, $windowSeconds) {
        $identifier = $this->getClientIdentifier();
        $limitKey = "$key:$identifier";
        $limitFile = $this->dataDir . '/' . md5($limitKey) . '.json';

        // Get current limits
        $limits = $this->getLimits($limitFile);
        
        // Clean old requests
        $now = time();
        $limits = array_filter($limits, function($timestamp) use ($now, $windowSeconds) {
            return ($now - $timestamp) < $windowSeconds;
        });

        // Check if limit exceeded
        if (count($limits) >= $maxRequests) {
            $retryAfter = min($limits) + $windowSeconds - $now;
            
            return [
                'success' => false,
                'message' => 'Too many requests',
                'error' => 'RATE_LIMIT_EXCEEDED',
                'retryAfter' => max(1, $retryAfter)
            ];
        }

        // Add current request
        $limits[] = $now;
        $this->saveLimits($limitFile, $limits);

        return null;
    }

    /**
     * Get client identifier (IP address)
     * @return string Client identifier
     */
    private function getClientIdentifier() {
        // Check for proxy headers
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }

        if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            return $_SERVER['HTTP_X_REAL_IP'];
        }

        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * Get limits from file
     * @param string $file File path
     * @return array Limits array
     */
    private function getLimits($file) {
        if (!file_exists($file)) {
            return [];
        }

        $content = file_get_contents($file);
        $data = json_decode($content, true);

        return is_array($data) ? $data : [];
    }

    /**
     * Save limits to file
     * @param string $file File path
     * @param array $limits Limits array
     */
    private function saveLimits($file, $limits) {
        file_put_contents($file, json_encode($limits));
    }
}
