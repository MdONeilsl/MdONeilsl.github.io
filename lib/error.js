/**
 * Custom Error class for handling application-specific errors.
 */
export class error extends Error {
    /**
     * Creates an instance of the custom error class.
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);  // Call the parent class constructor with the error message
        this.name = 'error';  // Set the name property to the custom error name
    }

    /**
     * Returns the type of the error.
     * @returns {string} The error type.
     */
    get kind() {
        return 'error';
    }
}

/**
 * Custom TypeError class for handling type-specific errors.
 */
export class type_error extends TypeError {
    /**
     * Creates an instance of the custom TypeError class.
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);  // Call the parent class (Error) constructor with the error message
        this.name = 'type_error';  // Set the name property to 'type_error'
    }

    /**
     * Returns the type of the error.
     * @returns {string} The error type.
     */
    get kind() {
        return 'error';
    }
}

/**
 * Custom RangeError class for handling range-specific errors.
 */
export class range_error extends RangeError {
    /**
     * Creates an instance of the custom RangeError class.
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);  // Call the parent class (RangeError) constructor with the error message
        this.name = 'range_error';  // Set the name property to 'range_error'
    }

    /**
     * Returns the type of the error.
     * @returns {string} The error type.
     */
    get kind() {
        return 'error';
    }
}

/**
 * Custom SyntaxError class for handling range-specific errors.
 */
export class syntax_error extends SyntaxError {
    /**
     * Creates an instance of the custom SyntaxError class.
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);  // Call the parent class (SyntaxError) constructor with the error message
        this.name = 'syntax_error';  // Set the name property to 'syntax_error'
    }

    /**
     * Returns the type of the error.
     * @returns {string} The error type.
     */
    get kind() {
        return 'error';
    }
}

/**
 * Custom URIError class for handling range-specific errors.
 */
export class uri_error extends URIError {
    /**
     * Creates an instance of the custom URIError class.
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);  // Call the parent class (URIError) constructor with the error message
        this.name = 'uri_error';  // Set the name property to 'uri_error'
    }

    /**
     * Returns the type of the error.
     * @returns {string} The error type.
     */
    get kind() {
        return 'error';
    }
}