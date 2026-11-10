@echo off
echo ========================================================
echo Starting AI Software Team Multi-Agent Studio...
echo ========================================================

start "Backend Server (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
start "Frontend Studio (Vite)" cmd /k "cd frontend && npm run dev"

echo Backend running on http://localhost:8000
echo Frontend running on http://localhost:5173
echo ========================================================
