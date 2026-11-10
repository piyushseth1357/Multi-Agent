# Entity Relationship Diagram (ERD) — AI Software Team

This document represents the database schema designed for **Supabase (PostgreSQL)** with strict **Row Level Security (RLS)**.

---

## 1. Visual ERD (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : "owns"
    USERS ||--o{ MESSAGES : "creates"
    USERS ||--o{ ATTACHMENTS : "uploads"
    USERS ||--o{ PIPELINE_RUNS : "initiates"
    USERS ||--o{ PROJECT_FILES : "owns"

    CONVERSATIONS ||--o{ MESSAGES : "contains"
    CONVERSATIONS ||--o{ PIPELINE_RUNS : "tracks"
    
    MESSAGES ||--o{ ATTACHMENTS : "has"
    
    PIPELINE_RUNS ||--o{ AGENT_OUTPUTS : "records"
    PIPELINE_RUNS ||--o{ PROJECT_FILES : "generates"

    USERS {
        uuid id PK "auth.users"
        varchar email
        timestamptz created_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid user_id FK "auth.users"
        text title
        text language "auto, en, hi, hinglish"
        boolean is_deleted "soft delete"
        timestamptz created_at
        timestamptz updated_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        text role "user, assistant, system"
        text content
        text language
        timestamptz created_at
    }

    ATTACHMENTS {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        text storage_path
        text mime_type
        integer size_bytes
        timestamptz created_at
    }

    PIPELINE_RUNS {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        text user_prompt
        text project_type "fullstack, frontend_only, backend_only"
        text status "queued, running, done, failed"
        jsonb state "complete PipelineState snapshot"
        timestamptz created_at
        timestamptz finished_at
    }

    AGENT_OUTPUTS {
        uuid id PK
        uuid run_id FK
        text agent_name "planner, architect, db_designer, etc."
        integer attempt "retry counter"
        jsonb output "validated pydantic output"
        text provider "groq, gemini, openrouter"
        text model
        integer tokens_in
        integer tokens_out
        integer latency_ms
        text status "ok, invalid, error, skipped"
        text error
        timestamptz created_at
    }

    PROJECT_FILES {
        uuid id PK
        uuid run_id FK
        uuid user_id FK
        text file_path "e.g. src/App.tsx"
        text language "typescript, html, python, sql"
        text content "full file content"
        integer size_bytes
        timestamptz created_at
    }
```

---

## 2. Table Descriptions & Row Level Security (RLS) Rules

| Table | Purpose | Row Level Security (RLS) Rule |
| :--- | :--- | :--- |
| `conversations` | Grouping user chat sessions | `auth.uid() = user_id` (Only creator can view/update) |
| `messages` | Chat history stream | `auth.uid() = user_id` |
| `attachments` | Uploaded images & document metadata | `auth.uid() = user_id` |
| `pipeline_runs` | Execution lifecycle & state snapshot | `auth.uid() = user_id` |
| `agent_outputs` | Latency, token usage, per-agent audit | `EXISTS (SELECT 1 FROM pipeline_runs WHERE id = agent_outputs.run_id AND user_id = auth.uid())` |
| `project_files` | Physical files generated for download/push | `auth.uid() = user_id` |

---

## 3. How to use in dbdiagram.io
1. Open [dbdiagram.io](https://dbdiagram.io) in your browser.
2. Open [docs/ERD.dbml](file:///c:/Users/asus/OneDrive/Desktop/multi%20agant/docs/ERD.dbml).
3. Copy all lines and paste into the editor.
4. Your interactive ERD diagram will generate automatically with all foreign keys and relationship lines.
