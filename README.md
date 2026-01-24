# NAVIYA - Learning Agent System

A modular learning agent platform with React frontend and Flask backend.

## Vision

NAVIYA is built to provide a clean foundation for learning agent systems. The architecture keeps frontend and backend separate, allowing for flexible development and deployment.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   React App     │ ◄────► │   Flask API     │
│  (TypeScript)   │  HTTP   │   (Python)      │
├─────────────────┤         ├─────────────────┤
│ • UI Components │         │ • REST Routes   │
│ • State Mgmt    │         │ • Config System │
│ • Routing       │         │ • Logging       │
└─────────────────┘         └─────────────────┘
     Port 5173                   Port 5000
```

## Tech Stack

**Frontend**
- React 18 with TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- shadcn/ui (component library)

**Backend**
- Python 3.x
- Flask (web framework)
- Environment-based config
- Structured logging

## Quick Start

### Frontend

```bash
cd frontend
npm install
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
python run.py
```

API runs at `http://localhost:5000`

### API Endpoints

- `GET /health` - Health check

## Project Structure

```
NAVIYA/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   └── lib/          # Utilities
│   └── tailwind.config.js
│
├── backend/              # Flask application
│   ├── app/
│   │   ├── __init__.py   # App factory
│   │   ├── config.py     # Configuration
│   │   └── routes.py     # API routes
│   └── run.py           # Entry point
│
└── README.md
```
