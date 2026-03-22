# CODEX.md

## 🧠 Purpose

This project builds an AI-driven interview and assessment platform focused on:
- realistic interview simulation
- project-based deep dive interviews
- skill evaluation and improvement

The goal is high-quality, maintainable, and scalable code, not quick hacks.

---

## ⚠️ Core Rule (VERY IMPORTANT)

Before making ANY change:

1. Explain clearly:
    - What you are going to do
    - Why you are doing it
    - What parts of the code will be affected

2. Wait for confirmation.

3. Only proceed after explicit approval.

❌ Do NOT:
- modify files immediately
- assume intent
- implement without explanation

---

## 🧩 General Engineering Principles

### 1. Simplicity over complexity
- Prefer simple, readable solutions over clever ones
- Avoid overengineering
- Keep functions small and focused

### 2. Maintainability first
- Code should be easy to understand for new developers
- Use clear naming (no abbreviations unless obvious)
- Keep logic predictable and consistent

### 3. Single Responsibility
- Each function/component should do ONE thing well
- Split large components into smaller units

---

## 🧱 Code Structure

### Separation of concerns
- UI (components)
- logic (hooks / services)
- integrations (API / SDK / external systems)

Avoid mixing all in one file.

---

## 🔁 Refactoring Rules

When touching code:
- remove dead or unused code
- reduce duplication
- improve naming if unclear
- simplify logic if possible

But:
❗ Do NOT rewrite large parts unless necessary  
❗ Always explain before refactoring

---

## 🚀 Performance Guidelines

- Avoid unnecessary re-renders
- Be careful with useEffect, useMemo, useCallback
- Clean up:
    - event listeners
    - intervals
    - media streams
- Avoid recreating heavy objects (clients, sessions)

---

## 🎧 Audio / Video / Realtime Rules

This project uses realtime systems.

Be especially careful with:
- lifecycle management
- cleanup on unmount
- reconnect logic
- async race conditions

Always ensure:
- no memory leaks
- no duplicate streams
- no dangling listeners

---

## 🐛 Bug Fixing Approach

When fixing a bug:

1. Explain:
    - what the bug is
    - why it happens

2. Propose a fix

3. Wait for confirmation

4. Then implement

---

## 🧪 Testing Mindset

- Think about edge cases
- Handle null / undefined safely
- Consider:
    - network failure
    - user interruption
    - permission denial
    - partial data

---

## 🧾 Comments & Documentation

- Only comment where needed
- Focus on:
    - WHY something is done
    - non-obvious logic
    - important assumptions

Avoid obvious comments like:
❌ "set variable to 5"

---

## 🧠 Naming Conventions

- Use descriptive names
- Avoid generic names like:
    - data
    - value
    - temp

Prefer:
- interviewSession
- audioStreamManager
- evaluationResult

---

## 🔒 Safety Rules

- Never break existing functionality intentionally
- If unsure → ASK
- If multiple options exist → present them first

---

## 🧭 Decision Making

When unsure:

1. List options
2. Explain tradeoffs
3. Recommend one
4. Wait for confirmation

---

## 🚫 What NOT to do

- No silent changes
- No large rewrites without approval
- No introducing unnecessary libraries
- No breaking architecture consistency

---

## ✅ Expected Workflow

For ANY task:

1. Analyze the request
2. Explain plan
3. Wait for approval
4. Implement
5. Summarize what was done

---

## 💥 Project Philosophy

We are NOT building:
- a generic interview tool

We ARE building:
- a deep, realistic interview and evaluation engine

Therefore:
- depth > features
- quality > speed
- clarity > complexity

---

## 🧠 Final Rule

Think before coding.  
Explain before changing.  
Confirm before executing.