# Skill Roadmap Agent

AI-powered skill gap analysis and personalized learning roadmap generator.

## Features

- 🎯 **Career Goal Analysis** - Analyzes target career requirements vs. current skills
- 🗺️ **Visual Roadmap** - Generates interactive graph visualization with React Flow
- 📚 **Learning Resources** - Curates YouTube tutorials for each skill gap
- 💾 **Save & Load** - Persists roadmaps per career goal in Supabase
- 🌍 **Multi-language** - Supports tutorials in 8+ languages

## Architecture

```
SkillRoadmapAgent
├── analyze_skills()      # LLM-based skill gap analysis
├── generate_graph()      # Creates nodes and edges for visualization
├── fetch_videos()        # YouTube API integration
└── save_roadmap()        # Supabase persistence
```

## Usage

```python
from Agents.skill_roadmap_agent import SkillRoadmapAgent

agent = SkillRoadmapAgent()
roadmap = await agent.generate_roadmap(
    user_id="user-uuid",
    career_goal="Full Stack Developer",
    preferred_language="English"
)
```

## API Integration

The agent is exposed via FastAPI routes in `app/routes/skill_roadmap.py`:

- `POST /api/skill-roadmap/generate` - Generate new roadmap
- `GET /api/skill-roadmap/saved/{user_id}` - Get saved goals
- `GET /api/skill-roadmap/history/{user_id}` - Get roadmap history
- `GET /api/skill-roadmap/load/{roadmap_id}` - Load specific roadmap
- `GET /api/skill-roadmap/videos` - Fetch videos for a skill

## Configuration

Environment variables required:
- `OPENROUTER_API_KEY` - For LLM access (Gemini Flash)
- `YOUTUBE_API_KEY` - For tutorial search
- `SUPABASE_URL` - Database URL
- `SUPABASE_KEY` - Service role key

## Database Schema

See `backend/data/05_skill_roadmap.sql`
