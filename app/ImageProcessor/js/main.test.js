/*
    Image Processor: Optimize and convert images (PNG, JPEG, WebP, GLTF) for Second Life users and web applications.
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

    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const scaleSlider = document.getElementById('scaleSlider');
const scaleValue = document.getElementById('scaleValue');
const maxWidth = document.getElementById('maxWidth');
const maxHeight = document.getElementById('maxHeight');
const originalPreview = document.getElementById('originalPreview');
const optimizedPreview = document.getElementById('optimizedPreview');
const previewContainer = document.getElementById('previewContainer');
const previewDivider = document.getElementById('previewDivider');
const originalSize = document.getElementById('originalSize');
const optimizedSize = document.getElementById('optimizedSize');
const spaceSaved = document.getElementById('spaceSaved');
const formatCompatibility = document.getElementById('formatCompatibility');
const fileType = document.getElementById('fileType');
const base64Uri = document.getElementById('base64Uri');
const saveButton = document.getElementById('saveButton');

const prowidth = document.getElementById('prowidth');
const proheight = document.getElementById('proheight');

let originalFile, originalImg, hasTransparency = false;
let dividerPosition = 50;

// Drag and Drop Handling
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

const processImage =  async () => {
    if (!originalImg) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = parseFloat(scaleSlider.value) / 100;
    let width = originalImg.width * scale;
    let height = originalImg.height * scale;
    const maxW = parseInt(maxWidth.value) || Infinity;
    const maxH = parseInt(maxHeight.value) || Infinity;
    const scaleFactor = Math.min(maxW / width, maxH / height, 1);
    width = width * scaleFactor;
    height = height * scaleFactor;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(originalImg, 0, 0, width, height);

    const format = fileType.value;
    const quality = parseFloat(qualitySlider.value) / 100;

    // Preview in PNG for consistency
    const previewDataUrl = canvas.toDataURL('image/png');
    optimizedPreview.style.backgroundImage = `url(${previewDataUrl})`;

    canvas.toBlob(async (blob) => {
        const file = new File([blob], 'resized.png', { type: 'image/png' });
        try {
            const compressedFile = await imageCompression(file, {
                initialQuality: quality,
                fileType: `image/${format}`,
                alwaysKeepResolution: true,
                useWebWorker: true
            });
            //console.log(compressedFile);
            updateOutput(compressedFile, `image/${format}`);
        } catch (error) {
            console.error('Compression error:', error);
        }
    }, 'image/png');
}

const debouncedProcessImage = debounce(processImage, 100);

// Slider Updates
qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${parseFloat(qualitySlider.value).toFixed(2)}%`;
    debouncedProcessImage();
});
scaleSlider.addEventListener('input', () => {
    scaleValue.textContent = `${parseFloat(scaleSlider.value).toFixed(2)}%`;
    debouncedProcessImage();
});
maxWidth.addEventListener('input', debouncedProcessImage);
maxHeight.addEventListener('input', debouncedProcessImage);

fileType.addEventListener('change', debouncedProcessImage);


// Preview Divider Dragging
let isDragging = false;
previewDivider.addEventListener('mousedown', () => isDragging = true);
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = previewContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    dividerPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
    optimizedPreview.style.clipPath = `inset(0 ${100 - dividerPosition}% 0 0)`;
    previewDivider.style.left = `${dividerPosition}%`;
});
document.addEventListener('mouseup', () => isDragging = false);

const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    originalFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImg = new Image();
        originalImg.onload = () => {
            checkTransparency(originalImg);
            originalPreview.style.backgroundImage = `url(${e.target.result})`;
            originalSize.textContent = originalFile.size;
            processImage();
        };
        originalImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

const checkTransparency = (img) => {
    const canvas = document.createElement('canvas');
    const sampleSize = Math.min(img.width, img.height, 100); // Limit sampling for large images
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    hasTransparency = false;
    for (let i = 3; i < imageData.length; i += 40) {
        if (imageData[i] < 255) {
            hasTransparency = true;
            break;
        }
    }
    updateFileTypes();
}

const updateFileTypes = () => {
    const format = formatCompatibility.value;
    let types = [];
    if (format === 'modern') {
        types = ['jpeg', 'png', 'webp'];
    } else if (format === 'gltf') {
        types = hasTransparency ? ['png'] : ['jpeg', 'png'];
    } else if (format === 'slupload') {
        types = ['jpeg', 'png'];
    }
    fileType.innerHTML = types.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('');
    processImage();
}


const updateOutput = (blob, mimeType) => {
    const reader = new FileReader();
    reader.onload = () => {
        base64Uri.value = reader.result;
        optimizedSize.textContent = blob.size;
        const saved = originalFile ? (1 - blob.size / originalFile.size) * 100 : 0;
        spaceSaved.textContent = saved.toFixed(2);

        const proimg = new Image();
        proimg.onload = () => {
            prowidth.textContent = proimg.width;
            proheight.textContent = proimg.height;
        };
        proimg.src = reader.result;

        saveButton.dataset.blob = URL.createObjectURL(blob);
        saveButton.dataset.mime = mimeType;
        saveButton.dataset.ext = fileType.value === 'jpeg' ? 'jpg' : fileType.value;
    };
    reader.readAsDataURL(blob);
}

const saveImage = () => {
    const link = document.createElement('a');
    link.href = saveButton.dataset.blob;
    link.download = `optimized.${saveButton.dataset.ext}`;
    link.click();
    URL.revokeObjectURL(saveButton.dataset.blob);
}

formatCompatibility.addEventListener('change', updateFileTypes);
saveButton.addEventListener('click', saveImage);

window.addEventListener('DOMContentLoaded', () => {
    updateFileTypes();
});
