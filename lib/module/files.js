
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
 * Saves a file to the user's download location.
 * Throws error if blob or file_name are invalid.
 * @param {Blob} blob - File data as blob.
 * @param {string} file_name - Name for the downloaded file.
 */
export const save_file = (blob, file_name) => {
    if (!(blob instanceof Blob)) {
        throw new TypeError('blob must be a Blob');
    }
    if (typeof file_name !== 'string' || !file_name) {
        throw new TypeError('file_name must be a non-empty string');
    }

    const link = document.createElement('a');
    const object_url = URL.createObjectURL(blob);

    link.href = object_url;
    link.download = file_name;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(object_url), 1000);
};

