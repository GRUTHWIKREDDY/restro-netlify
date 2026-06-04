# kCodeIT — AI Project Handbook

Welcome, AI agent. This handbook is written for you — not for a human. It assumes you are about to
read, modify, or extend this project and need **everything** in one place: what this project does,
how it's built, where the pitfalls are, and what patterns to follow.

## Quick Navigation

| File | What it covers |
|---|---|
| ARCHITECTURE.md | Stack, folder layout, data flow, real-time sync |
| DATA_MODEL.md | Firestore collections, TypeScript types, schemas |
| COMPONENTS.md | React component tree, routing, props, roles |
| FEATURES.md | Deep dives: geofencing, handshake, AI, QR, printing |
| CONVENTIONS.md | Coding rules, Tailwind v4 quirks, port notes, config gotchas |
| CHANGELOG.md | History of decisions (why DeepSeek, why port 3001, etc.) |

## Golden Rules

1. **Read the handbook first.** Every AI that enters this project reads these files before making changes.
2. **Don't look for `tailwind.config.js` or PostCSS config.** This project uses Tailwind v4 with `@theme` in `index.css` only.
3. **Port 3001, not 3000.** The WhatsApp bridge owns 3000. Don't change it back.
4. **DeepSeek, not Gemini.** The AI endpoints were migrated. All API paths use `/api/deepseek/*`.
5. **Ask the human before making structural changes.** This handbook is for context, not permission.
