/**
 * files module
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
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

/**
 * Extracts filename without extension from URL with maximum performance
 * @param {string} url - URL to extract filename from
 * @returns {string} Decoded filename without extension or 'index' default
 */
export const get_file_name_from_url = url => {
    if (typeof url !== 'string') throw new Error('Invalid URL');
    if (!url.trim()) throw new Error('Invalid URL');
    
    const url_obj = new URL(url, window.location.href);
    //console.log(url_obj.href);
    const path = url_obj.pathname;
    const len = path.length;
    
    if (len <= 1) return 'index';
    
    let last_slash = -1;
    let i = len;
    
    while (i--) {
        if (path.charCodeAt(i) === 47) {
            last_slash = i;
            break;
        }
    }
    
    const file_start = last_slash + 1;
    
    if (file_start < len) {
        const raw_name = path.slice(file_start);
        const decoded = decodeURIComponent(raw_name);
        const slash_pos = decoded.indexOf('/');
        const name = slash_pos < 0 ? decoded : decoded.slice(0, slash_pos);
        const first_dot = name.indexOf('.');
        return first_dot > 0 ? name.slice(0, first_dot) : first_dot === 0 ? '' : name;
    }
    
    if (last_slash > 0) {
        let prev_slash = -1;
        let j = last_slash;
        
        while (j--) {
            if (path.charCodeAt(j) === 47) {
                prev_slash = j;
                break;
            }
        }
        
        const segment_start = prev_slash + 1;
        if (segment_start < last_slash) {
            const raw_name = path.slice(segment_start, last_slash);
            const decoded = decodeURIComponent(raw_name);
            const slash_pos = decoded.indexOf('/');
            const name = slash_pos < 0 ? decoded : decoded.slice(0, slash_pos);
            const first_dot = name.indexOf('.');
            return first_dot > 0 ? name.slice(0, first_dot) : first_dot === 0 ? '' : name;
        }
    }
    
    return 'index';
};
