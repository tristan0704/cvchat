export function getParsePrompt(text: string) {
    return `
You are extracting structured CV data.

Convert the following resume text into a JSON object that strictly follows this schema:

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
  "certificates": [],
  "languages": []
}

Rules:
- Only include information explicitly present in the text.
- If information is missing, leave fields empty.
- Do not invent or infer data.
- Output ONLY valid JSON.

RESUME TEXT:
${text}
`
}
