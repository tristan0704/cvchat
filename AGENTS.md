# Repository Guidelines

## Project Scope
CareerPitch is an AI-driven interview and assessment platform focused on realistic interview simulation and skill evaluation. Optimize for quality, clarity, and maintainability over fast feature output.

## Project Structure & Module Organization
This is a Next.js 16 App Router project in TypeScript. Routes and API handlers live in `src/app`, including interview pages under `src/app/simulate/**` and server routes in `src/app/api/**/route.ts`. Reusable UI belongs in `src/components`, with interview-specific UI in `src/components/interview`. Shared logic belongs in `src/lib` such as `audio.ts`, `interview.ts`, and `face-analysis.ts`. Static assets live in `images/`.

## Required Workflow
Before making any code change, explain what will change, why it is needed, and which files or modules are affected. Wait for approval before implementing, especially for bug fixes or refactors. Do not make silent changes or large rewrites without prior agreement.

## Engineering Rules
Prefer simple, readable solutions over clever ones. Keep functions and components focused on a single responsibility. Preserve separation of concerns: UI in components, logic in hooks/services/lib, and external integrations in API or SDK-facing modules. When touching code, remove dead branches, reduce duplication, improve unclear names, and simplify logic without expanding scope unnecessarily.

## Realtime, Audio, and Video Safety
This codebase uses realtime interview flows. Be careful with lifecycle cleanup, reconnect logic, async race conditions, duplicate streams, and dangling listeners. Clean up intervals, listeners, and media streams on teardown. Avoid recreating heavy clients or sessions unless necessary.

## Build, Lint, and Verification Commands
Use `npm run dev` for local development. Use `npm run lint` for ESLint, `npm run typecheck` for TypeScript validation, `npm run build` for a production build, and `npm run start` to serve the built app. There is no dedicated automated test suite yet, so `lint`, `typecheck`, and `build` are the minimum verification gate. For interview or media changes, also do a manual browser pass.

## Coding Style & Naming
Follow the existing TypeScript and React style: 4-space indentation, double quotes, and no unnecessary comments. Comment only to explain why or important assumptions. Use descriptive names such as `interviewSession`, `audioStreamManager`, or `evaluationResult`; avoid names like `data`, `value`, or `temp`.

## Commits, PRs, and Configuration
Keep commit subjects short and imperative, optionally scoped like `refactor: split face metrics helper` or `fix: handle empty transcript response`. PRs should summarize the behavior change, list validation performed, and include screenshots for UI changes. Store secrets in `.env.local`; never commit API keys such as `GEMINI_API_KEY`.