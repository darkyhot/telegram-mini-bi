# Telegram Mini BI Platform (MVP)

AI-first analytics inside Telegram WebApp.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind + Telegram WebApp SDK + ECharts + Zustand
- Backend: FastAPI + Python 3.11 + pandas + SQLite + SQLAlchemy
- LLM: Ollama (`OLLAMA_MODEL` configurable)
- Infra: Docker + docker-compose

## Project Structure

```text
.
+-- backend/
¦   +-- app/
¦   ¦   +-- ai/
¦   ¦   ¦   +-- prompts/
¦   ¦   ¦   +-- agents.py
¦   ¦   ¦   L-- ollama_client.py
¦   ¦   +-- api/
¦   ¦   ¦   +-- v1/
¦   ¦   ¦   +-- routes.py
¦   ¦   ¦   L-- schemas.py
¦   ¦   +-- models/
¦   ¦   +-- services/
¦   ¦   +-- utils/
¦   ¦   L-- main.py
¦   +-- data/uploads/
¦   +-- .env.example
¦   +-- Dockerfile
¦   L-- requirements.txt
+-- frontend/
¦   +-- src/
¦   ¦   +-- components/
¦   ¦   +-- pages/
¦   ¦   +-- services/
¦   ¦   +-- store/
¦   ¦   +-- types/
¦   ¦   L-- App.tsx
¦   +-- .env.example
¦   +-- Dockerfile
¦   +-- nginx.conf
¦   L-- package.json
+-- docker-compose.yml
L-- .gitignore
```

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

```env
DATABASE_URL=sqlite:///./data/mini_bi.db
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=kimi-k2.5:cloud
TELEGRAM_BOT_TOKEN=your_bot_token_here
MAX_FILE_SIZE_MB=10
MAX_ROWS=100000
UPLOAD_DIR=./data/uploads
```

Frontend optional env (`frontend/.env`):

```env
VITE_API_BASE_URL=/api
```

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Docker Deployment (Linux Server)

1. Copy env:

```bash
cp backend/.env.example backend/.env
```

2. Start services:

```bash
docker compose up -d --build
```

3. Endpoints:

- Frontend: `http://<server-ip>:5173`
- Backend health: `http://<server-ip>:8000/health`
- Ollama API (external on server): `http://localhost:11434`

## Ollama Setup

This project expects Ollama to already be running on the server host.

- Set OLLAMA_BASE_URL=http://localhost:11434
- Set OLLAMA_MODEL=kimi-k2.5:cloud
- docker-compose.yml does not include an Ollama service

## MVP Features Implemented

- CSV upload with limits (10MB, 100k rows)
- Schema inference and sample preview
- Dataset profiling via Ollama prompt agent
- AI chat question -> safe pandas query + dynamic chart config
- ECharts chart rendering
- Add chart widgets into draggable/resizable dashboard
- Save dashboard config to SQLite
- Share dashboard via public token
- Telegram user ID usage from WebApp SDK

## Security Notes

- CSV type and size validation
- No raw python execution from LLM output
- Query sanitization with token/identifier restrictions
- Chart config sanitization against dataset schema

## GitHub Push

```bash
git init
git add .
git commit -m "feat: telegram mini bi mvp"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```


