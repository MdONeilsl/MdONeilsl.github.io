/** 
 * Strings module
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */


/**
 * Computes 32-bit integer hash from string
 * @param {string} input_string - Input string to hash
 * @returns {number} Computed 32-bit integer hash
 */
export const compute_hash = input_string => {
    let hash = 0;
    let i = input_string.length;
    
    while (i--) {
        hash = ((hash << 5) - hash + input_string.charCodeAt(i)) | 0;
    }
    
    return hash;
};
