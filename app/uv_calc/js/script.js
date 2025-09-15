
// Variables
let img = null;
let workingImg = null;
let workingWidth = 0;
let workingHeight = 0;
let currentFilename = '';
let canvas = document.getElementById('preview');
let ctx = canvas.getContext('2d');
let errorDiv = document.getElementById('error');
let potCheckbox = document.getElementById('pot-checkbox');
let render = document.getElementById('render-selector');
let unitSelect = document.getElementById('unit-selector');
unitSelect.dataset.old = 'pixels';
let modeSelect = document.getElementById('mode-selector');
let fromX = document.getElementById('from-x');
let fromY = document.getElementById('from-y');
let toX = document.getElementById('to-x');
let toY = document.getElementById('to-y');
let output = document.getElementById('output');
let output1 = document.getElementById('output1');
let base64Text = document.getElementById('base64');
let saveBtn = document.getElementById('save-btn');
let resetBtn = document.getElementById('reset-btn');
let imageSizeSpan = document.getElementById('image-size');
let dragDrop = document.getElementById('drag-drop');

// Function to trim trailing zeros
const trimTrailingZeros = num => {
    let str = num.toFixed(6);
    str = str.replace(/\.?0+$/, '');
    return str;
}

// Drag and drop handling
dragDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
});
dragDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    let file = e.dataTransfer.files[0];
    handleFile(file);
});

// Handle uploaded file
const handleFile = file => {
    if (!file || !file.type.startsWith('image/')) {
        errorDiv.textContent = 'Invalid image file';
        return;
    }
    currentFilename = file.name;
    let reader = new FileReader();
    reader.onload = (e) => {
        let tempImg = new Image();
        tempImg.onload = () => {
            // Scale down if over 2048 for performance
            let maxSide = 2048;
            if (tempImg.width > maxSide || tempImg.height > maxSide) {
                let ratio = Math.max(tempImg.width / maxSide, tempImg.height / maxSide);
                let newW = Math.floor(tempImg.width / ratio);
                let newH = Math.floor(tempImg.height / ratio);
                let scaleCanvas = document.createElement('canvas');
                scaleCanvas.width = newW;
                scaleCanvas.height = newH;
                let scaleCtx = scaleCanvas.getContext('2d', { willReadFrequently: true }); // Optimize context
                scaleCtx.drawImage(tempImg, 0, 0, newW, newH);
                tempImg.src = scaleCanvas.toDataURL('image/png', 0.8); // Lower quality for performance
            }
            img = tempImg;
            updateWorkingImage();
        };
        tempImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Update working image based on PoT checkbox
const updateWorkingImage = () => {
    errorDiv.textContent = '';
    if (potCheckbox.checked) {
        let newWidth = Math.pow(2, Math.round(Math.log2(img.width)));
        let newHeight = Math.pow(2, Math.round(Math.log2(img.height)));
        let tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        let tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, newWidth, newHeight);
        workingImg = new Image();
        workingImg.src = tempCanvas.toDataURL('image/png', 0.8);
        workingWidth = newWidth;
        workingHeight = newHeight;
    } else {
        workingImg = img;
        workingWidth = img.width;
        workingHeight = img.height;
    }
    imageSizeSpan.textContent = `${workingWidth} x ${workingHeight}`;
    // Set default to full size if not set
    let unit = unitSelect.value;
    if (toX.value === '') {
        toX.value = unit === 'percent' ? 100 : workingWidth;
        toY.value = unit === 'percent' ? 100 : workingHeight;
    }
    updateUI();
}

// Get subsection parameters in pixels
const getSubsectionPixels = () => {
    let unit = unitSelect.value;
    let mode = modeSelect.value;
    let fx = parseFloat(fromX.value);
    let fy = parseFloat(fromY.value);
    let tx = parseFloat(toX.value);
    let ty = parseFloat(toY.value);
    let pxFromX = unit === 'percent' ? (fx / 100) * workingWidth : fx;
    let pxFromY = unit === 'percent' ? (fy / 100) * workingHeight : fy;
    let pxToX = unit === 'percent' ? (tx / 100) * workingWidth : tx;
    let pxToY = unit === 'percent' ? (ty / 100) * workingHeight : ty;
    let pxSizeX = mode === 'to' ? pxToX - pxFromX : pxToX;
    let pxSizeY = mode === 'to' ? pxToY - pxFromY : pxToY;
    return { pxFromX, pxFromY, pxSizeX, pxSizeY };
}

// Create subsection canvas (memoize if possible, but simple so no need)
const getSubCanvas = () => {
    const { pxFromX, pxFromY, pxSizeX, pxSizeY } = getSubsectionPixels();
    let subCanvas = document.createElement('canvas');
    subCanvas.width = pxSizeX;
    subCanvas.height = pxSizeY;
    let subCtx = subCanvas.getContext('2d', { willReadFrequently: true });
    subCtx.drawImage(workingImg, pxFromX, pxFromY, pxSizeX, pxSizeY, 0, 0, pxSizeX, pxSizeY);
    return subCanvas;
}

// Update UI and calculations
const updateUI = () => {
    if (!workingImg) return;
    errorDiv.textContent = '';
    output.value = '';
    base64Text.value = '';
    saveBtn.disabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set input max
    let maxVal = unitSelect.value === 'percent' ? 100 : workingWidth;
    fromX.max = maxVal;
    toX.max = maxVal;
    fromY.max = maxVal;
    toY.max = maxVal;

    // Draw image on canvas (scaled to fit)
    let displayMax = 600; // Fixed size to fit UI
    let ratio = Math.max(workingWidth / displayMax, workingHeight / displayMax, 1);
    canvas.width = workingWidth / ratio;
    canvas.height = workingHeight / ratio;
    ctx.imageSmoothingEnabled = true; // For better performance/quality
    ctx.drawImage(workingImg, 0, 0, canvas.width, canvas.height);

    // Get subsection
    const { pxFromX, pxFromY, pxSizeX, pxSizeY } = getSubsectionPixels();

    // Validate
    if (isNaN(pxFromX) || isNaN(pxFromY) || isNaN(pxSizeX) || isNaN(pxSizeY) ||
        pxFromX < 0 || pxFromY < 0 || pxSizeX <= 0 || pxSizeY <= 0 ||
        pxFromX + pxSizeX > workingWidth || pxFromY + pxSizeY > workingHeight) {
        errorDiv.textContent = 'Invalid coordinates';
        return;
    }

    saveBtn.disabled = false;

    let scaleX, scaleY, offsetX, offsetY;

    const Height = workingWidth;
    const Width = workingHeight;
    const W = pxSizeX;
    const H = pxSizeY;

    // Normalized factors
    const HF = 1 / Height;
    const WF = 1 / Width;

    scaleX = W * WF;
    scaleY = H * HF;

    if (render.value === 'opengl') {
        offsetX = -0.5 + ((pxFromX + W * 0.5) * WF);
        offsetY = 0.5 - ((pxFromY + H * 0.5) * HF);
    } else {
        offsetX = pxFromX * WF;
        offsetY = pxFromY * HF;
    }

    // Output with trimmed zeros
    const x = trimTrailingZeros(scaleX);
    const y = trimTrailingZeros(scaleY);
    const z = trimTrailingZeros(offsetX);
    const s = trimTrailingZeros(offsetY);
    output.value = `<${x}, ${y}, 0>, <${z}, ${s}, 0>`;
    output1.value = `<${x}, ${y}, ${z}, ${s}>`;


    // Draw rectangle
    let scaleRatio = canvas.width / workingWidth;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(pxFromX * scaleRatio, pxFromY * scaleRatio, pxSizeX * scaleRatio, pxSizeY * scaleRatio);

    // Base64 (async to not block UI if large)
    requestAnimationFrame(() => {
        base64Text.value = getSubCanvas().toDataURL('image/png', 0.8);
    });
}

// Event listeners for updates
[fromX, fromY, toX, toY, unitSelect, modeSelect, potCheckbox].forEach(el => {
    el.addEventListener('input', updateUI);
});
potCheckbox.addEventListener('change', updateWorkingImage);

// Mode change: convert values
modeSelect.addEventListener('change', () => {
    const { pxFromX, pxFromY, pxSizeX, pxSizeY } = getSubsectionPixels();
    let unit = unitSelect.value;
    let conv = (val, isWidth) => unit === 'percent' ? (val / (isWidth ? workingWidth : workingHeight)) * 100 : val;
    if (modeSelect.value === 'to') {
        toX.value = conv(pxFromX + pxSizeX, true);
        toY.value = conv(pxFromY + pxSizeY, false);
    } else {
        toX.value = conv(pxSizeX, true);
        toY.value = conv(pxSizeY, false);
    }
    updateUI();
});

// Unit change: convert values
unitSelect.addEventListener('change', () => {
    let old = unitSelect.dataset.old;
    unitSelect.dataset.old = unitSelect.value;
    let fromConv = (val, isWidth) => {
        let size = isWidth ? workingWidth : workingHeight;
        if (old === 'pixels' && unitSelect.value === 'percent') {
            return (val / size) * 100;
        } else if (old === 'percent' && unitSelect.value === 'pixels') {
            return (val / 100) * size;
        }
        return val;
    };

    fromX.value = fromConv(parseFloat(fromX.value), true);
    fromX.step = unitSelect.value === 'pixels' ? 1 : 0.01;

    fromY.value = fromConv(parseFloat(fromY.value), false);
    fromY.step = unitSelect.value === 'pixels' ? 1 : 0.01;

    toX.value = fromConv(parseFloat(toX.value), true);
    toX.step = unitSelect.value === 'pixels' ? 1 : 0.01;

    toY.value = fromConv(parseFloat(toY.value), false);
    toY.step = unitSelect.value === 'pixels' ? 1 : 0.01;

    updateUI();
});

// Save button
saveBtn.addEventListener('click', () => {
    let format = document.getElementById('save-format').value;
    let mime = `image/${format}`;
    let ext = format === 'jpeg' ? 'jpg' : 'png';
    let dataURL = getSubCanvas().toDataURL(mime, 0.8);
    let a = document.createElement('a');
    a.href = dataURL;
    a.download = currentFilename.replace(/\.[^/.]+$/, '') + '-sub.' + ext;
    a.click();
});

// Reset button
resetBtn.addEventListener('click', () => {
    img = null;
    workingImg = null;
    workingWidth = 0;
    workingHeight = 0;
    currentFilename = '';
    errorDiv.textContent = '';
    imageSizeSpan.textContent = '';
    output.value = '';
    base64Text.value = '';
    saveBtn.disabled = true;
    fromX.value = 0;
    fromY.value = 0;
    toX.value = '';
    toY.value = '';
    potCheckbox.checked = false;
    unitSelect.value = 'pixels';
    modeSelect.value = 'to';
    canvas.width = 0;
    canvas.height = 0;
});
