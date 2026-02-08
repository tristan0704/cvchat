# CVChat

Kurze Beschreibung: Dieses Projekt verwandelt eine komplette Bewerbung in einen privaten, teilbaren Chat. Nutzer laden CV, Zeugnisse, Referenzen und Notizen hoch; Recruiter stellen Fragen und erhalten Antworten, die ausschließlich auf den hochgeladenen Unterlagen basieren.

**Features**
- Upload von CV (PDF) plus zusätzliche Dokumente (Referenzen, Zertifikate, Notizen, Profilbild)
- PDF-Parsing und strukturierte Extraktion des CVs via OpenAI
- Speicherung der Daten in PostgreSQL (Prisma)
- Chat-UI mit „shareable link“ für Recruiter
- Antworten sind auf den Dokumenten-Kontext begrenzt (kein Halluzinieren)

**Tech Stack**
- Next.js (App Router), React 19, TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Supabase Storage (Profilbild)
- OpenAI API (CV-Parsing + Q&A)

**Projektstruktur (Kurz)**
- `src/app/home`: Landing Page
- `src/app/upload`: Upload-Flow
- `src/app/cv/[token]`: Chat-UI für einen CV-Token
- `src/app/api/upload`: Upload + Parsing + Persistenz
- `src/app/api/chat`: Q&A über den gespeicherten Kontext
- `src/app/api/cv/[token]`: Metadaten (Name, Rolle, Summary, Bild)
- `prisma/`: Schema und Migrationen

**Lokales Setup**
1. Abhängigkeiten installieren:
   - `npm install`
2. Umgebungsvariablen setzen:
   - `.env` (für Prisma/Postgres)
   - `.env.local` (für OpenAI + Supabase)
3. Datenbank migrieren:
   - `npx prisma migrate dev`
4. Dev-Server starten:
   - `npm run dev`

**Erforderliche Umgebungsvariablen**
- `DATABASE_URL` (PostgreSQL Connection String)
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Supabase Storage**
- Erwarteter Bucket: `cv-images`
- Wird für das Profilbild genutzt (`uploadProfileImage.ts`)

**Wichtige Hinweise**
- Nur textbasierte PDFs werden unterstützt (gescannte PDFs ohne OCR werden abgewiesen).
- API-Aufrufe nutzen aktuell das OpenAI-Modell `gpt-4o-mini`.
- Bitte keine Secrets ins Repo committen.

**Nützliche Commands**
- `npm run dev` (lokale Entwicklung)
- `npm run build` (Production Build)
- `npm run start` (Production Start)
- `npm run lint` (Linting)
