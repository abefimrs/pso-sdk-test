/**
 * Payment Pop-up Manager
 * Handles opening gateway URL in popup/iframe and monitoring payment completion
 */

export class PaymentPopup {
  constructor(config) {
    this.config = config;
    this.overlay = null;
    this.popup = null;
    this.iframe = null;
    this.popupWindow = null;
    this.isOpen = false;
    this.messageListener = null;
    this.intervalCheck = null;
  }

  /**
   * Show the payment pop-up with gateway URL
   */
  show(options) {
    if (this.isOpen) {
      return;
    }

    this.options = options;
    
    // Decide between iframe (default) or popup window
    const usePopupWindow = this.config.usePopupWindow || false;
    
    if (usePopupWindow) {
      this.openPopupWindow();
    } else {
      this.createOverlay();
      this.createIframePopup();
      this.attachEventListeners();
    }
    
    this.isOpen = true;
    
    // Listen for payment completion messages
    this.setupMessageListener();

    // Prevent body scrolling when using overlay
    if (!usePopupWindow) {
      document.body.style.overflow = 'hidden';

      // Trigger animation
      setTimeout(() => {
        this.overlay.classList.add('pso-active');
        this.popup.classList.add('pso-active');
      }, 10);
    }
  }

  /**
   * Close the payment pop-up
   */
  close() {
    if (!this.isOpen) {
      return;
    }

    // Clean up message listener
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }

    // Clean up popup window check interval
    if (this.intervalCheck) {
      clearInterval(this.intervalCheck);
      this.intervalCheck = null;
    }

    // Close popup window if open
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
      this.popupWindow = null;
    }

    // Close iframe overlay
    if (this.overlay) {
      this.overlay.classList.remove('pso-active');
      if (this.popup) {
        this.popup.classList.remove('pso-active');
      }

      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.popup = null;
        this.iframe = null;
        this.isOpen = false;
        document.body.style.overflow = '';
      }, 300);
    } else {
      this.isOpen = false;
    }
  }

  /**
   * Open gateway URL in popup window
   */
  openPopupWindow() {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const features = `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;

    this.popupWindow = window.open(
      this.options.gatewayUrl,
      'PSOPaymentGateway',
      features
    );

    if (!this.popupWindow) {
      // Popup blocked - fallback to iframe
      console.warn('[PSO SDK] Popup blocked, falling back to iframe');
      this.createOverlay();
      this.createIframePopup();
      this.attachEventListeners();
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        this.overlay.classList.add('pso-active');
        this.popup.classList.add('pso-active');
      }, 10);
      return;
    }

    // Check if popup is closed
    this.intervalCheck = setInterval(() => {
      if (this.popupWindow && this.popupWindow.closed) {
        clearInterval(this.intervalCheck);
        this.intervalCheck = null;
        this.handleCancel();
      }
    }, 500);

    // Focus on popup
    if (this.popupWindow.focus) {
      this.popupWindow.focus();
    }
  }

  /**
   * Create overlay element
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'pso-overlay';
    document.body.appendChild(this.overlay);
  }

  /**
   * Create popup with iframe showing gateway page
   */
  createIframePopup() {
    this.popup = document.createElement('div');
    this.popup.className = 'pso-popup pso-popup-iframe';
    this.popup.innerHTML = this.getIframePopupHTML();
    this.overlay.appendChild(this.popup);

    // Get iframe element
    this.iframe = this.popup.querySelector('#pso-gateway-iframe');
  }

  /**
   * Get HTML content for iframe popup
   */
  getIframePopupHTML() {
    return `
      <div class="pso-header">
        <h2>Secure Payment</h2>
        <button class="pso-close" type="button">&times;</button>
      </div>
      <div class="pso-body pso-iframe-container">
        <div class="pso-loading" id="pso-loading">
          <div class="pso-spinner"></div>
          <p>Loading payment gateway...</p>
        </div>
        <iframe 
          id="pso-gateway-iframe" 
          src="${this.options.gatewayUrl}" 
          frameborder="0"
          allow="payment"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        ></iframe>
      </div>
      <div class="pso-footer">
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
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.popup.querySelector('.pso-close');
    closeBtn.addEventListener('click', () => {
      this.handleCancel();
    });

    // Iframe load event
    if (this.iframe) {
      this.iframe.addEventListener('load', () => {
        const loading = this.popup.querySelector('#pso-loading');
        if (loading) {
          loading.style.display = 'none';
        }
      });
    }
  }

  /**
   * Setup message listener for payment completion
   */
  setupMessageListener() {
    this.messageListener = (event) => {
      // Verify origin if needed
      // if (event.origin !== this.expectedOrigin) return;

      const data = event.data;

      if (this.config.debug) {
        console.log('[PSO SDK] Received message:', data);
      }

      // Handle payment completion messages
      if (data && typeof data === 'object') {
        if (data.type === 'PAYMENT_SUCCESS' || data.status === 'SUCCESS' || data.success === true) {
          this.handleSuccess(data);
        } else if (data.type === 'PAYMENT_FAILURE' || data.status === 'FAILED' || data.success === false) {
          this.handleError(data);
        } else if (data.type === 'PAYMENT_CANCEL' || data.status === 'CANCELLED') {
          this.handleCancel();
        }
      }

      // Also listen for redirect URLs
      if (typeof data === 'string') {
        if (data.includes('success') || data.includes('payment-success')) {
          this.handleSuccess({ redirectUrl: data });
        } else if (data.includes('cancel') || data.includes('payment-cancel')) {
          this.handleCancel();
        } else if (data.includes('failure') || data.includes('payment-failure')) {
          this.handleError({ redirectUrl: data });
        }
      }
    };

    window.addEventListener('message', this.messageListener);

    // Also monitor URL changes for redirect detection
    if (!this.config.usePopupWindow && this.iframe) {
      this.monitorIframeRedirects();
    }
  }

  /**
   * Monitor iframe URL changes for payment completion
   */
  monitorIframeRedirects() {
    // This is limited due to same-origin policy
    // The gateway should send postMessage for best results
    try {
      let lastUrl = this.options.gatewayUrl;
      
      const checkUrl = setInterval(() => {
        if (!this.iframe || !this.isOpen) {
          clearInterval(checkUrl);
          return;
        }

        try {
          const currentUrl = this.iframe.contentWindow.location.href;
          if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            
            // Check if redirected to success/failure/cancel URL
            if (this.options.successUrl && currentUrl.includes(this.options.successUrl)) {
              clearInterval(checkUrl);
              this.handleSuccess({ redirectUrl: currentUrl });
            } else if (this.options.failureUrl && currentUrl.includes(this.options.failureUrl)) {
              clearInterval(checkUrl);
              this.handleError({ redirectUrl: currentUrl });
            } else if (this.options.cancelUrl && currentUrl.includes(this.options.cancelUrl)) {
              clearInterval(checkUrl);
              this.handleCancel();
            }
          }
        } catch (e) {
          // Cross-origin access blocked - expected
        }
      }, 500);
    } catch (e) {
      // Silently fail - cross-origin restrictions
    }
  }

  /**
   * Handle successful payment
   */
  handleSuccess(data) {
    if (this.config.debug) {
      console.log('[PSO SDK] Payment successful:', data);
    }

    this.close();

    if (this.options.onSuccess) {
      this.options.onSuccess({
        success: true,
        transactionId: this.options.transactionId,
        sessionId: this.options.sessionId,
        ...data
      });
    }
  }

  /**
   * Handle payment error
   */
  handleError(data) {
    if (this.config.debug) {
      console.error('[PSO SDK] Payment failed:', data);
    }

    this.close();

    if (this.options.onError) {
      this.options.onError({
        success: false,
        message: data.message || 'Payment failed',
        transactionId: this.options.transactionId,
        ...data
      });
    }
  }

  /**
   * Handle payment cancellation
   */
  handleCancel() {
    if (this.config.debug) {
      console.log('[PSO SDK] Payment cancelled');
    }

    this.close();

    if (this.options.onCancel) {
      this.options.onCancel({
        success: false,
        message: 'Payment cancelled by user',
        transactionId: this.options.transactionId
      });
    }
  }
}
