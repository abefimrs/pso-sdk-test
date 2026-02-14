/**
 * PSO Payment SDK - Main Entry Point
 * 
 * @module @pso/payment-sdk
 */

import PSOPayment from './payment-sdk.js';
import './styles.css';

export default PSOPayment;
export { PSOPayment };

// Make available globally in browser environments
if (typeof window !== 'undefined') {
  window.PSOPayment = PSOPayment;
}
