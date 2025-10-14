
/*
    Copyright (C) 2025  MdONeil 

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
	
	https://github.com/MdONeilsl
    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/
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
