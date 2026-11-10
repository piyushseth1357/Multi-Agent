# User Stories & Acceptance Criteria — AI Software Team

This document outlines the 8 core user stories governing the MVP release of the AI Software Team platform. Each story follows the standard `As a... I want to... So that...` pattern accompanied by verifiable Acceptance Criteria.

---

### US-01: User Authentication & Strict Data Isolation
* **As a**: Registered developer or student,
* **I want to**: Sign up and log in securely using my email and password,
* **So that**: Only I can access my conversations, attachments, and generated architecture blueprints.

#### Acceptance Criteria:
1. **Given** an unauthenticated visitor, **when** they navigate to `/`, **then** they are redirected to `/login`.
2. **Given** valid credentials, **when** the user logs in, **then** Supabase Auth returns a valid JWT session token stored securely in the client.
3. **Given** authenticated User A and User B, **when** User A queries `/api/conversations`, **then** Postgres Row Level Security (RLS) guarantees User A receives zero rows belonging to User B (HTTP 403 or empty array).
4. **Given** an expired or tampered JWT, **when** calling any `/api/*` endpoint, **then** the backend returns HTTP 401 Unauthorized with standard error format `{"error": {"code": "UNAUTHORIZED", "message": "Invalid or expired token"}}`.

---

### US-02: Single-Prompt Pipeline Generation
* **As a**: Software engineer starting a new project,
* **I want to**: Enter a single descriptive prompt (e.g., *"Build a hospital management system"*),
* **So that**: A sequential and parallel pipeline of 9 specialized AI agents collaborates to produce a full specification.

#### Acceptance Criteria:
1. **Given** an active chat session, **when** the user sends a prompt, **then** the backend creates a `pipeline_runs` row with `status='running'` and returns a `run_id`.
2. **Given** the pipeline run begins, **then** agents execute in the specified dependency order:
   - `Planner` runs first.
   - `Architect` consumes `plan` and runs second.
   - `DB Designer`, `API Designer`, and `UI Designer` run in parallel (`asyncio.gather`) consuming `plan` and `architecture`.
   - `Backend Dev` and `Frontend Dev` run in parallel consuming the designs.
   - `Tester` evaluates the combined code and designs.
   - `Reviewer` audits the entire state.
3. **Given** each agent execution, **then** the agent only receives its required state subset (minimizing token usage) and must validate its output against its strict Pydantic model.

---

### US-03: Real-Time Token Streaming & Agent State Visibility
* **As a**: User waiting for my project blueprint,
* **I want to**: See live Server-Sent Events (SSE) showing which agent is working and watch their output stream in real-time,
* **So that**: I have full visibility into the AI team's progress without staring at a static loading spinner.

#### Acceptance Criteria:
1. **Given** a triggered run, **when** the frontend connects to `/api/runs/{id}/stream`, **then** it receives SSE events: `agent_started`, `agent_token`, `agent_done`, `review_issue`, and `run_done`.
2. **Given** parallel agents running (e.g., DB Designer & API Designer), **then** the UI displays simultaneous active status badges for both agents.
3. **Given** token generation from an agent, **then** tokens render smoothly in the active agent card via markdown streaming.
4. **Given** network disconnection during streaming, **when** reconnected, **then** the client fetches the current run state from `GET /api/runs/{id}` without data loss.

---

### US-04: Multilingual Prompting (Hindi, English, Hinglish)
* **As a**: Non-native English developer or Indian student,
* **I want to**: Type my project prompt in Hindi (e.g., *"Ek hospital appointment system banao"*), Hinglish, or English,
* **So that**: The AI agents understand my intent and provide explanations in my preferred language while keeping technical code strictly in English.

#### Acceptance Criteria:
1. **Given** a user prompt in Hindi or Hinglish, **when** the `Planner` agent inspects the prompt, **then** it identifies the `language` field (`"hi"`, `"hinglish"`, or `"en"`).
2. **Given** a non-English language setting, **then** summaries, user stories, and explanations are produced in that language.
3. **Given** all code generation (`Backend Dev`, `Frontend Dev`, SQL, and OpenAPI YAML), **then** variable names, class names, file paths, syntax, and comments remain 100% standard English.

---

### US-05: Context Enrichment via File Attachments (TXT, PDF, DOCX)
* **As a**: Product manager with an existing requirement document,
* **I want to**: Attach a PDF, TXT, or DOCX file to my prompt,
* **So that**: The AI Planner extracts the raw text and incorporates my exact domain constraints into the blueprint.

#### Acceptance Criteria:
1. **Given** the upload button, **when** a user attaches a file $>10\text{ MB}$ or of an unsupported mime-type (e.g., `.exe`, `.mp4`), **then** the UI rejects the upload with an informative error toast.
2. **Given** a valid file upload, **when** uploaded to `/api/uploads`, **then** the backend stores the file in Supabase Storage and extracts its plain text content.
3. **Given** extracted attachment text, **then** the backend sanitizes it, wraps it as read-only data (mitigating prompt injection), and passes it to `attachments_text` in the `PipelineState`.

---

### US-06: Voice-to-Text Input via Browser Web Speech
* **As a**: Developer on mobile or who prefers speaking my ideas,
* **I want to**: Click a microphone icon and dictate my prompt in Hindi or English,
* **So that**: My spoken words are automatically transcribed into the input field without manual typing.

#### Acceptance Criteria:
1. **Given** a browser supporting the Web Speech API (Chrome, Edge, Safari), **when** the user clicks the Mic button, **then** recording starts, the mic pulses red, and speech transcribes in real-time.
2. **Given** a language toggle (English `en-IN` / Hindi `hi-IN`), **when** toggled, **then** the speech recognition engine adjusts its acoustic model accordingly.
3. **Given** an unsupported browser or denied microphone permission, **then** the UI displays a fallback message explaining how to enable microphone permissions or type manually.

---

### US-07: Automated Consistency Audit & Self-Healing Review Loop
* **As a**: Developer seeking production-ready starter code,
* **I want to**: Have an AI Reviewer agent verify that the API contracts, DB schema, and code files match,
* **So that**: Inconsistencies are caught and repaired automatically before final blueprint delivery.

#### Acceptance Criteria:
1. **Given** the `Reviewer` agent inspecting the completed pipeline state, **when** an endpoint generated by `API Designer` (e.g., `/api/patients`) has mismatched column references against `DB Designer`'s schema, **then** the Reviewer issues an `Issue(severity='high', area='api', ...)` and sets `approved=False`.
2. **Given** `approved=False` and `review_loops < 2`, **then** the orchestrator re-dispatches only the affected agents specified in `send_back_to` (e.g., `Backend Dev` or `Frontend Dev`).
3. **Given** 2 review iterations have already completed, **then** the orchestrator enforces a hard stop (`review_loops=2`), flags remaining issues in the review report, and delivers the blueprint without entering an infinite loop.

---

### US-08: Conversation Lifecycle & Multi-Format Export/Import
* **As a**: Developer organizing multiple application blueprints,
* **I want to**: Manage my conversation history via a three-dots menu (Rename, Delete, Export as JSON/Markdown, and Import),
* **So that**: I can archive my project plans, share them with team members, or restore them later.

#### Acceptance Criteria:
1. **Given** an active conversation, **when** the user edits its title via the inline three-dots menu, **then** `PATCH /api/conversations/{id}` updates the title in Supabase within 300ms.
2. **Given** a delete request, **when** confirmed by the user, **then** the conversation is soft-deleted (`is_deleted=true`) and immediately hidden from the sidebar.
3. **Given** an export request for Markdown, **then** `GET /api/conversations/{id}/export?format=md` packages the full blueprint into a downloadable `.md` file containing all ERD diagrams, code blocks, and API specs.
4. **Given** a valid JSON export file from another session, **when** uploaded to `/api/conversations/import`, **then** a new conversation is reconstructed with the complete pipeline state and message history.
