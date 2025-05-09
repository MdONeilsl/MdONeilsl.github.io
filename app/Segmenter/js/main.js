/**
 * Audio Segmenter: Tool for Second Life users to split audio files into 30-second WAV segments.
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


const segmentDuration = 30; // 30 seconds
const sampleRate = 44100; // 44.1 kHz
const maxSamples = 1323000; // 30 seconds at 44.1 kHz

const mediaInput = document.getElementById('mediaInput');
const processButton = document.getElementById('processButton');
const progressDiv = document.getElementById('progress');
const errorDiv = document.getElementById('error');

// Enable process button when a file is selected
mediaInput.addEventListener('change', () => {
    processButton.disabled = !mediaInput.files.length;
});

// Function to convert AudioBuffer to WAV
function audioBufferToWav(audioBuffer) {
    const numChannels = 1; // Mono
    const numFrames = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + numFrames * 2);
    const view = new DataView(buffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numFrames * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, numFrames * 2, true);

    // Write PCM data
    const channelData = audioBuffer.getChannelData(0); // Use first channel or mix to mono
    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i])); // Clip
        view.setInt16(offset, sample * 0x7FFF, true); // 16-bit
        offset += 2;
    }

    return new Blob([buffer], {
        type: 'audio/wav'
    });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Process the audio file
processButton.addEventListener('click', async () => {
    const file = mediaInput.files[0];
    if (!file) {
        errorDiv.textContent = 'Please select a file.';
        return;
    }

    processButton.disabled = true;
    progressDiv.textContent = 'Loading audio...';
    errorDiv.textContent = '';

    try {
        // Read and decode audio file
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate
        });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Convert to mono if stereo
        let monoBuffer;
        if (audioBuffer.numberOfChannels > 1) {
            const numSamples = audioBuffer.length;
            monoBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
            const monoData = monoBuffer.getChannelData(0);
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            for (let i = 0; i < numSamples; i++) {
                monoData[i] = (left[i] + right[i]) / 2; // Mix to mono
            }
        } else {
            monoBuffer = audioBuffer;
        }

        // Calculate segments
        const totalDuration = monoBuffer.duration;
        const numSegments = Math.ceil(totalDuration / segmentDuration);
        const samplesPerSegment = Math.min(maxSamples, segmentDuration * sampleRate);

        // Create ZIP
        const zip = new JSZip();
        for (let i = 0; i < numSegments; i++) {
            progressDiv.textContent = `Processing segment ${i + 1} of ${numSegments}...`;

            // Create segment buffer
            const startSample = i * samplesPerSegment;
            const segmentSamples = Math.min(samplesPerSegment, monoBuffer.length - startSample);
            const segmentBuffer = audioContext.createBuffer(1, segmentSamples, sampleRate);
            const segmentData = segmentBuffer.getChannelData(0);
            const sourceData = monoBuffer.getChannelData(0);

            // Copy samples to segment
            for (let j = 0; j < segmentSamples; j++) {
                segmentData[j] = sourceData[startSample + j] || 0;
            }

            // Convert to WAV
            const wavBlob = audioBufferToWav(segmentBuffer);
            const wavArrayBuffer = await wavBlob.arrayBuffer();
            zip.file(`segment_${i + 1}.wav`, new Uint8Array(wavArrayBuffer));
        }

        // Generate and download ZIP
        progressDiv.textContent = 'Generating ZIP file...';
        const zipBlob = await zip.generateAsync({
            type: 'blob'
        });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = 'audio_segments.zip';
        a.style.display = 'none'; // Make the link invisible
        document.body.appendChild(a); // Append the link to the body
        a.click(); // Trigger the download
        document.body.removeChild(a); // Remove the link after download
        URL.revokeObjectURL(zipUrl); // Clean up the URL object

        progressDiv.textContent = 'Processing complete! ZIP file downloaded.';
    } catch (error) {
        console.error(error);
        errorDiv.textContent = `Error: ${error.message}`;
        progressDiv.textContent = '';
    } finally {
        processButton.disabled = false;
    }
});
