/**
 * Token Routes
 * API endpoints for creating payment tokens
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

/**
 * Create a payment token
 * POST /api/tokens/create
 */
router.post('/create', (req, res) => {
  try {
    const { cardNumber, expiry, cvv } = req.body;
    const merchantId = req.headers['x-merchant-id'];

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID is required'
      });
    }

    // Basic validation
    if (!cardNumber || !expiry || !cvv) {
      return res.status(400).json({
        success: false,
        message: 'Card number, expiry, and CVV are required'
      });
    }

    // Generate token
    const token = `tok_${uuidv4().replace(/-/g, '')}`;

    return res.json({
      success: true,
      token,
      cardLast4: cardNumber.slice(-4),
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
    });
  } catch (error) {
    console.error('Token creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
