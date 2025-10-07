

/**
 * Computes a 32-bit integer hash from a string.
 * @param {string} input_string - The input string to hash.
 * @throws {TypeError} If input_string is not a string.
 * @returns {number} The computed 32-bit integer hash.
 */
export const compute_hash = input_string => {
    if (typeof input_string !== 'string') {
        throw new TypeError('Input must be a string');
    }
    let hash = 0;
    const len = input_string.length;
    for (let i = 0; i < len; i++) {
        const code_point = input_string.charCodeAt(i);
        hash = ((hash << 5) - hash + code_point) | 0;
    }
    return hash;
};
