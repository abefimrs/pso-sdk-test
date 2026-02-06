/**
 * Payment Pop-up Manager
 * Handles creation, display, and management of the in-host payment pop-up
 */

import { Validator } from './validation.js';

export class PaymentPopup {
  constructor(config) {
    this.config = config;
    this.overlay = null;
    this.popup = null;
    this.isOpen = false;
  }

  /**
   * Show the payment pop-up
   */
  show(options) {
    if (this.isOpen) {
      return;
    }

    this.options = options;
    this.createOverlay();
    this.createPopup();
    this.attachEventListeners();
    this.isOpen = true;

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Trigger animation
    setTimeout(() => {
      this.overlay.classList.add('pso-active');
      this.popup.classList.add('pso-active');
    }, 10);
  }

  /**
   * Close the payment pop-up
   */
  close() {
    if (!this.isOpen) {
      return;
    }

    this.overlay.classList.remove('pso-active');
    this.popup.classList.remove('pso-active');

    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.popup = null;
      this.isOpen = false;
      document.body.style.overflow = '';
    }, 300);
  }

  /**
   * Create overlay element
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'pso-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    document.body.appendChild(this.overlay);
  }

  /**
   * Create popup element with payment form
   */
  createPopup() {
    this.popup = document.createElement('div');
    this.popup.className = 'pso-popup';
    this.popup.innerHTML = this.getPopupHTML();
    this.overlay.appendChild(this.popup);
  }

  /**
   * Get HTML content for popup
   */
  getPopupHTML() {
    const amount = this.formatAmount(this.options.amount, this.options.currency);
    
    return `
      <div class="pso-header">
        <h2>Secure Payment</h2>
        <button class="pso-close" type="button">&times;</button>
      </div>
      <div class="pso-body">
        <div class="pso-amount">
          <span class="pso-label">Amount:</span>
          <span class="pso-value">${amount}</span>
        </div>
        <form id="pso-payment-form" class="pso-form">
          <div class="pso-field">
            <label for="pso-card-number">Card Number</label>
            <input 
              type="text" 
              id="pso-card-number" 
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              maxlength="23"
              autocomplete="cc-number"
              required
            />
            <div class="pso-error" id="pso-card-number-error"></div>
          </div>
          
          <div class="pso-row">
            <div class="pso-field pso-field-half">
              <label for="pso-expiry">Expiry Date</label>
              <input 
                type="text" 
                id="pso-expiry" 
                name="expiry"
                placeholder="MM/YY"
                maxlength="5"
                autocomplete="cc-exp"
                required
              />
              <div class="pso-error" id="pso-expiry-error"></div>
            </div>
            
            <div class="pso-field pso-field-half">
              <label for="pso-cvv">CVV</label>
              <input 
                type="text" 
                id="pso-cvv" 
                name="cvv"
                placeholder="123"
                maxlength="4"
                autocomplete="cc-csc"
                required
              />
              <div class="pso-error" id="pso-cvv-error"></div>
            </div>
          </div>
          
          <div class="pso-field">
            <label for="pso-cardholder">Cardholder Name</label>
            <input 
              type="text" 
              id="pso-cardholder" 
              name="cardholderName"
              placeholder="John Doe"
              autocomplete="cc-name"
              required
            />
            <div class="pso-error" id="pso-cardholder-error"></div>
          </div>
          
          <button type="submit" class="pso-submit-btn" id="pso-submit-btn">
            Pay ${amount}
          </button>
        </form>
        
        <div class="pso-loading" id="pso-loading" style="display: none;">
          <div class="pso-spinner"></div>
          <p>Processing payment...</p>
        </div>
        
        <div class="pso-security-info">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0L2 3v4c0 3.5 2.5 6.5 6 7 3.5-.5 6-3.5 6-7V3L8 0z"/>
          </svg>
          <span>Secured by PSO Payment Gateway</span>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to form elements
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.popup.querySelector('.pso-close');
    closeBtn.addEventListener('click', () => this.close());

    // Form submission
    const form = this.popup.querySelector('#pso-payment-form');
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Real-time validation
    const cardNumberInput = this.popup.querySelector('#pso-card-number');
    const expiryInput = this.popup.querySelector('#pso-expiry');
    const cvvInput = this.popup.querySelector('#pso-cvv');
    const cardholderInput = this.popup.querySelector('#pso-cardholder');

    // Card number formatting and validation
    cardNumberInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      e.target.value = Validator.formatCardNumber(value);
      this.validateField('cardNumber', e.target.value);
    });

    // Expiry formatting and validation
    expiryInput.addEventListener('input', (e) => {
      e.target.value = Validator.formatExpiry(e.target.value);
      this.validateField('expiry', e.target.value);
    });

    // CVV validation
    cvvInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      this.validateField('cvv', e.target.value);
    });

    // Cardholder name validation
    cardholderInput.addEventListener('blur', (e) => {
      this.validateField('cardholderName', e.target.value);
    });
  }

  /**
   * Validate individual field
   */
  validateField(fieldName, value) {
    let result;
    let errorElement;

    switch (fieldName) {
      case 'cardNumber':
        result = Validator.validateCardNumber(value);
        errorElement = this.popup.querySelector('#pso-card-number-error');
        break;
      case 'expiry':
        result = Validator.validateExpiry(value);
        errorElement = this.popup.querySelector('#pso-expiry-error');
        break;
      case 'cvv':
        result = Validator.validateCVV(value);
        errorElement = this.popup.querySelector('#pso-cvv-error');
        break;
      case 'cardholderName':
        result = Validator.validateCardholderName(value);
        errorElement = this.popup.querySelector('#pso-cardholder-error');
        break;
    }

    if (errorElement) {
      errorElement.textContent = result.message;
      errorElement.style.display = result.message ? 'block' : 'none';
    }

    return result.valid;
  }

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
      cardNumber: formData.get('cardNumber'),
      expiry: formData.get('expiry'),
      cvv: formData.get('cvv'),
      cardholderName: formData.get('cardholderName'),
      amount: this.options.amount,
      currency: this.options.currency
    };

    // Validate all fields
    const validations = [
      this.validateField('cardNumber', data.cardNumber),
      this.validateField('expiry', data.expiry),
      this.validateField('cvv', data.cvv),
      this.validateField('cardholderName', data.cardholderName)
    ];

    if (!validations.every(v => v)) {
      return;
    }

    // Show loading state
    this.setLoadingState(true);

    try {
      const result = await this.processPayment(data);
      this.setLoadingState(false);
      
      if (result.success) {
        this.close();
        if (this.options.onSuccess) {
          this.options.onSuccess(result);
        }
      } else {
        this.showError(result.message || 'Payment failed');
        if (this.options.onError) {
          this.options.onError(result);
        }
      }
    } catch (error) {
      this.setLoadingState(false);
      this.showError(error.message || 'An error occurred');
      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }

  /**
   * Process payment through gateway
   */
  async processPayment(data) {
    const gatewayUrl = this.config.environment === 'production'
      ? this.config.gatewayUrl || 'https://api.pso-gateway.com'
      : this.config.gatewayUrl || 'http://localhost:3000';

    const response = await fetch(`${gatewayUrl}/api/payments/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-ID': this.config.merchantId
      },
      body: JSON.stringify({
        cardNumber: data.cardNumber.replace(/\s/g, ''),
        expiry: data.expiry,
        cvv: data.cvv,
        cardholderName: data.cardholderName,
        amount: data.amount,
        currency: data.currency
      })
    });

    if (!response.ok) {
      throw new Error('Network error');
    }

    return await response.json();
  }

  /**
   * Set loading state
   */
  setLoadingState(loading) {
    const form = this.popup.querySelector('#pso-payment-form');
    const loadingDiv = this.popup.querySelector('#pso-loading');
    const submitBtn = this.popup.querySelector('#pso-submit-btn');

    if (loading) {
      form.style.display = 'none';
      loadingDiv.style.display = 'block';
      submitBtn.disabled = true;
    } else {
      form.style.display = 'block';
      loadingDiv.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const existingError = this.popup.querySelector('.pso-global-error');
    if (existingError) {
      existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'pso-global-error';
    errorDiv.textContent = message;

    const body = this.popup.querySelector('.pso-body');
    body.insertBefore(errorDiv, body.firstChild);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /**
   * Format amount with currency
   */
  formatAmount(amount, currency) {
    const formatted = (amount / 100).toFixed(2);
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    const symbol = symbols[currency] || currency;
    return `${symbol}${formatted}`;
  }
}
