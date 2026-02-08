export function getCvParsePrompt(text: string) {
    return `
You are extracting structured CV data.

Convert the following resume text into a JSON object that STRICTLY follows this schema:

{
  "person": {
    "name": "",
    "title": "",
    "location": "",
    "summary": ""
  },
  "skills": [],
  "experience": [
    {
      "organization": "",
      "role": "",
      "start": "",
      "end": "",
      "tasks": [],
      "keywords": []
    }
  ],
  "education": [],
  "languages": []
}

Rules:
- Only include information explicitly present in the text.
- Do NOT infer, normalize, or guess.
- If information is missing, leave fields empty.
- Output ONLY valid JSON.
- No explanations, no markdown.

RESUME TEXT:
${text}
`
}
