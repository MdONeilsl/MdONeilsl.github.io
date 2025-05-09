/*
    Enhance image color and reflection for PBR materials.
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
// Utility Functions
const Utils = {
    nearestPowerOf2(size) {
        return Math.pow(2, Math.round(Math.log(size) / Math.log(2)));
    },

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

const addToArray = (doc, name, obj) => {
    doc[name] = doc[name] || [];
    return doc[name].push(obj) - 1;
};

const toDataURL = (el, type, quality) => el.toDataURL(type, quality);

// Image Processing Class
class ImageProcessor {
    constructor() {
        this.originalImage = null;
        this.elements = {
            canvasInput: document.getElementById('canvas-input'),
            imageFile: document.getElementById('image-file'),
            fixSize: document.getElementById('fix-size'),
            maxSize: document.getElementById('max-size'),
            srgbCanvas: document.getElementById('srgb-output'),
            metalRoughnessCanvas: document.getElementById('metal-roughness-output'),
            emissiveCanvas: document.getElementById('emissive-output'),
            inputCanvas: document.getElementById('input-image-canvas'),
            saveButton: document.getElementById('save-gltf'),
            srgbColorSpace: document.getElementById('srgb-color-space'),
            srgbMaxSize: document.getElementById('srgb-max-size'),
            metalRoughnessMaxSize: document.getElementById('metal-roughness-max-size'),
            emissiveMaxSize: document.getElementById('emissive-max-size'),
            emissiveThreshold: document.getElementById('emissive-threshold'),
            occlusion: document.getElementById('occlusion-checkbox'),
            roughness: document.getElementById('roughness-checkbox'),
            metalness: document.getElementById('metalness-checkbox')
        };
        this.reader = new FileReader();
        this.initEventListeners();
    }

    resizeImage(image, maxWidth, maxHeight, fixSize) {
        const canvas = document.createElement('canvas');
        let width = image.width;
        let height = image.height;
        const aspectRatio = width / height;

        if (fixSize) {
            width = Utils.nearestPowerOf2(width);
            height = Utils.nearestPowerOf2(height);
        }

        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        canvas.width = Math.min(width, maxWidth);
        canvas.height = Math.min(height, maxHeight);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    processSRGB(image, maxWidth, colorSpace) {
        const canvas = this.elements.srgbCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.min(image.width, maxWidth);
        canvas.height = Math.min(image.height, maxWidth);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        if (colorSpace !== 'none') {
            for (let i = 0; i < data.length; i += 4) {
                let [r, g, b] = [data[i], data[i + 1], data[i + 2]].map(v => v / 255);
                if (colorSpace === 'srgb') {
                    [r, g, b] = [r, g, b].map(v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
                } else {
                    [r, g, b] = [r, g, b].map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                }
                [data[i], data[i + 1], data[i + 2]] = [r, g, b].map(v => v * 255);
            }
            ctx.putImageData(imageData, 0, 0);
        }
    }

    processMetalRoughness(image, maxWidth) {
        const canvas = this.elements.metalRoughnessCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.min(image.width, maxWidth);
        canvas.height = Math.min(image.height, maxWidth);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const outputData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            const roughness = 0.05 + (1 - (luminance / 255)) * 0.935;
            const saturation = Math.max(r, g, b) === 0 ? 0 : (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b);

            outputData[i] = this.elements.occlusion.checked ? luminance : 0;
            outputData[i + 1] = this.elements.roughness.checked ? roughness * 255 : 0;
            outputData[i + 2] = this.elements.metalness.checked ? (saturation > 0.5 ? 255 : 0) : 0;
            outputData[i + 3] = 255;
        }
        ctx.putImageData(new ImageData(outputData, canvas.width, canvas.height), 0, 0);
    }

    processEmissive(image, maxWidth) {
        const canvas = this.elements.emissiveCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.min(image.width, maxWidth);
        canvas.height = Math.min(image.height, maxWidth);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const outputData = new Uint8ClampedArray(data.length);
        const threshold = parseInt(this.elements.emissiveThreshold.value);

        const map = (val, old_max, new_max) => (val * new_max) / old_max;

        for (let i = 0; i < data.length; i += 4) {
            outputData[i] = map(data[i], 255, threshold);
            outputData[i + 1] = map(data[i + 1], 255, threshold);
            outputData[i + 2] = map(data[i + 2], 255, threshold);
            outputData[i + 3] = 255;
        }
        ctx.putImageData(new ImageData(outputData, canvas.width, canvas.height), 0, 0);
    }

    updateOutputs = Utils.debounce(() => {
        if (!this.originalImage) return;

        const maxSize = parseInt(this.elements.maxSize.value);
        const resizedImage = this.resizeImage(this.originalImage, maxSize, maxSize, this.elements.fixSize.checked);

        this.elements.inputCanvas.width = resizedImage.width;
        this.elements.inputCanvas.height = resizedImage.height;
        this.elements.inputCanvas.getContext('2d').drawImage(resizedImage, 0, 0);

        this.processSRGB(resizedImage, parseInt(this.elements.srgbMaxSize.value), this.elements.srgbColorSpace.value);
        this.processMetalRoughness(resizedImage, parseInt(this.elements.metalRoughnessMaxSize.value));
        this.processEmissive(resizedImage, parseInt(this.elements.emissiveMaxSize.value));

        this.elements.saveButton.disabled = false;
    }, 250);

    handleImageLoad(e) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.elements.saveButton.disabled = false;
                this.updateOutputs();
                resolve();
            };
            img.onerror = reject;
            img.src = e.target.result;
        });
    }

    initEventListeners() {
        // Drag and Drop
        this.elements.canvasInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.canvasInput.classList.add('drag-over');
        });

        this.elements.canvasInput.addEventListener('dragleave', () => {
            this.elements.canvasInput.classList.remove('drag-over');
        });

        this.elements.canvasInput.addEventListener('drop', async (e) => {
            e.preventDefault();
            this.elements.canvasInput.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith('image/')) {
                this.reader.readAsDataURL(file);
            } else {
                alert('Please drop a valid image file.');
            }
        });

        // File Input
        this.elements.canvasInput.addEventListener('click', () => this.elements.imageFile.click());
        this.elements.canvasInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                this.elements.imageFile.click();
            }
        });

        this.elements.imageFile.addEventListener('change', () => {
            const file = this.elements.imageFile.files[0];
            if (file?.type.startsWith('image/')) {
                this.reader.readAsDataURL(file);
            } else {
                alert('Please select a valid image file.');
            }
        });

        this.reader.onload = (e) => this.handleImageLoad(e).catch(() => alert('Error loading image'));

        // Update Triggers
        Object.values(this.elements).forEach(el => {
            if (el?.addEventListener) {
                el.addEventListener('change', this.updateOutputs);
            }
        });

        // Save glTF
        this.elements.saveButton.addEventListener('click', () => {
            if (!this.originalImage) return;

            const material = {
                doubleSided: false,
                alphaMode: "OPAQUE",
                alphaCutoff: 1,
                emissiveFactor: [1, 1, 1],
                pbrMetallicRoughness: {
                    metallicFactor: 0,
                    roughnessFactor: 1,
                    baseColorFactor: [1, 1, 1, 1]
                }
            };

            const gltf = {
                asset: { version: "2.0" },
                scene: 0,
                scenes: [{ nodes: [0] }],
                nodes: [{ mesh: 0 }],
                meshes: [{ primitives: [{ attributes: { POSITION: 1, TEXCOORD_0: 2 }, indices: 0, material: 0 }] }],
                materials: [material],
                textures: [],
                images: [],
                buffers: [{ uri: "data:application/gltf-buffer;base64,AAABAAIAAQADAAIAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAA", byteLength: 108 }],
                bufferViews: [
                    { buffer: 0, byteOffset: 0, byteLength: 12, target: 34963 },
                    { buffer: 0, byteOffset: 12, byteLength: 96, byteStride: 12, target: 34962 }
                ],
                accessors: [
                    { bufferView: 0, byteOffset: 0, componentType: 5123, count: 6, type: "SCALAR", max: [3], min: [0] },
                    { bufferView: 1, byteOffset: 0, componentType: 5126, count: 4, type: "VEC3", max: [1, 1, 0], min: [0, 0, 0] },
                    { bufferView: 1, byteOffset: 48, componentType: 5126, count: 4, type: "VEC2", max: [1, 1], min: [0, 0] }
                ]
            };

            const textureMap = [
                { el: document.getElementById('srgb-output'), prop: 'baseColorTexture', type: 'image/png', target: 'pbrMetallicRoughness' },
                { el: document.getElementById('metal-roughness-output'), prop: 'metallicRoughnessTexture', type: 'image/jpeg', target: 'pbrMetallicRoughness' },
                { el: document.getElementById('emissive-output'), prop: 'emissiveTexture', type: 'image/jpeg' },
            ];
        
            textureMap.forEach(({ el, prop, type, target }) => {
                const textureIdx = addToArray(gltf, "textures", {
                    source: addToArray(gltf, "images", { uri: toDataURL(el, type, 1) })
                });
                const targetObj = target ? material[target] : material;
                targetObj[prop] = { index: textureIdx };
            });

            const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'model.gltf';
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new ImageProcessor());
