# CommIT

CommIT ist eine KI-gestuetzte Interview- und Assessment-Plattform auf Basis von Next.js 16. Die Anwendung fuehrt Kandidat:innen durch einen zusammenhaengenden Bewerbungs-Flow aus Profilpflege, CV-Analyse, Voice-Interview, Coding Challenge und einer aggregierten Gesamtbewertung.

Diese README ist als Entwicklerdokumentation gedacht. Sie beschreibt nicht nur, was das Produkt macht, sondern wie die Anwendung auf Low Level aufgebaut ist, welche Daten wo liegen, wie Requests durch das System laufen und welche Architekturgrenzen im Code gelten.

## 1. Produktbild in einem Satz

CommIT simuliert technische Interview-Situationen fuer registrierte Nutzer:innen und speichert dabei strukturierte Ergebnisse aus mehreren Stufen:

- CV-Feedback
- Live-Interview mit Audio, Transcript, Timing und Face-Analyse
- Coding Challenge mit automatischer Bewertung
- zusammengefuehrtes Overall Feedback

## 2. Tech-Stack

- Next.js 16 mit App Router
- React 19
- TypeScript
- Prisma mit PostgreSQL fuer App-Daten
- Supabase fuer Auth, Session-Cookies und Storage
- Gemini Live / Google GenAI fuer Realtime-Interview und Audio-Transkription
- OpenAI Chat Completions fuer CV-, Interview-, Coding- und Overall-Analysen

## 3. Architektur auf einen Blick

CommIT ist in vier technische Schichten getrennt:

1. UI und Routing in `src/app` und `src/components`
2. browserseitige Orchestrierung und zustandsnahe Hooks in `src/lib`
3. serverseitige Fachlogik in `src/db-backend`
4. externe Systeme: Supabase, Postgres, Gemini, OpenAI

Der wichtige Grundsatz ist:

- UI-Komponenten sollen keine `db-backend`-Module direkt importieren
- Client-nahe Seiten sollen nicht direkt auf `db-backend` zugreifen
- API-Routen sind die HTTP-Grenze zwischen Browser und Serverlogik
- `db-backend` kapselt Datenzugriff und fachliche Persistenz

Diese Trennung wird teilweise ueber `.dependency-cruiser.js` abgesichert.

## 4. Verzeichnisstruktur

```text
src/
  app/                      Next.js App Router Seiten, Layouts und API-Routen
    (protected)/            authentifizierte App-Bereiche
    api/                    serverseitige Route Handler
    auth/                   Login, Register, Confirm, Reset, Signout
  components/               wiederverwendbare UI
    coding-challenge/       Editor, Feedback, Abschnittskomponenten
    cv/                     CV-Feedback-Dashboard
    interviews/             Voice-Step, Face-Panel, Interview-Feedback
    navigation/             Navbar und Landing Navigation
    profile/                Profilseite
    ui/                     kleine generische UI-Elemente
  lib/                      clientnahe und providernahe Logik
    coding-challenge/       Hooks, Typen, Manifest, Evaluations-Interfaces
    cv/                     CV-Typen und servernahe Analyse-Helfer
    interview-feedback/     Bewertungs- und Fingerprint-Logik
    interview-session/      React Context fuer den Interview-Flow
    interview-transcript/   Transcript-Normalisierung, Export, QA-Mapping
    interview-templates/    Template-Katalog fuer neue Interviews
    voice-interview/        Realtime-Audio-, Playback-, Transcript- und Sessionlogik
  db-backend/               serverseitige Fachlogik und Datenzugriff
    auth/                   Supabase SSR-Clients und Current-User-Sync
    coding-challenge/       Persistenz und Task-Zuweisung
    cv/                     CV-Service
    interviews/             Interview-, Template- und Overall-Feedback-Services
    prisma/                 Prisma Client und Schema
    profile/                Profil- und Avatar-Services
public/
  audio/                    vorproduzierte Host-Audios
  icons/                    statische Icons
prisma/
  migrations/               Prisma-Migrationshistorie
supabase/
  migrations/               SQL-Migrationen fuer lokales Supabase/Postgres-Setup
```

## 5. Routing-Modell

### Oeffentliche Bereiche

- `/` Landing Page
- `/auth/login`
- `/auth/register`
- `/auth/register/step2`
- `/auth/reset-password`
- `/auth/update-password`
- `/auth/confirm`
- `/auth/signout`

### Geschuetzte Bereiche

Unter `src/app/(protected)` liegen die eigentlichen App-Seiten:

- `/home`
- `/interviews`
- `/interviews/new`
- `/interviews/[id]`
- `/profile`
- `/settings`
- `/learn`

Das Layout in `src/app/(protected)/layout.jsx` erzwingt zwei Dinge:

- es muss ein authentifizierter App-User vorhanden sein
- der User braucht einen gesetzten `profile.username`

Wenn das nicht erfuellt ist, wird auf `/auth/login` oder `/auth/register/step2` umgeleitet.

## 6. Auth-, Session- und User-Modell

### Was Supabase macht

Supabase ist in diesem Projekt primaer fuer diese Bereiche zustaendig:

- E-Mail-/Passwort-Auth
- Session-Cookies
- serverseitige und browserseitige Auth-Clients
- Avatar-Storage ueber einen Bucket

### Was Prisma/Postgres macht

Die fachlichen App-Daten liegen nicht in Supabase Auth-Tabellen, sondern im Prisma-Datenmodell:

- `User`
- `Profile`
- `UserSettings`
- `CvVersion`
- `Interview`
- alle Transcript-, Feedback-, Face- und Coding-Challenge-Tabellen

### Wie beide Welten zusammenkommen

Der zentrale Einstieg ist `getCurrentAppUser()` in [src/db-backend/auth/current-app-user.ts](/C:/Users/trist/WebstormProjects/careerpitch/src/db-backend/auth/current-app-user.ts).

Ablauf:

1. ueber den Supabase SSR-Client wird `supabase.auth.getUser()` gelesen
2. wenn ein authentifizierter Supabase-User existiert, wird lokal per Prisma sichergestellt, dass folgende Datensaetze existieren:
   `User`, `UserSettings`, `Profile`
3. die App arbeitet danach mit dieser kombinierten Sicht weiter

Das bedeutet:

- Supabase ist die Identitaetsquelle
- Prisma ist die fachliche Persistenz fuer die Anwendung

### Session Refresh

`src/proxy.ts` ruft `updateSession()` aus `src/db-backend/auth/session-proxy.ts` auf. Diese Proxy-Schicht aktualisiert Supabase-Session-Cookies fuer eingehende Requests. Server Components koennen Cookies nicht immer selbst setzen, deshalb wird Refresh-Logik bewusst auf diese Ingress-Schicht verlagert.

## 7. Datenmodell auf Low Level

Das Prisma-Schema liegt in [src/db-backend/prisma/schema.prisma](/C:/Users/trist/WebstormProjects/careerpitch/src/db-backend/prisma/schema.prisma).

### Kernmodelle

- `User`: lokaler App-User mit derselben UUID wie `auth.users`
- `Profile`: Username und Avatar-Pfad
- `UserSettings`: Sprache und Benachrichtigungen
- `CvVersion`: hochgeladene CV-Versionen, aktuell inklusive extrahiertem Text
- `CvFeedbackAnalysis`: pro CV und Interview-Konfiguration gespeicherte Analyse
- `Interview`: Wurzelobjekt des mehrstufigen Flows
- `InterviewPlannedQuestion`: die beim Anlegen eingefrorene Fragenliste
- `InterviewTranscript`: persistierter Transcript-Zustand und Export
- `InterviewTranscriptEntry`: einzelne Sprecherturns
- `InterviewTranscriptQaPair`: Frage/Antwort-Paare fuer spaetere Auswertung
- `InterviewTimingMetrics`: Antwortdauer, Latenzen, WPM
- `InterviewFeedback`: GPT-Auswertung des Interviews
- `InterviewFaceAnalysis`: heuristische Face-/Body-Language-Auswertung
- `InterviewOverallFeedback`: aggregierte Gesamtbewertung
- `CodingChallengeTask`: Aufgabenpool
- `CodingChallengeTaskSolution`: Referenzloesung pro Aufgabe
- `CodingChallengeAttempt`: konkrete Aufgabe in einem Interview
- `CodingChallengeEvaluation`: Bewertung einer abgegebenen Loesung

### Interview-Status

`Interview.status` kennt aktuell:

- `draft`
- `ready`
- `in_progress`
- `analyzing`
- `completed`
- `failed`
- `archived`
- `cancelled`

Im aktiven UI-Flow werden vor allem `ready`, `in_progress` und `completed` genutzt. Die aktuelle Step-Gating-Logik sitzt in `interview-service.ts` und auf der Detailseite des Interviews.

### Transcript-Status

Fuer `InterviewTranscript` gibt es zwei getrennte Statusachsen:

- `transcriptStatus`: `idle`, `recording`, `transcribing`, `ready`, `error`
- `recapStatus`: `idle`, `recording`, `ready`, `error`

Das ist wichtig, weil Transcript und Replay-Aufnahme getrennt verarbeitet werden.

## 8. API-Schicht

Die API-Routen liegen unter `src/app/api/**/route.ts`. Die meisten davon folgen demselben Muster:

1. `getCurrentAppUser()` pruefen
2. Request-Daten validieren
3. in `db-backend` oder `lib` delegieren
4. JSON-Response zurueckgeben

### Wichtige Routen

- `/api/home/summary`: Dashboard-Snapshot
- `/api/profile`: Profil lesen und aktualisieren
- `/api/profile/avatar`: Avatar hochladen
- `/api/profile/cv`: CV hochladen und aktiven CV liefern
- `/api/settings`: UserSettings lesen und schreiben
- `/api/account`: Account-Loeschung
- `/api/interviews/config`: Template-Katalog fuer neues Interview
- `/api/interviews`: Interviews listen und erstellen
- `/api/interviews/[id]`: Interview laden, Step speichern, Interview loeschen
- `/api/interviews/[id]/timing`: Timing-Metriken persistieren
- `/api/interview/cv-feedback`: CV-Analyse fuer ein Interview
- `/api/gemini/live-token`: einmaliges Live-Token fuer Gemini
- `/api/interview/transcript`: Transcript speichern und Post-Call-Transkription
- `/api/interview/interview-feedback`: GPT-Interviewbewertung
- `/api/interview/face-analysis`: Face-Landmark-Auswertung
- `/api/interview/coding-challenge`: Aufgabe laden, Draft speichern, Loesung bewerten
- `/api/interview/overall-feedback`: Gesamtfeedback ueber alle Steps

## 9. Interview-Flow Ende-zu-Ende

Die wichtigste Produktachse ist das Interview unter `/interviews/[id]`.

### 9.1 Interview anlegen

Die Seite `/interviews/new` laedt den Template-Katalog ueber `/api/interviews/config`.

Templates kommen nicht aus der Datenbank, sondern aktuell aus dem Katalog in [src/lib/interview-templates/catalog.ts](/C:/Users/trist/WebstormProjects/careerpitch/src/lib/interview-templates/catalog.ts):

- Rollen: Frontend, Backend, Fullstack
- Experience-Level: Junior, Mid, Senior
- Company Sizes: Startup, Mittelstand, Konzern

Beim POST auf `/api/interviews` passiert Folgendes:

- Template wird geladen
- aktiver CV des Users wird gesucht
- `Interview` wird angelegt
- geplante Fragen werden als `InterviewPlannedQuestion[]` persistiert

Wichtig: Die Fragen werden beim Erstellen eingefroren. Das Interview arbeitet danach mit der gespeicherten Frageplanung, nicht mit einem spaeter geaenderten globalen Pool.

### 9.2 Step 1: CV Feedback

Der CV-Step lebt in `CvFeedbackStep.tsx` und ruft `/api/interview/cv-feedback`.

Der Service:

- sucht das Interview
- nimmt den mit dem Interview verknuepften CV oder den aktuell aktiven CV
- reused eine bestehende `CvFeedbackAnalysis`, wenn dieselbe Konfiguration schon analysiert wurde
- erzeugt nur bei Bedarf eine neue Analyse

Die CV-Auswertung kombiniert zwei Signale:

- Keyword-/Rollenmatch
- LLM-Qualitaetsbewertung

Die zusammengefuehrte Analyse wird in `CvFeedbackAnalysis` gespeichert und mit dem Interview verknuepft.

### 9.3 Step 2: Voice Interview

Der Voice-Step verwendet `InterviewSessionProvider` aus `src/lib/interview-session/context.tsx`. Dieser Context haelt:

- `interviewId`
- `role`
- Interview-Konfiguration
- geplante Fragen
- kompletten Voice-Controller

Der eigentliche Orchestrator ist `useVoiceInterviewController()` in `src/lib/voice-interview/session/use-voice-interview-controller.ts`.

Darunter sind mehrere spezialisierte Hooks aufgeteilt:

- `useVoiceSessionLifecycle`
- `useVoiceCapture`
- `useHostPlayback`
- `useVoiceTranscript`
- `useVoiceTiming`
- `useVoiceEndgame`

Diese Trennung ist wichtig, weil hier die komplexeste Lifecycle-Logik des Projekts liegt.

### 9.4 Start des Realtime-Calls

Beim Start:

1. Browser validiert Secure Context, Mikrofon und Recorder-Support
2. Client holt ueber `/api/gemini/live-token` ein einmal verwendbares Token
3. `GoogleGenAI.live.connect()` startet die Session
4. Mikrofon-Stream wird an Gemini uebergeben
5. lokaler Host spielt fixe Intro-/Startphrasen aus `public/audio/voice-host/**`
6. der eigentliche Interviewfluss laeuft dann live weiter

Die Live-System-Instruktion wird serverseitig in `src/lib/voice-interview/server/live-token.ts` gebaut. Dort wird dem Modell gesagt:

- nur Deutsch sprechen
- keine eigene Begruessung und keine eigene Verabschiedung
- pro Turn genau eine Frage
- Kernfragen bevorzugt in geplanter Reihenfolge verwenden

### 9.5 Transcript-Verarbeitung

Waehrend des Calls sammelt der Client Transcript-Fragmente. Nach dem Call wird die Kandidatenaufnahme an `/api/interview/transcript` geschickt.

Die Route:

- laedt die Audiodatei zu Gemini hoch
- transkribiert den Kandidatenteil
- versucht Frage/Antwort-Paare aus Interviewerfragen und Transcript zu mappen
- baut daraus einen strukturierten Export
- persistiert `InterviewTranscript`, `InterviewTranscriptEntry` und `InterviewTranscriptQaPair`

Wenn die externe Transkription fehlschlaegt, gibt es einen Fallback:

- aus bereits vorhandenen Candidate-Turns wird ein minimales Transcript rekonstruiert

### 9.6 Timing-Metriken

Parallel zur Transcript-Schicht werden lokale Timing-Signale gesammelt:

- Anzahl Antworten
- gesamte Kandidaten-Sprechzeit
- durchschnittliche Antwortlaenge
- kuerzeste und laengste Antwort
- durchschnittliche und laengste Reaktionslatenz
- geschaetzte Words per Minute

Persistiert wird ueber `/api/interviews/[id]/timing`.

### 9.7 Face-Analyse

Die Face-Erfassung passiert ueber das Face-Landmark-Panel im Voice-Step. Nach Call-Ende wird eine regelbasierte Analyse erzeugt und optional ueber `/api/interview/face-analysis` persistiert.

Die Logik in [src/lib/face-analysis.ts](/C:/Users/trist/WebstormProjects/careerpitch/src/lib/face-analysis.ts) berechnet:

- Gesicht im Frame
- frontale Ausrichtung
- Kopfbewegung
- Sprechaktivitaet
- Blinkrate
- stabile Zeitfenster

Das ist bewusst heuristisches Coaching-Feedback und keine Hiring-Entscheidungslogik.

### 9.8 Step 3: Interview Feedback

Sobald `transcriptExport` verfuegbar ist, startet die Interviewbewertung ueber `/api/interview/interview-feedback`.

Die eigentliche Auswertung:

- liegt in `evaluate-interview-feedback.ts`
- nutzt OpenAI
- bewertet Kommunikation, Antwortqualitaet und Rollenfit
- speichert das Ergebnis als `InterviewFeedback`

### 9.9 Step 4 und 5: Coding Challenge

Die Coding-Challenge wird erst freigeschaltet, wenn Interview-Feedback existiert.

Der Service in `coding-challenge-service.ts`:

- seeded Tasks aus `src/lib/coding-challenge/tasks.json`, falls noetig
- waehlt rollennahe Aufgaben
- legt `CodingChallengeAttempt` an
- speichert Draft-Code automatisch
- bewertet finale Submissions ueber OpenAI und persistiert `CodingChallengeEvaluation`

### 9.10 Step 6: Overall Feedback

Der letzte Step aggregiert:

- CV-Score und CV-Summary
- Interview-Score und Interview-Summary
- Coding-Challenge-Score und Summary

Wenn alle drei Quellen vorhanden sind, wird ueber `overall-feedback-service.ts` ein Gesamtfeedback erzeugt und als `InterviewOverallFeedback` gespeichert.

## 10. Step-Gating und Zustandsuebergaenge

Die Detailseite fuer Interviews laedt das komplette Interviewobjekt und berechnet daraus den maximal zugaenglichen Step.

Aktuelle Freischaltung:

1. Step 1 ist immer erreichbar
2. Step 2 erst, wenn CV-Feedback existiert
3. Step 3 erst, wenn Transcript-Verarbeitung begonnen oder abgeschlossen wurde
4. Step 4 erst, wenn Interview-Feedback existiert
5. Step 5 bzw. 6 erst, wenn Coding-Evaluation vorhanden ist

Wichtig:

- die UI hat eigenes Locking fuer laufende Voice- und Analysephasen
- die Serverlogik clampt ungueltige Step-Updates auf den maximal erlaubten Step

## 11. KI-Integrationen

### Gemini

Gemini wird fuer zwei verschiedene Aufgaben benutzt:

- Live-Interview ueber ein kurzlebiges Auth-Token
- Post-Call-Audio-Transkription inklusive QA-Mapping

Wichtige Dateien:

- [src/lib/voice-interview/server/live-token.ts](/C:/Users/trist/WebstormProjects/careerpitch/src/lib/voice-interview/server/live-token.ts)
- [src/lib/interview-transcript/server/transcribe-candidate-audio.ts](/C:/Users/trist/WebstormProjects/careerpitch/src/lib/interview-transcript/server/transcribe-candidate-audio.ts)

### OpenAI

OpenAI wird ueber den gemeinsamen Wrapper in [src/lib/openai.ts](/C:/Users/trist/WebstormProjects/careerpitch/src/lib/openai.ts) angesprochen.

Der Wrapper standardisiert:

- Timeout
- Fehlerformat
- Request-Struktur

Aktuelle OpenAI-Anwendungsfaelle:

- CV-Qualitaetsanalyse
- Interview-Feedback
- Coding-Challenge-Bewertung
- Overall Feedback

## 12. Supabase-Rolle im System

Supabase ist bewusst nicht der Ort fuer die gesamte Geschaeftslogik, sondern fuer Plattformthemen:

- Auth
- Session
- Avatar-Storage

### Browser- und Server-Clients

- `src/db-backend/auth/browser-client.ts`
- `src/db-backend/auth/server-client.ts`

### Env-Alias-Mechanik

`src/db-backend/env.ts` mappt mehrere moegliche Variablennamen auf die erwarteten Runtime-Namen. Dadurch akzeptiert das Projekt sowohl klassische `.env.local`-Variablen als auch gewisse Vercel-/Integration-Aliase.

Wichtige Konsequenz:

- Dokumentation und Debugging sollten immer zuerst mit den finalen Namen arbeiten:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `DIRECT_URL`

### Lokales Supabase

Unter `supabase/config.toml` liegt ein lokales Supabase-Setup fuer Entwicklung. Das ist fuer lokale Auth-/Storage-/Postgres-nahe Flows relevant, ersetzt aber nicht das Prisma-Schema als Source of Truth fuer die App-Modelle.

## 13. Entwicklungsworkflow

### Voraussetzungen

- Node.js 20+
- npm
- Postgres-kompatible Datenbank
- Supabase-Projekt oder lokales Supabase-Setup
- `GEMINI_API_KEY`
- fuer OpenAI-Analysen: `OPENAI_API_KEY`

### Installation

```bash
npm install
```

### Lokale Entwicklung

```bash
npm run dev
```

### Wichtige Scripts

```bash
npm run lint
npm run typecheck
npm run build
npm run start
npm run prisma:generate
npm run prisma:validate
npm run prisma:studio
```

## 14. Umgebungsvariablen

Mindestens relevant sind:

```env
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
GEMINI_API_KEY="..."
OPENAI_API_KEY="..."
```

Hinweise:

- Secrets gehoeren in `.env.local`
- `prisma.config.ts` laedt `.env.local` explizit
- `applyEnvAliases()` setzt fehlende Standardnamen aus Aliasen nach

## 15. Persistenz- und Concurrency-Details

Einige Schreibpfade sind absichtlich abgesichert:

- Transcript-Persistenz nutzt advisory locks
- Coding-Challenge-Zuweisung nutzt advisory locks

Grund:

- Voice-, Transcript- und Feedback-Pfade koennen durch Polling, Retries oder parallele Requests mehrfach getriggert werden
- die Anwendung soll pro Interview konsistente Einzeldatensaetze behalten

## 16. Bekannte Architekturentscheidungen

- Die App mischt noch `.jsx`, `.tsx`, `.ts` und einzelne `.js`-Dateien. Das ist historisch gewachsen und kein vollstaendig vereinheitlichter TS-Only-Stand.
- Die neue Interview-Erstellung spricht in der UI von einer "DB-gestuetzten Konfiguration", die Templates kommen aktuell aber aus einem In-Memory-Katalog in `lib`.
- CV-Dateien werden derzeit nicht als Primarquelle im Storage verarbeitet, sondern als PDF gelesen und der extrahierte Text in `CvVersion` gespeichert.
- Die Face-Analyse ist ein Coaching-Signal, keine robuste verhaltenswissenschaftliche Bewertung.
- Die Voice-Pipeline ist lifecycle-sensitiv. Cleanup von MediaStreams, Session-Objekten, Timern und Playback ist hier wichtiger als in normalen Formularflows.

## 17. Verifikation

Es gibt aktuell keine dedizierte Testsuite. Die minimale technische Abnahme ist:

```bash
npm run lint
npm run typecheck
npm run build
```

Zusaetzlich sinnvoll bei Aenderungen an Interview-, Audio- oder Video-Flows:

- manueller Browser-Durchlauf
- Starten eines Interviews
- Voice-Session aufbauen und sauber beenden
- Transcript- und Feedback-Step pruefen
- Coding-Challenge laden und absenden

## 18. Einstieg fuer neue Developer

Wenn du das Projekt zum ersten Mal oeffnest, arbeite in dieser Reihenfolge:

1. `package.json` lesen, um Runtime und Scripts zu verstehen
2. `src/app/(protected)/interviews/[id]/page.tsx` lesen, weil dort der Hauptflow zusammenlaeuft
3. `src/lib/interview-session/context.tsx` und `src/lib/voice-interview/session/*` lesen, um den komplexesten Client-Teil zu verstehen
4. `src/db-backend/interviews/interview-service.ts` lesen, weil dort das Interview-Aggregat zusammengebaut wird
5. `src/db-backend/prisma/schema.prisma` lesen, um die Persistenzstruktur zu verankern
6. danach einzelne Verticals isoliert ansehen: CV, Transcript, Face, Coding, Overall Feedback

## 19. Status

Das Projekt ist kein einfacher MVP mehr. Die zentrale technische Herausforderung ist inzwischen nicht das Rendern einzelner Screens, sondern das stabile Zusammenspiel aus:

- Auth und App-User-Sync
- mehrstufigem Interview-State
- Realtime-Audio-Lifecycle
- persistierten Analyseergebnissen
- mehrfachen KI-Providern

Wer an CommIT arbeitet, sollte deshalb Aenderungen bevorzugt entlang bestehender Schichtgrenzen vornehmen und besonders vorsichtig mit Realtime-, Lifecycle- und Persistenzlogik umgehen.
