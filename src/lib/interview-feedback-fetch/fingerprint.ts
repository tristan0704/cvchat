export function buildInterviewTranscriptFingerprint(input: string) {
    const normalized = input.trim()
    let hash = 0

    for (let index = 0; index < normalized.length; index += 1) {
        hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0
    }

    return hash.toString(16).padStart(8, "0")
}
