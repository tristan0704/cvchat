import "server-only";

import { extractText } from "unpdf";

export async function pdfToText(buffer: Buffer) {
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  return result.text ?? "";
}
