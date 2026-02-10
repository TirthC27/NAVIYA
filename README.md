# 🚀 NAVIYA - AI-Powered Career Intelligence Platform

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![FastAPI](https://img.shields.io/badge/fastapi-latest-009688.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**An intelligent career development platform powered by AI agents, featuring adaptive learning roadmaps, resume analysis, skill assessments, and personalized mentoring.**

[Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage) • [API Documentation](#-api-documentation)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [AI Agents](#-ai-agents)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**NAVIYA** is a comprehensive AI-powered career intelligence platform that helps users navigate their career journey through:

- 🎯 **Personalized Career Roadmaps** - AI-generated career paths based on your goals and current skills
- 📄 **Resume Intelligence** - Deep analysis and optimization of your resume with AI-powered insights
- 🧠 **Skill Assessment** - Comprehensive skill evaluation with adaptive testing
- 🎓 **Adaptive Learning Roadmaps** - Dynamic learning plans generated from YouTube content
- 💬 **AI Mentor** - 24/7 career guidance and mentorship powered by conversational AI
- 📊 **Observability Dashboard** - Full pipeline tracing, metrics, and evaluation insights
- 🛡️ **Safety Guardrails** - Content safety with PII detection and harmful content filtering

The platform leverages cutting-edge AI technologies including LangGraph, LangChain, and Google Gemini, integrated with Supabase for data persistence and OPIK for comprehensive observability.

---

## ✨ Features

### 🎯 Career Intelligence Module

#### 1. **Career Dashboard**
- Real-time progress tracking across all career development areas
- Visual analytics and insights into your career journey
- Activity timeline and milestone tracking
- Personalized recommendations based on your profile

#### 2. **Career Roadmap Generator**
- AI-powered career path planning based on your target role
- Step-by-step milestones with timeframes and prerequisites
- Integration with learning resources and skill requirements
- Progress tracking with completion status

#### 3. **Resume Analysis & Intelligence**
- Deep resume parsing and analysis
- ATS (Applicant Tracking System) optimization suggestions
- Skills gap identification
- Job-specific resume tailoring recommendations
- Version history and comparison

#### 4. **Skills Assessment**
- Adaptive skill testing across multiple domains
- Real-time difficulty adjustment based on performance
- Comprehensive skill reports with strengths and weaknesses
- Industry-standard benchmarking
- Personalized improvement recommendations

#### 5. **Mock Interview Preparation**
- Role-specific interview questions
- AI-powered answer evaluation
- Behavioral and technical interview practice
- Real-time feedback and improvement suggestions
- Common mistake identification

#### 6. **AI Mentor (Conversational Agent)**
- 24/7 personalized career guidance
- Context-aware conversations with memory
- Career advice, job search strategies, and industry insights
- Multi-turn dialogue with follow-up questions
- Emotional support and motivation

#### 7. **Learning Roadmaps (YouTube Integration)**
- Dynamic learning paths generated from YouTube content
- Multiple difficulty modes (Quick, Standard, Comprehensive)
- Curated video selection with relevance scoring
- Progress tracking and completion certificates
- Deeper dive options for advanced topics

### 🔬 Advanced Features

#### 8. **OPIK Observability Integration**
- **Full Pipeline Tracing**: Every API call is traced with detailed spans
- **LLM-as-Judge Evaluations**: Automatic quality assessment of generated content
- **Performance Metrics**: Latency, token usage, success rates
- **Experiment Tracking**: A/B testing and configuration comparisons
- **Regression Testing**: Automated quality assurance for model updates

#### 9. **Safety & Security**
- **PII Detection**: Automatic detection of emails, phones, SSN, crypto wallets
- **Content Safety**: Harmful content filtering (cheating, hacking, weapons)
- **Block Rate Monitoring**: Track false positives and safety metrics
- **GDPR Compliance**: User data protection and privacy controls

#### 10. **Document Ingestion & RAG**
- **Multi-format Support**: PDF, DOCX, TXT, Markdown, CSV
- **Intelligent Chunking**: Semantic document splitting for better retrieval
- **Vector Search**: ChromaDB-powered semantic search
- **Dynamic Knowledge Base**: Continuously updated with new content

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Dashboard  │ │   Roadmap   │ │   Mentor    │           │
│  │   Pages     │ │    Pages    │ │   Pages     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                         │                                    │
│                    Axios API Client                          │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ HTTPS/REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Routes (REST Endpoints)             │   │
│  │  /api/auth  /api/career  /api/mentor  /api/roadmap  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │              AI Agents (LangGraph)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │Supervisor│ │  Roadmap │ │  Mentor  │ │  Resume │ │  │
│  │  │  Agent   │ │   Agent  │ │   Agent  │ │  Agent  │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │         Services & Utilities Layer                    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │  │
│  │  │   LLM   │ │   RAG   │ │ Safety  │ │  OPIK    │  │  │
│  │  │Provider │ │ Vector  │ │ Guards  │ │Observ.   │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘  │  │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ Supabase │  │  OPIK    │  │ YouTube  │
      │   (DB)   │  │(Tracing) │  │   API    │
      └──────────┘  └──────────┘  └──────────┘
```

### Agent Workflow Architecture

```
User Request
     │
     ▼
┌─────────────────┐
│   Supervisor    │ ◄─── Orchestrates all agent tasks
│     Agent       │
└────────┬────────┘
         │
         ├──────────────────────┬────────────────────┬──────────────┐
         ▼                      ▼                    ▼              ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐   ┌──────────┐
│  Roadmap Agent  │   │  Mentor Agent   │   │Resume Agent  │   │Learning  │
│                 │   │                 │   │              │   │  Agent   │
│ • Career paths  │   │ • Conversations │   │ • Parsing    │   │• YouTube │
│ • Milestones    │   │ • Advice        │   │ • Analysis   │   │• Roadmaps│
│ • Resources     │   │ • Context aware │   │ • Optimize   │   │• Videos  │
└─────────────────┘   └─────────────────┘   └──────────────┘   └──────────┘
         │                      │                    │              │
         └──────────────────────┴────────────────────┴──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Response   │
                         │  Aggregator  │
                         └──────────────┘
                                │
                                ▼
                         Final Response
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18.2** - Modern UI library with hooks
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization
- **React Flow** - Interactive node-based diagrams
- **Lucide React** - Icon library

### Backend
- **FastAPI** - High-performance Python web framework
- **Python 3.8+** - Core programming language
- **LangChain** - LLM application framework
- **LangGraph** - Agent orchestration and workflows
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server

### AI & ML
- **Google Gemini** - Primary LLM (via OpenRouter)
- **ChromaDB** - Vector database for semantic search
- **Sentence Transformers** - Text embeddings
- **OPIK** - LLM observability and tracing
- **LangChain Community** - Extended integrations

### Database & Storage
- **Supabase** - PostgreSQL database with Auth
- **PostgreSQL** - Relational database
- **ChromaDB** - Vector storage for RAG

### Document Processing
- **PyPDF** - PDF text extraction
- **PDFPlumber** - Advanced PDF parsing
- **Python-DOCX** - Word document processing
- **PyMuPDF** - PDF manipulation
- **Unstructured** - Multi-format document loader
- **PyTesseract** - OCR for scanned documents

### Observability & Safety
- **OPIK** - Full pipeline tracing and evaluation
- **Custom Safety Guards** - PII and content filtering
- **Logging** - Comprehensive application logging

### APIs & Integrations
- **YouTube Data API v3** - Video search and metadata
- **Supabase Auth** - User authentication
- **OpenRouter** - LLM API gateway

---

## 📁 Project Structure

```
NAVIYA_testing/
├── backend/                          # Python FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI application entry point
│   │   ├── config.py                 # Configuration and environment variables
│   │   │
│   │   ├── agents/                   # AI Agent implementations
│   │   │   ├── __init__.py
│   │   │   ├── supervisor.py         # Main orchestrator agent
│   │   │   ├── roadmap_agent.py      # Career roadmap generation
│   │   │   ├── mentor_agent.py       # Conversational mentor
│   │   │   ├── resume_intelligence_agent.py  # Resume analysis
│   │   │   ├── skill_evaluation_agent.py     # Skills assessment
│   │   │   ├── learning_graph.py     # Learning roadmap with LangGraph
│   │   │   ├── task_executor.py      # Task execution logic
│   │   │   ├── worker_base.py        # Base worker class
│   │   │   ├── worker_loop.py        # Worker event loop
│   │   │   ├── llm.py                # LLM provider abstraction
│   │   │   ├── registry.py           # Agent registry
│   │   │   └── career/               # Career-specific agents
│   │   │
│   │   ├── routes/                   # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py               # Authentication endpoints
│   │   │   ├── agents.py             # Agent orchestration routes
│   │   │   ├── career.py             # Career intelligence endpoints
│   │   │   ├── mentor.py             # Mentor chat endpoints
│   │   │   ├── roadmap_api.py        # Roadmap generation API
│   │   │   ├── resume.py             # Resume analysis endpoints
│   │   │   ├── skill_assessment_api.py  # Skill testing API
│   │   │   ├── onboarding.py         # User onboarding flow
│   │   │   ├── plans.py              # Learning plans management
│   │   │   ├── metrics.py            # Metrics and analytics
│   │   │   └── dashboard_state_api.py  # Dashboard state sync
│   │   │
│   │   ├── db/                       # Database layer
│   │   │   ├── __init__.py
│   │   │   ├── supabase_client.py    # Supabase connection
│   │   │   ├── queries.py            # Database queries
│   │   │   └── queries_v2.py         # Updated queries
│   │   │
│   │   ├── llm/                      # LLM providers
│   │   │   ├── __init__.py
│   │   │   └── provider.py           # LLM provider interface
│   │   │
│   │   ├── rag/                      # Retrieval Augmented Generation
│   │   │   ├── __init__.py
│   │   │   ├── document_loader.py    # Document ingestion
│   │   │   ├── vector_rag.py         # Vector search
│   │   │   └── roadmap.py            # RAG for roadmaps
│   │   │
│   │   ├── observability/            # OPIK integration
│   │   │   ├── __init__.py
│   │   │   └── opik_client.py        # Tracing and metrics
│   │   │
│   │   ├── evals/                    # Evaluation and testing
│   │   │   ├── __init__.py
│   │   │   ├── judges.py             # LLM-as-judge evaluators
│   │   │   └── regression_tests.py   # Automated tests
│   │   │
│   │   ├── safety/                   # Safety guardrails
│   │   │   ├── __init__.py
│   │   │   └── pii_guard.py          # PII and content safety
│   │   │
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/                 # Business logic services
│   │   ├── utils/                    # Utility functions
│   │   └── youtube/                  # YouTube integration
│   │
│   ├── data/                         # Database schemas and data
│   │   ├── schema.sql                # Main database schema
│   │   ├── schema_v2.sql             # Updated schema
│   │   ├── fix_foreign_keys.sql      # Foreign key fixes
│   │   ├── career_roadmap_schema.sql # Career roadmap tables
│   │   ├── resume_analysis_schema.sql  # Resume tables
│   │   ├── skill_assessments_schema.sql  # Skills tables
│   │   ├── mentor_messages_schema.sql  # Mentor chat tables
│   │   ├── agent_activity_log_schema.sql  # Activity logging
│   │   ├── dashboard_state_schema.sql  # Dashboard state
│   │   ├── learning_paths.json       # Learning path templates
│   │   ├── roadmaps.json             # Roadmap templates
│   │   └── documents/                # RAG document storage
│   │       ├── courses/
│   │       ├── syllabi/
│   │       └── tutorials/
│   │
│   ├── requirements.txt              # Python dependencies
│   ├── OPIK_INTEGRATION.md           # OPIK documentation
│   ├── KNOWLEDGE_BASE.md             # RAG setup guide
│   ├── DOCUMENT_INGESTION.md         # Document processing guide
│   ├── DATASETS.md                   # Dataset documentation
│   └── test_*.py                     # Test files
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── main.jsx                  # Application entry point
│   │   ├── App.jsx                   # Main app component with routing
│   │   ├── index.css                 # Global styles
│   │   │
│   │   ├── pages/                    # Page components
│   │   │   ├── Welcome.jsx           # Landing page
│   │   │   ├── Auth.jsx              # Login/Register
│   │   │   ├── Onboarding.jsx        # User onboarding
│   │   │   ├── UnifiedDashboard.jsx  # Main dashboard
│   │   │   ├── LearningDashboard.jsx # Learning progress
│   │   │   ├── ObservabilityDashboard.jsx  # Metrics view
│   │   │   └── career/               # Career module pages
│   │   │       ├── CareerDashboard.jsx
│   │   │       ├── CareerRoadmap.jsx
│   │   │       ├── ResumeAnalysis.jsx
│   │   │       ├── SkillsAssessment.jsx
│   │   │       ├── MockInterview.jsx
│   │   │       ├── AIMentor.jsx
│   │   │       ├── LearningRoadmaps.jsx
│   │   │       └── Observability.jsx
│   │   │
│   │   ├── components/               # Reusable components
│   │   │   └── career/               # Career-specific components
│   │   │       └── CareerLayout.jsx
│   │   │
│   │   ├── context/                  # React Context providers
│   │   │   └── DashboardStateContext.jsx  # Global state
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   └── useAuthGuard.jsx      # Route protection
│   │   │
│   │   └── api/                      # API client functions
│   │
│   ├── public/                       # Static assets
│   │   └── Vector_images/
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Node dependencies
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # TailwindCSS config
│   └── postcss.config.js             # PostCSS config
│
└── README.md                         # This file
```

---

## 🚀 Installation

### Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 16+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/)
- **OpenRouter API Key** - [Get key](https://openrouter.ai/)
- **YouTube API Key** - [Get key](https://console.cloud.google.com/)
- **OPIK Account** - [Sign up](https://www.comet.com/site/products/opik/)

### Backend Setup

1. **Clone the repository**
   ```bash
   cd NAVIYA_testing/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file**
   ```bash
   # Copy the example below and fill in your credentials
   ```

5. **Configure environment variables** (create `backend/.env`)
   ```env
   # OpenRouter API (for LLM access)
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   GEMINI_MODEL=google/gemini-pro
   
   # YouTube API
   YOUTUBE_API_KEY=your_youtube_api_key_here
   
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_supabase_anon_key_here
   
   # OPIK Observability
   OPIK_API_KEY=your_opik_api_key_here
   OPIK_WORKSPACE=your_workspace_name
   OPIK_PROJECT=NAVIYA
   
   # Application Settings
   DEBUG=True
   ```

6. **Set up database**
   ```bash
   # Go to Supabase Dashboard > SQL Editor
   # Run the following files in order:
   # 1. data/schema.sql or data/schema_v2.sql
   # 2. data/career_roadmap_schema.sql
   # 3. data/resume_analysis_schema.sql
   # 4. data/skill_assessments_schema.sql
   # 5. data/mentor_messages_schema.sql
   # 6. data/agent_activity_log_schema.sql
   # 7. data/dashboard_state_schema.sql
   # 8. data/fix_foreign_keys.sql
   ```

7. **Initialize RAG (Optional - for document search)**
   ```bash
   # Place your documents in backend/data/documents/
   python -m app.rag.document_loader
   ```

8. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The backend will be available at: `http://localhost:8000`
   API docs at: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (create `frontend/.env`)
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at: `http://localhost:5173`

---

## ⚙️ Configuration

### API Keys Setup

#### 1. OpenRouter (LLM Access)
1. Visit [OpenRouter](https://openrouter.ai/)
2. Create an account and generate an API key
3. Add to `.env`: `OPENROUTER_API_KEY=sk-or-...`

#### 2. YouTube Data API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)
5. Add to `.env`: `YOUTUBE_API_KEY=AIza...`

#### 3. Supabase
1. Create account at [Supabase](https://supabase.com/)
2. Create a new project
3. Go to Settings > API
4. Copy URL and anon/public key
5. Add to `.env`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_KEY=eyJhbGc...
   ```
6. Run all SQL schema files in SQL Editor

#### 4. OPIK (Observability)
1. Sign up at [OPIK](https://www.comet.com/site/products/opik/)
2. Create a workspace and project
3. Generate API key
4. Add to `.env`:
   ```
   OPIK_API_KEY=your_key
   OPIK_WORKSPACE=your_workspace
   OPIK_PROJECT=NAVIYA
   ```

### Database Setup

Run the SQL files in Supabase SQL Editor in this order:

1. **Main Schema**: `data/schema_v2.sql`
2. **Career Roadmap**: `data/career_roadmap_schema.sql`
3. **Resume Analysis**: `data/resume_analysis_schema.sql`
4. **Skill Assessments**: `data/skill_assessments_schema.sql`
5. **Mentor Messages**: `data/mentor_messages_schema.sql`
6. **Activity Log**: `data/agent_activity_log_schema.sql`
7. **Dashboard State**: `data/dashboard_state_schema.sql`
8. **Fix Foreign Keys**: `data/fix_foreign_keys.sql`

---

## 💻 Usage

### Starting the Application

1. **Start Backend** (in `backend/` directory)
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start Frontend** (in `frontend/` directory)
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - OPIK Dashboard: https://www.comet.com/

### User Journey

1. **Registration & Authentication**
   - Visit the welcome page
   - Sign up with email/password
   - Authenticate via Supabase Auth

2. **Onboarding**
   - Complete the onboarding questionnaire
   - Provide career goals and current skills
   - Set your learning preferences

3. **Career Dashboard**
   - View your personalized career dashboard
   - Track progress across all modules
   - Access quick actions and recommendations

4. **Generate Career Roadmap**
   - Navigate to Career Roadmap
   - Enter your target role (e.g., "Senior Software Engineer")
   - AI generates a step-by-step career path
   - Track milestones and mark completed

5. **Resume Analysis**
   - Upload your resume (PDF, DOCX)
   - AI analyzes and provides optimization suggestions
   - Get ATS score and improvement recommendations
   - Download optimized version

6. **Skills Assessment**
   - Choose a skill domain to test
   - Take adaptive assessment (adjusts difficulty)
   - View comprehensive skill report
   - Get personalized improvement plan

7. **Learning Roadmaps**
   - Enter a topic you want to learn
   - Choose difficulty mode (Quick/Standard/Comprehensive)
   - AI generates learning path with YouTube videos
   - Track progress and mark steps completed

8. **AI Mentor Chat**
   - Ask career-related questions
   - Get personalized advice and guidance
   - Multi-turn conversations with context
   - Save important conversations

9. **Observability**
   - View system metrics and traces
   - Check evaluation scores
   - Monitor API performance
   - Review safety metrics

### Testing Endpoints

Use the interactive API docs at `http://localhost:8000/docs` or use curl/Postman:

```bash
# Health check
curl http://localhost:8000/

# Generate learning roadmap
curl -X POST http://localhost:8000/generate-learning-plan \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Machine Learning",
    "difficulty": "standard",
    "user_id": "your-user-id"
  }'

# Chat with mentor
curl -X POST http://localhost:8000/api/mentor/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "message": "How do I become a data scientist?"
  }'

# Get observability metrics
curl http://localhost:8000/api/observability/dashboard
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000
```

### Authentication
All protected endpoints require authentication via Supabase JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Learning Roadmaps

**Generate Learning Plan**
```http
POST /generate-learning-plan
Content-Type: application/json

{
  "topic": "Python Programming",
  "difficulty": "standard",  // quick, standard, comprehensive
  "user_id": "uuid"
}

Response: {
  "roadmap": [...],
  "videos": [...],
  "evaluation": {...},
  "trace_id": "string"
}
```

**Deepen Roadmap**
```http
POST /roadmap/deepen
Content-Type: application/json

{
  "step": "Learn Python Basics",
  "context": "User wants advanced topics"
}
```

#### Career Intelligence

**Generate Career Roadmap**
```http
POST /api/career/roadmap/generate
Content-Type: application/json

{
  "user_id": "uuid",
  "target_role": "Senior Software Engineer",
  "current_role": "Junior Developer",
  "timeline_months": 24
}
```

**Analyze Resume**
```http
POST /api/resume/analyze
Content-Type: multipart/form-data

file: resume.pdf
user_id: uuid
target_role: "Data Scientist"
```

**Start Skill Assessment**
```http
POST /api/skill-assessment/start
Content-Type: application/json

{
  "user_id": "uuid",
  "skill": "Python Programming",
  "difficulty": "intermediate"
}
```

#### AI Mentor

**Send Message**
```http
POST /api/mentor/chat
Content-Type: application/json

{
  "user_id": "uuid",
  "message": "How do I improve my coding skills?",
  "conversation_id": "uuid" // optional
}
```

**Get Conversation History**
```http
GET /api/mentor/conversations/{user_id}
```

#### Observability

**Dashboard Metrics**
```http
GET /api/observability/dashboard

Response: {
  "total_traces": 150,
  "total_spans": 892,
  "avg_latency": 1.25,
  "success_rate": 0.98,
  "llm_calls": 450,
  "evaluations": {...},
  "safety_metrics": {...}
}
```

**Recent Traces**
```http
GET /api/observability/traces?limit=10
```

#### Safety

**Check Content Safety**
```http
POST /api/safety/check
Content-Type: application/json

{
  "text": "Content to check",
  "check_pii": true,
  "check_harmful": true
}

Response: {
  "is_safe": true,
  "pii_detected": [],
  "harmful_content": [],
  "risk_score": 0.0
}
```

#### Evaluation

**Evaluate Learning Plan**
```http
POST /api/evaluate/plan
Content-Type: application/json

{
  "topic": "Machine Learning",
  "roadmap": [...],
  "videos": [...]
}

Response: {
  "relevance_score": 8.5,
  "quality_score": 9.0,
  "simplicity_score": 7.5,
  "progressive_score": 8.0,
  "overall_score": 8.25
}
```

**Run Regression Tests**
```http
POST /api/tests/regression

Response: {
  "total_tests": 12,
  "passed": 11,
  "failed": 1,
  "pass_rate": 0.92,
  "results": [...]
}
```

### Response Format

All API responses follow this structure:

**Success Response**
```json
{
  "status": "success",
  "data": {...},
  "message": "Operation completed successfully",
  "timestamp": "2026-02-03T10:30:00Z"
}
```

**Error Response**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {...}
  },
  "timestamp": "2026-02-03T10:30:00Z"
}
```

### Rate Limiting

- **Free tier**: 100 requests/hour
- **Authenticated**: 1000 requests/hour
- **Premium**: Unlimited

---

## 🤖 AI Agents

### Agent Architecture

NAVIYA uses a multi-agent system built with LangGraph:

#### 1. **Supervisor Agent**
- **Role**: Orchestrates all other agents
- **Responsibilities**:
  - Routes user requests to appropriate agents
  - Manages agent communication
  - Aggregates responses
  - Handles errors and fallbacks

#### 2. **Roadmap Agent**
- **Role**: Career path planning
- **Capabilities**:
  - Analyzes target role requirements
  - Generates step-by-step milestones
  - Suggests resources and timelines
  - Adapts based on user progress

#### 3. **Mentor Agent**
- **Role**: Conversational career advisor
- **Capabilities**:
  - Multi-turn dialogues with context
  - Career guidance and advice
  - Emotional support
  - Job search strategies

#### 4. **Resume Intelligence Agent**
- **Role**: Resume analysis and optimization
- **Capabilities**:
  - Deep resume parsing
  - ATS optimization
  - Skills gap analysis
  - Job-specific tailoring

#### 5. **Skill Evaluation Agent**
- **Role**: Adaptive skill assessment
- **Capabilities**:
  - Dynamic question generation
  - Difficulty adjustment
  - Comprehensive reporting
  - Improvement recommendations

#### 6. **Learning Graph Agent**
- **Role**: YouTube-based learning roadmaps
- **Capabilities**:
  - Topic analysis
  - Difficulty determination
  - Video curation
  - Progress tracking

### Agent Communication Flow

```
User Request
     ↓
Supervisor Agent (Analyzes intent)
     ↓
[Determines required agents]
     ↓
┌────────────┬─────────────┬──────────────┐
│            │             │              │
Roadmap    Mentor      Resume        Skills
Agent      Agent       Agent         Agent
│            │             │              │
└────────────┴─────────────┴──────────────┘
     ↓
Supervisor Agent (Aggregates)
     ↓
Final Response
```

---

## 🗄️ Database Schema

### Core Tables

#### **users** (Supabase Auth)
- `id` (UUID, PK)
- `email`
- `created_at`
- `metadata`

#### **onboarding_profiles**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `current_role`
- `target_role`
- `skills`
- `interests`
- `learning_style`
- `completed_at`

#### **career_roadmaps**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `target_role`
- `current_role`
- `timeline_months`
- `milestones` (JSONB)
- `status`
- `created_at`
- `updated_at`

#### **resume_documents**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `file_url`
- `file_type`
- `analysis_result` (JSONB)
- `ats_score`
- `uploaded_at`

#### **skill_assessments**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `skill_name`
- `difficulty_level`
- `questions` (JSONB)
- `answers` (JSONB)
- `score`
- `completed_at`

#### **mentor_conversations**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `conversation_id` (UUID)
- `messages` (JSONB)
- `context` (JSONB)
- `created_at`
- `updated_at`

#### **learning_plans**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `topic`
- `difficulty`
- `roadmap` (JSONB)
- `videos` (JSONB)
- `progress` (JSONB)
- `status`
- `created_at`

#### **agent_activity_log**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `agent_name`
- `action`
- `input_data` (JSONB)
- `output_data` (JSONB)
- `status`
- `error_details`
- `duration_ms`
- `timestamp`

#### **dashboard_state**
- `id` (UUID, PK)
- `user_id` (FK → auth.users)
- `state_data` (JSONB)
- `last_updated`

---

## 🧪 Testing

### Backend Tests

Run all tests:
```bash
cd backend

# Test LLM integration
python test_llm.py

# Test agents
python test_supervisor.py
python test_mentor_agent.py
python test_roadmap_agent.py
python test_resume_intelligence_agent.py

# Test learning graph
python test_learning_graph.py

# Test OPIK integration
python test_opik_integration.py

# Test skill evaluation
python test_skill_evaluation.py
```

### Regression Tests

Run automated regression tests:
```bash
# Via API
curl -X POST http://localhost:8000/api/tests/regression

# Via Python
python test_regression.py
```

### Manual Testing Checklist

- [ ] User registration and authentication
- [ ] Onboarding flow completion
- [ ] Career roadmap generation
- [ ] Resume upload and analysis
- [ ] Skills assessment (full flow)
- [ ] Mentor chat (multi-turn)
- [ ] Learning roadmap generation
- [ ] Video playback and progress tracking
- [ ] Observability dashboard metrics
- [ ] Safety guardrails (PII detection)

---

## 🚀 Deployment

### Backend Deployment (Railway/Render)

1. **Create account** on Railway or Render
2. **Connect GitHub repository**
3. **Set environment variables** (all from `.env`)
4. **Configure build command**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Configure start command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
   ```

### Frontend Deployment (Vercel/Netlify)

1. **Create account** on Vercel or Netlify
2. **Import repository**
3. **Configure build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Set environment variables**:
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

### Production Checklist

- [ ] Update CORS origins in `backend/app/main.py`
- [ ] Set `DEBUG=False` in backend `.env`
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Configure proper API rate limiting
- [ ] Set up monitoring and alerting
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CDN for static assets
- [ ] Set up database backups
- [ ] Enable error tracking (Sentry)
- [ ] Configure logging infrastructure

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**
   ```bash
   git commit -m "feat: add new career roadmap algorithm"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### Code Style

**Python (Backend)**
- Follow PEP 8
- Use type hints
- Write docstrings for functions/classes
- Keep functions focused and small

**JavaScript/React (Frontend)**
- Use ES6+ features
- Functional components with hooks
- Descriptive variable names
- Consistent formatting (Prettier)

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 👥 Team

**NAVIYA Development Team**

- Lead Developer: [Your Name]
- AI/ML Engineer: [Team Member]
- Frontend Developer: [Team Member]
- Backend Developer: [Team Member]

---

## 🙏 Acknowledgments

- **LangChain** for the amazing LLM framework
- **FastAPI** for the high-performance backend framework
- **React** team for the excellent frontend library
- **Supabase** for the developer-friendly backend platform
- **OPIK** for comprehensive LLM observability
- **Google** for Gemini LLM access
- **OpenRouter** for unified LLM API access

---

## 📧 Contact & Support

- **Documentation**: [Full Docs](./backend/OPIK_INTEGRATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@naviya.ai
- **Discord**: [Join our community](https://discord.gg/naviya)

---

## 🗺️ Roadmap

### Version 2.1 (Q2 2026)
- [ ] Mobile app (React Native)
- [ ] Advanced interview simulator with voice
- [ ] LinkedIn integration
- [ ] Job matching algorithm
- [ ] Salary negotiation coach

### Version 2.2 (Q3 2026)
- [ ] Multi-language support
- [ ] Company culture matching
- [ ] Network visualization
- [ ] Peer learning groups
- [ ] Certification tracking

### Version 3.0 (Q4 2026)
- [ ] VR/AR interview practice
- [ ] Blockchain credentials
- [ ] Decentralized identity
- [ ] Web3 integration
- [ ] AI avatar mentor

---

## ⚡ Quick Links

- [Installation Guide](#-installation)
- [API Documentation](#-api-documentation)
- [Agent Architecture](#-ai-agents)
- [Database Schema](#-database-schema)
- [Contributing Guidelines](#-contributing)

---

<div align="center">

**Built with ❤️ by the NAVIYA Team**

[⭐ Star us on GitHub](https://github.com/your-repo) | [📖 Read the Docs](./docs) | [💬 Join Discord](https://discord.gg/naviya)

</div>
