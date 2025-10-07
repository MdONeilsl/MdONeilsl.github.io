


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

