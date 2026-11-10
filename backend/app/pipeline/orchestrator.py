import asyncio
import logging
from urllib.parse import quote
from typing import AsyncGenerator
from ..schemas.pipeline_state import PipelineState
from ..schemas.agent_schemas import CodeFile
from ..agents.specialized import (
    IntentClassifierAgent,
    ChatAssistantAgent,
    ImageGeneratorAgent,
    PlannerAgent,
    ArchitectAgent,
    DBDesignerAgent,
    ApiDesignerAgent,
    UIDesignerAgent,
    BackendDevAgent,
    FrontendDevAgent,
    TesterAgent,
    ReviewerAgent
)
from .file_writer import file_writer

logger = logging.getLogger("orchestrator")


class PipelineOrchestrator:
    def __init__(self):
        self.classifier = IntentClassifierAgent()
        self.chat_assistant = ChatAssistantAgent()
        self.image_generator = ImageGeneratorAgent()
        self.planner = PlannerAgent()
        self.architect = ArchitectAgent()
        self.db_designer = DBDesignerAgent()
        self.api_designer = ApiDesignerAgent()
        self.ui_designer = UIDesignerAgent()
        self.backend_dev = BackendDevAgent()
        self.frontend_dev = FrontendDevAgent()
        self.tester = TesterAgent()
        self.reviewer = ReviewerAgent()

    async def run_pipeline(
        self,
        state: PipelineState,
        force_provider: str | None = None
    ) -> AsyncGenerator[dict, None]:
        """
        Executes the autonomous multi-agent pipeline:
        - general_chat: fast single-agent programming & conversation mode
        - image_generation: visual prompt engineering + free FLUX image creation
        - software project modes: adaptive multi-agent pipeline with dynamic skipping & atomic file output
        """
        state.status = "running"
        yield {"event": "run_started", "data": {"run_id": state.run_id, "user_prompt": state.user_prompt}}

        # ==========================================
        # Step 0: Dynamic Intent Classification
        # ==========================================
        yield {"event": "agent_started", "data": {"agent": "intent_classifier"}}
        ctx = state.get_token_optimized_context_for_agent("intent_classifier")
        state.intent, meta = await self.classifier.execute(ctx, force_provider=force_provider)

        needed = set(state.intent.needed_agents)
        skipped = state.intent.skipped_agents
        yield {
            "event": "agent_done",
            "data": {
                "agent": "intent_classifier",
                "provider": meta.provider,
                "model": meta.model,
                "output": state.intent.model_dump(),
                "skipped_agents": skipped,
                "project_type": state.intent.project_type
            }
        }

        # ==========================================
        # Fast Path A: Conversational & Programming Chat
        # ==========================================
        if state.intent.project_type == "general_chat" or "chat_assistant" in needed:
            yield {"event": "agent_started", "data": {"agent": "chat_assistant"}}
            chat_ctx = state.get_token_optimized_context_for_agent("chat_assistant")
            state.chat_response, chat_meta = await self.chat_assistant.execute(chat_ctx, force_provider=force_provider)
            yield {
                "event": "agent_done",
                "data": {
                    "agent": "chat_assistant",
                    "provider": chat_meta.provider,
                    "model": chat_meta.model,
                    "output": state.chat_response.model_dump()
                }
            }
            state.status = "done"
            yield {
                "event": "run_done",
                "data": {
                    "run_id": state.run_id,
                    "mode": "general_chat",
                    "status": "done",
                    "chat_reply": state.chat_response.reply,
                    "written_paths": []
                }
            }
            return

        # ==========================================
        # Fast Path B: Free AI Image Generation
        # ==========================================
        if state.intent.project_type == "image_generation" or "image_generator" in needed:
            yield {"event": "agent_started", "data": {"agent": "image_generator"}}
            img_ctx = state.get_token_optimized_context_for_agent("image_generator")
            state.image_result, img_meta = await self.image_generator.execute(img_ctx, force_provider=force_provider)

            encoded_prompt = quote(state.image_result.refined_prompt)
            state.image_result.image_url = f"https://gen.pollinations.ai/image/{encoded_prompt}?model=flux&width=1024&height=1024"

            yield {
                "event": "agent_done",
                "data": {
                    "agent": "image_generator",
                    "provider": img_meta.provider,
                    "model": img_meta.model,
                    "output": state.image_result.model_dump()
                }
            }
            state.status = "done"
            yield {
                "event": "run_done",
                "data": {
                    "run_id": state.run_id,
                    "mode": "image_generation",
                    "status": "done",
                    "chat_reply": f"{state.image_result.explanation}\n\n**Visual Prompt:** _{state.image_result.refined_prompt}_",
                    "image_url": state.image_result.image_url,
                    "written_paths": []
                }
            }
            return

        # ==========================================
        # Software Engineering Pipeline
        # ==========================================
        # Step 1: Planner
        if "planner" in needed:
            yield {"event": "agent_started", "data": {"agent": "planner"}}
            ctx = state.get_token_optimized_context_for_agent("planner")
            state.plan, p_meta = await self.planner.execute(ctx, force_provider=force_provider)
            yield {
                "event": "agent_done",
                "data": {"agent": "planner", "provider": p_meta.provider, "model": p_meta.model, "output": state.plan.model_dump()}
            }
        else:
            yield {"event": "agent_skipped", "data": {"agent": "planner", "reason": "Not required by project type"}}

        # Step 2: Architect
        if "architect" in needed:
            yield {"event": "agent_started", "data": {"agent": "architect"}}
            ctx = state.get_token_optimized_context_for_agent("architect")
            state.architecture, a_meta = await self.architect.execute(ctx, force_provider=force_provider)
            yield {
                "event": "agent_done",
                "data": {"agent": "architect", "provider": a_meta.provider, "model": a_meta.model, "output": state.architecture.model_dump()}
            }
        else:
            yield {"event": "agent_skipped", "data": {"agent": "architect", "reason": "Not required"}}

        # Step 3: Parallel Group 1 (DB, API, UI Designers)
        parallel_group_1_tasks = []
        task_names_1 = []

        if "db_designer" in needed:
            yield {"event": "agent_started", "data": {"agent": "db_designer"}}
            parallel_group_1_tasks.append(
                self.db_designer.execute(state.get_token_optimized_context_for_agent("db_designer"), force_provider)
            )
            task_names_1.append("db_designer")
        else:
            yield {"event": "agent_skipped", "data": {"agent": "db_designer", "reason": "Frontend/Static project, database skipped"}}

        if "api_designer" in needed:
            yield {"event": "agent_started", "data": {"agent": "api_designer"}}
            parallel_group_1_tasks.append(
                self.api_designer.execute(state.get_token_optimized_context_for_agent("api_designer"), force_provider)
            )
            task_names_1.append("api_designer")
        else:
            yield {"event": "agent_skipped", "data": {"agent": "api_designer", "reason": "No custom API endpoints requested"}}

        if "ui_designer" in needed:
            yield {"event": "agent_started", "data": {"agent": "ui_designer"}}
            parallel_group_1_tasks.append(
                self.ui_designer.execute(state.get_token_optimized_context_for_agent("ui_designer"), force_provider)
            )
            task_names_1.append("ui_designer")
        else:
            yield {"event": "agent_skipped", "data": {"agent": "ui_designer", "reason": "Backend/DB-only task"}}

        if parallel_group_1_tasks:
            results_1 = await asyncio.gather(*parallel_group_1_tasks)
            for name, (output, res_meta) in zip(task_names_1, results_1):
                if name == "db_designer":
                    state.db_design = output
                elif name == "api_designer":
                    state.api_design = output
                elif name == "ui_designer":
                    state.ui_design = output
                yield {
                    "event": "agent_done",
                    "data": {"agent": name, "provider": res_meta.provider, "model": res_meta.model, "output": output.model_dump()}
                }

        # Step 4: Parallel Group 2 (Backend Dev, Frontend Dev) + Review Loop (Max 2)
        while state.review_loops <= 2:
            tasks_2 = []
            names_2 = []
            if "backend_dev" in needed and (state.review_loops == 0 or (state.review and "backend_dev" in state.review.send_back_to)):
                yield {"event": "agent_started", "data": {"agent": "backend_dev", "loop": state.review_loops}}
                tasks_2.append(self.backend_dev.execute(state.get_token_optimized_context_for_agent("backend_dev"), force_provider))
                names_2.append("backend_dev")
            elif state.review_loops == 0 and "backend_dev" not in needed:
                yield {"event": "agent_skipped", "data": {"agent": "backend_dev", "reason": "No backend required"}}

            if "frontend_dev" in needed and (state.review_loops == 0 or (state.review and "frontend_dev" in state.review.send_back_to)):
                yield {"event": "agent_started", "data": {"agent": "frontend_dev", "loop": state.review_loops}}
                tasks_2.append(self.frontend_dev.execute(state.get_token_optimized_context_for_agent("frontend_dev"), force_provider))
                names_2.append("frontend_dev")
            elif state.review_loops == 0 and "frontend_dev" not in needed:
                yield {"event": "agent_skipped", "data": {"agent": "frontend_dev", "reason": "No frontend UI required"}}

            if tasks_2:
                results_2 = await asyncio.gather(*tasks_2)
                for name, (output, code_meta) in zip(names_2, results_2):
                    if name == "backend_dev":
                        state.backend = output
                    elif name == "frontend_dev":
                        state.frontend = output
                    yield {
                        "event": "agent_done",
                        "data": {"agent": name, "provider": code_meta.provider, "model": code_meta.model, "output": output.model_dump()}
                    }

            if "tester" in needed and state.review_loops == 0:
                yield {"event": "agent_started", "data": {"agent": "tester"}}
                state.tests, t_meta = await self.tester.execute(state.get_token_optimized_context_for_agent("tester"), force_provider)
                yield {
                    "event": "agent_done",
                    "data": {"agent": "tester", "provider": t_meta.provider, "model": t_meta.model, "output": state.tests.model_dump()}
                }

            if "reviewer" in needed:
                yield {"event": "agent_started", "data": {"agent": "reviewer", "loop": state.review_loops}}
                state.review, r_meta = await self.reviewer.execute(state.get_token_optimized_context_for_agent("reviewer"), force_provider)
                yield {
                    "event": "agent_done",
                    "data": {"agent": "reviewer", "provider": r_meta.provider, "model": r_meta.model, "output": state.review.model_dump()}
                }

                if state.review.approved or state.review_loops >= 2 or not state.review.send_back_to:
                    break
                else:
                    state.review_loops += 1
                    yield {"event": "review_issue", "data": {"issues": [i.model_dump() for i in state.review.issues], "loop": state.review_loops}}
            else:
                break

        # Step 5: Sandboxed Physical File Creation
        files_to_write: list[CodeFile] = []
        if state.backend and state.backend.files:
            files_to_write.extend(state.backend.files)
        if state.frontend and state.frontend.files:
            files_to_write.extend(state.frontend.files)
        if state.tests and state.tests.test_code_files:
            files_to_write.extend(state.tests.test_code_files)
        if state.ui_design and state.ui_design.html_wireframe:
            has_index = any(f.path.strip().lstrip("./") == "index.html" for f in files_to_write)
            target_preview_path = "preview.html" if has_index else "index.html"
            files_to_write.append(
                CodeFile(path=target_preview_path, language="html", content=state.ui_design.html_wireframe)
            )

        written_paths = []
        if files_to_write:
            yield {"event": "writing_files", "data": {"file_count": len(files_to_write)}}
            written_paths = await file_writer.write_files(state.run_id, files_to_write)
            yield {
                "event": "files_written",
                "data": {
                    "project_id": state.run_id,
                    "written_paths": written_paths,
                    "tree": file_writer.list_project_tree(state.run_id)
                }
            }

        state.status = "done"
        yield {
            "event": "run_done",
            "data": {
                "run_id": state.run_id,
                "mode": state.intent.project_type,
                "status": "done",
                "written_paths": written_paths,
                "project_tree": file_writer.list_project_tree(state.run_id)
            }
        }


orchestrator = PipelineOrchestrator()
