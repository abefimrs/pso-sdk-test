/**
 * Transaction Model
 * In-memory storage for test transactions
 */

class TransactionStore {
  constructor() {
    this.transactions = new Map();
    this.transactionHistory = [];
  }

  /**
   * Create a new transaction
   */
  create(transaction) {
    this.transactions.set(transaction.id, transaction);
    this.transactionHistory.unshift(transaction); // Add to beginning
    
    // Keep only last 1000 transactions in history
    if (this.transactionHistory.length > 1000) {
      this.transactionHistory.pop();
    }
    
    return transaction;
  }

  /**
   * Get transaction by ID
   */
  get(id) {
    return this.transactions.get(id);
  }

  /**
   * Get all transactions
   */
  getAll(limit = 100) {
    return this.transactionHistory.slice(0, limit);
  }

  /**
   * Update transaction status
   */
  update(id, updates) {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      return null;
    }
    
    Object.assign(transaction, updates);
    this.transactions.set(id, transaction);
    
    // Update in history
    const historyIndex = this.transactionHistory.findIndex(t => t.id === id);
    if (historyIndex !== -1) {
      this.transactionHistory[historyIndex] = transaction;
    }
    
    return transaction;
  }

  /**
   * Get statistics
   */
  getStats() {
    const all = this.transactionHistory;
    const successful = all.filter(t => t.status === 'success').length;
    const declined = all.filter(t => t.status === 'declined').length;
    const errors = all.filter(t => t.status === 'error').length;
    
    const totalAmount = all
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      total: all.length,
      successful,
      declined,
      errors,
      totalAmount
    };
  }

  /**
   * Clear all transactions (for testing)
   */
  clear() {
    this.transactions.clear();
    this.transactionHistory = [];
  }
}

module.exports = new TransactionStore();
