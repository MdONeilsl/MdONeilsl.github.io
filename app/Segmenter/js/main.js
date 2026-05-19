/**
 * Audio Segmenter: Tool for Second Life users to split audio files into 30-second WAV segments.
 * Copyright (C) 2025 MdONeil
 * Licensed under GNU GPL v3 <https://www.gnu.org/licenses/>.
 *
 * secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
 */

import { elem, ev, new_node, set_node_text, clear_element } from '../../../lib/module/html.js';
import { error, type_error, range_error } from '../../../lib/error.js';
import { NULL, type_of, kind_of } from '../../../lib/functions.js';
import { request_files_dialog as real_request_files_dialog, save_file_on_disk as real_save_file_on_disk } from '../../../lib/module/system/system.js';

// ==================== CONSTANTS ====================

export const SEGMENT_DURATION_SECONDS = 30;
export const SAMPLE_RATE_HZ = 44100;
export const MAX_SAMPLES_PER_SEGMENT = SEGMENT_DURATION_SECONDS * SAMPLE_RATE_HZ;
export const WAV_HEADER_SIZE = 44;
export const BITS_PER_SAMPLE = 16;
export const BYTES_PER_SAMPLE = 2;
export const PCM_FORMAT = 1;
export const NUM_CHANNELS_MONO = 1;

// Validation constants
export const MIN_SAMPLE_RATE = 8000;
export const MAX_SAMPLE_RATE = 192000;
export const MAX_FILE_SIZE_MB = 500;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const SUPPORTED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
export const SUPPORTED_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.m4a', '.aac'];

// Magic numbers for file validation (binary signatures)
export const MAGIC_NUMBERS = {
    RIFF: [0x52, 0x49, 0x46, 0x46], // "RIFF"
    WAVE: [0x57, 0x41, 0x56, 0x45], // "WAVE"
    fmt: [0x66, 0x6D, 0x74, 0x20],   // "fmt "
    data: [0x64, 0x61, 0x74, 0x61],  // "data"
};

// ==================== VALIDATION MODULE ====================

/**
 * Validates file input before processing
 */
export class file_validator_class {
    /**
     * Validates file size and type
     * @param {File} file - File to validate
     * @throws {range_error|type_error} If validation fails
     */
    static validate_file(file) {
        if (!file) {
            throw new type_error('No file provided');
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new range_error(
                `File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds ` +
                `maximum of ${MAX_FILE_SIZE_MB}MB`
            );
        }

        if (file.size === 0) {
            throw new range_error('File is empty (0 bytes)');
        }

        // Check file type by extension as first pass
        const file_name = file.name.toLowerCase();
        const has_valid_extension = SUPPORTED_EXTENSIONS.some(ext =>
            file_name.endsWith(ext)
        );

        if (!has_valid_extension) {
            throw new type_error(
                `Unsupported file type: ${file.name}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`
            );
        }
    }

    /**
     * Validates binary signatures of WAV file
     * @param {ArrayBuffer} buffer - File buffer
     * @throws {type_error} If WAV header is invalid
     */
    static validate_wav_header(buffer) {
        const view = new Uint8Array(buffer);

        // Check RIFF header
        for (let i = 0; i < 4; i++) {
            if (view[i] !== MAGIC_NUMBERS.RIFF[i]) {
                throw new type_error('Invalid WAV file: missing RIFF header');
            }
        }

        // Check WAVE format
        for (let i = 8; i < 12; i++) {
            if (view[i] !== MAGIC_NUMBERS.WAVE[i - 8]) {
                throw new type_error('Invalid WAV file: missing WAVE format marker');
            }
        }

        // Check fmt chunk
        for (let i = 12; i < 16; i++) {
            if (view[i] !== MAGIC_NUMBERS.fmt[i - 12]) {
                throw new type_error('Invalid WAV file: missing fmt chunk');
            }
        }

        // Validate audio format (should be PCM = 1)
        const audio_format = view[20] + (view[21] << 8);
        if (audio_format !== PCM_FORMAT) {
            throw new type_error(`Unsupported audio format: ${audio_format}. Only PCM (1) is supported`);
        }

        // Validate sample rate
        const sample_rate = view[24] + (view[25] << 8) + (view[26] << 16) + (view[27] << 24);
        if (sample_rate < MIN_SAMPLE_RATE || sample_rate > MAX_SAMPLE_RATE) {
            throw new range_error(
                `Invalid sample rate: ${sample_rate}Hz. Must be between ` +
                `${MIN_SAMPLE_RATE}Hz and ${MAX_SAMPLE_RATE}Hz`
            );
        }

        // Validate bits per sample
        const bits_per_sample = view[34] + (view[35] << 8);
        if (bits_per_sample !== 16 && bits_per_sample !== 24 && bits_per_sample !== 32) {
            throw new type_error(
                `Unsupported bits per sample: ${bits_per_sample}. Only 16, 24, or 32-bit supported`
            );
        }
    }
}

/**
 * Validates audio buffer properties
 */
export class audio_buffer_validator_class {
    /**
     * Validates AudioBuffer properties
     * @param {AudioBuffer} buffer - Buffer to validate
     * @throws {range_error|type_error} If validation fails
     */
    static validate_buffer(buffer) {
        if (!(buffer instanceof AudioBuffer)) {
            throw new type_error('Expected AudioBuffer instance');
        }

        // Check duration
        if (buffer.duration === 0) {
            throw new range_error('Audio file has zero duration');
        }

        if (buffer.duration > 3600) { // 1 hour max
            throw new range_error(`Audio too long: ${buffer.duration.toFixed(2)} seconds exceeds 1 hour limit`);
        }

        // Check sample rate
        if (buffer.sampleRate < MIN_SAMPLE_RATE || buffer.sampleRate > MAX_SAMPLE_RATE) {
            throw new range_error(
                `Invalid sample rate: ${buffer.sampleRate}Hz. Must be between ` +
                `${MIN_SAMPLE_RATE}Hz and ${MAX_SAMPLE_RATE}Hz`
            );
        }

        // Check for valid audio data (non-zero samples)
        let has_audio = false;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            const step = Math.max(1, Math.floor(data.length / 100)); // Check ~100 points
            for (let i = 0; i < data.length; i += step) {
                if (Math.abs(data[i]) > 0.0001) {
                    has_audio = true;
                    break;
                }
            }
            if (has_audio) break;
        }

        if (!has_audio) {
            throw new range_error('Audio file contains only silence or invalid data');
        }
    }

    /**
     * Validates segment parameters
     * @param {number} total_samples - Total samples in source
     * @param {number} segment_index - Current segment index
     * @param {number} num_segments - Total segments
     */
    static validate_segment(total_samples, segment_index, num_segments) {
        if (segment_index < 0 || segment_index >= num_segments) {
            throw new range_error(`Invalid segment index: ${segment_index}`);
        }

        if (total_samples <= 0) {
            throw new range_error('Source buffer has no samples');
        }
    }
}

// ==================== WAV ENCODER ====================

/**
 * Encodes an AudioBuffer into a WAV blob (mono, 16-bit PCM).
 */
export class wav_encoder_class {
    /**
     * Encodes a mono AudioBuffer to a WAV Blob.
     * @param {AudioBuffer} audio_buffer - The audio buffer (must be mono).
     * @returns {Blob} WAV blob.
     * @throws {type_error} If audio_buffer is not an AudioBuffer or not mono.
     */
    static encode(audio_buffer) {
        if (!(audio_buffer instanceof AudioBuffer)) {
            throw new type_error('wav_encoder_class.encode: expected AudioBuffer');
        }
        if (audio_buffer.numberOfChannels !== NUM_CHANNELS_MONO) {
            throw new type_error('wav_encoder_class.encode: buffer must be mono');
        }

        const num_frames = audio_buffer.length;
        const data_byte_length = num_frames * BYTES_PER_SAMPLE;
        const total_byte_length = WAV_HEADER_SIZE + data_byte_length;
        const buffer = new ArrayBuffer(total_byte_length);
        const view = new DataView(buffer);

        // RIFF chunk
        write_string_to_view(view, 0, 'RIFF');
        view.setUint32(4, 36 + data_byte_length, true);
        write_string_to_view(view, 8, 'WAVE');

        // fmt subchunk
        write_string_to_view(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, PCM_FORMAT, true);
        view.setUint16(22, NUM_CHANNELS_MONO, true);
        view.setUint32(24, SAMPLE_RATE_HZ, true);
        view.setUint32(28, SAMPLE_RATE_HZ * BYTES_PER_SAMPLE, true);
        view.setUint16(32, BYTES_PER_SAMPLE, true);
        view.setUint16(34, BITS_PER_SAMPLE, true);

        // data subchunk
        write_string_to_view(view, 36, 'data');
        view.setUint32(40, data_byte_length, true);

        // PCM data
        const channel_data = audio_buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < num_frames; i++) {
            const sample = Math.max(-1, Math.min(1, channel_data[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += BYTES_PER_SAMPLE;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
}

/**
 * Writes a string into a DataView at a given offset.
 * @param {DataView} view - The target DataView.
 * @param {number} offset - Byte offset.
 * @param {string} string - String to write.
 */
export function write_string_to_view(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// ==================== AUDIO PROCESSOR ====================

/**
 * Handles audio decoding, mono conversion, and segment extraction.
 */
export class audio_processor_class {
    /**
     * @param {AudioContext} audio_context - Web Audio API context.
     * @throws {type_error} If audio_context is not an AudioContext.
     */
    constructor(audio_context) {
        if (!(audio_context instanceof AudioContext)) {
            throw new type_error('audio_processor_class: expected AudioContext');
        }
        this.audio_context = audio_context;
        this.is_terminated = false;
    }

    /**
     * Terminates the audio context to free resources
     */
    terminate() {
        if (!this.is_terminated && this.audio_context.state !== 'closed') {
            this.audio_context.close();
            this.is_terminated = true;
        }
    }

    /**
     * Decodes an audio file into an AudioBuffer.
     * @param {File} file - The input audio file.
     * @returns {Promise<AudioBuffer>} Decoded buffer.
     * @throws {error} If decoding fails.
     */
    async decode_audio_file(file) {
        if (this.is_terminated) {
            throw new error('Audio processor has been terminated');
        }

        try {
            const array_buffer = await file.arrayBuffer();

            // Validate WAV header if applicable
            if (file.type === 'audio/wav' || file.name.toLowerCase().endsWith('.wav')) {
                file_validator_class.validate_wav_header(array_buffer);
            }

            return await this.audio_context.decodeAudioData(array_buffer);
        } catch (decode_error) {
            throw new error(`Audio decoding failed: ${decode_error.message}`);
        }
    }

    /**
     * Converts a multi‑channel AudioBuffer to mono by averaging channels.
     * @param {AudioBuffer} stereo_buffer - Input buffer.
     * @returns {AudioBuffer} Mono buffer.
     */
    convert_to_mono(stereo_buffer) {
        const num_samples = stereo_buffer.length;
        const mono_buffer = this.audio_context.createBuffer(
            NUM_CHANNELS_MONO,
            num_samples,
            stereo_buffer.sampleRate
        );
        const mono_data = mono_buffer.getChannelData(0);

        if (stereo_buffer.numberOfChannels === 1) {
            mono_data.set(stereo_buffer.getChannelData(0));
            return mono_buffer;
        }

        const left = stereo_buffer.getChannelData(0);
        const right = stereo_buffer.getChannelData(1);
        for (let i = 0; i < num_samples; i++) {
            mono_data[i] = (left[i] + right[i]) / 2;
        }
        return mono_buffer;
    }

    /**
     * Resamples audio to target sample rate if needed
     * @param {AudioBuffer} buffer - Input buffer
     * @returns {AudioBuffer} Buffer at target sample rate
     */
    resample_to_target_rate(buffer) {
        if (buffer.sampleRate === SAMPLE_RATE_HZ) {
            return buffer;
        }

        // Calculate resampling ratio
        const ratio = SAMPLE_RATE_HZ / buffer.sampleRate;
        const new_length = Math.floor(buffer.length * ratio);

        const resampled = this.audio_context.createBuffer(
            buffer.numberOfChannels,
            new_length,
            SAMPLE_RATE_HZ
        );

        // Simple linear interpolation resampling
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const input_data = buffer.getChannelData(channel);
            const output_data = resampled.getChannelData(channel);

            for (let i = 0; i < new_length; i++) {
                const src_index = i / ratio;
                const src_index_floor = Math.floor(src_index);
                const src_index_ceil = Math.min(src_index_floor + 1, buffer.length - 1);
                const fraction = src_index - src_index_floor;

                output_data[i] = input_data[src_index_floor] * (1 - fraction) +
                    input_data[src_index_ceil] * fraction;
            }
        }

        return resampled;
    }

    /**
     * Extracts segments from a mono AudioBuffer.
     * @param {AudioBuffer} mono_buffer - Mono audio buffer.
     * @returns {AudioBuffer[]} Array of segment buffers.
     */
    extract_segments(mono_buffer) {
        const total_samples = mono_buffer.length;
        const segment_samples = Math.min(
            MAX_SAMPLES_PER_SEGMENT,
            SEGMENT_DURATION_SECONDS * mono_buffer.sampleRate
        );
        const num_segments = Math.ceil(total_samples / segment_samples);
        const segments = [];

        for (let i = 0; i < num_segments; i++) {
            audio_buffer_validator_class.validate_segment(total_samples, i, num_segments);

            const start = i * segment_samples;
            const end = Math.min(start + segment_samples, total_samples);
            const segment_length = end - start;
            const segment_buffer = this.audio_context.createBuffer(
                NUM_CHANNELS_MONO,
                segment_length,
                mono_buffer.sampleRate
            );
            const segment_data = segment_buffer.getChannelData(0);
            const source_data = mono_buffer.getChannelData(0);

            for (let j = 0; j < segment_length; j++) {
                segment_data[j] = source_data[start + j];
            }
            segments.push(segment_buffer);
        }
        return segments;
    }
}

// ==================== ZIP GENERATOR ====================

/**
 * Creates a ZIP archive containing multiple files.
 */
export class zip_generator_class {
    constructor() {
        this.zip = new JSZip();
        this.file_count = 0;
    }

    /**
     * Adds a file to the ZIP archive.
     * @param {string} filename - Name inside the ZIP.
     * @param {Blob} blob - File content.
     */
    add_file(filename, blob) {
        if (!(blob instanceof Blob)) {
            throw new type_error('zip_generator_class.add_file: expected Blob');
        }
        this.zip.file(filename, blob);
        this.file_count++;
    }

    /**
     * Generates the ZIP blob.
     * @returns {Promise<Blob>} ZIP blob.
     */
    async generate_blob() {
        if (this.file_count === 0) {
            throw new error('No files added to ZIP archive');
        }
        return this.zip.generateAsync({ type: 'blob' });
    }

    /**
     * Resets the generator for reuse
     */
    reset() {
        this.zip = new JSZip();
        this.file_count = 0;
    }
}

// ==================== UI CONTROLLER ====================

/**
 * Manages UI elements and orchestrates the segmentation process.
 * Supports dependency injection for file dialog and save functions to ease testing.
 */
export class ui_controller_class {
    /**
     * @param {Object} element_ids - Object containing DOM element IDs.
     * @param {string} element_ids.process_button - Process button ID.
     * @param {string} element_ids.progress - Progress display ID.
     * @param {string} element_ids.error - Error display ID.
     * @param {Function} [file_dialog_service=request_files_dialog] - Function to open file dialog.
     * @param {Function} [save_file_service=save_file_on_disk] - Function to save blob to disk.
     */
    constructor(element_ids, file_dialog_service = real_request_files_dialog, save_file_service = real_save_file_on_disk) {
        // Retrieve elements using the html.js `elem` function
        this.media_input = elem('mediaInput');
        this.process_button = elem(element_ids.process_button);
        this.progress_div = elem(element_ids.progress);
        this.error_div = elem(element_ids.error);

        if (!this.process_button || !this.progress_div || !this.error_div) {
            throw new error('ui_controller_class: required DOM elements not found');
        }

        // Services (with dependency injection)
        this.file_dialog_service = file_dialog_service;
        this.save_file_service = save_file_service;

        // Create services (AudioContext created on demand to avoid autoplay restrictions)
        this.audio_processor = NULL;
        this.zip_generator = new zip_generator_class();

        this.init_event_listeners();
    }

    /** Initialises DOM event listeners using the html.js `ev` function. */
    init_event_listeners() {
        ev(this.process_button, 'click', () => this.handle_process_click());
        ev(this.media_input, 'change', () => {
            this.process_button.disabled = this.media_input.files.length === 0;
        });
    }

    /** Updates the progress message using html.js `set_node_text`. */
    update_progress(message) {
        set_node_text(this.progress_div, message);
    }

    /** Displays an error message using html.js `set_node_text`. */
    show_error(message) {
        set_node_text(this.error_div, message);
    }

    /** Clears previous messages. */
    clear_messages() {
        this.update_progress('');
        this.show_error('');
    }

    /**
     * Creates or reinitializes audio processor
     */
    init_audio_processor() {
        if (this.audio_processor) {
            this.audio_processor.terminate();
        }

        const audio_context = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: SAMPLE_RATE_HZ,
        });
        this.audio_processor = new audio_processor_class(audio_context);
    }

    /** Main handler for the process button click. */
    async handle_process_click() {
        this.clear_messages();
        this.process_button.disabled = true;
        this.zip_generator.reset();

        try {
            // Open file selection dialog using injected service
            this.update_progress('Select an audio file...');
            const file = this.media_input.files[0];
            if (!file) {
                throw new error('No file selected');
            }

            // Validate file
            file_validator_class.validate_file(file);

            // Initialize audio processor
            this.init_audio_processor();
            this.update_progress('Loading audio...');

            // 1. Decode audio
            const stereo_buffer = await this.audio_processor.decode_audio_file(file);

            // 2. Validate decoded buffer
            audio_buffer_validator_class.validate_buffer(stereo_buffer);

            // 3. Convert to mono
            const mono_buffer = this.audio_processor.convert_to_mono(stereo_buffer);

            // 4. Resample if needed
            const resampled_buffer = this.audio_processor.resample_to_target_rate(mono_buffer);

            // 5. Extract segments
            const segments = this.audio_processor.extract_segments(resampled_buffer);
            this.update_progress(`Processing ${segments.length} segments...`);

            // 6. Encode each segment to WAV and add to ZIP
            for (let i = 0; i < segments.length; i++) {
                const wav_blob = wav_encoder_class.encode(segments[i]);
                this.zip_generator.add_file(`segment_${String(i + 1).padStart(3, '0')}.wav`, wav_blob);
                this.update_progress(`Processed segment ${i + 1} of ${segments.length}`);
            }

            // 7. Generate and download ZIP using injected service
            this.update_progress('Generating ZIP file...');
            const zip_blob = await this.zip_generator.generate_blob();
            const zip_url = URL.createObjectURL(zip_blob);
            await this.save_file_service('audio_segments.zip', zip_url);
            URL.revokeObjectURL(zip_url);

            this.update_progress(`Processing complete! ${segments.length} segments saved.`);
        } catch (err) {
            console.error(err);
            const message = (err instanceof error || err instanceof type_error || err instanceof range_error)
                ? err.message
                : `Unexpected error: ${err.message}`;
            this.show_error(message);
            this.update_progress('');
        } finally {
            // Clean up audio resources
            if (this.audio_processor) {
                this.audio_processor.terminate();
                this.audio_processor = NULL;
                this.media_input.value = '';
            }
            this.process_button.disabled = false;
        }
    }
}

// ==================== INITIALISATION ====================

document.addEventListener('DOMContentLoaded', () => {
    try {
        new ui_controller_class({
            process_button: 'processButton',
            progress: 'progress',
            error: 'error',
        });
    } catch (init_error) {
        console.error('Initialization failed:', init_error);
        const error_elem = document.getElementById('error');
        if (error_elem) {
            set_node_text(error_elem, `Initialization error: ${init_error.message}`);
        }
    }
});