from pydantic import BaseModel, Field
from typing import Literal

# ==========================================
# 0. INTENT CLASSIFIER (Dynamic Adaptive Pipeline)
# ==========================================
class IntentClassifierOutput(BaseModel):
    project_type: Literal["frontend_only", "backend_only", "fullstack", "database_only", "landing_page"] = Field(
        description="The architectural scope of the project based on the prompt."
    )
    needed_agents: list[str] = Field(
        description="List of agent names required for this prompt. Agents not in this list will be safely skipped to save tokens."
    )
    skipped_agents: list[str] = Field(
        default_factory=list,
        description="List of agents deliberately skipped (e.g. ['db_designer', 'backend_dev'] for static websites)."
    )
    reasoning: str = Field(description="Short rationale explaining why certain agents were chosen or skipped.")

# ==========================================
# 1. PLANNER AGENT
# ==========================================
class UserStory(BaseModel):
    as_a: str
    i_want: str
    so_that: str
    acceptance_criteria: list[str]

class PlannerOutput(BaseModel):
    project_name: str
    summary: str
    functional_requirements: list[str]
    non_functional_requirements: list[str]
    user_stories: list[UserStory]
    out_of_scope: list[str] = Field(default_factory=list)

# ==========================================
# 2. ARCHITECT AGENT
# ==========================================
class ArchitectOutput(BaseModel):
    style: Literal["monolith", "modular_monolith", "microservices", "static_spa", "serverless"]
    tech_stack: dict[str, str]  # e.g., {"frontend": "React + Tailwind", "backend": "FastAPI"}
    components: list[str]
    mermaid_diagram: str
    risks: list[str]

# ==========================================
# 3. DATABASE DESIGNER AGENT
# ==========================================
class Column(BaseModel):
    name: str
    type: str
    nullable: bool = False
    primary_key: bool = False
    references: str | None = None  # e.g. "users.id"

class Table(BaseModel):
    name: str
    columns: list[Column]
    indexes: list[str] = Field(default_factory=list)

class DBDesignOutput(BaseModel):
    tables: list[Table]
    sql: str
    mermaid_erd: str

# ==========================================
# 4. API DESIGNER AGENT
# ==========================================
class Endpoint(BaseModel):
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    path: str
    auth_required: bool = True
    request_example: dict | None = None
    response_example: dict | None = None
    errors: list[int] = Field(default_factory=list)

class ApiDesignOutput(BaseModel):
    endpoints: list[Endpoint]
    openapi_yaml: str

# ==========================================
# 5. UI DESIGNER AGENT
# ==========================================
class Screen(BaseModel):
    name: str
    purpose: str
    components: list[str]
    navigates_to: list[str] = Field(default_factory=list)

class UIDesignOutput(BaseModel):
    screens: list[Screen]
    user_flow_mermaid: str
    html_wireframe: str | None = None

# ==========================================
# 6 & 7. CODE AGENTS (Backend Dev & Frontend Dev)
# ==========================================
class CodeFile(BaseModel):
    path: str = Field(description="Exact relative file path, e.g. 'src/components/Header.tsx' or 'app/main.py'")
    language: str = Field(description="Language: typescript, javascript, python, html, css, etc.")
    content: str = Field(description="Complete, non-truncated working code. No placeholders or '// TODO' allowed.")

class CodeOutput(BaseModel):
    files: list[CodeFile]
    run_instructions: str

# ==========================================
# 8. TESTER AGENT
# ==========================================
class TestCase(BaseModel):
    id: str
    title: str
    type: Literal["unit", "integration", "e2e", "security"]
    steps: list[str]
    expected: str

class TestOutput(BaseModel):
    test_cases: list[TestCase]
    test_code_files: list[CodeFile] = Field(default_factory=list)

# ==========================================
# 9. REVIEWER AGENT (Self-Healing Loop)
# ==========================================
class Issue(BaseModel):
    severity: Literal["low", "medium", "high"]
    area: Literal["backend", "frontend", "database", "api", "ui", "tests", "architecture"]
    description: str
    suggested_fix: str

class ReviewOutput(BaseModel):
    approved: bool
    issues: list[Issue]
    send_back_to: list[str] = Field(default_factory=list)  # e.g. ["backend_dev", "frontend_dev"]
    summary: str
