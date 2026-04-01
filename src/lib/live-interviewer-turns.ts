
import { type Part } from "@google/genai"

function shouldInsertSpaceBetweenFragments(existingText: string, incomingText: string): boolean {
    const leftChar = existingText.slice(-1)
    const rightChar = incomingText.slice(0, 1)

    if (!leftChar || !rightChar) return false
    if (/\s/.test(leftChar) || /\s/.test(rightChar)) return false
    if (/[\(\[\{\/"'`-]/.test(leftChar)) return false
    if (/^[,.;:!?)\]\}\/"'`-]/.test(rightChar)) return false

    return true
}

function concatModelTextParts(parts: Part[]): string {
    return parts
        .filter((part) => typeof part.text === "string" && !!part.text && !part.thought)
        .map((part) => part.text || "")
        .reduce((mergedText, partText) => mergeStreamingTurnText(mergedText, partText), "")
}

export function mergeStreamingTurnText(existingText: string, incomingText: string): string {
    if (!incomingText) return existingText
    if (!existingText) return incomingText
    if (incomingText === existingText) return existingText
    if (incomingText.startsWith(existingText)) return incomingText
    if (existingText.startsWith(incomingText)) return existingText

    const maxOverlap = Math.min(existingText.length, incomingText.length)
    for (let overlapLength = maxOverlap; overlapLength > 0; overlapLength -= 1) {
        if (existingText.slice(-overlapLength) === incomingText.slice(0, overlapLength)) {
            return `${existingText}${incomingText.slice(overlapLength)}`
        }
    }

    const joiner = shouldInsertSpaceBetweenFragments(existingText, incomingText) ? " " : ""
    return `${existingText}${joiner}${incomingText}`
}

export function mergeModelTurnText(existingText: string, parts: Part[]): string {
    const incomingText = concatModelTextParts(parts)
    return mergeStreamingTurnText(existingText, incomingText)
}
