if (typeof SuperGif === 'undefined') {
    console.error('libgif-js failed to load.');
    showError('Failed to load required library for GIFs. Videos may still work.');
}

const input = document.getElementById('input');
const maxCanvasSizeSelect = document.getElementById('maxCanvasSize');
const maxFrameSizeSelect = document.getElementById('maxFrameSize');
const videoFpsSelect = document.getElementById('videoFps');
const container = document.getElementById('canvasContainer');
const canvasInfo = document.getElementById('canvasInfo');
const progressBar = document.getElementById('progressBar');
const hiddenImage = document.getElementById('hiddenImage');
const hiddenVideo = document.getElementById('hiddenVideo');
const messageContainer = document.getElementById('messageContainer');

const showError = (message) => {
    container.innerHTML = '';
    canvasInfo.value = '';
    progressBar.style.display = 'none';

    messageContainer.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.id = 'errorMessage';
    errorDiv.textContent = message;
    messageContainer.appendChild(errorDiv);
};

const showSuccess = () => {
    progressBar.style.display = 'none';

    messageContainer.innerHTML = '';
    const successDiv = document.createElement('div');
    successDiv.id = 'successMessage';
    successDiv.textContent = 'File loaded and parsed successfully';
    messageContainer.appendChild(successDiv);
};

const clearMedia = () => {
    hiddenImage.src = '';
    hiddenVideo.src = '';
    hiddenVideo.removeAttribute('src');
    hiddenVideo.load();
    container.innerHTML = '';
    canvasInfo.value = '';
    progressBar.style.display = 'none';
    progressBar.value = 0;
    input.value = '';
    hiddenImage.onload = null;
    hiddenImage.onerror = null;
    hiddenVideo.onloadedmetadata = null;
    hiddenVideo.onseeked = null;
    hiddenVideo.onerror = null;
};

input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        showError('No file selected.');
        return;
    }

    clearMedia();
    progressBar.style.display = 'block';
    progressBar.value = 0;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (file.type.startsWith('image/gif')) {
            processGif(dataUrl);
        } else if (file.type.startsWith('video/')) {
            processVideo(dataUrl);
        } else {
            showError('Please select a GIF or video file.');
        }
    };
    reader.readAsDataURL(file);
});

const processGif = (dataUrl) => {
    try {
        hiddenImage.src = dataUrl;
        hiddenImage.onload = () => {
            const gif = new SuperGif({ gif: hiddenImage });
            gif.load(() => {
                const canvas = gif.get_canvas();
                const width = canvas.width;
                const height = canvas.height;
                const frameCount = gif.get_length();

                if (frameCount === 0) {
                    showError('No frames found in the GIF.');
                    return;
                }

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const frames = [];
                const frameDelays = [];

                for (let i = 0; i < frameCount; i++) {
                    gif.move_to(i);
                    const imageData = ctx.getImageData(0, 0, width, height);
                    frames.push({
                        width,
                        height,
                        pixels: imageData.data
                    });
                    const frameInfo = gif.get_frames()[i];
                    frameDelays.push(frameInfo.delay || 100);
                    progressBar.value = ((i + 1) / frameCount) * 100;
                }

                showSuccess();
                drawFrames(frames, width, height, frameDelays, null);
            }, (error) => {
                console.error('libgif-js load error:', error);
                showError('Error loading GIF. Please try another file.');
            });
        };
        hiddenImage.onerror = () => {
            showError('Error loading GIF image data.');
        };
    } catch (error) {
        console.error('Error processing GIF:', error);
        showError('Error processing GIF file.');
    }
};

const processVideo = async (dataUrl) => {
    try {
        hiddenVideo.src = dataUrl;
        await new Promise((resolve, reject) => {
            hiddenVideo.onloadedmetadata = resolve;
            hiddenVideo.onerror = () => reject(new Error('Error loading video metadata.'));
        });

        const width = hiddenVideo.videoWidth;
        const height = hiddenVideo.videoHeight;
        const duration = hiddenVideo.duration;

        if (!width || !height || !duration) {
            showError('Invalid video dimensions or duration.');
            return;
        }

        const targetFps = parseInt(videoFpsSelect.value);
        const frameTime = 1 / targetFps;
        const totalFrames = Math.floor(duration * targetFps);
        if (totalFrames > 1000) {
            showError(`Video has ${totalFrames} frames, which may be too many to process. Consider a shorter video or lower FPS.`);
            return;
        }

        const frames = [];
        const frameDelays = new Array(totalFrames).fill(frameTime * 1000);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        for (let i = 0; i < totalFrames; i++) {
            const time = i * frameTime;
            await new Promise((resolve, reject) => {
                hiddenVideo.onseeked = () => {
                    ctx.drawImage(hiddenVideo, 0, 0, width, height);
                    const imageData = ctx.getImageData(0, 0, width, height);
                    frames.push({
                        width,
                        height,
                        pixels: imageData.data
                    });
                    progressBar.value = ((frames.length) / totalFrames) * 100;
                    hiddenVideo.onseeked = null;
                    hiddenVideo.onerror = null;
                    resolve();
                };
                hiddenVideo.onerror = () => reject(new Error('Error seeking video.'));
                hiddenVideo.currentTime = time;
            });
        }

        showSuccess();
        drawFrames(frames, width, height, frameDelays, targetFps);
    } catch (error) {
        console.error('Error processing video:', error);
        showError('Error processing video file. Please ensure it’s a valid video.');
    }
};

const drawFrames = (frames, inputWidth, inputHeight, frameDelays, targetFps) => {
    const maxCanvasSize = parseInt(maxCanvasSizeSelect.value);
    const maxFrameSize = parseInt(maxFrameSizeSelect.value);
    const powersOf2 = [64, 128, 256, 512, 1024, 2048].filter(p => p <= maxCanvasSize);
    let canvasIndex = 0;

    const avgFrameDelay = (frameDelays.reduce((sum, delay) => sum + delay, 0) / frameDelays.length) / 1000;

    const minFrameWidth = inputWidth / 2;
    const minFrameHeight = inputHeight / 2;
    const totalFrames = frames.length;

    const sqrtFrames = Math.ceil(Math.sqrt(totalFrames));
    const maxFramesPerRow = Math.floor(maxCanvasSize / Math.min(maxFrameSize, minFrameWidth));
    const maxFramesPerCol = Math.floor(maxCanvasSize / Math.min(maxFrameSize, minFrameHeight));
    const framesPerRowInitial = Math.min(sqrtFrames, maxFramesPerRow);
    const framesPerColInitial = Math.min(Math.ceil(totalFrames / framesPerRowInitial), maxFramesPerCol);

    const frameWidth = Math.min(Math.max(Math.ceil(maxCanvasSize / framesPerRowInitial), Math.ceil(minFrameWidth)), maxFrameSize);
    const frameHeight = Math.min(Math.max(Math.ceil(maxCanvasSize / framesPerColInitial), Math.ceil(minFrameHeight)), maxFrameSize);

    const evaluateLayout = (totalFrames) => {
        let framesPerRow = Math.floor(maxCanvasSize / frameWidth);
        let framesPerCol = Math.floor(maxCanvasSize / frameHeight);
        if (framesPerRow === 0 || framesPerCol === 0) {
            return {
                framesPerRow: 1,
                framesPerCol: 1,
                framesPerCanvas: 1,
                canvasWidth: frameWidth,
                canvasHeight: frameHeight
            };
        }

        const actualRowsNeeded = Math.ceil(totalFrames / framesPerRow);
        const framesPerColAdjusted = Math.min(framesPerCol, actualRowsNeeded);
        const framesPerCanvas = framesPerRow * framesPerColAdjusted;

        let canvasWidth = framesPerRow * frameWidth;
        let canvasHeight = framesPerColAdjusted * frameHeight;

        if (canvasWidth > maxCanvasSize) {
            framesPerRow = Math.floor(maxCanvasSize / frameWidth);
            canvasWidth = framesPerRow * frameWidth;
        }
        if (canvasHeight > maxCanvasSize) {
            framesPerColAdjusted = Math.floor(maxCanvasSize / frameHeight);
            canvasHeight = framesPerColAdjusted * frameHeight;
            framesPerCanvas = framesPerRow * framesPerColAdjusted;
        }

        return { framesPerRow, framesPerCol: framesPerColAdjusted, framesPerCanvas, canvasWidth, canvasHeight };
    };

    const drawCanvas = (startFrame, remainingFrames) => {
        const { framesPerRow, framesPerCol, framesPerCanvas, canvasWidth, canvasHeight } = evaluateLayout(remainingFrames);
        const framesToDraw = Math.min(remainingFrames, framesPerCanvas);

        if (framesToDraw === 0) {
            showError('No frames can be drawn. Please use a smaller file or fewer frames.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        for (let i = 0; i < framesToDraw; i++) {
            const frameIndex = startFrame + i;
            const frame = frames[frameIndex];
            const row = Math.floor(i / framesPerRow);
            const col = i % framesPerRow;

            const x = col * frameWidth;
            const y = row * frameHeight;

            const imageData = ctx.createImageData(frameWidth, frameHeight);
            const pixels = renderFrame(frame, frameWidth, frameHeight);
            for (let j = 0; j < pixels.length; j++) imageData.data[j] = pixels[j];
            ctx.putImageData(imageData, x, y);
        }

        const newWidth = powersOf2.find(p => p >= canvasWidth) || maxCanvasSize;
        const newHeight = powersOf2.find(p => p >= canvasHeight) || maxCanvasSize;
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        const resizedCtx = resizedCanvas.getContext('2d');
        resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

        resizedCanvas.id = `canvas-${canvasIndex}`;
        container.appendChild(resizedCanvas);
        canvasIndex++;

        const canvasJson = {
            id: "",
            time: framesToDraw * avgFrameDelay,
            frame: framesToDraw,
            row: framesPerCol,
            col: framesPerRow
        };
        const currentText = canvasInfo.value;
        canvasInfo.value = currentText + (currentText ? '\n' : '') + JSON.stringify(canvasJson);

        if (startFrame + framesToDraw < frames.length) {
            drawCanvas(startFrame + framesToDraw, frames.length - (startFrame + framesToDraw));
        }
    };

    const selectedFps = parseInt(videoFpsSelect.value);
    const selectedSide = parseInt(document.getElementById('objectSide').value);
    canvasInfo.value = JSON.stringify({ side: selectedSide, fps: selectedFps });

    drawCanvas(0, frames.length);
};

const renderFrame = (frame, targetWidth, targetHeight) => {
    const { width, height, pixels } = frame;
    const scaleX = width / targetWidth;
    const scaleY = height / targetHeight;
    const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);

    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const srcX = Math.floor(x * scaleX);
            const srcY = Math.floor(y * scaleY);
            const srcIdx = (srcY * width + srcX) * 4;
            const dstIdx = (y * targetWidth + x) * 4;

            if (srcX < width && srcY < height && srcIdx < pixels.length) {
                output[dstIdx] = pixels[srcIdx];
                output[dstIdx + 1] = pixels[srcIdx + 1];
                output[dstIdx + 2] = pixels[srcIdx + 2];
                output[dstIdx + 3] = pixels[srcIdx + 3];
            }
        }
    }

    return output;
};