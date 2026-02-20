// DATEIUEBERSICHT: Erzeugt den Parsing-Prompt fuer Zertifikats-PDFs.
export function getCertificateParsePrompt(text: string) {
    return `
Extract certificate information from the text below.

Return ONLY a JSON object following this schema:

{
  "title": "",
  "issuer": "",
  "date": ""
}

Rules:
- Extract only what is explicitly stated.
- If a field is not present, leave it as "".
- Keep values short and clean (no extra commentary).
- If multiple certificate names appear, use the main/canonical title in "title".
- Do not invent missing details.
- Output ONLY valid JSON.

CERTIFICATE TEXT:
${text}
`
}

