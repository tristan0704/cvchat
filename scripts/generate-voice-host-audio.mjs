import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "..");
const manifestPath = path.join(workspaceRoot, "src", "config", "voice-host-phrases.json");
const publicRoot = path.join(workspaceRoot, "public");
const force = process.argv.includes("--force");
const validateOnly = process.argv.includes("--validate-only");
const ttsModel = process.env.VOICE_HOST_TTS_MODEL || "gemini-2.5-flash-preview-tts";

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const apiKey = process.env.GEMINI_API_KEY?.trim();

function getSpeechLanguage(language) {
    return language === "en" ? "en-US" : "de-DE";
}

function getPhraseEntries() {
    const entries = [];

    for (const [language, phraseSet] of Object.entries(manifest.languages ?? {})) {
        for (const phrase of phraseSet.greetings ?? []) {
            entries.push({ language, ...phrase });
        }

        for (const phrase of phraseSet.firstQuestions ?? []) {
            entries.push({ language, ...phrase });
        }

        entries.push({ language, ...phraseSet.genericGreeting });
        entries.push({ language, ...phraseSet.genericFirstQuestion });
        entries.push({ language, ...phraseSet.lastQuestion });
        entries.push({ language, ...phraseSet.farewell });
        entries.push({ language, ...phraseSet.technicalErrorFarewell });
    }

    return entries.filter((entry) => entry.assetPath && entry.text);
}

function resolveAssetPath(assetPath) {
    if (!assetPath.startsWith("/audio/voice-host/")) {
        throw new Error(`Unexpected voice-host asset path: ${assetPath}`);
    }

    return path.join(publicRoot, assetPath.replace(/^\//, ""));
}

async function fileExists(filePath) {
    try {
        const file = await readFile(filePath);
        return file.byteLength > 0;
    } catch {
        return false;
    }
}

function getAudioPart(response) {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const part = parts.find((candidatePart) => candidatePart.inlineData?.data);

    if (!part?.inlineData?.data) {
        throw new Error("TTS response did not contain inline audio data.");
    }

    return part.inlineData;
}

function createWavFromPcm16(pcmBuffer, sampleRate = 24000) {
    const channelCount = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * channelCount * bitsPerSample / 8;
    const blockAlign = channelCount * bitsPerSample / 8;
    const header = Buffer.alloc(44);

    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channelCount, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcmBuffer.length, 40);

    return Buffer.concat([header, pcmBuffer]);
}

function toWavBuffer(inlineData) {
    const audioBuffer = Buffer.from(inlineData.data, "base64");
    const mimeType = inlineData.mimeType || inlineData.mime_type || "";

    if (mimeType.includes("wav") || audioBuffer.subarray(0, 4).toString("ascii") === "RIFF") {
        return audioBuffer;
    }

    return createWavFromPcm16(audioBuffer);
}

async function generatePhrase(ai, phrase) {
    const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: [
                            "Read the following interview host line exactly as written.",
                            "Use a calm, professional technical interviewer tone.",
                            "Do not add, omit, translate, or explain anything.",
                            "",
                            phrase.text,
                        ].join("\n"),
                    },
                ],
            },
        ],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                languageCode: getSpeechLanguage(phrase.language),
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: manifest.voiceName,
                    },
                },
            },
        },
    });

    return toWavBuffer(getAudioPart(response));
}

const phrases = getPhraseEntries();
const missingAssets = [];

for (const phrase of phrases) {
    const outputPath = resolveAssetPath(phrase.assetPath);
    const exists = await fileExists(outputPath);

    if (!exists) {
        missingAssets.push(phrase.assetPath);
    }
}

if (validateOnly) {
    if (missingAssets.length > 0) {
        throw new Error(`Missing voice-host assets:\n${missingAssets.join("\n")}`);
    }

    console.info(`Validated ${phrases.length} voice-host assets.`);
    process.exit(0);
}

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to generate voice-host audio assets.");
}

const ai = new GoogleGenAI({ apiKey });
let generatedCount = 0;
let skippedCount = 0;

for (const phrase of phrases) {
    const outputPath = resolveAssetPath(phrase.assetPath);
    const exists = await fileExists(outputPath);

    if (exists && !force) {
        skippedCount += 1;
        continue;
    }

    const audio = await generatePhrase(ai, phrase);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, audio);
    generatedCount += 1;
    console.info(`Generated ${phrase.assetPath}`);
}

console.info(`Voice-host audio generation complete. Generated ${generatedCount}, skipped ${skippedCount}.`);
