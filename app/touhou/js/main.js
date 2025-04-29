const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 600;

const sources = {
    badApple: { data: null, video: null },
    black: { data: null, element: null },
    white: { data: null, element: null }
};

const elements = {
    badApple: { 
        url: document.getElementById('badAppleUrl'), 
        file: document.getElementById('badAppleFile'), 
        video: document.getElementById('badApplePreview'),
    },
    black: { 
        url: document.getElementById('blackUrl'), 
        file: document.getElementById('blackFile'), 
        video: document.getElementById('blackPreview'), 
        img: document.getElementById('blackPreviewImg') 
    },
    white: { 
        url: document.getElementById('whiteUrl'), 
        file: document.getElementById('whiteFile'), 
        video: document.getElementById('whitePreview'), 
        img: document.getElementById('whitePreviewImg') 
    }
};

const debug = (msg, data) => console.log(`[DEBUG ${new Date().toISOString()}] ${msg}`, data);

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif']);
const isImageSource = (source) => 
    (typeof source === 'string' && imageExtensions.has(source.split('.').pop().toLowerCase())) ||
    (source instanceof File && source.type.startsWith('image/'));

async function loadMedia({ url, file, video, img }, mediaName) {
    try {
        const source = file.files[0] || (url.value.trim() && url.value);
        if (!source) return null;

        const isFile = source instanceof File;
        const src = isFile ? URL.createObjectURL(source) : source;

        if (!isFile && (src.includes('youtube.com') || src.includes('youtu.be'))) {
            throw new Error('YouTube URLs not supported');
        }

        if (!isFile) await fetch(src, { method: 'HEAD' }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });

        const isImage = isImageSource(source);
        const preview = isImage ? img : video;
        preview.src = src;
        preview.style.display = 'block';
        
        const otherPreview = isImage ? video : img;
        if (otherPreview) otherPreview.style.display = 'none';

        debug(`Loaded ${mediaName}`, { src, type: isImage ? 'image' : 'video' });
        return { type: isImage ? 'image' : 'video', src };
    } catch (error) {
        debug(`Error loading ${mediaName}`, error);
        throw error;
    }
}

let updateTimeout;
async function updatePreviews() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(async () => {
        try {
            sources.badApple.data = await loadMedia(elements.badApple, 'Bad Apple');
            sources.black.data = await loadMedia(elements.black, 'black source');
            sources.white.data = await loadMedia(elements.white, 'white source');
        } catch (error) {
            alert(`Media load failed: ${error.message}`);
        }
    }, 250);
}

Object.values(elements).forEach(group => {
    ['url', 'file'].forEach(type => group[type].addEventListener('change', updatePreviews));
});

async function playCustomVideo() {
    await updatePreviews();
    if (!sources.badApple.data || !sources.black.data || !sources.white.data) {
        alert('All three media sources required!');
        return;
    }

    try {
        const createElement = (source) => source.type === 'image' ? new Image() : document.createElement('video');
        [sources.badApple.video, sources.black.element, sources.white.element] = [
            document.createElement('video'),
            createElement(sources.black.data),
            createElement(sources.white.data)
        ].map((el, i) => {
            el.src = typeof sources[Object.keys(sources)[i]].data.src === 'string' 
                ? sources[Object.keys(sources)[i]].data.src 
                : URL.createObjectURL(sources[Object.keys(sources)[i]].data.src);
            el.onerror = () => debug(`Error loading ${Object.keys(sources)[i]}`, el.error);
            return el;
        });

        await Promise.all(Object.values(sources).map(({ video, element, data }) => 
            new Promise((resolve, reject) => {
                const el = video || element;
                const isVideo = data.type === 'video';
                el[isVideo ? 'onloadedmetadata' : 'onload'] = () => resolve();
                el.onerror = () => reject(new Error(`Failed to load ${data.type} metadata`));
                setTimeout(() => reject(new Error('Metadata timeout')), 5000);
            })
        ));

        sources.badApple.video.muted = false;
        if (sources.black.data.type === 'video') sources.black.element.muted = true;
        if (sources.white.data.type === 'video') sources.white.element.muted = true;

        let lastFrameTime = 0;
        const renderFrame = (timestamp) => {
            if (sources.badApple.video.paused || sources.badApple.video.ended) {
                if (sources.badApple.video.ended) debug('Playback completed');
                return;
            }

            if (timestamp - lastFrameTime < 16.67) { // Cap at ~60fps
                requestAnimationFrame(renderFrame);
                return;
            }
            lastFrameTime = timestamp;

            ctx.drawImage(sources.badApple.video, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
            const maskData = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT).data;
            
            ctx.drawImage(sources.black.element, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
            const blackData = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT).data;
            
            ctx.drawImage(sources.white.element, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
            const whiteData = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT).data;

            const outputData = new Uint32Array(TARGET_WIDTH * TARGET_HEIGHT);
            const mask = new Uint32Array(maskData.buffer);
            const black = new Uint32Array(blackData.buffer);
            const white = new Uint32Array(whiteData.buffer);

            for (let i = 0; i < outputData.length; i++) {
                const brightness = ((mask[i] & 0xFF) + ((mask[i] >> 8) & 0xFF) + ((mask[i] >> 16) & 0xFF)) / 3;
                outputData[i] = (brightness < 128 ? black[i] : white[i]) | 0xFF000000; // Set alpha to 255
            }

            ctx.putImageData(new ImageData(new Uint8ClampedArray(outputData.buffer), TARGET_WIDTH, TARGET_HEIGHT), 0, 0);

            const currentTime = sources.badApple.video.currentTime;
            if (sources.black.data.type === 'video') sources.black.element.currentTime = currentTime % sources.black.element.duration;
            if (sources.white.data.type === 'video') sources.white.element.currentTime = currentTime % sources.white.element.duration;

            requestAnimationFrame(renderFrame);
        };

        Promise.all(Object.values(sources).map(({ video, element, data }) => 
            data.type === 'video' ? (video || element).play() : Promise.resolve()
        )).then(() => requestAnimationFrame(renderFrame));
    } catch (error) {
        debug('Playback error', error);
        alert(`Playback failed: ${error.message}`);
    }
}
