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
- Only extract what is explicitly stated.
- If a field is not present, leave it empty.
- Do not infer or guess.
- Output ONLY valid JSON.

CERTIFICATE TEXT:
${text}
`
}
