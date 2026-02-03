"""
Skill Extractor Agent

Extracts and analyzes skills from resumes and other documents.
Identifies skill gaps and suggests improvements.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import uuid
import re

from .base_agent import BaseAgent


class SkillExtractorAgent(BaseAgent):
    """
    The Skill Extractor Agent processes resumes and extracts skills.
    
    Responsibilities:
    - Parse resume text/PDFs
    - Extract skills, experience, and education
    - Identify skill levels based on context
    - Compare with target role requirements
    - Identify skill gaps
    """
    
    agent_name = "SkillExtractorAgent"
    agent_description = "Extracts and analyzes skills from resumes and documents"
    
    # Common skill categories
    SKILL_CATEGORIES = {
        "programming_languages": [
            "python", "javascript", "typescript", "java", "c++", "c#", 
            "ruby", "go", "rust", "php", "swift", "kotlin"
        ],
        "frameworks": [
            "react", "angular", "vue", "django", "flask", "express",
            "spring", "rails", "nextjs", "fastapi", "node.js"
        ],
        "databases": [
            "postgresql", "mysql", "mongodb", "redis", "sqlite",
            "dynamodb", "cassandra", "elasticsearch"
        ],
        "cloud_devops": [
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
            "jenkins", "github actions", "ci/cd"
        ],
        "soft_skills": [
            "leadership", "communication", "teamwork", "problem-solving",
            "project management", "agile", "scrum"
        ]
    }
    
    async def execute(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract skills from resume or analyze skill gaps.
        
        Args:
            user_id: The user's ID
            context: Contains 'resume_text' or 'action'
            
        Returns:
            Dict with extracted skills or gap analysis
        """
        action = context.get("action", "extract")
        
        if action == "extract":
            return await self._extract_skills(user_id, context)
        elif action == "analyze_gaps":
            return await self._analyze_gaps(user_id, context)
        elif action == "recommend_roles":
            return await self._recommend_roles(user_id, context)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _extract_skills(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract skills from resume text."""
        resume_text = context.get("resume_text", "")
        
        if not resume_text:
            return {"error": "No resume text provided"}
        
        # Use LLM for comprehensive extraction
        prompt = self._build_extraction_prompt(resume_text)
        response = await self.call_llm(
            prompt=prompt,
            system_prompt=self._get_extraction_system_prompt(),
            temperature=0.3  # Lower temperature for consistency
        )
        
        # Parse the response
        extracted = self._parse_extraction_response(response)
        
        # Also do keyword-based extraction as fallback/supplement
        keyword_skills = self._extract_skills_by_keywords(resume_text)
        
        # Merge results
        all_skills = self._merge_skills(extracted.get("skills", []), keyword_skills)
        
        # Save to Supabase
        await self._save_extracted_skills(user_id, all_skills)
        await self._save_resume_analysis(user_id, resume_text, extracted)
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="extract_skills",
            input_summary=f"Resume: {len(resume_text)} chars",
            output_summary=f"Extracted {len(all_skills)} skills",
            metadata={"skill_count": len(all_skills)}
        )
        
        return {
            "skills": all_skills,
            "experience": extracted.get("experience", []),
            "education": extracted.get("education", []),
            "summary": extracted.get("summary", ""),
            "skill_count": len(all_skills)
        }
    
    def _build_extraction_prompt(self, resume_text: str) -> str:
        """Build the prompt for skill extraction."""
        # Truncate if too long
        text = resume_text[:8000] if len(resume_text) > 8000 else resume_text
        
        return f"""Analyze this resume and extract information:

RESUME TEXT:
{text}

Extract and return JSON with:
1. skills - list of objects with skill_name, category, and estimated_level (beginner/intermediate/advanced/expert)
2. experience - list of job experiences with title, company, duration
3. education - list of educational qualifications
4. summary - brief professional summary

Respond ONLY with valid JSON:
{{
    "skills": [
        {{"skill_name": "Python", "category": "programming_languages", "level": "advanced"}}
    ],
    "experience": [
        {{"title": "Software Engineer", "company": "Company", "duration": "2 years"}}
    ],
    "education": [
        {{"degree": "BS Computer Science", "institution": "University"}}
    ],
    "summary": "Brief summary"
}}"""
    
    def _get_extraction_system_prompt(self) -> str:
        """Get the system prompt for skill extraction."""
        return """You are an expert resume parser and skill analyst.
Extract skills accurately based on:
- Explicitly mentioned technologies
- Implied skills from job responsibilities
- Years of experience with each skill
- Context clues for skill level

Categorize skills as: programming_languages, frameworks, databases, cloud_devops, soft_skills, tools, other.
Estimate levels based on: usage context, years mentioned, responsibility level.

Always respond with valid JSON only."""
    
    def _parse_extraction_response(self, response: str) -> Dict[str, Any]:
        """Parse the LLM extraction response."""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
        
        return {"skills": [], "experience": [], "education": [], "summary": ""}
    
    def _extract_skills_by_keywords(self, text: str) -> List[Dict]:
        """Extract skills using keyword matching."""
        text_lower = text.lower()
        found_skills = []
        
        for category, skills in self.SKILL_CATEGORIES.items():
            for skill in skills:
                if skill.lower() in text_lower:
                    found_skills.append({
                        "skill_name": skill.title(),
                        "category": category,
                        "level": "intermediate",  # Default level
                        "source": "keyword_match"
                    })
        
        return found_skills
    
    def _merge_skills(self, llm_skills: List, keyword_skills: List) -> List[Dict]:
        """Merge skills from LLM and keyword extraction, avoiding duplicates."""
        seen = set()
        merged = []
        
        # Prefer LLM skills (they have better level estimation)
        for skill in llm_skills:
            name = skill.get("skill_name", "").lower()
            if name and name not in seen:
                seen.add(name)
                merged.append(skill)
        
        # Add keyword skills not already present
        for skill in keyword_skills:
            name = skill.get("skill_name", "").lower()
            if name and name not in seen:
                seen.add(name)
                merged.append(skill)
        
        return merged
    
    async def _save_extracted_skills(self, user_id: str, skills: List[Dict]) -> None:
        """Save extracted skills to user_skills table."""
        for skill in skills:
            try:
                self.supabase.table("user_skills").upsert({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "skill_name": skill.get("skill_name"),
                    "skill_level": skill.get("level", "intermediate"),
                    "category": skill.get("category", "other"),
                    "source": skill.get("source", "resume"),
                    "verified": False,
                    "updated_at": datetime.utcnow().isoformat()
                }, on_conflict="user_id,skill_name").execute()
            except Exception as e:
                print(f"Failed to save skill: {e}")
    
    async def _save_resume_analysis(
        self, 
        user_id: str, 
        resume_text: str, 
        extracted: Dict
    ) -> str:
        """Save resume analysis to resume_analysis table."""
        analysis_id = str(uuid.uuid4())
        
        try:
            self.supabase.table("resume_analysis").insert({
                "id": analysis_id,
                "user_id": user_id,
                "raw_text": resume_text[:10000],  # Limit storage
                "extracted_skills": extracted.get("skills", []),
                "experience": extracted.get("experience", []),
                "education": extracted.get("education", []),
                "analysis_summary": extracted.get("summary", ""),
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Failed to save resume analysis: {e}")
        
        return analysis_id
    
    async def _analyze_gaps(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze skill gaps compared to target role."""
        target_role = context.get("target_role", "Software Developer")
        
        # Get user's current skills
        current_skills = await self.get_user_skills(user_id)
        current_skill_names = {s.get("skill_name", "").lower() for s in current_skills}
        
        # Get required skills for target role (LLM)
        prompt = f"""List the top 15 most important skills for a {target_role} position.
For each skill, indicate:
- skill_name
- importance (critical/important/nice_to_have)
- category

Respond with JSON only:
{{"required_skills": [{{"skill_name": "X", "importance": "critical", "category": "Y"}}]}}"""
        
        response = await self.call_llm(prompt=prompt, temperature=0.3)
        
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                required = json.loads(json_match.group())
        except:
            required = {"required_skills": []}
        
        # Identify gaps
        gaps = []
        matched = []
        
        for skill in required.get("required_skills", []):
            skill_name = skill.get("skill_name", "").lower()
            if skill_name in current_skill_names:
                matched.append(skill)
            else:
                gaps.append(skill)
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="analyze_skill_gaps",
            input_summary=f"Target: {target_role}",
            output_summary=f"Found {len(gaps)} gaps, {len(matched)} matches",
            metadata={"target_role": target_role}
        )
        
        return {
            "target_role": target_role,
            "current_skills_count": len(current_skills),
            "matched_skills": matched,
            "skill_gaps": gaps,
            "match_percentage": (len(matched) / max(len(required.get("required_skills", [])), 1)) * 100,
            "recommendations": self._generate_gap_recommendations(gaps)
        }
    
    def _generate_gap_recommendations(self, gaps: List[Dict]) -> List[Dict]:
        """Generate recommendations for addressing skill gaps."""
        recommendations = []
        
        # Sort gaps by importance
        priority_order = {"critical": 0, "important": 1, "nice_to_have": 2}
        sorted_gaps = sorted(gaps, key=lambda x: priority_order.get(x.get("importance", "nice_to_have"), 2))
        
        for gap in sorted_gaps[:5]:  # Top 5 recommendations
            recommendations.append({
                "skill": gap.get("skill_name"),
                "priority": gap.get("importance"),
                "suggestion": f"Consider learning {gap.get('skill_name')} through online courses or projects"
            })
        
        return recommendations
    
    async def _recommend_roles(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Recommend roles based on current skills."""
        current_skills = await self.get_user_skills(user_id)
        
        if not current_skills:
            return {"error": "No skills found. Please upload your resume first."}
        
        skill_list = [s.get("skill_name") for s in current_skills[:15]]
        
        prompt = f"""Based on these skills: {', '.join(skill_list)}

Recommend 5 job roles this person would be a good fit for.
For each role, provide:
- role_name
- match_score (0-100)
- reasoning

Respond with JSON:
{{"recommended_roles": [{{"role_name": "X", "match_score": 85, "reasoning": "Y"}}]}}"""
        
        response = await self.call_llm(prompt=prompt, temperature=0.5)
        
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
                return result
        except:
            pass
        
        return {"recommended_roles": []}
