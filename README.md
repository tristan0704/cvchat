# CareerPitch

Minimaler Hiring-Flow fuer den aktuellen MVP.

## Flow

1. Startseite
2. Rolle waehlen
3. CV Upload
4. Screening
5. Interview
6. Interview Feedback
7. Coding Challenge
8. Coding Feedback
9. Gesamtanalyse

## Aktueller Stand

Enthalten:
- einfacher Next.js Flow
- Upload mit einfacher PDF-Validierung
- Interview-API als GPT-Wrapper
- Placeholder fuer Screening, Feedback und Analyse

Nicht enthalten:
- Datenbank
- Auth
- Persistenz
- echtes CV-Parsing
- echtes Scoring
- echte Hiring-Entscheidung

## Wichtige Dateien

- `src/app/home/page.tsx`
- `src/app/simulate/new/page.tsx`
- `src/app/upload/page.tsx`
- `src/app/simulate/screening/page.tsx`
- `src/app/simulate/interview/page.tsx`
- `src/app/simulate/interview-feedback/page.tsx`
- `src/app/simulate/coding/page.tsx`
- `src/app/simulate/coding-feedback/page.tsx`
- `src/app/simulate/analysis/page.tsx`
- `src/app/api/upload/route.ts`
- `src/app/api/simulate/interview/route.ts`

## Setup

```bash
npm install
npm run dev
```

## Environment

Nur fuer den Interview-API-Call noetig:

```env
OPENAI_API_KEY="..."
```

## Checks

```bash
npm run typecheck
npm run build
```
