# CareerIndex MVP

CareerIndex erzeugt aus CV-Daten ein recruiter-taugliches Profil mit zwei Exportansichten:

- Public Profile mit Chatbot: `/u/[publicSlug]`
- Pitch/PDF Seite: `/u/[publicSlug]/pitch`

## Produktfluss

1. User registriert sich / loggt sich ein.
2. Onboarding-Upload (`/upload`): CV (Pflicht), Zertifikate/Bild/Zusatztext (optional).
3. Dashboard (`/cv/[token]`): Profilpflege + Exportlinks.
4. Recruiter nutzt Public Profile (Overview + Projekte + Chatbot) oder Pitch-PDF.

## Aktueller Scope

### Enthalten
- Auth (Register/Login/Session)
- CV + Zertifikats-Parsing mit OpenAI
- Persistenz via Prisma/PostgreSQL
- Public-Slug Exportseiten
- PDF-Export ueber Browser-Print

### Bewusst als BAUSTELLE
- Projekt-Upload ist nur Placeholder im Onboarding
- Analyse-/Scoring-Layer (Skill Score, Skill Gaps, Verbesserungsvorschlaege)
- Snapshot-/Freigabelogik fuer Exporte (aktuell immer latest CV pro publicSlug)

## Tech Stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- OpenAI API
- Supabase Storage (Profilbild)

## Wichtige Dateien

- `src/app/upload/page.tsx`
  - Onboarding-Upload + Projekt-Placeholder
- `src/app/cv/[token]/page.tsx`
  - Dashboard + Exportsteuerung + Analyse-BAUSTELLE
- `src/app/u/[publicSlug]/page.tsx`
  - Public Profile (Person, Projekte, Chat)
- `src/app/u/[publicSlug]/pitch/page.tsx`
  - Pitch/PDF Layout
- `src/app/api/upload/route.ts`
  - Upload-Verarbeitung + Parsing + Persistenz
- `src/app/api/public-profile/[publicSlug]/route.ts`
  - Datenquelle fuer Public-Ansichten
- `src/app/api/public-chat/route.ts`
  - Chatbot-Antworten auf Profilbasis
- `src/lib/profileContext.ts`
  - Zentrale Daten-Normalisierung (UI + Chat)

## Setup

### Voraussetzungen
- Node.js 20+
- PostgreSQL
- OpenAI API Key
- Supabase (wenn Bild-Upload genutzt wird)

### Installation

```bash
npm install
```

### Environment

`.env`:

```env
DATABASE_URL="postgresql://..."
```

`.env.local`:

```env
OPENAI_API_KEY="..."
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### Migration + Start

```bash
npx prisma migrate dev
npm run dev
```

### Quality Checks

```bash
npm run typecheck
npm run build
```

## Team-Parallelisierung (4 Personen)

1. API/LLM
- `src/app/api/upload/route.ts`
- `src/app/api/public-chat/route.ts`

2. Dashboard + Analyse
- `src/app/cv/[token]/page.tsx`
- Ausbau der Analyse-BAUSTELLE

3. Public UI
- `src/app/u/[publicSlug]/page.tsx`
- `src/app/u/[publicSlug]/pitch/page.tsx`

4. Datenmodell
- `prisma/schema.prisma`
- `src/lib/profileContext.ts`

## Hinweis zu Kommentaren

Im Code sind an den Kernstellen kurze deutsche Entwickler-Kommentare gesetzt. Diese markieren:
- die aktuelle Produktlogik,
- die zentralen Datenfluesse,
- und wo BAUSTELLEN als naechstes erweitert werden.
