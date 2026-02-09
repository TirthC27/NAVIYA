"""
Skill Roadmap Agent - Core Logic
Generates visual skill-gap roadmaps with LLM analysis and YouTube tutorials.
"""

import json
import re
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx

from .config import AgentConfig


class SkillRoadmapAgent:
    """
    AI agent for generating personalized skill roadmaps.
    
    Workflow:
    1. Fetch user's current skills from resume
    2. Analyze skill gaps using LLM
    3. Generate visual graph (nodes + edges)
    4. Find YouTube tutorials for each gap
    5. Save roadmap to database
    """
    
    ROADMAP_SYSTEM_PROMPT = """You are a career skills analysis expert. Given a user's career goal and their current skills, you must:

1. Identify ALL skills required for the career goal
2. Determine which skills the user already has
3. Identify missing/gap skills
4. Create a learning roadmap as a directed graph (nodes + links)
5. Assign a STEP NUMBER (1, 2, 3...) to each skill showing the recommended learning ORDER

RULES:
- Each skill is a node with: id, label, category, status (has/missing), level (1=beginner basics, 2=intermediate, 3=advanced), step (sequential learning order)
- STEP NUMBERS show the exact sequence: Step 1 = learn first, Step 2 = learn second, etc.
- For skills the user already has, assign step numbers based on where they would fall in the learning path
- For missing skills, assign step numbers in the order they SHOULD be learned
- Links show learning flow: ALWAYS from LOWER step to HIGHER step (e.g., Step 1 → Step 2 → Step 3 → Goal)
- Link direction CRITICAL: "source" must be the EARLIER/PREREQUISITE skill, "target" must be the LATER/DEPENDENT skill
- Example: If Python (step 1) is needed before Django (step 4), link is { "source": "skill_python", "target": "skill_django" }
- ALL skills should eventually connect to the goal node (step 0) either directly or through other skills
- The career goal itself is the ROOT node (id: "goal", step: 0)
- Group skills into categories: "foundation", "core", "advanced", "specialization"
- Be realistic and comprehensive — include 10-20 skill nodes
- Number the steps sequentially starting from 1 for the first skill, incrementing for each subsequent skill

Return ONLY valid JSON matching this exact structure:

{
  "career_goal": "the career title",
  "summary": "brief 2-sentence analysis of the user's position",
  "nodes": [
    {
      "id": "goal",
      "label": "Career Goal Title",
      "category": "goal",
      "status": "goal",
      "level": 0,
      "step": 0,
      "description": "Brief description"
    },
    {
      "id": "skill_python",
      "label": "Python",
      "category": "foundation",
      "status": "has",
      "level": 1,
      "step": 1,
      "description": "General-purpose programming language"
    },
    {
      "id": "skill_django",
      "label": "Django",
      "category": "core",
      "status": "missing",
      "level": 2,
      "step": 4,
      "description": "Python web framework",
      "search_query": "Django tutorial for beginners 2024"
    },
    {
      "id": "skill_react",
      "label": "React",
      "category": "core",
      "status": "missing",
      "level": 2,
      "step": 5,
      "description": "Frontend UI library",
      "search_query": "React tutorial for beginners 2024"
    },
    {
      "id": "skill_databases",
      "label": "SQL & Databases",
      "category": "foundation",
      "status": "missing",
      "level": 1,
      "step": 2,
      "description": "Database fundamentals",
      "search_query": "SQL database tutorial"
    }
  ],
  "links": [
    { "source": "skill_python", "target": "skill_django" },
    { "source": "skill_databases", "target": "skill_django" },
    { "source": "skill_react", "target": "goal" },
    { "source": "skill_django", "target": "goal" }
  ],
  "missing_count": 5,
  "has_count": 8
}

CRITICAL:
- ALWAYS include a "step" number for every node (0 for goal, 1+ for skills in learning order)
- LINK DIRECTION RULE: In each link, "source" MUST have a LOWER step number than "target"
  Example: Python (step 1) → Django (step 4) means { "source": "skill_python", "target": "skill_django" }
  WRONG: { "source": "skill_django", "target": "skill_python" } ❌ (higher step pointing to lower step)
  RIGHT: { "source": "skill_python", "target": "skill_django" } ✓ (lower step pointing to higher step)
- For "missing" skills, include a "search_query" field with a good YouTube search query for learning that skill
- Make search_query specific and educational, e.g. "React hooks tutorial for beginners 2024"
- Ensure the graph is connected — every node should eventually lead to the goal
- Skills that user already "has" should NOT have search_query
- Step numbers should be SEQUENTIAL and reflect the recommended learning path order
- ALL links must flow from lower step numbers to higher step numbers (foundation → advanced → goal)
- Return ONLY valid JSON. No markdown, no code fences."""
    
    def __init__(self, config: Optional[AgentConfig] = None):
        """Initialize the agent with configuration"""
        self.config = config or AgentConfig.from_env()
        self.supabase_rest_url = f"{self.config.SUPABASE_URL}/rest/v1"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get Supabase API headers"""
        return {
            "apikey": self.config.SUPABASE_KEY,
            "Authorization": f"Bearer {self.config.SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    def _parse_llm_json(self, response: str) -> Dict:
        """Parse JSON from LLM response, handling markdown code blocks"""
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to extract JSON object
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
            return {}
    
    async def fetch_user_skills(self, user_id: str) -> tuple[List[str], List[Dict]]:
        """
        Fetch user's current skills and experience from resume data.
        Returns (skills_list, experience_list)
        """
        current_skills = []
        user_experience = []
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"{self.supabase_rest_url}/resume_data?user_id=eq.{user_id}&select=skills,experience,llm_extracted_data,full_name"
                resp = await client.get(url, headers=self._get_headers())
                if resp.status_code == 200 and resp.json():
                    data = resp.json()[0]
                    current_skills = data.get("skills", []) or []
                    user_experience = data.get("experience", []) or []
        except Exception as e:
            print(f"[SkillRoadmapAgent] Error fetching user skills: {e}")
        
        return current_skills, user_experience
    
    async def call_llm_for_analysis(
        self,
        career_goal: str,
        current_skills: List[str],
        user_experience: List[Dict],
        preferred_language: str = "English"
    ) -> Dict:
        """
        Call LLM to analyze skill gaps and generate roadmap structure.
        Uses the app.agents.llm module for actual LLM call.
        """
        # Import here to avoid circular dependency
        from app.agents.llm import call_gemini
        
        # Build prompt
        skills_text = ", ".join(current_skills[:50]) if current_skills else "No skills detected"
        exp_text = ""
        if user_experience:
            exp_entries = []
            for exp in user_experience[:5]:
                if isinstance(exp, dict):
                    exp_entries.append(f"{exp.get('title', '')} at {exp.get('company', '')}")
            exp_text = "; ".join(exp_entries) if exp_entries else "No experience listed"
        else:
            exp_text = "No experience listed"
        
        lang_note = ""
        if preferred_language and preferred_language.lower() != "english":
            lang_note = f"\nIMPORTANT: For search_query fields, add 'in {preferred_language}' to help find videos in the user's preferred language."
        
        prompt = f"""Career Goal: {career_goal}

Current Skills: {skills_text}

Experience: {exp_text}
{lang_note}
Analyze the gap between the user's current skills and what's needed for "{career_goal}".
Generate the skill roadmap graph as specified."""
        
        llm_response = await call_gemini(prompt, self.ROADMAP_SYSTEM_PROMPT)
        roadmap_data = self._parse_llm_json(llm_response)
        
        if not roadmap_data or "nodes" not in roadmap_data:
            raise ValueError("Failed to generate valid roadmap from LLM")
        
        print(f"[SkillRoadmapAgent] Generated: {len(roadmap_data.get('nodes', []))} nodes, {len(roadmap_data.get('links', []))} links")
        return roadmap_data
    
    async def save_to_database(
        self,
        user_id: str,
        career_goal: str,
        roadmap_data: Dict,
        preferred_language: str = "English"
    ) -> Optional[str]:
        """
        Save or update roadmap in Supabase.
        Returns the roadmap ID if successful, None otherwise.
        """
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                payload = {
                    "user_id": user_id,
                    "career_goal": career_goal,
                    "roadmap_data": roadmap_data,
                    "preferred_language": preferred_language,
                    "generated_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                # Check if same career goal exists for this user
                check_url = f"{self.supabase_rest_url}/skill_roadmap?user_id=eq.{user_id}&career_goal=eq.{career_goal}&select=id"
                check_resp = await client.get(check_url, headers=self._get_headers())
                print(f"[SkillRoadmapAgent] DB check: {check_resp.status_code} rows={len(check_resp.json()) if check_resp.status_code == 200 else 'N/A'}")
                
                if check_resp.status_code == 200 and check_resp.json():
                    # Update existing
                    row_id = check_resp.json()[0]["id"]
                    url = f"{self.supabase_rest_url}/skill_roadmap?id=eq.{row_id}"
                    resp = await client.patch(url, headers=self._get_headers(), json=payload)
                    print(f"[SkillRoadmapAgent] DB update: {resp.status_code} {resp.text[:200] if resp.status_code >= 400 else 'OK'}")
                    return row_id if resp.status_code in [200, 201] else None
                else:
                    # Insert new
                    url = f"{self.supabase_rest_url}/skill_roadmap"
                    resp = await client.post(url, headers=self._get_headers(), json=payload)
                    print(f"[SkillRoadmapAgent] DB insert: {resp.status_code} {resp.text[:300] if resp.status_code >= 400 else 'OK'}")
                    if resp.status_code in [200, 201] and resp.json():
                        rows = resp.json()
                        if isinstance(rows, list) and rows:
                            return rows[0].get("id")
                        elif isinstance(rows, dict):
                            return rows.get("id")
                    return None
                
        except Exception as e:
            print(f"[SkillRoadmapAgent] DB save FAILED: {type(e).__name__}: {e}")
            return None
    
    async def fetch_videos_for_skill(
        self,
        search_query: str,
        preferred_language: str = "English",
        max_results: int = 3
    ) -> List[Dict]:
        """
        Fetch YouTube tutorials for a specific skill.
        Returns list of video objects with quality scores.
        """
        from app.youtube.client import search_videos, get_video_details, calculate_video_score
        
        try:
            query = search_query
            if preferred_language and preferred_language.lower() != "english":
                query = f"{search_query} in {preferred_language}"
            
            video_ids = await search_videos(query, max_results=15)
            if not video_ids:
                return []
            
            videos = await get_video_details(video_ids)
            
            # Score and filter
            scored_videos = []
            for video in videos:
                duration = video.get("duration_seconds", 0)
                if duration >= 60:  # At least 1 minute
                    video["quality_score"] = calculate_video_score(video, search_query)
                    scored_videos.append(video)
            
            # Sort by score, return top N
            scored_videos.sort(key=lambda v: v["quality_score"], reverse=True)
            return scored_videos[:max_results]
            
        except Exception as e:
            print(f"[SkillRoadmapAgent] Video search error: {e}")
            return []
    
    async def generate_roadmap(
        self,
        user_id: str,
        career_goal: str,
        preferred_language: str = "English"
    ) -> Dict:
        """
        Main method: Generate complete skill roadmap.
        
        Returns:
        {
            "success": bool,
            "roadmap": dict,  # nodes and links
            "career_goal": str,
            "current_skills_count": int
        }
        """
        if not career_goal or len(career_goal.strip()) < 3:
            return {"success": False, "error": "Please enter a valid career goal"}
        
        # 1. Fetch current skills
        current_skills, user_experience = await self.fetch_user_skills(user_id)
        
        # 2. Call LLM for analysis
        try:
            roadmap_data = await self.call_llm_for_analysis(
                career_goal,
                current_skills,
                user_experience,
                preferred_language
            )
        except Exception as e:
            print(f"[SkillRoadmapAgent] LLM error: {e}")
            return {"success": False, "error": f"AI analysis failed: {str(e)}"}
        
        # 3. Save to database
        roadmap_id = await self.save_to_database(
            user_id,
            career_goal,
            roadmap_data,
            preferred_language
        )
        
        # 4. Return result
        return {
            "success": True,
            "roadmap": roadmap_data,
            "roadmap_id": roadmap_id,
            "current_skills_count": len(current_skills),
            "career_goal": career_goal,
            "saved": roadmap_id is not None
        }
    
    async def get_roadmap_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """
        Get all saved roadmaps for a user.
        Returns list of roadmap summaries for the history card view.
        """
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"{self.supabase_rest_url}/skill_roadmap?user_id=eq.{user_id}&order=updated_at.desc&limit={limit}&select=id,career_goal,preferred_language,generated_at,updated_at,roadmap_data"
                resp = await client.get(url, headers=self._get_headers())
                if resp.status_code == 200:
                    rows = resp.json()
                    history = []
                    for row in rows:
                        rd = row.get("roadmap_data", {})
                        nodes = rd.get("nodes", [])
                        missing = sum(1 for n in nodes if n.get("status") == "missing")
                        has = sum(1 for n in nodes if n.get("status") == "has")
                        history.append({
                            "id": row["id"],
                            "career_goal": row.get("career_goal", ""),
                            "preferred_language": row.get("preferred_language", "English"),
                            "generated_at": row.get("generated_at"),
                            "updated_at": row.get("updated_at"),
                            "total_skills": len(nodes) - 1,  # exclude goal node
                            "missing_count": missing,
                            "has_count": has,
                            "summary": rd.get("summary", ""),
                        })
                    return history
        except Exception as e:
            print(f"[SkillRoadmapAgent] Error fetching history: {e}")
        
        return []
    
    async def load_roadmap_by_id(self, roadmap_id: str) -> Optional[Dict]:
        """
        Load a specific roadmap by ID.
        Returns roadmap data or None if not found.
        """
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"{self.supabase_rest_url}/skill_roadmap?id=eq.{roadmap_id}&limit=1"
                resp = await client.get(url, headers=self._get_headers())
                if resp.status_code == 200 and resp.json():
                    data = resp.json()[0]
                    return {
                        "roadmap": data.get("roadmap_data"),
                        "career_goal": data.get("career_goal"),
                        "preferred_language": data.get("preferred_language"),
                        "generated_at": data.get("generated_at")
                    }
        except Exception as e:
            print(f"[SkillRoadmapAgent] Error loading roadmap: {e}")
        
        return None
