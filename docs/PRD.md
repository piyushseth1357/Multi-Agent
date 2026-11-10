# Product Requirement Document (PRD) — AI Software Team (Advanced Edition)

## 1. Executive Summary & Problem Statement
* **Project Name**: AI Software Team (Agentic Full-Stack Studio)
* **Target Audience**: Student developers, indie hackers, solo founders, and creators.
* **The Problem**: 
  - Standard chatbots only dump markdown code in a chat stream, forcing users to manually copy-paste into multiple files.
  - Not every project needs a database or full backend; generating unnecessary database schemas wastes tokens and confuses simple frontend projects.
  - Users want a unified, modern interface (like Claude or Antigravity) that feels like talking to a single senior engineer, but internally harnesses a specialized multi-agent team with automated file creation, voice input, and GitHub synchronization.
* **The Solution**: A unified AI Chatbot & Agentic Studio that:
  1. Features an **Adaptive Pipeline**: Automatically detects project intent and dynamically skips unneeded agents (e.g., skips DB & Backend for static frontend websites).
  2. Features an **Agentic File System & GitHub Writer**: Directly reads existing project files, creates directory structures, and writes production code files directly to the local folder or pushes to GitHub.
  3. Features a **Seamless Unified Chat**: One conversational window with auto/manual model switching (Groq, Gemini, OpenRouter), voice dictation, and a `+` media/document attachment drawer.

---

## 2. API Keys Required (All 100% Free Tier)
| Provider | Purpose | Free Tier Limits | Where to Get |
| :--- | :--- | :--- | :--- |
| **Groq API** | Primary ultra-fast LLM (Llama 3.3 70B, Llama 3.1 8B) for planning, code, & schema | ~30 RPM, 14.4k TPM (Generous daily free quota) | [console.groq.com](https://console.groq.com) |
| **Google Gemini (AI Studio)** | Vision (images), large context documents (PDF/DOCX), & high-reasoning fallback | 15 RPM, 1M TPM (Free tier for Gemini 2.5 Flash / 1.5 Flash) | [aistudio.google.com](https://aistudio.google.com) |
| **OpenRouter** | Secondary fallback with free open-source models (Mistral, Qwen, DeepSeek free tiers) | Varies per free model | [openrouter.ai](https://openrouter.ai) |
| **Supabase** | Authentication, database (Postgres), project state persistence, & file storage | Free tier (500MB DB, 1GB Storage, 50k MAU) | [supabase.com](https://supabase.com) |
| **GitHub Token (Optional)** | Reading repository files & pushing commits directly to user's GitHub repo | Free (Standard personal access token / Fine-grained PAT) | [github.com/settings/tokens](https://github.com/settings/tokens) |

---

## 3. Core Features & Functional Architecture

### A. Adaptive Multi-Agent Pipeline (Conditional Agent Execution)
* **Intent Classifier**: Automatically categorizes user prompt into:
  - `STATIC_FRONTEND / WEBSITE`: Skips `DB Designer` and `Backend Dev`. Pipeline: `Planner` $\rightarrow$ `UI Designer` $\rightarrow$ `Frontend Dev` $\rightarrow$ `Tester` $\rightarrow$ `Reviewer` $\rightarrow$ `File Writer`.
  - `FULLSTACK_APP`: Runs the complete 9-agent pipeline.
  - `BACKEND_API_ONLY`: Skips `UI Designer` and `Frontend Dev`.
  - `QUICK_CHAT / EDIT`: Direct conversational answer or targeted single-file edit.
* **Token Optimization Guarantee**: Agents only receive their necessary state slice. Skipping agents for frontend-only apps saves 40–60% of total tokens.

### B. Agentic File System & Code Writer Engine
* **Local Workspace Writer**: Instead of just raw markdown, the agent writes directly to designated disk folders (e.g., `output/my-app/src/App.tsx`).
* **Existing Project Inspection**: The agent can inspect directory trees and read file contents to make accurate contextual edits.
* **GitHub Integration**: If user connects a GitHub token/repo, the agent commits and pushes code directly to a branch or creates a Pull Request.
* **ZIP Archive Exporter**: One-click download of the generated project directory.

### C. Unified Chatbot Experience & Model Router
* **Unified Interface**: Clean chat experience without cluttered multi-agent logs in the main stream. An expandable **"Agent Activity Pill"** allows users to see what agents are doing in the background.
* **Auto vs. Manual Switching**:
  - `Auto Mode (Default)`: Router picks the best model based on task (Groq for rapid code generation, Gemini for vision/documents, OpenRouter for fallback).
  - `Manual Mode`: User can click a model dropdown to force a specific engine if desired.

### D. Multimodal & Voice Input
* **Voice Note (Speech-to-Text)**: Dedicated microphone button powered by the browser Web Speech API (supports Hindi `hi-IN` and English `en-IN`/`en-US`).
* **Audio Playback (Text-to-Speech)**: Optional speaker icon on AI messages to read responses out loud.
* **Attachment Drawer (`+` Button)**:
  - Supports Images (`.png`, `.jpg`, `.webp`) sent to Gemini Vision for UI replication.
  - Supports Documents (`.pdf`, `.docx`, `.txt`) parsed and injected as prompt context.

### E. Mentor Recommended Extra Features (Inserted into Architecture)
1. **In-Browser Live Website Preview (Live Sandbox)**:
   - For frontend/website prompts, render the generated HTML/Tailwind/React preview directly in an embedded iframe or Sandpack window side-by-side with chat!
2. **Interactive File Tree & Code Diff Viewer**:
   - Visual sidebar displaying all generated files with syntax highlighting and diff comparisons before applying changes.
3. **Smart Prompt Enhancer**:
   - A button ("Enhance Prompt") that turns vague prompts (e.g., *"Make a gym website"*) into clear architectural requirements before passing to the pipeline.

---

## 4. Phased Implementation Roadmap
* **Phase 0: Planning & Architecture**: PRD, User Stories, ERD, OpenAPI, Wireframes, Repo setup.
* **Phase 1: Foundation**: Provider Router (Groq + Gemini + OpenRouter), Base Agent, Planner & Architect.
* **Phase 2: Adaptive Pipeline & Code Writer**: Conditional execution (skip DB/backend for frontend-only), File System writer.
* **Phase 3: Backend API & Persistence**: FastAPI, Supabase Auth/DB/Storage, SSE Streaming.
* **Phase 4: Frontend Studio UI**: React, Vite, Tailwind, Chat, Live Preview, File Tree, Voice Mic, `+` Attachment.
* **Phase 5: Packaging & Deploy**: Web PWA, Android APK (Capacitor), Desktop (Electron).
