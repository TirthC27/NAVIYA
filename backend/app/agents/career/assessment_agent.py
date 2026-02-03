"""
Assessment Agent

Generates and evaluates skill assessments.
Creates quizzes, tracks XP, and determines skill levels.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import uuid
import re
import random

from .base_agent import BaseAgent


class AssessmentAgent(BaseAgent):
    """
    The Assessment Agent creates and evaluates skill assessments.
    
    Responsibilities:
    - Generate skill-specific quiz questions
    - Evaluate answers and calculate scores
    - Determine skill levels based on results
    - Track XP and gamification elements
    - Update verified skill levels
    """
    
    agent_name = "AssessmentAgent"
    agent_description = "Creates skill assessments and evaluates user knowledge"
    
    # XP rewards
    XP_REWARDS = {
        "correct_answer": 10,
        "assessment_complete": 50,
        "level_up": 100,
        "perfect_score": 150
    }
    
    # Score thresholds for levels
    LEVEL_THRESHOLDS = {
        "beginner": 0,
        "intermediate": 50,
        "advanced": 75,
        "expert": 90
    }
    
    async def execute(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate assessment or evaluate answers.
        
        Args:
            user_id: The user's ID
            context: Contains 'skill_name', 'action', etc.
            
        Returns:
            Dict with questions or evaluation results
        """
        action = context.get("action", "generate")
        
        if action == "generate":
            return await self._generate_assessment(user_id, context)
        elif action == "evaluate":
            return await self._evaluate_assessment(user_id, context)
        elif action == "get_history":
            return await self._get_assessment_history(user_id)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _generate_assessment(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a skill assessment quiz."""
        skill_name = context.get("skill_name", "General Programming")
        difficulty = context.get("difficulty", "intermediate")
        num_questions = context.get("num_questions", 5)
        
        # Generate questions using LLM
        prompt = self._build_question_prompt(skill_name, difficulty, num_questions)
        response = await self.call_llm(
            prompt=prompt,
            system_prompt=self._get_question_system_prompt(),
            temperature=0.7
        )
        
        # Parse questions
        questions = self._parse_questions(response, skill_name, num_questions)
        
        # Create assessment record
        assessment_id = str(uuid.uuid4())
        
        try:
            self.supabase.table("skill_assessments").insert({
                "id": assessment_id,
                "user_id": user_id,
                "skill_name": skill_name,
                "difficulty": difficulty,
                "questions": questions,
                "status": "in_progress",
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Failed to create assessment: {e}")
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="generate_assessment",
            input_summary=f"Skill: {skill_name}, Difficulty: {difficulty}",
            output_summary=f"Generated {len(questions)} questions",
            metadata={"assessment_id": assessment_id}
        )
        
        # Return questions without answers
        safe_questions = [{
            "id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "difficulty": q.get("difficulty", difficulty)
        } for q in questions]
        
        return {
            "assessment_id": assessment_id,
            "skill_name": skill_name,
            "difficulty": difficulty,
            "questions": safe_questions,
            "time_limit_minutes": num_questions * 2
        }
    
    def _build_question_prompt(
        self, 
        skill_name: str, 
        difficulty: str, 
        num_questions: int
    ) -> str:
        """Build prompt for question generation."""
        return f"""Create {num_questions} multiple-choice questions to assess knowledge of {skill_name}.

Difficulty level: {difficulty}
- beginner: Basic concepts and syntax
- intermediate: Practical application and common patterns
- advanced: Complex scenarios and best practices
- expert: Edge cases, optimization, architecture

For each question provide:
- question: Clear, specific question text
- options: Exactly 4 options labeled A, B, C, D
- correct_answer: The letter of the correct option
- explanation: Brief explanation of why the answer is correct

Respond with JSON:
{{
    "questions": [
        {{
            "question": "Question text",
            "options": {{"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"}},
            "correct_answer": "A",
            "explanation": "Explanation"
        }}
    ]
}}"""
    
    def _get_question_system_prompt(self) -> str:
        """Get the system prompt for question generation."""
        return """You are an expert technical interviewer and assessment creator.
Create clear, unambiguous questions that accurately test knowledge.
Ensure:
- Questions are specific and testable
- All options are plausible (no obvious wrong answers)
- Only one option is definitively correct
- Questions cover different aspects of the topic
- Difficulty matches the specified level

Always respond with valid JSON only."""
    
    def _parse_questions(
        self, 
        response: str, 
        skill_name: str,
        num_questions: int
    ) -> List[Dict]:
        """Parse LLM response into question objects."""
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                questions = data.get("questions", [])
                
                # Add IDs and ensure structure
                for i, q in enumerate(questions):
                    q["id"] = str(uuid.uuid4())
                    q["index"] = i + 1
                
                return questions[:num_questions]
        except json.JSONDecodeError:
            pass
        
        # Fallback questions
        return self._get_fallback_questions(skill_name, num_questions)
    
    def _get_fallback_questions(self, skill_name: str, num: int) -> List[Dict]:
        """Generate fallback questions if LLM fails."""
        return [{
            "id": str(uuid.uuid4()),
            "index": i + 1,
            "question": f"What is an important concept in {skill_name}?",
            "options": {
                "A": "Concept A",
                "B": "Concept B", 
                "C": "Concept C",
                "D": "Concept D"
            },
            "correct_answer": "A",
            "explanation": "This is a fundamental concept."
        } for i in range(num)]
    
    async def _evaluate_assessment(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate submitted assessment answers."""
        assessment_id = context.get("assessment_id")
        answers = context.get("answers", {})  # {question_id: "A"}
        
        # Fetch the assessment
        try:
            result = self.supabase.table("skill_assessments")\
                .select("*")\
                .eq("id", assessment_id)\
                .single()\
                .execute()
            assessment = result.data
        except Exception:
            return {"error": "Assessment not found"}
        
        if not assessment:
            return {"error": "Assessment not found"}
        
        questions = assessment.get("questions", [])
        skill_name = assessment.get("skill_name", "")
        
        # Grade answers
        correct = 0
        results = []
        
        for q in questions:
            q_id = q.get("id")
            user_answer = answers.get(q_id, "")
            is_correct = user_answer.upper() == q.get("correct_answer", "").upper()
            
            if is_correct:
                correct += 1
            
            results.append({
                "question_id": q_id,
                "user_answer": user_answer,
                "correct_answer": q.get("correct_answer"),
                "is_correct": is_correct,
                "explanation": q.get("explanation", "")
            })
        
        # Calculate score and level
        score = (correct / len(questions)) * 100 if questions else 0
        determined_level = self._determine_level(score)
        
        # Calculate XP earned
        xp_earned = correct * self.XP_REWARDS["correct_answer"]
        xp_earned += self.XP_REWARDS["assessment_complete"]
        if score == 100:
            xp_earned += self.XP_REWARDS["perfect_score"]
        
        # Update assessment record
        try:
            self.supabase.table("skill_assessments")\
                .update({
                    "answers": answers,
                    "score": score,
                    "results": results,
                    "determined_level": determined_level,
                    "xp_earned": xp_earned,
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat()
                })\
                .eq("id", assessment_id)\
                .execute()
        except Exception as e:
            print(f"Failed to update assessment: {e}")
        
        # Update user's skill level
        await self._update_skill_level(user_id, skill_name, determined_level)
        
        # Update user's total XP
        await self._add_user_xp(user_id, xp_earned)
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="complete_assessment",
            input_summary=f"Assessment: {assessment_id}",
            output_summary=f"Score: {score:.0f}%, Level: {determined_level}, XP: +{xp_earned}",
            metadata={
                "assessment_id": assessment_id,
                "score": score,
                "level": determined_level
            }
        )
        
        return {
            "assessment_id": assessment_id,
            "skill_name": skill_name,
            "score": score,
            "correct_count": correct,
            "total_questions": len(questions),
            "determined_level": determined_level,
            "xp_earned": xp_earned,
            "results": results,
            "feedback": self._generate_feedback(score, skill_name)
        }
    
    def _determine_level(self, score: float) -> str:
        """Determine skill level based on score."""
        if score >= 90:
            return "expert"
        elif score >= 75:
            return "advanced"
        elif score >= 50:
            return "intermediate"
        else:
            return "beginner"
    
    def _generate_feedback(self, score: float, skill_name: str) -> str:
        """Generate feedback based on score."""
        if score >= 90:
            return f"Excellent! You've demonstrated expert-level knowledge of {skill_name}."
        elif score >= 75:
            return f"Great job! You have advanced understanding of {skill_name}."
        elif score >= 50:
            return f"Good effort! You have solid intermediate skills in {skill_name}. Keep practicing!"
        else:
            return f"Keep learning! Focus on {skill_name} fundamentals to build a stronger foundation."
    
    async def _update_skill_level(
        self, 
        user_id: str, 
        skill_name: str, 
        level: str
    ) -> None:
        """Update the user's verified skill level."""
        try:
            self.supabase.table("user_skills")\
                .update({
                    "skill_level": level,
                    "verified": True,
                    "verified_at": datetime.utcnow().isoformat()
                })\
                .eq("user_id", user_id)\
                .eq("skill_name", skill_name)\
                .execute()
        except Exception as e:
            print(f"Failed to update skill level: {e}")
    
    async def _add_user_xp(self, user_id: str, xp: int) -> None:
        """Add XP to the user's profile."""
        try:
            # Get current XP
            result = self.supabase.table("user_career_profile")\
                .select("total_xp")\
                .eq("user_id", user_id)\
                .single()\
                .execute()
            
            current_xp = result.data.get("total_xp", 0) if result.data else 0
            
            # Update XP
            self.supabase.table("user_career_profile")\
                .update({"total_xp": current_xp + xp})\
                .eq("user_id", user_id)\
                .execute()
        except Exception as e:
            print(f"Failed to add XP: {e}")
    
    async def _get_assessment_history(self, user_id: str) -> Dict[str, Any]:
        """Get the user's assessment history."""
        try:
            result = self.supabase.table("skill_assessments")\
                .select("id, skill_name, score, determined_level, xp_earned, completed_at")\
                .eq("user_id", user_id)\
                .eq("status", "completed")\
                .order("completed_at", desc=True)\
                .limit(20)\
                .execute()
            
            assessments = result.data or []
            
            # Calculate stats
            total_xp = sum(a.get("xp_earned", 0) for a in assessments)
            avg_score = sum(a.get("score", 0) for a in assessments) / len(assessments) if assessments else 0
            
            return {
                "assessments": assessments,
                "total_completed": len(assessments),
                "total_xp_earned": total_xp,
                "average_score": avg_score
            }
        except Exception:
            return {"assessments": [], "total_completed": 0}
