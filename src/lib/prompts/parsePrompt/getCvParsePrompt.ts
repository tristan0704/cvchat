// DATEIUEBERSICHT: Erzeugt den Parsing-Prompt fuer CV-PDFs.
export function getCvParsePrompt(text: string) {
    return `
You are extracting structured CV data.

Convert the resume text into ONE JSON object that follows this schema exactly:

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
  "projects": [
    {
      "name": "",
      "role": "",
      "summary": "",
      "impact": "",
      "tech": [],
      "links": []
    }
  ],
  "education": [],
  "languages": []
}

Rules:
- Include only information explicitly present in the text.
- Do not guess missing facts.
- Keep the response concise and clean.
- If information is missing, use empty strings ("") or empty arrays ([]).
- "skills" should contain short skill labels only.
- "experience[].tasks" should contain short bullet-like task statements.
- "experience[].keywords" should contain short technology/domain keywords from that role.
- "projects" should contain notable projects mentioned in the CV.
- "projects[].tech" should list technologies used in the project.
- "projects[].impact" should describe measurable outcomes or results.
- "projects[].links" should contain any URLs mentioned for the project.
- Keep original wording where possible; light cleanup for readability is fine.
- Output ONLY valid JSON.
- No explanations, no markdown.

RESUME TEXT:
${text}
`
}

