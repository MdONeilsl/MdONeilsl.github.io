/**
 * function module
 * @copyright 2026 MdONeil
 * @license GNU GPL v3
 */

import { array } from "./module/array.js"

export const NULL = void (0);

/**
 * Class representing various flag constants and utility functions.
 */
export class flag {
    // Define flag constants with bitwise operations
    static get CASE_SENSITIVE() { return 0x1 << 0; }
    static get CASE_INSENSITIVE() { return 0x1 << 1; }

    static get INVALID_FLAG() { return 0; }

    static get COMMENT_FLAG() { return 0x1 << 0; }
    static get NAME_FLAG() { return 0x1 << 1; }
    static get NUMBER_FLAG() { return 0x1 << 2; }
    static get SYMBOL_FLAG() { return 0x1 << 3; }
    static get STRING_FLAG() { return 0x1 << 4; }

    static get TYPE_FLAG() { return 0x1 << 5; }
    static get VARIABLE_FLAG() { return 0x1 << 6; }
    static get USER_FUNC_FLAG() { return 0x1 << 7; }
    static get DEF_FUNC_FLAG() { return 0x1 << 8; }
    static get EVENT_FLAG() { return 0x1 << 9; }
    static get CONTROL_FLAG() { return 0x1 << 10; }
    static get OPERATOR_FLAG() { return 0x1 << 11; }

    static get VECTOR_OP_FLAG() { return 0x1 << 12; }
    static get VECTOR_CL_FLAG() { return 0x1 << 13; }

    static get QUAT_OP_FLAG() { return 0x1 << 14; }
    static get QUAT_CL_FLAG() { return 0x1 << 15; }

    static get LIST_OP_FLAG() { return 0x1 << 16; }
    static get LIST_ENTRY() { return 0x1 << 17; }
    static get LIST_CL_FLAG() { return 0x1 << 18; }

    static get DEL_FLAG() { return 0x1 << 19; }
    static get EOL_FLAG() { return 0x1 << 20; }
    static get STATE_NAME_FLAG() { return 0x1 << 21; }

    static get CASTING_FLAG() { return 0x1 << 22; }
    static get VALIDATE_FLAG() { return 0x1 << 23; }

    static get USED_FLAG() { return 0x1 << 24; }
    static get ASSIGNED_FLAG() { return 0x1 << 25; }
    static get INITED_FLAG() { return 0x1 << 26; }
    static get DEF_INIT_FLAG() { return 0x1 << 27; }
    static get CONST_FLAG() { return 0x1 << 28; }
    static get PARAM_FLAG() { return 0x1 << 29; }

    /**
     * Converts a flag value to a human-readable string.
     *
     * @param {number} f - The flag value.
     * @returns {string} The human-readable string representation of the flag value.
     */
    static to_string(f) {
        let out = []
        if (f & flag.COMMENT_FLAG) out.push(`COMMENT_FLAG`)
        if (f & flag.NAME_FLAG) out.push(`NAME_FLAG`)
        if (f & flag.NUMBER_FLAG) out.push(`NUMBER_FLAG`)
        if (f & flag.SYMBOL_FLAG) out.push(`SYMBOL_FLAG`)
        if (f & flag.STRING_FLAG) out.push(`STRING_FLAG`)
        if (f & flag.TYPE_FLAG) out.push(`TYPE_FLAG`)
        if (f & flag.VARIABLE_FLAG) out.push(`VARIABLE_FLAG`)
        if (f & flag.USER_FUNC_FLAG) out.push(`USER_FUNC_FLAG`)
        if (f & flag.DEF_FUNC_FLAG) out.push(`DEF_FUNC_FLAG`)
        if (f & flag.EVENT_FLAG) out.push(`EVENT_FLAG`)
        if (f & flag.CONTROL_FLAG) out.push(`CONTROL_FLAG`)
        if (f & flag.OPERATOR_FLAG) out.push(`OPERATOR_FLAG`)
        if (f & flag.VECTOR_OP_FLAG) out.push(`VECTOR_OP_FLAG`)
        if (f & flag.VECTOR_CL_FLAG) out.push(`VECTOR_CL_FLAG`)
        if (f & flag.QUAT_OP_FLAG) out.push(`QUAT_OP_FLAG`)
        if (f & flag.QUAT_CL_FLAG) out.push(`QUAT_CL_FLAG`)
        if (f & flag.LIST_OP_FLAG) out.push(`LIST_OP_FLAG`)
        if (f & flag.LIST_ENTRY) out.push(`LIST_ENTRY`)
        if (f & flag.LIST_CL_FLAG) out.push(`LIST_CL_FLAG`)
        if (f & flag.DEL_FLAG) out.push(`DEL_FLAG`)
        if (f & flag.EOL_FLAG) out.push(`EOL_FLAG`)
        if (f & flag.STATE_NAME_FLAG) out.push(`STATE_NAME_FLAG`)
        if (f & flag.CASTING_FLAG) out.push(`CASTING_FLAG`)
        if (f & flag.VALIDATE_FLAG) out.push(`VALIDATE_FLAG`)
        if (f & flag.USED_FLAG) out.push(`USED_FLAG`)
        if (f & flag.ASSIGNED_FLAG) out.push(`ASSIGNED_FLAG`)
        if (f & flag.INITED_FLAG) out.push(`INITED_FLAG`)
        if (f & flag.DEF_INIT_FLAG) out.push(`DEF_INIT_FLAG`)
        if (f & flag.CONST_FLAG) out.push(`CONST_FLAG`)
        if (f & flag.PARAM_FLAG) out.push(`PARAM_FLAG`)
        return out.length ? `[ ${out.join(` | `)} ]` : `[ NONE ]`
    }
}

/**
 * Function to determine the type of an object.
 * @param {any} obj - The object to check the type of.
 * @returns {string} The type of the object.
 */
export const type_of = obj => {
    // Check if the object is null and return 'null'
    if (obj === null) return `null`;

    // Check if the object is undefined and return 'undefined'
    if (obj === undefined) return `undefined`;

    // Check if the object has a 'type' property and return it if it does
    if (obj.hasOwnProperty(`type`)) {
        if (obj.type === null) return `null`;
        if (obj.type === undefined) return `undefined`;
        return obj.type;
    }

    // Check if the object is an array using the 'is_array' property from the 'array' module
    // and return 'array' if it is
    if (array.is_array(obj)) return `array`;

    // Check if the object is an object and return its constructor name
    if (typeof obj === `object`) {
        const name = obj.constructor.name;
        if (name !== `Object`) return name;
        return `object`;
    }

    // If none of the above conditions are met, return the type of the object using the 'typeof' operator
    return typeof obj;
};

/**
 * Function to determine the kind of an object.
 * If the object has a 'kind' property, it returns the value of the 'kind' property.
 * If the object does not have a 'kind' property, it calls the 'type_of' function to determine the type of the object.
 *
 * @param {any} obj - The object to check the kind of.
 * @returns {string} The kind of the object.
 */
export const kind_of = obj => {
    if (obj && obj.kind) {
        if (obj.kind === null) return `null`;
        if (obj.kind === undefined) return `undefined`;
        return obj.kind;
    }
    return type_of(obj);
};

/** https://stackoverflow.com/questions/29879267/es6-class-multiple-inheritance
 * Factory function for creating classes with mixins.
 * @param {Function} base_class - The base class to extend.
 * @param {...Function} mixins - The mixins to apply to the base class.
 * @returns {Function} The new class with mixins applied.
 */
export const classes = (base_class, ...mixins) => {
    /**
     * Copies properties and symbols from source to target, filtering out specific properties.
     * @param {Object} target - The target object to copy properties to.
     * @param {Object} source - The source object to copy properties from.
     */
    const copy_props = (target, source) => {
        const prop = ['constructor', 'prototype', 'arguments', 'caller', 'name', 'bind', 'call', 'apply', 'toString', 'length'];
        for (let key of [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)]) {
            if (!prop.includes(key)) Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        }
    };

    class base extends base_class {
        constructor(...args) {
            super(...args);
            mixins.forEach(mixin => copy_props(this, new mixin(...args)));
        }
    }

    mixins.forEach(mixin => {
        copy_props(base.prototype, mixin.prototype);
        copy_props(base, mixin);
    });

    return base;
};


/**
 * Creates a debounced function that delays execution until after a specified wait time
 * has elapsed since the last invocation.
 *
 * @param {Function} target_function - The function to debounce
 * @param {number} wait_duration - Milliseconds to delay execution
 * @returns {Function} Debounced function
 */
export const debounce = (target_function, wait_duration) => {
    let timeout_identifier = null;

    return (...call_arguments) => {
        const execution_context = this;

        if (timeout_identifier !== null) {
            clearTimeout(timeout_identifier);
        }

        timeout_identifier = setTimeout(() => {
            target_function.apply(execution_context, call_arguments);
        }, wait_duration);
    };
};
