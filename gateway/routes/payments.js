/**
 * Payment Routes
 * API endpoints for payment processing
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const transactionStore = require('../models/transaction');

/**
 * Test card numbers and their behaviors
 */
const TEST_CARDS = {
  '4111111111111111': { status: 'success', message: 'Payment successful' },
  '4242424242424242': { status: 'success', message: 'Payment successful' },
  '5555555555554444': { status: 'success', message: 'Payment successful' },
  '4000000000000002': { status: 'declined', message: 'Card declined - Insufficient funds' },
  '4000000000000069': { status: 'declined', message: 'Card declined - Expired card' },
  '4000000000000127': { status: 'declined', message: 'Card declined - Incorrect CVC' },
  '4000000000000119': { status: 'error', message: 'Processing error occurred' },
  '4000000000000341': { status: 'error', message: 'Card declined - Lost card' },
  '4000000000000259': { status: 'error', message: 'Card declined - Restricted card' }
};

/**
 * Validate card data
 */
function validateCardData(data) {
  const errors = [];

  if (!data.cardNumber || !/^\d{13,19}$/.test(data.cardNumber)) {
    errors.push('Invalid card number');
  }

  if (!data.expiry || !/^\d{2}\/\d{2}$/.test(data.expiry)) {
    errors.push('Invalid expiry date');
  }

  if (!data.cvv || !/^\d{3,4}$/.test(data.cvv)) {
    errors.push('Invalid CVV');
  }

  if (!data.cardholderName || data.cardholderName.trim().length < 3) {
    errors.push('Invalid cardholder name');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Invalid amount');
  }

  return errors;
}

/**
 * Luhn algorithm for card validation
 */
function luhnCheck(cardNumber) {
  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Process a payment
 * POST /api/payments/process
 */
router.post('/process', async (req, res) => {
  try {
    const { cardNumber, expiry, cvv, cardholderName, amount, currency } = req.body;
    const merchantId = req.headers['x-merchant-id'];

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID is required'
      });
    }

    // Validate card data
    const validationErrors = validateCardData({ cardNumber, expiry, cvv, cardholderName, amount });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(', ')
      });
    }

    // Check Luhn algorithm
    if (!luhnCheck(cardNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card number (failed Luhn check)'
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get test card behavior
    const testCard = TEST_CARDS[cardNumber];
    const behavior = testCard || { status: 'success', message: 'Payment successful' };

    // Create transaction
    const transaction = {
      id: uuidv4(),
      merchantId,
      cardNumber: `****${cardNumber.slice(-4)}`,
      cardholderName,
      amount,
      currency: currency || 'USD',
      status: behavior.status,
      message: behavior.message,
      timestamp: new Date().toISOString()
    };

    transactionStore.create(transaction);

    // Return response based on status
    if (behavior.status === 'success') {
      return res.json({
        success: true,
        transactionId: transaction.id,
        message: behavior.message,
        amount: transaction.amount,
        currency: transaction.currency,
        timestamp: transaction.timestamp
      });
    } else {
      return res.status(400).json({
        success: false,
        transactionId: transaction.id,
        message: behavior.message,
        status: behavior.status
      });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Verify a payment
 * GET /api/payments/verify/:transactionId
 */
router.get('/verify/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  const merchantId = req.headers['x-merchant-id'];

  if (!merchantId) {
    return res.status(401).json({
      success: false,
      message: 'Merchant ID is required'
    });
  }

  const transaction = transactionStore.get(transactionId);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  if (transaction.merchantId !== merchantId) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  return res.json({
    success: true,
    transaction
  });
});

/**
 * Get all transactions (for admin)
 * GET /api/payments/transactions
 */
router.get('/transactions', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const transactions = transactionStore.getAll(limit);
  const stats = transactionStore.getStats();

  return res.json({
    success: true,
    transactions,
    stats
  });
});

module.exports = router;
