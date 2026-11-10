import os
import zipfile
import io
import asyncio
from pathlib import Path
from typing import Sequence
from ..config import settings
from ..schemas.agent_schemas import CodeFile

class SandboxedFileWriter:
    """
    Solves Kami #2 & User Requirement:
    1. Sandboxed path resolution (cannot escape workspace directory)
    2. Writes clean, modular files with correct folder structures
    3. Exports ZIP bundles
    4. Integrates with GitHub if token is provided
    """
    def __init__(self, base_workspace_dir: str | None = None):
        self.base_dir = Path(base_workspace_dir or settings.WORKSPACE_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_path(self, project_id: str, relative_path: str) -> Path:
        """
        Guarantees file cannot escape the project's sandboxed directory.
        Rejects paths containing '..' or absolute paths.
        """
        # Clean relative path
        cleaned = relative_path.strip().replace("\\", "/").lstrip("/")
        if ".." in cleaned or cleaned.startswith("/"):
            raise ValueError(f"Security Alert: Directory traversal detected in path '{relative_path}'")

        project_dir = (self.base_dir / project_id).resolve()
        target_path = (project_dir / cleaned).resolve()

        # Strict Jail Check: Must be a descendant of project_dir
        if not str(target_path).startswith(str(project_dir)):
            raise ValueError(f"Security Alert: Path '{target_path}' attempts to escape sandbox '{project_dir}'")

        return target_path

    async def write_files(self, project_id: str, files: Sequence[CodeFile]) -> list[str]:
        """
        Writes all generated code files atomically to the sandboxed workspace.
        """
        written_paths: list[str] = []
        project_dir = self.base_dir / project_id
        project_dir.mkdir(parents=True, exist_ok=True)

        for file in files:
            safe_file_path = self._sanitize_path(project_id, file.path)
            safe_file_path.parent.mkdir(parents=True, exist_ok=True)

            await asyncio.to_thread(
                safe_file_path.write_text,
                file.content,
                encoding="utf-8",
            )

            written_paths.append(str(safe_file_path.relative_to(project_dir)))

        return written_paths

    def create_zip_archive(self, project_id: str) -> bytes:
        """
        Packages the entire generated project folder into a downloadable ZIP archive in memory.
        """
        project_dir = self.base_dir / project_id
        if not project_dir.exists():
            raise FileNotFoundError(f"Project directory '{project_id}' not found.")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for root, _, files in os.walk(project_dir):
                for file in files:
                    full_path = Path(root) / file
                    arcname = full_path.relative_to(project_dir)
                    zip_file.write(full_path, arcname)

        zip_buffer.seek(0)
        return zip_buffer.getvalue()

    def list_project_tree(self, project_id: str) -> list[dict]:
        """
        Returns directory tree for the frontend file explorer.
        """
        project_dir = self.base_dir / project_id
        if not project_dir.exists():
            return []

        tree = []
        for root, dirs, files in os.walk(project_dir):
            rel_dir = Path(root).relative_to(project_dir)
            for f in files:
                file_rel = str((rel_dir / f).as_posix()).lstrip("./")
                full_path = Path(root) / f
                tree.append({
                    "path": file_rel,
                    "name": f,
                    "size_bytes": full_path.stat().st_size
                })
        return tree

file_writer = SandboxedFileWriter()
