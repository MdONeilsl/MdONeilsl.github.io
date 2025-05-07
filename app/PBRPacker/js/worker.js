/**
 * PBR Material Packer: Combines and decomposes PBR texture maps for glTF workflows.
 * Supports drag-and-drop, texture classification, and glTF/glb loading/saving.
 * Optimized with Web Workers and chunked processing for performance.
 */

// Constants
const DEFAULT_TEXTURE_SIZE = 16;
const components = ['albedo', 'transparency', 'occlusion', 'roughness', 'metalness', 'emissive', 'normal'];
const pbrMaps = ['color', 'metal', 'emissiveOut', 'normalOut'];
const defViewIds = ['def_tex_placeholder_img', 'def_tex_white_img', 'def_tex_black_img', 'def_tex_normal_img', 'def_tex_transparent_img'];
let canvs_flags = 0;
const EPSILON = 1e-5;
const CMP_ALBEDO = 0x1 << 0;
const CMP_TRANS = 0x1 << 1;
const CMP_OCC = 0x1 << 2;
const CMP_ROUGH = 0x1 << 3;
const CMP_METAL = 0x1 << 4;
const CMP_EMISS = 0x1 << 5;
const CMP_NORM = 0x1 << 6;
const PBR_COLOR = 0x1 << 7;
const PBR_METAL = 0x1 << 8;
const PBR_EMISS = 0x1 << 9;
const PBR_NORM = 0x1 << 10;
let currentFiles = [];

// Web Worker setup
const workerCode = `
  const clamp = (val, min, max) => (val < min ? min : val > max ? max : val);
  const map = (val, omin, omax, nmin, nmax) => {
    const or = omax - omin;
    return or < 1e-5 ? nmin : ((val - omin) * (nmax - nmin)) / or + nmin;
  };
  const sample = (x, y, width, height) => {
    const clampedX = clamp(x, 0, 1);
    const clampedY = clamp(y, 0, 1);
    const sx = (clampedX * (width - 1)) | 0;
    const sy = (clampedY * (height - 1)) | 0;
    return (sy * width + sx) << 2;
  };
  const gray = (buff, index) => ((buff[index] + buff[index + 1] + buff[index + 2]) / 3) | 0;

  self.onmessage = ({ data }) => {
    const { task, maxSize, albedoData, transData, occlusionData, roughnessData, metalnessData, emissiveData, normalData, colorData, metalData } = data;
    const chunkSize = 100; // Process 100 rows at a time

    if (task === 'compose') {
      let progress = 0;
      const results = {};

      // Color Map
      if (albedoData) {
        const colorWidth = Math.min(Math.max(albedoData.width, transData?.width || 0), maxSize);
        const colorHeight = Math.min(Math.max(albedoData.height, transData?.height || 0), maxSize);
        const colorData = new Uint8ClampedArray(colorWidth * colorHeight * 4);
        for (let y = 0; y < colorHeight; y += chunkSize) {
          for (let cy = y; cy < Math.min(y + chunkSize, colorHeight); cy++) {
            const baseIndex = (cy * colorWidth) << 2;
            for (let x = 0; x < colorWidth; x++) {
              const index = baseIndex + (x << 2);
              const u = x / colorWidth;
              const v = cy / colorHeight;
              const albedoIdx = sample(u, v, albedoData.width, albedoData.height);
              const transIdx = transData ? sample(u, v, transData.width, transData.height) : 0;
              colorData[index] = albedoData.data[albedoIdx];
              colorData[index + 1] = albedoData.data[albedoIdx + 1];
              colorData[index + 2] = albedoData.data[albedoIdx + 2];
              colorData[index + 3] = transData ? gray(transData.data, transIdx) : albedoData.data[albedoIdx + 3];
            }
          }
          progress += (chunkSize / colorHeight) * 25;
          self.postMessage({ progress });
        }
        results.color = { data: colorData, width: colorWidth, height: colorHeight };
      }

      // Metal Map (ORM)
      if (occlusionData || roughnessData || metalnessData) {
        const metalWidth = Math.min(Math.max(
          occlusionData?.width || 0,
          roughnessData?.width || 0,
          metalnessData?.width || 0
        ), maxSize);
        const metalHeight = Math.min(Math.max(
          occlusionData?.height || 0,
          roughnessData?.height || 0,
          metalnessData?.height || 0
        ), maxSize);
        const metalData = new Uint8ClampedArray(metalWidth * metalHeight * 4);
        const scale = roughnessData?.data.some(val => val < 0x0D || val > 0xFC);
        for (let y = 0; y < metalHeight; y += chunkSize) {
          for (let cy = y; cy < Math.min(y + chunkSize, metalHeight); cy++) {
            const baseIndex = (cy * metalWidth) << 2;
            for (let x = 0; x < metalWidth; x++) {
              const index = baseIndex + (x << 2);
              const u = x / metalWidth;
              const v = cy / metalHeight;
              const occIdx = occlusionData ? sample(u, v, occlusionData.width, occlusionData.height) : 0;
              const roughIdx = roughnessData ? sample(u, v, roughnessData.width, roughnessData.height) : 0;
              const metalIdx = metalnessData ? sample(u, v, metalnessData.width, metalnessData.height) : 0;
              metalData[index] = occlusionData ? gray(occlusionData.data, occIdx) : 0;
              const rough = roughnessData ? gray(roughnessData.data, roughIdx) : 0x0D;
              metalData[index + 1] = scale ? map(rough, 0x00, 0xFF, 0x0D, 0xFC) : rough;
              metalData[index + 2] = metalnessData ? gray(metalnessData.data, metalIdx) : 0;
              metalData[index + 3] = 0xFF;
            }
          }
          progress += (chunkSize / metalHeight) * 25;
          self.postMessage({ progress });
        }
        results.metal = { data: metalData, width: metalWidth, height: metalHeight };
      }

      // Emissive Map
      if (emissiveData) {
        const emissiveWidth = Math.min(emissiveData.width, maxSize);
        const emissiveHeight = Math.min(emissiveData.height, maxSize);
        const emissiveOutData = new Uint8ClampedArray(emissiveWidth * emissiveHeight * 4);
        for (let y = 0; y < emissiveHeight; y += chunkSize) {
          for (let cy = y; cy < Math.min(y + chunkSize, emissiveHeight); cy++) {
            const baseIndex = (cy * emissiveWidth) << 2;
            for (let x = 0; x < emissiveWidth; x++) {
              const index = baseIndex + (x << 2);
              const srcIdx = sample(x / emissiveWidth, cy / emissiveHeight, emissiveData.width, emissiveData.height);
              emissiveOutData[index] = emissiveData.data[srcIdx];
              emissiveOutData[index + 1] = emissiveData.data[srcIdx + 1];
              emissiveOutData[index + 2] = emissiveData.data[srcIdx + 2];
              emissiveOutData[index + 3] = emissiveData.data[srcIdx + 3];
            }
          }
          progress += (chunkSize / emissiveHeight) * 25;
          self.postMessage({ progress });
        }
        results.emissiveOut = { data: emissiveOutData, width: emissiveWidth, height: emissiveHeight };
      }

      // Normal Map
      if (normalData) {
        const normalWidth = normalData.width;
        const normalHeight = normalData.height;
        const normalOutData = new Uint8ClampedArray(normalWidth * normalHeight * 4);
        for (let y = 0; y < normalHeight; y += chunkSize) {
          for (let cy = y; cy < Math.min(y + chunkSize, normalHeight); cy++) {
            const baseIndex = (cy * normalWidth) << 2;
            for (let x = 0; x < normalWidth; x++) {
              const index = baseIndex + (x << 2);
              const srcIdx = (cy * normalWidth + x) << 2;
              normalOutData[index] = normalData.data[srcIdx];
              normalOutData[index + 1] = normalData.data[srcIdx + 1];
              normalOutData[index + 2] = normalData.data[srcIdx + 2];
              normalOutData[index + 3] = normalData.data[srcIdx + 3];
            }
          }
          progress += (chunkSize / normalHeight) * 25;
          self.postMessage({ progress });
        }
        results.normalOut = { data: normalOutData, width: normalWidth, height: normalHeight };
      }

      self.postMessage({ results });
    } else if (task === 'decompose') {
      let progress = 0;
      const results = {};

      // Color Decomposition
      if (colorData) {
        const maxWidth = colorData.width;
        const maxHeight = colorData.height;
        const albedoData = new Uint8ClampedArray(maxWidth * maxHeight * 4);
        const transData = new Uint8ClampedArray(maxWidth * maxHeight * 4);
        const albedo32 = new Uint32Array(albedoData.buffer);
        const trans32 = new Uint32Array(transData.buffer);
        const color32 = new Uint32Array(colorData.data.buffer);
        for (let i = 0; i < albedo32.length; i++) {
          const c = color32[i];
          albedo32[i] = (c & 0x00FFFFFF) | 0xFF000000;
          const alpha = (c >>> 24) & 0xFF;
          trans32[i] = (0xFF << 24) | (alpha << 16) | (alpha << 8) | alpha;
        }
        results.albedo = { data: albedoData, width: maxWidth, height: maxHeight };
        results.transparency = { data: transData, width: maxWidth, height: maxHeight };
        progress += 50;
        self.postMessage({ progress });
      }

      // Metal Decomposition
      if (metalData) {
        const maxWidth = metalData.width;
        const maxHeight = metalData.height;
        const pixelCount = maxWidth * maxHeight;
        const occData = new Uint8ClampedArray(pixelCount * 4);
        const roughData = new Uint8ClampedArray(pixelCount * 4);
        const metalnessData = new Uint8ClampedArray(pixelCount * 4);
        const metal32 = new Uint32Array(metalData.data.buffer);
        const occ32 = new Uint32Array(occData.buffer);
        const rough32 = new Uint32Array(roughData.buffer);
        const metalness32 = new Uint32Array(metalnessData.buffer);
        for (let i = 0; i < pixelCount; i++) {
          const metal = metal32[i];
          const r = metal & 0xFF;
          const g = (metal >> 8) & 0xFF;
          const b = (metal >> 16) & 0xFF;
          const alpha = 0xFF << 24;
          occ32[i] = alpha | (r << 16) | (r << 8) | r;
          rough32[i] = alpha | (g << 16) | (g << 8) | g;
          metalness32[i] = alpha | (b << 16) | (b << 8) | b;
        }
        results.occlusion = { data: occData, width: maxWidth, height: maxHeight };
        results.roughness = { data: roughData, width: maxWidth, height: maxHeight };
        results.metalness = { data: metalnessData, width: maxWidth, height: maxHeight };
        progress += 50;
        self.postMessage({ progress });
      }

      self.postMessage({ results });
    }
  };
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);

/**
 * Initializes the sidebar with neutral texture images.
 */
function init() {
    defViewIds.forEach(id => {
        const elem = document.getElementById(id);
        elem.ondragstart = e => e.dataTransfer.setData('text', elem.dataset.origine);
    });
    components.forEach(id => {
        const elem = document.getElementById(id);
        setupCanvasEvents(elem);
        clearCanvas(elem)
    });
    pbrMaps.forEach(id => {
        const elem = document.getElementById(id);
        setupCanvasEvents(elem, true);
        clearCanvas(elem, true)
    });
}

/**
 * Clears a canvas to a placeholder texture.
 * @param {HTMLCanvasElement} canvas - The canvas to clear.
 * @param {boolean} isPbr - Whether the canvas is a PBR map.
 */
function clearCanvas(canvas, isPbr = false) {
    const maxSize = parseInt(document.getElementById('maxSize').value) || DEFAULT_TEXTURE_SIZE;
    canvas.width = maxSize;
    canvas.height = maxSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(document.getElementById('def_tex_placeholder_img'), 0, 0, maxSize, maxSize);
    canvas.dataset.origine = 'placeholder';
}

/**
 * Sets up drag-and-drop events for a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas to configure.
 * @param {boolean} isPbr - Whether the canvas is a PBR map.
 */
function setupCanvasEvents(canvas, isPbr = false) {
    canvas.draggable = true;
    canvas.ondragstart = e => {
        e.dataTransfer.setData('text', canvas.id);
    };
    canvas.ondragover = e => {
        e.preventDefault();
        canvas.classList.add('active');
    };
    canvas.ondragleave = () => {
        canvas.classList.remove('active');
    };
    canvas.ondrop = async e => {
        e.preventDefault();
        canvas.classList.remove('active');
        const data = e.dataTransfer.getData('text');
        if (['placeholder', 'white', 'black', 'normal', 'transparent'].includes(data)) {
            applyNeutralTexture(canvas, data);
        } else if (components.includes(data) || pbrMaps.includes(data)) {
            applyCanvasTexture(canvas, data);
        } else {
            const files = [];
            for (const item of e.dataTransfer.items) {
                if (item.kind === 'file') {
                    if (typeof item.getAsFileSystemHandle === 'function') {
                        const handle = await item.getAsFileSystemHandle();
                        if (handle.kind === 'directory') {
                            files.push(...await handleFolderDrop(handle));
                            continue;
                        }
                    }
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            }
            if (files.length) {
                if (isPbr && files.some(f => f.name.endsWith('.gltf') || f.name.endsWith('.glb'))) {
                    const gltfFile = files.find(f => f.name.endsWith('.gltf') || f.name.endsWith('.glb'));
                    if (gltfFile) await loadGltfFile(gltfFile, canvas.id);
                    const otherFiles = files.filter(f => !f.name.endsWith('.gltf') && !f.name.endsWith('.glb'));
                    if (otherFiles.length) loadImgFiles(otherFiles, canvas.id);
                } else {
                    loadImgFiles(files, canvas.id);
                }
            }
        }
        if (components.includes(canvas.id)) {
            compose();
        } else if (pbrMaps.includes(canvas.id)) {
            decompose();
        }
    };
}

/**
 * Recursively processes a dropped folder to collect image and glTF files.
 * @param {FileSystemDirectoryHandle} directoryHandle - The directory handle.
 * @returns {Promise<File[]>} Array of files.
 */
async function handleFolderDrop(directoryHandle) {
    const files = [];
    async function processEntry(handle, path = '') {
        if (handle.kind === 'file') {
            const file = await handle.getFile();
            if (file.type.startsWith('image/') || file.name.endsWith('.gltf') || file.name.endsWith('.glb')) {
                files.push(file);
            }
        } else if (handle.kind === 'directory') {
            for await (const entry of handle.values()) {
                await processEntry(entry, `${path}${handle.name}/`);
            }
        }
    }
    await processEntry(directoryHandle);
    return files;
}

/**
 * Applies a neutral texture to a canvas.
 * @param {HTMLCanvasElement} canvas - The target canvas.
 * @param {string} type - The neutral texture type (e.g., 'white', 'normal').
 */
function applyNeutralTexture(canvas, type) {
    const img = document.getElementById(`def_tex_${type}_img`);
    canvas.width = parseInt(img.getAttribute('width'));
    canvas.height = parseInt(img.getAttribute('height'));
    canvas.dataset.origine = type;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    setFlags(canvas.id, type !== 'placeholder');
    if (components.includes(canvas.id)) compose();
}

/**
 * Copies a texture from one canvas to another.
 * @param {HTMLCanvasElement} targetCanvas - The destination canvas.
 * @param {string} sourceCanvasId - The ID of the source canvas.
 */
function applyCanvasTexture(targetCanvas, sourceCanvasId) {
    const sourceCanvas = document.getElementById(sourceCanvasId);
    if (!sourceCanvas) return;
    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, 0, 0);
    targetCanvas.dataset.origine = sourceCanvas.dataset.origine;
    setFlags(targetCanvas.id, targetCanvas.dataset.origine !== 'placeholder');
    if (components.includes(targetCanvas.id)) compose();
    else if (pbrMaps.includes(targetCanvas.id)) decompose();
}

/**
 * Loads and processes image files for texture assignment.
 * @param {File[]} files - Array of image files.
 * @param {string} targetView - The target canvas ID.
 */
function loadImgFiles(files, targetView) {
    const fileEntries = [];
    const promises = files.map(file => {
        if (file.type.startsWith('image/')) {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = new Image();
                    img.onload = () => {
                        const type = classifyTexture(file.name, img);
                        if (!type && files.length > 1) {
                            fileEntries.push({ file, img });
                        } else {
                            applyTexture(type, img, targetView, file.name);
                        }
                        resolve();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        }
        return Promise.resolve();
    });
    Promise.all(promises).then(() => {
        if (fileEntries.length) {
            showAssignDialog(fileEntries, targetView);
        } else if (components.includes(targetView)) {
            compose();
        } else if (pbrMaps.includes(targetView)) {
            decompose();
        }
    });
}

/**
 * Classifies a texture based on filename or pixel data.
 * @param {string} filename - The name of the file.
 * @param {HTMLImageElement} img - The image object.
 * @returns {string|null} The texture type or null if unclassified.
 */
function classifyTexture(filename, img) {
    const patterns = {
        albedo: ['_albedo', '_basecolor', '_diffuse', '_color'],
        normal: ['_normal', '_nrm', '_norm'],
        roughness: ['_roughness', '_rough'],
        metalness: ['_metalness', '_metal', '_metallic'],
        occlusion: ['_occlusion', '_ao'],
        emissive: ['_emissive', '_emit'],
        transparency: ['_transparency', '_alpha'],
        smoothness: ['_smoothness', '_smooth']
    };
    filename = filename.toLowerCase();
    for (const [type, suffixes] of Object.entries(patterns)) {
        if (suffixes.some(suffix => filename.includes(suffix))) {
            return type;
        }
    }
    if (img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        let isBlueish = true;
        for (let i = 0; i < data.length; i += 4) {
            if (Math.abs(data[i] - 128) > 20 || Math.abs(data[i + 1] - 128) > 20 || data[i + 2] < 200) {
                isBlueish = false;
                break;
            }
        }
        canvas.remove();
        if (isBlueish) return 'normal';
    }
    return null;
}

/**
 * Displays a dialog for assigning multiple textures.
 * @param {Object[]} fileEntries - Array of file entries with file and img properties.
 * @param {string} canvasId - The target canvas ID.
 */
function showAssignDialog(fileEntries, canvasId) {
    currentFiles = fileEntries.map(entry => ({ ...entry, canvasId }));
    const fileAssignments = document.getElementById('fileAssignments');
    fileAssignments.innerHTML = '';
    fileEntries.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'file-assignment flex items-center gap-2';
        const imgPreview = document.createElement('img');
        imgPreview.src = entry.img.src;
        imgPreview.style.width = '50px';
        imgPreview.style.height = '50px';
        const span = document.createElement('span');
        span.textContent = entry.file.name;
        const select = document.createElement('select');
        select.id = `assignSelect-${index}`;
        const options = [
            { value: 'discard', text: 'Discard' },
            ...components.map(c => ({ value: c, text: c.charAt(0).toUpperCase() + c.slice(1) }))
        ];
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });
        div.appendChild(imgPreview);
        div.appendChild(span);
        div.appendChild(select);
        fileAssignments.appendChild(div);
    });
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Assignments';
    resetButton.onclick = () => {
        fileAssignments.innerHTML = '';
        showAssignDialog(fileEntries, canvasId);
    };
    fileAssignments.appendChild(resetButton);
    document.getElementById('applyAssignments').onclick = assignTextures;
    document.getElementById('assignDialog').showModal();
}

/**
 * Applies texture assignments from the dialog.
 */
function assignTextures() {
    currentFiles.forEach((entry, index) => {
        const select = document.getElementById(`assignSelect-${index}`);
        const type = select.value;
        if (type !== 'discard') {
            applyTexture(type, entry.img, type, entry.file.name);
        }
        entry.img.src = '';
    });
    document.getElementById('assignDialog').close();
    currentFiles = [];
    compose();
}

/**
 * Applies a texture to a canvas, handling smoothness conversion if needed.
 * @param {string} type - The texture type.
 * @param {HTMLImageElement} img - The image to apply.
 * @param {string} canvasId - The target canvas ID.
 * @param {string} filename - The source filename.
 */
function applyTexture(type, img, canvasId, filename) {
    let canvas = document.getElementById(canvasId);
    if (!components.includes(canvasId) && !pbrMaps.includes(canvasId)) {
        return;
    }
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (type === 'smoothness') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const smoothness = imgData.data[i] / 255;
            imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = (1 - smoothness) * 255;
        }
        ctx.putImageData(imgData, 0, 0);
        tempCanvas.remove();
        type = 'roughness';
        canvas = document.getElementById('roughness');
    } else {
        ctx.drawImage(img, 0, 0);
    }
    canvas.dataset.origine = filename || 'uploaded';
    setFlags(canvas.id, true);
    if (components.includes(canvas.id)) {
        compose();
    } else if (pbrMaps.includes(canvas.id)) {
        decompose();
    }
}

/**
 * Updates canvas flags based on texture presence.
 * @param {string} id - The canvas ID.
 * @param {boolean} add - Whether to set or clear the flag.
 */
function setFlags(id, add = true) {
    const map = {
        albedo: CMP_ALBEDO,
        transparency: CMP_TRANS,
        occlusion: CMP_OCC,
        roughness: CMP_ROUGH,
        metalness: CMP_METAL,
        emissive: CMP_EMISS,
        normal: CMP_NORM,
        color: PBR_COLOR,
        metal: PBR_METAL,
        emissiveOut: PBR_EMISS,
        normalOut: PBR_NORM
    };
    const flag = map[id];
    if (flag !== undefined) {
        canvs_flags = (canvs_flags & ~flag) | (-Number(add) & flag);
    }
}

/**
 * Retrieves canvas data for processing.
 * @param {string} id - The canvas ID.
 * @returns {Object} Canvas data with width, height, and pixel data.
 */
function getCanvasData(id) {
    const canvas = document.getElementById(id);
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, width, height).data;
    return { width, height, data: new Uint8ClampedArray(data) };
}

/**
 * Sets up a canvas with processed image data.
 * @param {string} id - The canvas ID.
 * @param {number} maxWidth - The canvas width.
 * @param {number} maxHeight - The canvas height.
 * @param {Uint8ClampedArray} imageData - The pixel data.
 * @param {string} origine - The origin of the data.
 */
function setupCanvas(id, maxWidth, maxHeight, imageData, origine) {
    const canvas = document.getElementById(id);
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    canvas.dataset.origine = origine;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, maxWidth, maxHeight), 0, 0);
    setFlags(id, true);
}

/**
 * Composes PBR maps from component textures using a Web Worker.
 */
function compose() {
    const maxSize = parseInt(document.getElementById('maxSize').value) || DEFAULT_TEXTURE_SIZE;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'block';
    progressBar.children[0].style.width = '0%';

    const data = { task: 'compose', maxSize };
    if (canvs_flags & CMP_ALBEDO) data.albedoData = getCanvasData('albedo');
    if (canvs_flags & CMP_TRANS) data.transData = getCanvasData('transparency');
    if (canvs_flags & CMP_OCC) data.occlusionData = getCanvasData('occlusion');
    if (canvs_flags & CMP_ROUGH) data.roughnessData = getCanvasData('roughness');
    if (canvs_flags & CMP_METAL) data.metalnessData = getCanvasData('metalness');
    if (canvs_flags & CMP_EMISS) data.emissiveData = getCanvasData('emissive');
    if (canvs_flags & CMP_NORM) data.normalData = getCanvasData('normal');

    worker.onmessage = e => {
        if (e.data.progress) {
            requestAnimationFrame(() => {
                progressBar.children[0].style.width = `${Math.min(e.data.progress, 100)}%`;
            });
        } else if (e.data.results) {
            const { results } = e.data;
            if (results.color) {
                setupCanvas('color', results.color.width, results.color.height, results.color.data, 'generated');
            } else {
                clearCanvas(document.getElementById('color'), true);
            }
            if (results.metal) {
                setupCanvas('metal', results.metal.width, results.metal.height, results.metal.data, 'generated');
            } else {
                clearCanvas(document.getElementById('metal'), true);
            }
            if (results.emissiveOut) {
                setupCanvas('emissiveOut', results.emissiveOut.width, results.emissiveOut.height, results.emissiveOut.data, 'generated');
            } else {
                clearCanvas(document.getElementById('emissiveOut'), true);
            }
            if (results.normalOut) {
                setupCanvas('normalOut', results.normalOut.width, results.normalOut.height, results.normalOut.data, 'generated');
            } else {
                clearCanvas(document.getElementById('normalOut'), true);
            }
            progressBar.style.display = 'none';
        }
    };
    const transfer = Object.values(data)
        .filter(v => v?.data)
        .map(v => v.data.buffer);
    worker.postMessage(data, transfer);
}

/**
 * Decomposes PBR maps into component textures using a Web Worker.
 */
function decompose() {
    const maxSize = parseInt(document.getElementById('maxSize').value) || DEFAULT_TEXTURE_SIZE;
    pbrMaps.forEach(id => setFlags(id, document.getElementById(id).dataset.origine !== 'placeholder'));

    const data = { task: 'decompose', maxSize };
    if (canvs_flags & PBR_COLOR) data.colorData = getCanvasData('color');
    if (canvs_flags & PBR_METAL) data.metalData = getCanvasData('metal');
    if (canvs_flags & PBR_EMISS) data.emissiveData = getCanvasData('emissiveOut');
    if (canvs_flags & PBR_NORM) data.normalData = getCanvasData('normalOut');

    worker.onmessage = e => {
        if (e.data.progress) {
            requestAnimationFrame(() => {
                progressBar.children[0].style.width = `${Math.min(e.data.progress, 100)}%`;
            });
        } else if (e.data.results) {
            const { results } = e.data;
            if (results.albedo) {
                setupCanvas('albedo', results.albedo.width, results.albedo.height, results.albedo.data, 'decomposed');
                setupCanvas('transparency', results.transparency.width, results.transparency.height, results.transparency.data, 'decomposed');
            } else {
                clearCanvas(document.getElementById('albedo'));
                clearCanvas(document.getElementById('transparency'));
            }
            if (results.occlusion) {
                setupCanvas('occlusion', results.occlusion.width, results.occlusion.height, results.occlusion.data, 'decomposed');
                setupCanvas('roughness', results.roughness.width, results.roughness.height, results.roughness.data, 'decomposed');
                setupCanvas('metalness', results.metalness.width, results.metalness.height, results.metalness.data, 'decomposed');
            } else {
                clearCanvas(document.getElementById('occlusion'));
                clearCanvas(document.getElementById('roughness'));
                clearCanvas(document.getElementById('metalness'));
            }
            if (canvs_flags & PBR_EMISS) {
                const sourceCanvas = document.getElementById('emissiveOut');
                const targetCanvas = document.getElementById('emissive');
                targetCanvas.width = Math.min(sourceCanvas.width, maxSize);
                targetCanvas.height = Math.min(sourceCanvas.height, maxSize);
                targetCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
                targetCanvas.dataset.origine = 'decomposed';
                setFlags('emissive', true);
            } else {
                clearCanvas(document.getElementById('emissive'));
            }
            if (canvs_flags & PBR_NORM) {
                const sourceCanvas = document.getElementById('normalOut');
                const targetCanvas = document.getElementById('normal');
                targetCanvas.width = sourceCanvas.width;
                targetCanvas.height = sourceCanvas.height;
                targetCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0);
                targetCanvas.dataset.origine = 'decomposed';
                setFlags('normal', true);
            } else {
                clearCanvas(document.getElementById('normal'));
            }
            progressBar.style.display = 'none';
        }
    };
    const transfer = Object.values(data)
        .filter(v => v?.data)
        .map(v => v.data.buffer);
    worker.postMessage(data, transfer);
}

/**
 * Clears all canvases and resets the application.
 */
function clearApp() {
    components.forEach(id => clearCanvas(document.getElementById(id)));
    pbrMaps.forEach(id => clearCanvas(document.getElementById(id), true));
    compose();
}

/**
 * Loads and processes a glTF or glb file.
 * @param {File} file - The glTF/glb file.
 * @param {string} canvasId - The target canvas ID.
 */
async function loadGltfFile(file, canvasId) {
    const debugLog = document.getElementById('debugLog') || document.createElement('div');
    debugLog.id = 'debugLog';
    debugLog.style.display = 'none';
    document.body.appendChild(debugLog);
    function logError(message) {
        console.error(`Error: ${message}`);
        debugLog.textContent += `${message}\n`;
        alert(message);
    }

    try {
        const reader = new FileReader();
        reader.onload = async e => {
            let gltfData;
            try {
                if (file.name.endsWith('.glb')) {
                    const zip = await JSZip.loadAsync(e.target.result);
                    const gltfFile = Object.values(zip.files).find(f => f.name.endsWith('.gltf'));
                    if (!gltfFile) {
                        logError('No .gltf file found in .glb archive.');
                        return;
                    }
                    gltfData = JSON.parse(await gltfFile.async('string'));
                } else {
                    gltfData = JSON.parse(e.target.result);
                }
            } catch (err) {
                logError(`Failed to parse ${file.name}: ${err.message}. Ensure the file is valid JSON or a valid glb archive.`);
                return;
            }

            if (!gltfData || !gltfData.materials || !gltfData.textures || !gltfData.images) {
                logError('Invalid glTF structure: Missing materials, textures, or images.');
                return;
            }

            const textureMap = {
                color: ['albedo', 'transparency'],
                metal: ['occlusion', 'roughness', 'metalness'],
                emissiveOut: ['emissive'],
                normalOut: ['normal']
            };
            const material = gltfData.materials[0] || {};
            const pbr = material.pbrMetallicRoughness || {};

            async function loadTexture(textureIndex, type) {
                if (textureIndex === undefined) {
                    return null;
                }
                const texture = gltfData.textures[textureIndex];
                if (!texture || texture.source === undefined) {
                    return null;
                }
                const image = gltfData.images[texture.source];
                if (!image) {
                    return null;
                }
                let imgSrc = image.uri;

                try {
                    const img = new Image();
                    if (imgSrc && imgSrc.startsWith('data:')) {
                        img.src = imgSrc;
                    } else if (image.bufferView !== undefined) {
                        const bufferView = gltfData.bufferViews[image.bufferView];
                        if (!bufferView) throw new Error(`Invalid bufferView ${image.bufferView}`);
                        const buffer = gltfData.buffers[bufferView.buffer];
                        if (!buffer || !buffer.uri) throw new Error(`Invalid buffer ${bufferView.buffer}`);
                        const base64Data = buffer.uri.split(',')[1];
                        const binaryData = atob(base64Data);
                        const arrayBuffer = new ArrayBuffer(binaryData.length);
                        const view = new Uint8Array(arrayBuffer);
                        for (let i = 0; i < binaryData.length; i++) {
                            view[i] = binaryData.charCodeAt(i);
                        }
                        const blob = new Blob([arrayBuffer.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength)], { type: image.mimeType || 'image/png' });
                        img.src = URL.createObjectURL(blob);
                    } else {
                        throw new Error(`Unsupported image source for ${type}`);
                    }
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error(`Failed to load image for ${type}`));
                    });
                    if (image.bufferView !== undefined) {
                        URL.revokeObjectURL(img.src);
                    }
                    return img;
                } catch (err) {
                    return null;
                }
            }

            try {
                if (pbrMaps.includes(canvasId)) {
                    const textureType = {
                        color: 'baseColorTexture',
                        metal: 'metallicRoughnessTexture',
                        emissiveOut: 'emissiveTexture',
                        normalOut: 'normalTexture'
                    }[canvasId];
                    const textureIndex = textureType === 'baseColorTexture' ? pbr.baseColorTexture?.index :
                        textureType === 'metallicRoughnessTexture' ? pbr.metallicRoughnessTexture?.index :
                            textureType === 'emissiveTexture' ? material.emissiveTexture?.index :
                                textureType === 'normalTexture' ? material.normalTexture?.index : undefined;

                    if (textureIndex !== undefined) {
                        const img = await loadTexture(textureIndex, textureType);
                        if (img) {
                            applyTexture(canvasId, img, canvasId, `gltf_${canvasId}`);
                            if (canvasId === 'color') {
                                const componentImg = await loadTexture(pbr.baseColorTexture?.index, 'baseColorTexture');
                                if (componentImg) {
                                    const tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = componentImg.width;
                                    tempCanvas.height = componentImg.height;
                                    const tempCtx = tempCanvas.getContext('2d');
                                    tempCtx.imageSmoothingEnabled = false;
                                    tempCtx.drawImage(componentImg, 0, 0);
                                    const imgData = tempCtx.getImageData(0, 0, componentImg.width, componentImg.height);
                                    const albedoCanvas = document.getElementById('albedo');
                                    albedoCanvas.width = componentImg.width;
                                    albedoCanvas.height = componentImg.height;
                                    const albedoCtx = albedoCanvas.getContext('2d');
                                    albedoCtx.imageSmoothingEnabled = false;
                                    albedoCtx.drawImage(componentImg, 0, 0);
                                    albedoCanvas.dataset.origine = 'gltf_albedo';
                                    setFlags('albedo', true);
                                    if (material.alphaMode === 'BLEND') {
                                        const transparencyCanvas = document.getElementById('transparency');
                                        transparencyCanvas.width = componentImg.width;
                                        transparencyCanvas.height = componentImg.height;
                                        const transparencyCtx = transparencyCanvas.getContext('2d');
                                        transparencyCtx.imageSmoothingEnabled = false;
                                        const transparencyData = transparencyCtx.createImageData(componentImg.width, componentImg.height);
                                        for (let i = 0; i < imgData.data.length; i += 4) {
                                            transparencyData.data[i] = transparencyData.data[i + 1] = transparencyData.data[i + 2] = imgData.data[i + 3];
                                            transparencyData.data[i + 3] = 255;
                                        }
                                        transparencyCtx.putImageData(transparencyData, 0, 0);
                                        transparencyCanvas.dataset.origine = 'gltf_transparency';
                                        setFlags('transparency', true);
                                    }
                                    tempCanvas.remove();
                                }
                            } else if (canvasId === 'metal') {
                                const componentImg = await loadTexture(pbr.metallicRoughnessTexture?.index, 'metallicRoughnessTexture');
                                if (componentImg) {
                                    const tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = componentImg.width;
                                    tempCanvas.height = componentImg.height;
                                    const tempCtx = tempCanvas.getContext('2d');
                                    tempCtx.imageSmoothingEnabled = false;
                                    tempCtx.drawImage(componentImg, 0, 0);
                                    const imgData = tempCtx.getImageData(0, 0, componentImg.width, componentImg.height);
                                    ['occlusion', 'roughness', 'metalness'].forEach((type, idx) => {
                                        const targetCanvas = document.getElementById(type);
                                        targetCanvas.width = componentImg.width;
                                        targetCanvas.height = componentImg.height;
                                        const targetCtx = targetCanvas.getContext('2d');
                                        targetCtx.imageSmoothingEnabled = false;
                                        const targetData = targetCtx.createImageData(componentImg.width, componentImg.height);
                                        for (let i = 0; i < imgData.data.length; i += 4) {
                                            targetData.data[i] = targetData.data[i + 1] = targetData.data[i + 2] = imgData.data[i + idx];
                                            targetData.data[i + 3] = 255;
                                        }
                                        targetCtx.putImageData(targetData, 0, 0);
                                        targetCanvas.dataset.origine = `gltf_${type}`;
                                        setFlags(type, true);
                                    });
                                    tempCanvas.remove();
                                }
                            }
                            decompose();
                        }
                    }
                } else {
                    if (canvasId === 'albedo' || canvasId === 'transparency') {
                        const img = await loadTexture(pbr.baseColorTexture?.index, 'baseColorTexture');
                        if (img) {
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = img.width;
                            tempCanvas.height = img.height;
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCtx.imageSmoothingEnabled = false;
                            tempCtx.drawImage(img, 0, 0);
                            const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
                            const albedoCanvas = document.getElementById('albedo');
                            albedoCanvas.width = img.width;
                            albedoCanvas.height = img.height;
                            const albedoCtx = albedoCanvas.getContext('2d');
                            albedoCtx.imageSmoothingEnabled = false;
                            albedoCtx.drawImage(img, 0, 0);
                            albedoCanvas.dataset.origine = 'gltf_albedo';
                            setFlags('albedo', true);
                            if (material.alphaMode === 'BLEND') {
                                const transparencyCanvas = document.getElementById('transparency');
                                transparencyCanvas.width = img.width;
                                transparencyCanvas.height = img.height;
                                const transparencyCtx = transparencyCanvas.getContext('2d');
                                transparencyCtx.imageSmoothingEnabled = false;
                                const transparencyData = transparencyCtx.createImageData(img.width, img.height);
                                for (let i = 0; i < imgData.data.length; i += 4) {
                                    transparencyData.data[i] = transparencyData.data[i + 1] = transparencyData.data[i + 2] = imgData.data[i + 3];
                                    transparencyData.data[i + 3] = 255;
                                }
                                transparencyCtx.putImageData(transparencyData, 0, 0);
                                transparencyCanvas.dataset.origine = 'gltf_transparency';
                                setFlags('transparency', true);
                            }
                            tempCanvas.remove();
                        }
                    } else if (canvasId === 'occlusion' || canvasId === 'roughness' || canvasId === 'metalness') {
                        const img = await loadTexture(pbr.metallicRoughnessTexture?.index, 'metallicRoughnessTexture');
                        if (img) {
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = img.width;
                            tempCanvas.height = img.height;
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCtx.imageSmoothingEnabled = false;
                            tempCtx.drawImage(img, 0, 0);
                            const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
                            ['occlusion', 'roughness', 'metalness'].forEach((type, idx) => {
                                const targetCanvas = document.getElementById(type);
                                targetCanvas.width = img.width;
                                targetCanvas.height = img.height;
                                const targetCtx = targetCanvas.getContext('2d');
                                targetCtx.imageSmoothingEnabled = false;
                                const targetData = targetCtx.createImageData(img.width, img.height);
                                for (let i = 0; i < imgData.data.length; i += 4) {
                                    targetData.data[i] = targetData.data[i + 1] = targetData.data[i + 2] = imgData.data[i + idx];
                                    targetData.data[i + 3] = 255;
                                }
                                targetCtx.putImageData(targetData, 0, 0);
                                targetCanvas.dataset.origine = `gltf_${type}`;
                                setFlags(type, true);
                            });
                            tempCanvas.remove();
                        }
                    } else if (canvasId === 'emissive') {
                        const img = await loadTexture(material.emissiveTexture?.index, 'emissiveTexture');
                        if (img) {
                            applyTexture('emissive', img, 'emissive', 'gltf_emissive');
                        }
                    } else if (canvasId === 'normal') {
                        const img = await loadTexture(material.normalTexture?.index, 'normalTexture');
                        if (img) {
                            applyTexture('normal', img, 'normal', 'gltf_normal');
                        }
                    }
                    compose();
                }
            } catch (err) {
                logError(`Failed to process textures: ${err.message}`);
            }
        };
        if (file.name.endsWith('.glb')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    } catch (err) {
        logError(`Failed to load ${file.name}: ${err.message}`);
    }
}

/**
 * Saves the current PBR maps as a glTF file.
 */
async function saveGltf() {
    const format = document.getElementById('format').value;
    const lossless = document.getElementById('lossless').checked;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = lossless && format !== 'jpeg' ? 1 : 0.8;

    const gltf = {
        asset: { version: '2.0', generator: 'PBR Material Packer', copyright: '2025' },
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, TANGENT: 3 }, material: 0, indices: 4 }] }],
        buffers: [],
        bufferViews: [],
        accessors: [],
        materials: [{}],
        textures: [],
        images: [],
        samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }]
    };

    // Placeholder mesh with vertices, normals, UVs, tangents, and indices
    const vertices = new Float32Array([
        -0.5, -0.5, 0, // Vertex 0
        0.5, -0.5, 0, // Vertex 1
        -0.5, 0.5, 0, // Vertex 2
        0.5, 0.5, 0  // Vertex 3
    ]);
    const normals = new Float32Array([
        0, 0, 1, // Vertex 0
        0, 0, 1, // Vertex 1
        0, 0, 1, // Vertex 2
        0, 0, 1  // Vertex 3
    ]);
    const uvs = new Float32Array([
        0, 0, // Vertex 0
        1, 0, // Vertex 1
        0, 1, // Vertex 2
        1, 1  // Vertex 3
    ]);
    const tangents = new Float32Array([
        1, 0, 0, 1, // Vertex 0
        1, 0, 0, 1, // Vertex 1
        1, 0, 0, 1, // Vertex 2
        1, 0, 0, 1  // Vertex 3
    ]);
    const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    // Combine data into a single buffer
    const vertexByteLength = vertices.byteLength;
    const normalByteLength = normals.byteLength;
    const uvByteLength = uvs.byteLength;
    const tangentByteLength = tangents.byteLength;
    const indexByteLength = indices.byteLength;
    const buffer = new ArrayBuffer(vertexByteLength + normalByteLength + uvByteLength + tangentByteLength + indexByteLength);
    new Float32Array(buffer, 0, vertices.length).set(vertices);
    new Float32Array(buffer, vertexByteLength, normals.length).set(normals);
    new Float32Array(buffer, vertexByteLength + normalByteLength, uvs.length).set(uvs);
    new Float32Array(buffer, vertexByteLength + normalByteLength + uvByteLength, tangents.length).set(tangents);
    new Uint16Array(buffer, vertexByteLength + normalByteLength + uvByteLength + tangentByteLength, indices.length).set(indices);

    const base64Buffer = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    gltf.buffers.push({ byteLength: buffer.byteLength, uri: `data:application/octet-stream;base64,${base64Buffer}` });

    gltf.bufferViews.push(
        { buffer: 0, byteOffset: 0, byteLength: vertexByteLength, target: 34962 }, // Vertices
        { buffer: 0, byteOffset: vertexByteLength, byteLength: normalByteLength, target: 34962 }, // Normals
        { buffer: 0, byteOffset: vertexByteLength + normalByteLength, byteLength: uvByteLength, target: 34962 }, // UVs
        { buffer: 0, byteOffset: vertexByteLength + normalByteLength + uvByteLength, byteLength: tangentByteLength, target: 34962 }, // Tangents
        { buffer: 0, byteOffset: vertexByteLength + normalByteLength + uvByteLength + tangentByteLength, byteLength: indexByteLength, target: 34963 } // Indices
    );

    gltf.accessors.push(
        { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3', min: [-0.5, -0.5, 0], max: [0.5, 0.5, 0] }, // POSITION
        { bufferView: 1, componentType: 5126, count: 4, type: 'VEC3', min: [0, 0, 1], max: [0, 0, 1] }, // NORMAL
        { bufferView: 2, componentType: 5126, count: 4, type: 'VEC2', min: [0, 0], max: [1, 1] }, // TEXCOORD_0
        { bufferView: 3, componentType: 5126, count: 4, type: 'VEC4', min: [1, 0, 0, 1], max: [1, 0, 0, 1] }, // TANGENT
        { bufferView: 4, componentType: 5123, count: 6, type: 'SCALAR' } // Indices
    );

    // Add textures
    const textureCanvases = { color: 'color', metal: 'metal', emissive: 'emissiveOut', normal: 'normalOut' };
    let textureIndex = 0;
    if (canvs_flags & PBR_COLOR) {
        gltf.materials[0].pbrMetallicRoughness = gltf.materials[0].pbrMetallicRoughness || {};
        gltf.materials[0].pbrMetallicRoughness.baseColorTexture = { index: textureIndex };
        gltf.images.push({ uri: document.getElementById('color').toDataURL(mimeType, quality) });
        gltf.textures.push({ sampler: 0, source: gltf.images.length - 1 });
        textureIndex++;
    }
    if (canvs_flags & PBR_METAL) {
        gltf.materials[0].pbrMetallicRoughness = gltf.materials[0].pbrMetallicRoughness || {};
        gltf.materials[0].pbrMetallicRoughness.metallicRoughnessTexture = { index: textureIndex };
        gltf.images.push({ uri: document.getElementById('metal').toDataURL(mimeType, quality) });
        gltf.textures.push({ sampler: 0, source: gltf.images.length - 1 });
        textureIndex++;
    }
    if (canvs_flags & PBR_EMISS) {
        gltf.materials[0].emissiveTexture = { index: textureIndex };
        gltf.materials[0].emissiveFactor = [1, 1, 1];
        gltf.images.push({ uri: document.getElementById('emissiveOut').toDataURL(mimeType, quality) });
        gltf.textures.push({ sampler: 0, source: gltf.images.length - 1 });
        textureIndex++;
    }
    if (canvs_flags & PBR_NORM) {
        gltf.materials[0].normalTexture = { index: textureIndex };
        gltf.images.push({ uri: document.getElementById('normalOut').toDataURL(mimeType, quality) });
        gltf.textures.push({ sampler: 0, source: gltf.images.length - 1 });
        textureIndex++;
    }
    if (canvs_flags & CMP_TRANS) {
        gltf.materials[0].alphaMode = 'BLEND';
    }

    alert('glTF validation skipped. Please validate manually if needed.');
    const gltfJson = JSON.stringify(gltf, null, 2);
    const blob = new Blob([gltfJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'material.gltf';
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize
init();

// Cleanup worker on page unload
window.addEventListener('unload', () => {
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
});