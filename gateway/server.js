/**
 * PSO Test Payment Gateway Server
 * Mock payment processor for development and testing
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const paymentRoutes = require('./routes/payments');
const tokenRoutes = require('./routes/tokens');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/tokens', tokenRoutes);

// Admin interface - serve static HTML
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSO Gateway Admin</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }
    
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 30px;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .stat-card.success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }
    
    .stat-card.declined {
      background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
    }
    
    .stat-card.error {
      background: linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%);
    }
    
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: 700;
    }
    
    .controls {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    button:hover {
      background: #5568d3;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    
    th {
      background: #f9f9f9;
      font-weight: 600;
      color: #333;
    }
    
    .status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      display: inline-block;
    }
    
    .status.success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .status.declined {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .status.error {
      background: #fef3c7;
      color: #92400e;
    }
    
    .amount {
      font-weight: 600;
      color: #333;
    }
    
    .timestamp {
      color: #666;
      font-size: 13px;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    
    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PSO Payment Gateway Admin</h1>
    <p class="subtitle">Test Transaction Dashboard</p>
    
    <div class="stats" id="stats">
      <div class="stat-card">
        <div class="stat-label">Total Transactions</div>
        <div class="stat-value" id="stat-total">0</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">Successful</div>
        <div class="stat-value" id="stat-success">0</div>
      </div>
      <div class="stat-card declined">
        <div class="stat-label">Declined</div>
        <div class="stat-value" id="stat-declined">0</div>
      </div>
      <div class="stat-card error">
        <div class="stat-label">Errors</div>
        <div class="stat-value" id="stat-errors">0</div>
      </div>
    </div>
    
    <div class="controls">
      <button onclick="loadTransactions()">Refresh</button>
      <button onclick="clearTransactions()">Clear All</button>
    </div>
    
    <div id="transactions-container">
      <div class="empty-state">
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
          <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"></path>
        </svg>
        <p>No transactions yet</p>
      </div>
    </div>
  </div>
  
  <script>
    async function loadTransactions() {
      try {
        const response = await fetch('/api/payments/transactions');
        const data = await response.json();
        
        if (data.success) {
          updateStats(data.stats);
          renderTransactions(data.transactions);
        }
      } catch (error) {
        console.error('Failed to load transactions:', error);
      }
    }
    
    function updateStats(stats) {
      document.getElementById('stat-total').textContent = stats.total;
      document.getElementById('stat-success').textContent = stats.successful;
      document.getElementById('stat-declined').textContent = stats.declined;
      document.getElementById('stat-errors').textContent = stats.errors;
    }
    
    function renderTransactions(transactions) {
      const container = document.getElementById('transactions-container');
      
      if (transactions.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
              <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"></path>
            </svg>
            <p>No transactions yet</p>
          </div>
        \`;
        return;
      }
      
      container.innerHTML = \`
        <table>
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Cardholder</th>
              <th>Card</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            \${transactions.map(t => \`
              <tr>
                <td><code>\${t.id.slice(0, 8)}...</code></td>
                <td>\${t.cardholderName}</td>
                <td>\${t.cardNumber}</td>
                <td class="amount">\${formatAmount(t.amount, t.currency)}</td>
                <td><span class="status \${t.status}">\${t.status}</span></td>
                <td class="timestamp">\${formatTime(t.timestamp)}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;
    }
    
    function formatAmount(amount, currency) {
      const formatted = (amount / 100).toFixed(2);
      const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£' };
      return \`\${symbols[currency] || currency}\${formatted}\`;
    }
    
    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    }
    
    async function clearTransactions() {
      if (confirm('Clear all transactions?')) {
        // This would require a DELETE endpoint
        alert('Clear functionality would be implemented on the backend');
      }
    }
    
    // Load transactions on page load
    loadTransactions();
    
    // Auto-refresh every 5 seconds
    setInterval(loadTransactions, 5000);
  </script>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: 'test',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'PSO Test Payment Gateway',
    version: '1.0.0',
    environment: 'test',
    endpoints: {
      payments: '/api/payments/process',
      verify: '/api/payments/verify/:id',
      tokens: '/api/tokens/create',
      admin: '/admin',
      health: '/health'
    },
    testCards: {
      success: ['4111111111111111', '4242424242424242', '5555555555554444'],
      declined: ['4000000000000002', '4000000000000069', '4000000000000127'],
      error: ['4000000000000119', '4000000000000341', '4000000000000259']
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('=================================');
  console.log('PSO Test Payment Gateway');
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin interface: http://localhost:${PORT}/admin`);
  console.log(`API endpoint: http://localhost:${PORT}/api/payments/process`);
  console.log('=================================');
});

module.exports = app;
