
//import { numb } from './math/number.js';

/**
 * @class array
 */
export class array {

    /**
     * Checks if the given argument is an array or array-like object.
     * @param {*} arg - The object to test.
     * @returns {boolean} - True if the object is an array or array-like, false otherwise.
     * 
     * @example
     * // Example usage:
     * const myArray = [1, 2, 3];
     * console.log(array.is_array(myArray)); // Output: true
     * 
     * const myTypedArray = new Float32Array([1.1, 2.2, 3.3]);
     * console.log(array.is_array(myTypedArray)); // Output: true
     * 
     * const myObject = { key: 'value' };
     * console.log(array.is_array(myObject)); // Output: false
     */
    static is_array(arg) {
        //console.trace(Object.prototype.toString.call(arg));
        return (
            Object.prototype.toString.call(arg) === '[object Array]' || // Check if it's an array
            arg instanceof ArrayBuffer || // Check if it's an ArrayBuffer
            ArrayBuffer.isView(arg) // Check if it's an array-like object
        );
    }

    /**
     * Checks if the provided argument is a FloatArray.
     * @param {Object} arg - The object to test.
     * @returns {boolean} - True if the argument is a FloatArray, false otherwise.
     * 
     * @example
     * // Example usage:
     * const floatArray = new Float32Array([1.1, 2.2, 3.3]);
     * console.log(array.is_float_array(floatArray)); // Output: true
     * 
     * const intArray = new Int32Array([1, 2, 3]);
     * console.log(array.is_float_array(intArray)); // Output: false
     */
    static is_float_array(arg) {
        return ArrayBuffer.isView(arg) && arg[Symbol.toStringTag].includes('Float');
    }

    /**
     * Shuffles the elements of an array.
     * @param {Array} arr - The array to shuffle.
     * @returns {void} - The shuffled array (the original array is modified in place).
     */
    static shuffle(arr) {
        // Loop through each element of the array
        for (let i = 0; i < arr.length; ++i) {
            // Generate a random index within the array range
            let index = numb.irand(0, arr.length - 1);
            // Swap the current element with the randomly selected element
            [arr[i], arr[index]] = [arr[index], arr[i]];
        }
    }

    /**
     * Returns the last element of the provided array.
     * @param {Array} arg - The array from which to retrieve the last element.
     * @returns {any} - The last element of the array.
     */
    static last(arg) {
        return arg[arg.length - 1];
    }

    /**
     * Checks if two arrays are equal.
     * @param {Array} a - The first array to compare.
     * @param {Array} b - The second array to compare.
     * @returns {boolean} True if the arrays are equal, false otherwise.
     */
    static equals(a, b) {
        if (a.length !== b.length) return false;

        for (let i = 0, len = a.length; i < len; i++) {
            if (a[i] !== b[i]) return false;
        }

        return true;
    }

}

/**
 * Represents a memory pool.
 */
export class pool {
    #buffer;
    #offset;

    /**
     * Creates a new Pool instance.
     */
    constructor() {
        this.#offset = 0;
    }

    /**
     * Gets the buffer.
     * @returns {ArrayBuffer} The buffer.
     */
    get buffer() { return this.#buffer; }

    /**
     * Sets the buffer.
     * @param {ArrayBuffer} value - The value to set the buffer to.
     */
    set buffer(value) { this.#buffer = value; }

    /**
     * Gets the offset.
     * @returns {number} The offset.
     */
    get offset() { return this.#offset; }

    /**
     * Sets the offset.
     * @param {number} value - The value to set the offset to.
     */
    set offset(value) { this.#offset = value; }

    /**
     * Initializes the memory pool with a buffer of the specified length.
     * @param {number} length - The length of the buffer.
     */
    init(length) {
        this.#buffer = new ArrayBuffer(length);
        this.#offset = 0;
    }

    /**
     * Aligns the offset to the byte alignment of the given array and updates the offset.
     * @param {TypedArray} arr - The typed array to align to.
     * @param {number} length - The length of the array.
     * @returns {number} The aligned offset.
     */
    align(arr, length) {
        const bytesPerElement = arr.BYTES_PER_ELEMENT;
        while (this.#offset % bytesPerElement) this.#offset++;
        const alignedOffset = this.#offset;
        this.#offset += bytesPerElement * length;
        return alignedOffset;
    }
}


