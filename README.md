# NAVIYA - Learning Agent System

Project scaffold for a Learning Agent System with React frontend and Flask backend.

## Project Structure

```
/frontend          - React + TypeScript + Vite + TailwindCSS
/backend           - Python Flask API
```

## Setup Instructions

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python run.py
```

Backend will run on `http://localhost:5000`

## API Endpoints

- `GET /health` - Health check endpoint

## Tech Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Python, Flask
