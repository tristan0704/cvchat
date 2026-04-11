export function normalizeTranscriptText(text: string): string {
    return text.replace(/\s+/g, " ").replace(/\s+([,.!?;:])/g, "$1").trim()
}

//Text normalisieren