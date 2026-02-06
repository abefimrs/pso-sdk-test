/**
 * Form Validation Utilities
 * Provides validation functions for payment form fields
 */

export class Validator {
  /**
   * Validate credit card number using Luhn algorithm
   */
  static validateCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (!/^\d{13,19}$/.test(cleaned)) {
      return { valid: false, message: 'Card number must be 13-19 digits' };
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    const valid = sum % 10 === 0;
    return {
      valid,
      message: valid ? '' : 'Invalid card number'
    };
  }

  /**
   * Validate expiry date (MM/YY format)
   */
  static validateExpiry(expiry) {
    const cleaned = expiry.replace(/\s/g, '');
    const match = cleaned.match(/^(\d{2})\/(\d{2})$/);

    if (!match) {
      return { valid: false, message: 'Format should be MM/YY' };
    }

    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10) + 2000;

    if (month < 1 || month > 12) {
      return { valid: false, message: 'Invalid month' };
    }

    const now = new Date();
    const expDate = new Date(year, month - 1);

    if (expDate < now) {
      return { valid: false, message: 'Card has expired' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate CVV/CVC code
   */
  static validateCVV(cvv) {
    const cleaned = cvv.replace(/\s/g, '');

    if (!/^\d{3,4}$/.test(cleaned)) {
      return { valid: false, message: 'CVV must be 3-4 digits' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate cardholder name
   */
  static validateCardholderName(name) {
    const trimmed = name.trim();

    if (trimmed.length < 3) {
      return { valid: false, message: 'Name must be at least 3 characters' };
    }

    if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
      return { valid: false, message: 'Name should contain only letters' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Get card type from card number
   */
  static getCardType(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');

    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';

    return 'unknown';
  }

  /**
   * Format card number with spaces
   */
  static formatCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ');
  }

  /**
   * Format expiry date
   */
  static formatExpiry(expiry) {
    const cleaned = expiry.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  }
}
