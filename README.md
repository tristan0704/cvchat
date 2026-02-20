# CareerIndex MVP

CareerIndex ist ein Next.js-basiertes MVP fuer evidenzbasierte Karriereprofile.
Nach dem Upload wird ein Dashboard erstellt, von dem zwei recruiter-taugliche Ansichten exportiert werden koennen:

- Public Profile mit Chatbot (`/u/[publicSlug]`)
- Pitch/Case-Study Seite mit PDF-Export (`/u/[publicSlug]/pitch`)

## Aktueller Scope

### Enthalten
- Login/Registrierung mit Session-Cookie
- Upload von:
  - CV (Pflicht, PDF)
  - Zertifikate (optional, PDF)
  - Profilbild (optional)
  - Zusatztext (optional)
- CV-Parsing und Zertifikat-Parsing via OpenAI
- Dashboard fuer Profil-Management und Export-Links
- Public-Slug Webinterface mit Chatbot
- Pitch-Seite mit `window.print()` PDF-Export

### Nicht enthalten (bewusst)
- Publish/Unpublish-Workflow
- Share-Token-Flow
- Event-Tracking / Analytics-Tabelle
- Voller Projekt-Upload (nur Placeholder vorhanden, als `BAUSTELLE` markiert)

## Tech Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- OpenAI Chat Completions API
- Supabase Storage (Profilbild)

## Projektstruktur (wichtigste Bereiche)

- `src/app/upload/page.tsx`
  - Upload-Flow (CV/Zertifikate/Bild/Zusatztext)
  - Projekt-Upload Placeholder (`BAUSTELLE`)
- `src/app/cv/[token]/page.tsx`
  - User-Dashboard nach Upload
  - Export zu Public Profile + Pitch
- `src/app/u/[publicSlug]/page.tsx`
  - Public recruiter interface mit Chatbot
- `src/app/u/[publicSlug]/pitch/page.tsx`
  - Pitch/Case-Study Seite mit PDF-Export
- `src/app/api/upload/route.ts`
  - Parsing + Persistenz der Upload-Daten
- `src/app/api/public-profile/[publicSlug]/route.ts`
  - Liefert Public-Profil-Daten fuer beide Exporte
- `src/app/api/public-chat/route.ts`
  - Chatbot ueber strukturierte Profildaten
- `src/lib/profileContext.ts`
  - Zentrale Daten-Normalisierung fuer UI + Chat
- `prisma/schema.prisma`
  - Datenmodell (MVP-vereinfacht)

## Installation und Start

### Voraussetzungen
- Node.js 20+
- PostgreSQL
- OpenAI API Key
- Supabase Projekt (nur wenn Bild-Upload genutzt wird)

### 1. Dependencies

```bash
npm install
```

### 2. Environment

`.env` (DB):

```env
DATABASE_URL="postgresql://..."
```

`.env.local` (App/API):

```env
OPENAI_API_KEY="..."
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### 3. Datenbank Migration

```bash
npx prisma migrate dev
```

### 4. Development Server

```bash
npm run dev
```

App startet standardmaessig auf `http://localhost:3000`.

### 5. Typecheck und Build

```bash
npm run typecheck
npm run build
```

## Empfohlene Parallelisierung (4er Team)

1. API/LLM Pipeline
- `src/app/api/upload/route.ts`
- `src/app/api/public-chat/route.ts`
- Robustere Validierung, Fehlerpfade, Prompt-Iteration

2. Dashboard + Upload UX
- `src/app/upload/page.tsx`
- `src/app/cv/[token]/page.tsx`
- Wizard-UX, Statusanzeigen, bessere Fehlertexte

3. Public Profile + Pitch UI
- `src/app/u/[publicSlug]/page.tsx`
- `src/app/u/[publicSlug]/pitch/page.tsx`
- Recruiter-Readability, Print-Layout, mobile polishing

4. Data/Platform
- `prisma/schema.prisma`
- `src/lib/profileContext.ts`
- Migrations, Datenkonsistenz, klare DTOs fuer spaetere Features

## Groesste BAUSTELLEN (naechste Schritte)

1. Projekt-Upload als echtes Modul
- Aktuell nur Placeholder in Upload und im gespeicherten Zusatztext.
- Ziel: strukturierter Projekt-Input + Repo/Artefakt-Verknuepfung.

2. Export-/Freigabe-Strategie
- Aktuell ist Public Export ueber `publicSlug` auf latest CV.
- Ziel: versionierte Snapshots + gezielte Freigabe pro Export.

3. Chat-Qualitaet und Grounding
- Ziel: bessere Quellenzitate, Guardrails und Antwortqualitaet je Rollenkontext.

## Hinweise fuer Contributor

- `BAUSTELLE` ist bewusst als gelber Marker in UI gesetzt.
- `profileContext.ts` ist die zentrale Stelle fuer Daten-Mapping. Neue Felder zuerst dort sauber modellieren.
- Erst Datenmodell/API stabilisieren, dann UI feinschleifen.

