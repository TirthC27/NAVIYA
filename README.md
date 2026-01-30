# NAVIYA - Learning Agent System

A modular learning agent platform with React frontend, Flask backend, and Supabase persistence.

## Vision

NAVIYA is built to provide a clean foundation for learning agent systems with persistent sessions. The architecture keeps frontend and backend separate while leveraging Supabase for data persistence and real-time capabilities.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   React App     │ ◄────► │   Flask API     │ ◄────► │   Supabase      │
│  (JavaScript)   │  HTTP   │   (Python)      │  REST   │   (Postgres)    │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ • UI Components │         │ • Agent System  │         │ • Sessions DB   │
│ • State Mgmt    │         │ • REST Routes   │         │ • Auth (future) │
│ • Supabase JS   │         │ • Opik Tracing  │         │ • Storage       │
└─────────────────┘         └─────────────────┘         └─────────────────┘
     Port 5173                   Port 5000               Supabase Cloud
```

## Tech Stack

**Frontend**
- React 18 with JavaScript
- Vite (build tool)
- TailwindCSS (styling)
- Radix UI (component library)
- Supabase JS client
- Axios for API calls
- Framer Motion for animations

**Backend**
- Python 3.x
- Flask (web framework)
- Supabase Python client
- Opik (observability)
- Environment-based config

**Database**
- Supabase (Postgres)
- Learning sessions table

## Week 1 Capabilities

✅ **Agent Orchestrator**
- BaseAgent abstract class
- PlannerAgent with static roadmap generation
- Session-aware agent execution

✅ **Persistent Sessions**
- Create learning sessions via API
- Sessions stored in Supabase
- Session validation on agent execution

✅ **Observability**
- Opik tracing integration
- Agent execution tracking
- Latency and error monitoring

✅ **API Endpoints**
- `POST /session/start` - Create new learning session
- `GET /sessions/{id}` - Fetch session details
- `POST /agents/{name}/execute` - Execute agent with session context
- `GET /agents` - List available agents
- `GET /health` - Health check

## Quick Start

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Visit `http://localhost:5173`

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase and Opik credentials
python -m app.main
```

API runs at `http://localhost:5000`

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL in `backend/data/schema.sql` in the Supabase SQL Editor
3. Copy your project URL and keys to `.env` files

## Project Structure

```
NAVIYA/
├── frontend/              # React application
│   ├── public/
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── home/      # Home page components
│   │   │   ├── interests/ # Interests dashboard components
│   │   │   ├── learning/  # Learning dashboard components
│   │   │   ├── observability/ # Observability components
│   │   │   └── roadmap/   # Roadmap components
│   │   ├── pages/         # Page components
│   │   ├── api/           # API utilities
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/               # Flask application
│   ├── app/
│   │   ├── __init__.py    # App factory
│   │   ├── config.py      # Configuration
│   │   ├── main.py        # Main entry point
│   │   ├── agents/        # Agent modules
│   │   ├── db/            # Database modules
│   │   ├── evals/         # Evaluation modules
│   │   ├── observability/ # Observability modules
│   │   ├── rag/           # RAG modules
│   │   ├── routes/        # API routes
│   │   ├── safety/        # Safety modules
│   │   ├── schemas/       # Data schemas
│   │   ├── utils/         # Utilities
│   │   └── youtube/       # YouTube integration
│   ├── data/              # Data files
│   ├── requirements.txt
│   └── start_server.bat  # Windows startup script
│
└── README.md
