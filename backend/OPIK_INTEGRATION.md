# Naviya AI - Hackathon-Grade Agentic Learning Platform

## 🚀 Overview

Naviya AI is an AI-powered YouTube learning platform that generates adaptive learning roadmaps with curated video content. This upgrade transforms it into a **production-grade agentic system** with comprehensive observability, evaluation, and safety features.

## ✨ New Features (OPIK Integration)

### 1. 📊 Full Pipeline Tracing
Every learning plan generation is fully traced with OPIK:
- **Trace**: `GenerateLearningPlan`
  - **Span**: DifficultyAnalyzer (LLM latency tracked)
  - **Span**: RoadmapGenerator (steps count, LLM latency)
  - **Span**: VideoFetcher (API calls, success rate)
  - **Span**: ResponseBuilder (final metrics)

### 2. 🎯 LLM-as-Judge Evaluations
Every plan is automatically evaluated across 4 dimensions:
- **Roadmap Relevance** (0-10): Are steps logically aligned with the topic?
- **Video Quality** (0-10): Is content educational, not clickbait?
- **Simplicity** (0-10): Is the roadmap digestible, not overwhelming?
- **Progressiveness** (0-10): Does it encourage gradual learning?

### 3. 🛡️ Safety Guardrails
Comprehensive content safety with:
- **PII Detection**: Emails, phones, SSN, crypto wallets, seed phrases
- **Cheating Detection**: Academic dishonesty, exam dumps, plagiarism
- **Unsafe Content**: Hacking, weapons, fraud, harmful activities
- **Metrics**: Block rate, false alarm rate, detection counts

### 4. 🧪 Regression Testing
Automated testing for model/prompt changes:
- **Golden Dataset**: 12+ test cases (simple, medium, hard, edge cases)
- **A/B Testing**: Compare configurations
- **Experiment Tracking**: Historical results
- **Pass/Fail Criteria**: Steps count, quality scores, keyword matching

## 📁 Project Structure

```
backend/app/
├── observability/
│   ├── __init__.py
│   └── opik_client.py      # OPIK integration & tracing
├── evals/
│   ├── __init__.py
│   ├── judges.py           # LLM-as-judge evaluations
│   └── regression_tests.py # Test suite & experiments
├── safety/
│   ├── __init__.py
│   └── pii_guard.py        # PII & content safety
├── agents/
│   └── learning_graph.py   # LangGraph with OPIK spans
└── main.py                 # FastAPI with all integrations
```

## 🔌 API Endpoints

### Core Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate-learning-plan` | POST | Generate traced learning plan with evaluations |
| `/roadmap/deepen` | POST | Generate deeper roadmap |
| `/step/complete` | POST | Mark step as completed |

### Observability Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/observability/dashboard` | GET | Full dashboard with traces & metrics |
| `/api/observability/traces` | GET | Recent traces list |
| `/api/observability/clear` | POST | Clear metrics buffer |

### Safety Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/safety/check` | POST | Run safety check on text |
| `/api/safety/metrics` | GET | Safety system metrics |
| `/api/safety/report-false-positive` | POST | Report false positive |

### Evaluation Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/evaluate/plan` | POST | Run LLM-as-judge on plan |
| `/api/tests/regression` | POST | Run regression tests |

### Demo Endpoint
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/demo/showcase` | GET | Hackathon feature showcase |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
Create `.env` file:
```env
OPENROUTER_API_KEY=your_key
YOUTUBE_API_KEY=your_key
OPIK_API_KEY=ARtXGDhLbJmFIP4VaT0XT14n5
OPIK_WORKSPACE=default
```

### 3. Run the Server
```bash
python -m uvicorn app.main:app --reload
```

### 4. View Dashboard
Open: http://localhost:8000/docs

## 📊 OPIK Dashboard

Access trace data through:
- **Real-time Metrics**: `/api/observability/dashboard`
- **Trace History**: `/api/observability/traces`
- **Safety Stats**: `/api/safety/metrics`

Example dashboard response:
```json
{
  "tracing": {
    "total_traces": 150,
    "success_rate": 0.95,
    "avg_duration_seconds": 4.2,
    "avg_scores": {
      "roadmap_relevance": 8.1,
      "video_quality": 7.8,
      "simplicity": 8.5,
      "progressiveness": 7.9
    }
  },
  "safety": {
    "total_checks": 200,
    "safety_block_rate": 0.02,
    "false_alarm_rate": 0.005
  }
}
```

## 🧪 Running Tests

### Quick Regression Test
```python
from app.evals import run_quick_regression

# Test with default topics
result = await run_quick_regression()

# Test with custom topics
result = await run_quick_regression([
    "Python basics",
    "React hooks",
    "Machine learning"
])
```

### Full Regression Suite
```python
from app.evals import RegressionTestRunner, GOLDEN_DATASET

runner = RegressionTestRunner()
result = await runner.run_experiment("v2.0-release")
```

### A/B Testing
```python
runner = RegressionTestRunner()
comparison = await runner.run_ab_test(
    baseline_name="current_prompt",
    variant_name="new_prompt"
)
```

## 🛡️ Safety Examples

### Blocked Request (Cheating)
```json
POST /generate-learning-plan
{
  "user_topic": "write my essay for me"
}

Response:
{
  "success": false,
  "blocked": true,
  "message": "I can't help with cheating. Let me suggest legitimate learning resources instead!"
}
```

### Blocked Request (PII)
```json
POST /api/safety/check
{
  "text": "Contact me at john@example.com or 555-123-4567"
}

Response:
{
  "is_safe": false,
  "category": "pii_email",
  "detected_items": ["email: john@example.com", "phone: 555-123-4567"],
  "should_block": true
}
```

## 🎯 Evaluation Example

```json
POST /api/evaluate/plan
{
  "learning_plan": {
    "topic": "React hooks",
    "learning_steps": [...]
  }
}

Response:
{
  "overall_score": 8.2,
  "evaluations": [
    {"dimension": "roadmap_relevance", "score": 8.5, "reason": "..."},
    {"dimension": "video_quality", "score": 7.8, "reason": "..."},
    {"dimension": "simplicity", "score": 8.5, "reason": "..."},
    {"dimension": "progressiveness", "score": 8.0, "reason": "..."}
  ],
  "recommendation": "Excellent learning plan! Ready for production use."
}
```

## 🏆 Hackathon Highlights

1. **Production-Ready**: Full observability, safety, and testing
2. **LLM-as-Judge**: Automated quality scoring
3. **Safety-First**: PII detection, cheating prevention
4. **Experiment-Ready**: A/B testing, regression suites
5. **Real-Time Dashboard**: Live metrics and traces

## 📈 Metrics Tracked

### Pipeline Metrics
- LLM latency (per node)
- API call counts
- Success/failure rates
- Total duration

### Quality Metrics
- Relevance scores
- Video quality scores
- Simplicity scores
- Progressiveness scores

### Safety Metrics
- Block rate
- False alarm rate
- Detection counts by category

## 🔧 Configuration

### OPIK Settings
```python
OPIK_API_KEY = "your_api_key"
OPIK_WORKSPACE = "default"
OPIK_PROJECT = "NaviyaAI"
```

### Safety Thresholds
- PII Detection: 95% confidence
- Unsafe Content: 90% confidence
- Seed Phrase Alert: 6+ BIP39 words

## 📝 License

MIT License - Built for hackathon demonstration purposes.
