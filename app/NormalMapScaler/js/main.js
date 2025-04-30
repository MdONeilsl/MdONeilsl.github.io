const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const widthSelect = document.getElementById('widthSelect');
const heightSelect = document.getElementById('heightSelect');
const processButton = document.getElementById('processButton');
const progressBar = document.getElementById('progressBar');
const errorMessage = document.getElementById('errorMessage');
const previewContainer = document.getElementById('previewContainer');
const downloadButton = document.getElementById('downloadButton');
const resetButton = document.getElementById('resetButton');


let files = [];
let zipFileName = "";

// Drag-and-drop handling
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    files = Array.from(e.dataTransfer.files);
    updateFileStatus();
});
fileInput.addEventListener('change', () => {
    files = Array.from(fileInput.files);
    updateFileStatus();
});

function updateFileStatus() {
    dropZone.textContent = files.length ? `${files.length} file(s) selected` : 'Drag and drop normal maps here or click to select';
    processButton.disabled = files.length === 0;
}

// Process normal maps
processButton.addEventListener('click', async () => {
    if (files.length === 0) return;
    errorMessage.textContent = '';
    previewContainer.innerHTML = '';
    progressBar.style.display = 'block';
    progressBar.value = 0;

    const targetWidth = parseInt(widthSelect.value);
    const targetHeight = parseInt(heightSelect.value);

    const zip = new JSZip();
    let processed = 0;
    const totalFiles = files.length;
    let hasValidNormalMap = false;

    for (const file of files) {
        try {
            const img = await loadImage(file);
            hasValidNormalMap = true;
            let scaledCanvas;


            if (targetWidth === 0 && targetHeight === 0) {
                scaledCanvas = img;
                zip.file(file.name, await fetch(img.src).then(r => r.blob()));
            }
            else if (targetWidth === 0) {
                if (img.height === targetHeight) {
                    scaledCanvas = img;
                    zip.file(file.name, await fetch(img.src).then(r => r.blob()));
                }
                else {
                    scaledCanvas = await scaleNormalMap(img, { width: img.width, height: targetHeight });
                }

            }
            else if (targetHeight === 0) {
                if (img.width === targetWidth) {
                    scaledCanvas = img;
                    zip.file(file.name, await fetch(img.src).then(r => r.blob()));
                }
                else {
                    scaledCanvas = await scaleNormalMap(img, { width: targetWidth, height: img.height });
                }
            }
            else {
                if (img.width === targetWidth && img.height === targetHeight) {
                    scaledCanvas = img;
                    zip.file(file.name, await fetch(img.src).then(r => r.blob()));
                }
                else {
                    scaledCanvas = await scaleNormalMap(img, { width: targetWidth, height: targetHeight });
                }
            }


            displayPreview(file.name, img, scaledCanvas);

            // Export to PNG and add to ZIP
            if (scaledCanvas !== img) {
                const blob = await new Promise(resolve => scaledCanvas.toBlob(resolve, 'image/png'));
                zip.file(`${file.name}_scaled_${targetWidth > 0 ? targetWidth : 'Original'}x${targetHeight > 0 ? targetHeight : 'Original'}.png`, blob);
            }
            processed++;
            progressBar.value = (processed / totalFiles) * 100;

        } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
            errorMessage.textContent = `Error processing ${file.name}: ${err.message}. Continuing with other files.`;
            processed++;
            progressBar.value = (processed / totalFiles) * 100;
        }
        // Force progress bar update on each iteration
        progressBar.value = (processed / totalFiles) * 100;
    }

    // Save ZIP
    if (hasValidNormalMap && Object.keys(zip.files).length > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        let targetName = `${targetWidth > 0 ? targetWidth : 'Original'}x${targetHeight > 0 ? targetHeight : 'Original'}`;
        zipFileName = files[0].name.split('.')[0] + "_scaled_normal_maps_" + targetName + ".zip";
        downloadButton.textContent = "Download " + zipFileName;
        downloadButton.style.display = "block";
        downloadButton.onclick = function () {
            saveFile(zipBlob, zipFileName);
        };
    } else {
        errorMessage.textContent = 'No valid normal maps were processed.';
        downloadButton.style.display = "none";
    }

    progressBar.style.display = 'none';
});

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

function srgbToLinear(c) {
    if (c <= 0.0031308) {
        return c * 12.92;
    }
    return 1.055 * Math.pow(c, 0.41666) - 0.055;
}

async function scaleNormalMap(img, targetSize) {
    const srcWidth = img.width;
    const srcHeight = img.height;

    let targetWidth = 0;
    let targetHeight = 0;

    if (typeof targetSize === 'number') {
        targetWidth = targetSize;
        targetHeight = targetSize;
    } else {
        targetWidth = targetSize.width;
        targetHeight = targetSize.height;
    }


    if (srcWidth === targetWidth && srcHeight === targetHeight) {
        return img;
    }


    let currentWidth = srcWidth;
    let currentHeight = srcHeight;
    let scaledImage = img;

    while (currentWidth < targetWidth || currentHeight < targetHeight) {
        const nextWidth = Math.min(currentWidth * 2, targetWidth);
        const nextHeight = Math.min(currentHeight * 2, targetHeight);
        scaledImage = await scaleImage(scaledImage, nextWidth, nextHeight);
        currentWidth = nextWidth;
        currentHeight = nextHeight;
    }
    return scaledImage;
}

async function scaleImage(img, targetWidth, targetHeight) {
    const srcWidth = img.width;
    const srcHeight = img.height;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // Get source pixel data
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcWidth;
    srcCanvas.height = srcHeight;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(img, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight).data;

    const destData = ctx.createImageData(targetWidth, targetHeight);

    // Process pixels
    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const vector = getScaledVector(x, y, srcData, srcWidth, srcHeight, targetWidth, targetHeight);
            const idx = (y * targetWidth + x) * 4;
            destData.data[idx] = vector[0] * 255;
            destData.data[idx + 1] = vector[1] * 255;
            destData.data[idx + 2] = vector[2] * 255;
            destData.data[idx + 3] = 255;
        }
    }

    ctx.putImageData(destData, 0, 0);
    return canvas;
}


function getScaledVector(x, y, srcData, srcWidth, srcHeight, targetWidth, targetHeight) {
    const srcX = (x / targetWidth) * srcWidth;
    const srcY = (y / targetHeight) * srcHeight;

    const vectors = [];
    const scaleX = targetWidth >= srcWidth ? 3 : Math.ceil(srcWidth / targetWidth);
    const scaleY = targetHeight >= srcHeight ? 3 : Math.ceil(srcHeight / targetHeight);

    for (let dy = -Math.floor(scaleY / 2); dy <= Math.ceil(scaleY / 2); dy++) {
        for (let dx = -Math.floor(scaleX / 2); dx <= Math.ceil(scaleX / 2); dx++) {
            const px = Math.floor(srcX + dx);
            const py = Math.floor(srcY + dy);
            if (px >= 0 && px < srcWidth && py >= 0 && py < srcHeight) {
                const idx = (py * srcWidth + px) * 4;
                let r = srcData[idx] / 255;
                let g = srcData[idx + 1] / 255;
                let b = srcData[idx + 2] / 255;

                vectors.push([r, g, b]);
            }
        }
    }
    return averageAndNormalize(vectors);
}

function averageAndNormalize(vectors) {
    if (vectors.length === 0) return [0, 0, 1];
    const sum = vectors.reduce(([rx, ry, rz], [x, y, z]) => [rx + x, ry + y, rz + z], [0, 0, 0]);
    const avg = sum.map(v => v / vectors.length);
    const length = Math.sqrt(avg[0] ** 2 + avg[1] ** 2 + avg[2] ** 2);
    return length > 0 ? avg.map(v => v / length) : [0, 0, 1];
}

function displayPreview(fileName, originalImg, scaledCanvas) {
    const preview = document.createElement('div');
    preview.className = 'preview';
    let scaledWidth = typeof scaledCanvas === 'number' ? scaledCanvas : scaledCanvas.width;
    let scaledHeight = typeof scaledCanvas === 'number' ? scaledCanvas : scaledCanvas.height;
    const originalWidth = originalImg.width;
    const originalHeight = originalImg.height;

    let displayWidth = originalWidth;
    let displayHeight = originalHeight;

    if (originalWidth > 128 || originalHeight > 128) {
        if (originalWidth > originalHeight) {
            displayWidth = 128;
            displayHeight = Math.round((128 / originalWidth) * originalHeight);
        } else {
            displayHeight = 128;
            displayWidth = Math.round((128 / originalHeight) * originalWidth);
        }
    }

    preview.innerHTML = `
                <h3>${fileName}</h3>
                <p>Original (${originalWidth}x${originalHeight})</p>
                <canvas width="${displayWidth}" height="${displayHeight}"></canvas>
                <p>Scaled (${scaledWidth}x${scaledHeight})</p>
                <canvas class="scaled" width="128" height="128"></canvas>
            `;
    previewContainer.appendChild(preview);

    const originalCanvas = preview.querySelector('canvas:not(.scaled)');
    originalCanvas.getContext('2d').drawImage(originalImg, 0, 0, displayWidth, displayHeight);
    const scaledCanvasPreview = preview.querySelector('canvas.scaled');
    scaledCanvasPreview.getContext('2d').drawImage(scaledCanvas, 0, 0, 128, 128);
}

function saveFile(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}

function resetApp() {
    files = [];
    zipFileName = "";
    dropZone.textContent = 'Drag and drop normal maps here or click to select';
    processButton.disabled = true;
    progressBar.style.display = 'none';
    progressBar.value = 0;
    errorMessage.textContent = '';
    previewContainer.innerHTML = '';
    downloadButton.style.display = 'none';
    fileInput.value = '';
    widthSelect.value = "512";
    heightSelect.value = "512";
}

resetButton.addEventListener('click', resetApp);
