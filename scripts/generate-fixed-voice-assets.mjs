import fs from "node:fs/promises"
import path from "node:path"
import { GoogleGenAI } from "@google/genai"

/**
 * @typedef {{
 *   voiceName: string
 *   greetings: Array<{ id: string, text: string, assetPath: string }>
 *   genericGreeting: { id: string, text: string, assetPath: string }
 *   firstQuestions: Array<{ id: string, text: string, assetPath: string }>
 *   genericFirstQuestion: { id: string, text: string, assetPath: string }
 *   lastQuestion: { id: string, text: string, assetPath: string }
 *   farewell: { id: string, text: string, assetPath: string }
 *   technicalErrorFarewell: { id: string, text: string, assetPath: string }
 * }} VoiceHostManifest
 *
 * @typedef {{ numChannels: number, sampleRate: number, bitsPerSample: number }} WavOptions
 * @typedef {{ ok: true, buffer: Buffer } | { ok: false, error: Error, retryDelayMs: number | null }} SynthesizeAttemptResult
 */

const repoRoot = process.cwd()
const manifestPath = path.join(repoRoot, "src", "config", "voice-host-phrases.json")
/** @type {VoiceHostManifest} */
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
const forceOverwrite = process.argv.includes("--force")
const MAX_TTS_RETRIES = 5

/** @param {number} ms */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Load `.env.local` and `.env` in a lightweight way so the script can be run
 * directly with `node` without adding a dotenv dependency just for asset
 * generation.
 */
async function loadEnvironmentFiles() {
    for (const fileName of [".env.local", ".env"]) {
        const filePath = path.join(repoRoot, fileName)
        const content = await fs.readFile(filePath, "utf8").catch(() => "")
        if (!content) continue

        for (const rawLine of String(content).split(/\r?\n/)) {
            const line = rawLine.trim()
            if (!line || line.startsWith("#")) continue

            const separatorIndex = line.indexOf("=")
            if (separatorIndex === -1) continue

            const key = line.slice(0, separatorIndex).trim()
            const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "")
            if (!process.env[key]) process.env[key] = value
        }
    }
}

/** @param {string} assetPath */
function ensureAssetPath(assetPath) {
    return path.join(repoRoot, "public", assetPath.replace(/^\//, ""))
}

/** @param {string} mimeType
 *  @returns {WavOptions}
 */
function parsePcmMimeType(mimeType) {
    const normalizedMimeType = String(mimeType)
    const [, ...params] = normalizedMimeType.split(";").map((segment) => segment.trim())
    const options = {
        numChannels: 1,
        sampleRate: 24000,
        bitsPerSample: 16,
    }

    const formatMatch = normalizedMimeType.match(/audio\/L(\d+)/i)
    if (formatMatch) {
        options.bitsPerSample = Number(formatMatch[1])
    }

    for (const param of params) {
        const [key, value] = param.split("=").map((segment) => segment.trim())
        if (key === "rate" && value) {
            const parsedRate = Number(value)
            if (!Number.isNaN(parsedRate)) options.sampleRate = parsedRate
        }
    }

    return options
}

/** @param {number} dataLength
 *  @param {WavOptions} options
 */
function createWavHeader(dataLength, options) {
    const { numChannels, sampleRate, bitsPerSample } = options
    const byteRate = sampleRate * numChannels * bitsPerSample / 8
    const blockAlign = numChannels * bitsPerSample / 8
    const buffer = Buffer.alloc(44)

    buffer.write("RIFF", 0)
    buffer.writeUInt32LE(36 + dataLength, 4)
    buffer.write("WAVE", 8)
    buffer.write("fmt ", 12)
    buffer.writeUInt32LE(16, 16)
    buffer.writeUInt16LE(1, 20)
    buffer.writeUInt16LE(numChannels, 22)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(byteRate, 28)
    buffer.writeUInt16LE(blockAlign, 32)
    buffer.writeUInt16LE(bitsPerSample, 34)
    buffer.write("data", 36)
    buffer.writeUInt32LE(dataLength, 40)

    return buffer
}

/** @param {Buffer} rawPcmBuffer
 *  @param {string} mimeType
 */
function toWavBuffer(rawPcmBuffer, mimeType) {
    const header = createWavHeader(rawPcmBuffer.byteLength, parsePcmMimeType(mimeType))
    return Buffer.concat([header, rawPcmBuffer])
}

/** @param {unknown} error
 *  @param {number} attempt
 */
function resolveRetryDelayMs(error, attempt) {
    const retryDelaySecondsMatch = String(error?.message || "").match(/retry in\s+([\d.]+)s/i)
    const parsedRetryDelayMs = retryDelaySecondsMatch ? Math.ceil(Number(retryDelaySecondsMatch[1]) * 1000) : 0

    if (!Number.isNaN(parsedRetryDelayMs) && parsedRetryDelayMs > 0) {
        return parsedRetryDelayMs + 1000
    }

    return 15000 * attempt
}

/** @param {Buffer[]} audioChunks
 *  @param {string} detectedMimeType
 *  @param {string} phraseText
 *  @returns {SynthesizeAttemptResult}
 */
function finalizeSynthesizedAudio(audioChunks, detectedMimeType, phraseText) {
    if (!audioChunks.length) {
        return {
            ok: false,
            error: new Error(`No audio returned for phrase: ${phraseText}`),
            retryDelayMs: null,
        }
    }

    const rawAudio = Buffer.concat(audioChunks)
    const normalizedMimeType = detectedMimeType.toLowerCase()

    if (normalizedMimeType.includes("wav")) {
        return {
            ok: true,
            buffer: rawAudio,
        }
    }

    if (normalizedMimeType.includes("audio/l")) {
        return {
            ok: true,
            buffer: toWavBuffer(rawAudio, detectedMimeType),
        }
    }

    return {
        ok: false,
        error: new Error(`Unsupported TTS mime type: ${detectedMimeType || "unknown"}`),
        retryDelayMs: null,
    }
}

/** @param {unknown} error
 *  @param {number} attempt
 *  @returns {SynthesizeAttemptResult}
 */
function createFailedAttempt(error, attempt) {
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    const isQuotaError = error?.status === 429 || String(error?.message || "").includes("\"code\": 429")

    return {
        ok: false,
        error: normalizedError,
        retryDelayMs: isQuotaError ? resolveRetryDelayMs(error, attempt) : null,
    }
}

/** @param {GoogleGenAI} ai
 *  @param {string} phraseText
 *  @returns {Promise<Buffer>}
 */
async function synthesizePhrase(ai, phraseText) {
    /** @type {Error | null} */
    let lastError = null

    for (let attempt = 1; attempt <= MAX_TTS_RETRIES; attempt += 1) {
        /** @type {SynthesizeAttemptResult} */
        let attemptResult

        try {
            const response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash-preview-tts",
                config: {
                    temperature: 1,
                    responseModalities: ["audio"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: manifest.voiceName,
                            },
                        },
                    },
                },
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `Read aloud naturally in German and keep the wording exactly unchanged:\n${phraseText}`,
                            },
                        ],
                    },
                ],
            })

            /** @type {Buffer[]} */
            const audioChunks = []
            let detectedMimeType = ""

            for await (const chunk of response) {
                const inlineData = chunk.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData
                if (!inlineData?.data || typeof inlineData.data !== "string") continue

                if (!detectedMimeType && inlineData.mimeType) {
                    detectedMimeType = inlineData.mimeType
                }

                audioChunks.push(Buffer.from(String(inlineData.data), "base64"))
            }

            attemptResult = finalizeSynthesizedAudio(audioChunks, detectedMimeType, phraseText)
        } catch (error) {
            attemptResult = createFailedAttempt(error, attempt)
        }

        if (attemptResult.ok) {
            return attemptResult.buffer
        }

        lastError = attemptResult.error
        if (attemptResult.retryDelayMs === null || attempt === MAX_TTS_RETRIES) {
            break
        }

        console.warn(`quota retry for phrase after ${attemptResult.retryDelayMs}ms (attempt ${attempt}/${MAX_TTS_RETRIES})`)
        await sleep(attemptResult.retryDelayMs)
    }

    throw lastError ?? new Error(`Failed to synthesize phrase: ${phraseText}`)
}

/** @param {GoogleGenAI} ai
 *  @param {{ id: string, text: string, assetPath: string }} phrase
 */
async function writePhraseAsset(ai, phrase) {
    const absoluteAssetPath = ensureAssetPath(phrase.assetPath)
    const assetDirectory = path.dirname(absoluteAssetPath)
    await fs.mkdir(assetDirectory, { recursive: true })

    if (!forceOverwrite) {
        const existingFile = await fs.readFile(absoluteAssetPath).catch(() => null)
        if (existingFile) {
            console.log(`skip ${phrase.id} -> ${absoluteAssetPath}`)
            return
        }
    }

    console.log(`generate ${phrase.id} -> ${absoluteAssetPath}`)
    const wavBuffer = await synthesizePhrase(ai, phrase.text)
    await fs.writeFile(absoluteAssetPath, wavBuffer)
}

await loadEnvironmentFiles()

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required. Set it in the shell or in .env.local/.env before running this script.")
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
})

const phrases = [
    ...manifest.greetings,
    manifest.genericGreeting,
    ...manifest.firstQuestions,
    manifest.genericFirstQuestion,
    manifest.lastQuestion,
    manifest.farewell,
    manifest.technicalErrorFarewell,
]

for (const phrase of phrases) {
    await writePhraseAsset(ai, phrase)
}

console.log("Fixed host voice asset generation complete.")
