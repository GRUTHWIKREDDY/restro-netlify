# Changelog

This file tracks significant decisions and changes that affect how an AI should approach this project.

## 2025-06-04: DeepSeek Migration
- **Change:** Replaced Google Gemini AI (`@google/genai` SDK, `gemini-3.5-flash`) with DeepSeek Chat API
- **Why:** Project had a DeepSeek API key available but no Gemini key
- **What changed:**
  - Removed `import { GoogleGenAI }` from `server.ts`
  - Added `callDeepSeek()` helper using native `fetch` to `https://api.deepseek.com/v1/chat/completions`
  - Both `/api/gemini/chat` and `/api/gemini/report` endpoints now proxy through DeepSeek
  - Added `dotenv` import to load `DEEPSEEK_API_KEY` from `.env`
  - **Endpoint paths kept as-is** (`/api/gemini/*`) to avoid frontend changes
- **Fallback:** Hardcoded mock responses when key is missing
- **Model:** `deepseek-chat`

## 2025-06-04: Port Changed to 3001
- **Change:** Server port changed from 3000 to 3001
- **Why:** Port 3000 was occupied by a WhatsApp bridge managed by the Hermes agent
- **Note:** Do not revert to 3000 without checking for port conflicts

## 2025-06-04: Maitre D' Renamed to Aarudy D'
- **Change:** All "Maitre D'" references in the customer UI changed to "Aarudy D'"
- **Scope:** DineInCustomerUI.tsx — greeting messages, system instructions, UI labels, comments

## 2025-06-04: Created AI_HANDBOOK
- **Change:** Added this handbook folder
- **Why:** Ensures any AI model can understand the project without being told the same context repeatedly

## 2025-06-04: GitHub Pages Deployment
- **Change:** Added `gh-pages` deployment config
- **What changed:**
  - Added `homepage`, `predeploy`, and `deploy` scripts to `package.json`
  - Set Vite `base: '/Restro/'` in `vite.config.ts`
  - Pushed built frontend to `gh-pages` branch
- **Note:** API-dependent features won't work on GH Pages (no Express server)

## 2025-06-04: GitHub Copilot Instructions
- **Change:** Created `.github/copilot-instructions.md` with full project context
- **Why:** Provides instant project understanding for GitHub Copilot and other AI coding assistants
