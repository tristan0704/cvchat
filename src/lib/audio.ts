/**
 * Audio utility functions for realtime voice streaming.
 *
 * Audio Flow Overview:
 * 1. Microphone → MediaStream → ScriptProcessor (4096 samples)
 * 2. Float32 PCM → downsample to 16 kHz → 16-bit PCM → base64
 * 3. Base64 sent to Gemini Realtime via session.sendRealtimeInput()
 * 4. Gemini responds with base64 PCM16 audio chunks
 * 5. Chunks decoded → AudioBuffer → scheduled playback via AudioBufferSourceNode
 *
 * Note: ScriptProcessor is deprecated but still widely supported.
 * Migrating to AudioWorklet would require a separate worklet file and
 * MessagePort-based communication, which adds complexity without
 * meaningful benefit for this use case.
 */

/** Fallback playback sample rate when the Gemini stream does not specify one. */
export const OUTPUT_SAMPLE_RATE_FALLBACK = 24_000

/** Microphone audio is downsampled to this rate before being sent upstream. */
export const INPUT_SAMPLE_RATE = 16_000

/**
 * Parse the sample rate from a MIME type string like "audio/pcm;rate=24000".
 * Falls back to OUTPUT_SAMPLE_RATE_FALLBACK if no rate parameter is found.
 */
export function parseSampleRate(mimeType?: string): number {
    const match = mimeType?.match(/rate=(\d+)/i)
    return match ? Number(match[1]) : OUTPUT_SAMPLE_RATE_FALLBACK
}

/** Decode a base64 string into a Uint8Array of raw bytes. */
export function base64ToUint8Array(base64: string): Uint8Array {
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }
    return bytes
}

/** Encode a Uint8Array into a base64 string. */
export function encodeBase64(bytes: Uint8Array): string {
    let binary = ""
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index])
    }
    return window.btoa(binary)
}

/**
 * Downsample a Float32Array from one sample rate to another using
 * simple averaging. This is intentionally basic — the audio is speech
 * destined for an LLM, so audiophile-grade resampling is unnecessary.
 */
export function downsampleBuffer(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (inputRate === outputRate) return input

    const ratio = inputRate / outputRate
    const newLength = Math.round(input.length / ratio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetInput = 0

    while (offsetResult < result.length) {
        const nextOffsetInput = Math.round((offsetResult + 1) * ratio)
        let accumulated = 0
        let count = 0

        for (let index = offsetInput; index < nextOffsetInput && index < input.length; index += 1) {
            accumulated += input[index]
            count += 1
        }

        result[offsetResult] = count > 0 ? accumulated / count : 0
        offsetResult += 1
        offsetInput = nextOffsetInput
    }

    return result
}

/** Convert Float32 PCM samples (range -1..1) to 16-bit signed PCM bytes. */
export function floatTo16BitPcm(input: Float32Array): Uint8Array {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)

    for (let index = 0; index < input.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, input[index]))
        view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }

    return new Uint8Array(buffer)
}

/** Decode base64-encoded 16-bit PCM into Float32 samples for Web Audio playback. */
export function decodePcm16(base64: string): Float32Array<ArrayBuffer> {
    const pcmBytes = base64ToUint8Array(base64)
    const sampleCount = Math.floor(pcmBytes.byteLength / 2)
    // Allocate a fresh ArrayBuffer so the return type is Float32Array<ArrayBuffer>
    // rather than Float32Array<ArrayBufferLike> (required by AudioBuffer.copyToChannel).
    const buffer = new ArrayBuffer(sampleCount * 4)
    const samples = new Float32Array(buffer)
    const view = new DataView(pcmBytes.buffer as ArrayBuffer, pcmBytes.byteOffset, pcmBytes.byteLength)

    for (let index = 0; index < sampleCount; index += 1) {
        samples[index] = view.getInt16(index * 2, true) / 0x8000
    }

    return samples
}

/**
 * Find a supported MIME type for MediaRecorder.
 * Prefers opus in webm, falls back to plain webm, then mp4.
 * Returns an empty string if no format is supported.
 */
export function getSupportedRecordingMimeType(): string {
    if (typeof MediaRecorder === "undefined") return ""

    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
    return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ""
}
