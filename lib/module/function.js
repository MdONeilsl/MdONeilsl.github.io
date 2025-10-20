/** 
 * Utility functions
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

/**
 * High-performance debounce implementation with immediate option
 * @param {Function} func - Function to debounce
 * @param {number} wait - Debounce delay in milliseconds
 * @param {boolean} immediate - Whether to trigger immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
    let timeout = null;
    return function (...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const call_now = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (call_now) func.apply(this, args);
    };
};

