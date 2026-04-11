import { DEFAULT_CALL_DURATION_SECONDS } from "@/lib/voice-interview/session/endgame"

export const LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"
export const LIVE_VOICE = "Zephyr"
export const AUDIO_INPUT_WORKLET_PATH = "/audio/voice-host/pcm-input-worklet.js"
export const CALL_DURATION_SECONDS = DEFAULT_CALL_DURATION_SECONDS
export const LIVE_INPUT_PREFIX_PADDING_MS = 120
export const LIVE_INPUT_SILENCE_DURATION_MS = 700
