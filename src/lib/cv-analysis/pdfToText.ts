import { extractText } from "unpdf"

export async function pdfToText(buffer: Buffer): Promise<string> {
    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError("pdfToText expects a Buffer")
    }

    const result = await extractText(new Uint8Array(buffer), { mergePages: true })
    return result.text ?? ""
}
