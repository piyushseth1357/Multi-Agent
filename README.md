# AI Software Team — Autonomous Multi-Agent Studio

An adaptive, multi-agent AI engineering platform that turns a single prompt (in English, Hindi, or Hinglish) into a complete software blueprint, normalized database design, OpenAPI spec, UI wireframe, tested starter codebase, and live in-browser preview—powered 100% by free-tier LLM APIs.

## Key Features
- **Adaptive Multi-Agent Pipeline**: Automatically classifies project scope (`frontend_only`, `backend_only`, `fullstack`, `database_only`, `landing_page`) and skips unneeded agents to save up to 60% of tokens.
- **Resilient Free-Tier Provider Router**: Automatic concurrency control (`asyncio.Semaphore`), exponential backoff on HTTP 429, and seamless fallback (`Groq -> Google Gemini -> OpenRouter`), plus manual override in the UI.
- **Sandboxed Atomic File Writer & GitHub Sync**: Writes generated files safely into `backend/workspace/<run_id>/`, exports ready-to-run `.zip` bundles, and supports direct GitHub repository pushing.
- **Unified Studio UI**: Holographic dark glassmorphic interface with login isolation, conversation history (rename, soft delete, export JSON/Markdown, import), voice dictation (Web Speech API), text-to-speech playback, file attachments (`TXT`, `PDF`, `DOCX`, images), and live desktop/mobile iframe preview.

## Project Structure
```text
├── backend/
│   ├── app/
│   │   ├── agents/       # BaseAgent + 10 specialized agents
│   │   ├── pipeline/     # Adaptive orchestrator & SandboxedFileWriter
│   │   ├── prompts/      # Per-agent system prompts (.md)
│   │   ├── providers/    # Groq, Gemini, OpenRouter + fallback router
│   │   ├── routers/      # FastAPI endpoints (runs, files, conversations, uploads, health)
│   │   └── schemas/      # Pydantic v2 contracts & PipelineState
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/   # LoginPage, Sidebar, ChatArea, LivePreviewModal, FileExplorerModal
│       └── lib/api.ts
├── docs/                 # PRD, User Stories, ERD (DBML + Mermaid)
└── run_dev.bat           # One-click local launcher (Windows)
```

## Quick Start
1. Copy `backend/.env.example` to `backend/.env` and add at least one free API key (`GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENROUTER_API_KEY`).
2. Install backend dependencies: `pip install -r backend/requirements.txt`
3. Install frontend dependencies: `cd frontend && npm install`
4. Run locally: double-click `run_dev.bat` or start both servers manually:
   - Backend: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
   - Frontend: `cd frontend && npm run dev`
