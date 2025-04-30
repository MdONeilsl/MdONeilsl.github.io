const baseInput = document.getElementById('baseInput');
const addInput = document.getElementById('addInput');
const conventionSelect = document.getElementById('convention');
const intensityInput = document.getElementById('intensity');
const fallbackAlphaInput = document.getElementById('fallbackAlpha');
const mergeButton = document.querySelector('button');
const previewCanvas = document.getElementById('preview');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const errorMessage = document.getElementById('error-message');
const downloadButton = document.getElementById('download');
let resultImageData;
let isProcessing = false; // Track processing state

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
    progressContainer.style.display = 'none';
    previewCanvas.style.display = 'none';
    downloadButton.style.display = 'none';
    isProcessing = false;
    if (mergeButton) {
        mergeButton.classList.remove('loading');
        mergeButton.textContent = 'Merge Normal Maps'; // Restore button text
    }
}

function clearError() {
    errorMessage.style.display = 'none';
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (img.width > 2048 || img.height > 2048) {
                reject('Image exceeds 2048x2048 pixels.');
            } else {
                resolve(img);
            }
        };
        img.onerror = () => {
            let errorMsg = 'Failed to load image.';
            if (file.type && !file.type.startsWith('image/')) {
                errorMsg = 'Invalid file type. Please upload an image.';
            }
            reject(errorMsg);
        };
        img.src = URL.createObjectURL(file);
    });
}

function getImageData(img, canvas) {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try {
        return ctx.getImageData(0, 0, img.width, img.height);
    } catch (error) {
        throw new Error('Error reading image data. The image may be corrupted.');
    }

}

function normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : v;
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function rotateVector(vec, axis, angle) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const k = 1 - cosA;
    const [x, y, z] = vec;
    const [ux, uy, uz] = axis;

    const rotated = [
        x * (cosA + ux * ux * k) + y * (ux * uy * k - uz * sinA) + z * (ux * uz * k + uy * sinA),
        x * (uy * ux * k + uz * sinA) + y * (cosA + uy * uy * k) + z * (uy * uz * k - ux * sinA),
        x * (uz * ux * k - uy * sinA) + y * (uz * uy * k + ux * sinA) + z * (cosA + uz * uz * k)
    ];
    return normalize(rotated);
}

async function mergeNormalMaps() {
    if (isProcessing) return; // Prevent multiple merges
    isProcessing = true;
    clearError();
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    previewCanvas.style.display = 'none';
    downloadButton.style.display = 'none';
    mergeButton.classList.add('loading'); // Add loading class
    mergeButton.textContent = 'Processing...'; // Change button text

    try {
        if (!baseInput.files[0] || !addInput.files[0]) {
            throw new Error('Please upload both normal maps.');
        }

        const baseImg = await loadImage(baseInput.files[0]);
        const addImg = await loadImage(addInput.files[0]);

        // Check image dimensions
        if (baseImg.width !== addImg.width || baseImg.height !== addImg.height) {
            throw new Error('Images must have the same dimensions.');
        }

        const tempCanvas = document.createElement('canvas');
        const baseData = getImageData(baseImg, tempCanvas);
        const addData = getImageData(addImg, tempCanvas);

        const width = Math.min(baseData.width, addData.width);
        const height = Math.min(baseData.height, addData.height);
        previewCanvas.width = width;
        previewCanvas.height = height;
        const ctx = previewCanvas.getContext('2d');
        const resultData = ctx.createImageData(width, height);

        const intensity = parseFloat(intensityInput.value);
        const isDirectX = conventionSelect.value === 'directx';
        const fallbackAlpha = parseInt(fallbackAlphaInput.value);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const baseIdx = (y % baseData.height * baseData.width + x % baseData.width) * 4;
                const addIdx = (y % addData.height * addData.width + x % addData.width) * 4;

                const baseNormal = [
                    baseData.data[baseIdx] / 255 * 2 - 1,
                    (isDirectX ? -1 : 1) * (baseData.data[baseIdx + 1] / 255 * 2 - 1),
                    baseData.data[baseIdx + 2] / 255 * 2 - 1
                ];
                const addNormal = [
                    addData.data[addIdx] / 255 * 2 - 1,
                    (isDirectX ? -1 : 1) * (addData.data[addIdx + 1] / 255 * 2 - 1),
                    addData.data[addIdx + 2] / 255 * 2 - 1
                ];

                const zAxis = [0, 0, 1];
                const axis = normalize(cross(zAxis, addNormal));
                const angle = Math.acos(Math.min(Math.max(dot(zAxis, addNormal), -1), 1));

                let resultNormal = baseNormal;
                if (!isNaN(axis[0]) && angle > 0.0001) {
                    resultNormal = rotateVector(baseNormal, axis, angle * intensity);
                }

                // Blend alpha channels for per-pixel specular exponent
                const baseAlpha = baseData.data[baseIdx + 3] !== undefined ? baseData.data[baseIdx + 3] : fallbackAlpha;
                const addAlpha = addData.data[addIdx + 3] !== undefined ? addData.data[addIdx + 3] : fallbackAlpha;
                const blendedAlpha = Math.round((1 - intensity) * baseAlpha + intensity * addAlpha);

                resultData.data[idx] = ((resultNormal[0] + 1) / 2) * 255;
                resultData.data[idx + 1] = ((resultNormal[1] * (isDirectX ? -1 : 1) + 1) / 2) * 255;
                resultData.data[idx + 2] = ((resultNormal[2] + 1) / 2) * 255;
                resultData.data[idx + 3] = blendedAlpha; // Per-pixel specular exponent
            }
            progressBar.style.width = `${(y / (height - 1)) * 100}%`;
        }

        ctx.putImageData(resultData, 0, 0);
        previewCanvas.style.display = 'block';
        progressContainer.style.display = 'none';
        downloadButton.style.display = 'block';
        resultImageData = resultData;

        const baseName = baseInput.files[0].name.split('.')[0];
        const addName = addInput.files[0].name.split('.')[0];
        downloadButton.dataset.filename = `${baseName}_${addName}.png`;
    } catch (err) {
        showError(err.message);
    } finally {
        isProcessing = false; // Reset processing flag
        if (mergeButton) {
            mergeButton.classList.remove('loading'); // Remove loading class
            mergeButton.textContent = 'Merge Normal Maps'; // Restore button text
        }
    }
}

function downloadResult() {
    if (!resultImageData) {
        showError('No result to download. Please merge normal maps first.');
        return;
    }
    const link = document.createElement('a');
    link.download = downloadButton.dataset.filename;
    link.href = previewCanvas.toDataURL('image/png');
    link.click();
}
