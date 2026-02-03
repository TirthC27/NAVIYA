"""
Interview Agent

Conducts mock interviews and provides feedback.
Supports behavioral, technical, and system design interviews.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import uuid
import re

from .base_agent import BaseAgent


class InterviewAgent(BaseAgent):
    """
    The Interview Agent conducts mock interviews and evaluates responses.
    
    Responsibilities:
    - Generate role-specific interview questions
    - Conduct conversational mock interviews
    - Evaluate responses using STAR method
    - Provide detailed feedback and scores
    - Track interview performance over time
    """
    
    agent_name = "InterviewAgent"
    agent_description = "Conducts mock interviews and provides performance feedback"
    
    INTERVIEW_TYPES = {
        "behavioral": {
            "description": "Questions about past experiences and soft skills",
            "evaluation_criteria": ["STAR method", "clarity", "relevance", "impact"]
        },
        "technical": {
            "description": "Questions about technical knowledge and problem-solving",
            "evaluation_criteria": ["accuracy", "depth", "problem-solving", "communication"]
        },
        "system_design": {
            "description": "Questions about designing scalable systems",
            "evaluation_criteria": ["requirements gathering", "architecture", "trade-offs", "scalability"]
        },
        "case_study": {
            "description": "Business case analysis and problem-solving",
            "evaluation_criteria": ["structure", "analysis", "creativity", "feasibility"]
        }
    }
    
    DIFFICULTY_LEVELS = {
        "entry": {"question_count": 3, "complexity": "basic"},
        "mid": {"question_count": 4, "complexity": "moderate"},
        "senior": {"question_count": 5, "complexity": "advanced"},
        "lead": {"question_count": 5, "complexity": "expert"}
    }
    
    async def execute(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Conduct mock interview or evaluate responses.
        
        Args:
            user_id: The user's ID
            context: Contains interview parameters and actions
            
        Returns:
            Dict with questions, evaluation, or feedback
        """
        action = context.get("action", "start")
        
        if action == "start":
            return await self._start_interview(user_id, context)
        elif action == "get_question":
            return await self._get_next_question(user_id, context)
        elif action == "submit_answer":
            return await self._evaluate_answer(user_id, context)
        elif action == "complete":
            return await self._complete_interview(user_id, context)
        elif action == "get_history":
            return await self._get_interview_history(user_id)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _start_interview(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new mock interview session."""
        interview_type = context.get("interview_type", "behavioral")
        target_role = context.get("target_role", "Software Engineer")
        difficulty = context.get("difficulty", "mid")
        
        # Get user context
        profile = await self.get_user_profile(user_id)
        skills = await self.get_user_skills(user_id)
        
        # Generate questions
        config = self.DIFFICULTY_LEVELS.get(difficulty, self.DIFFICULTY_LEVELS["mid"])
        questions = await self._generate_questions(
            interview_type=interview_type,
            target_role=target_role,
            difficulty=difficulty,
            num_questions=config["question_count"],
            user_skills=skills
        )
        
        # Create interview record
        interview_id = str(uuid.uuid4())
        
        try:
            self.supabase.table("mock_interviews").insert({
                "id": interview_id,
                "user_id": user_id,
                "interview_type": interview_type,
                "target_role": target_role,
                "difficulty": difficulty,
                "questions": questions,
                "responses": [],
                "status": "in_progress",
                "started_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Failed to create interview: {e}")
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="start_interview",
            input_summary=f"Type: {interview_type}, Role: {target_role}, Level: {difficulty}",
            output_summary=f"Started with {len(questions)} questions",
            metadata={"interview_id": interview_id}
        )
        
        return {
            "interview_id": interview_id,
            "interview_type": interview_type,
            "target_role": target_role,
            "difficulty": difficulty,
            "total_questions": len(questions),
            "first_question": {
                "index": 1,
                "question": questions[0]["question"],
                "category": questions[0].get("category", interview_type)
            }
        }
    
    async def _generate_questions(
        self,
        interview_type: str,
        target_role: str,
        difficulty: str,
        num_questions: int,
        user_skills: List
    ) -> List[Dict]:
        """Generate interview questions using LLM."""
        skill_list = [s.get("skill_name") for s in (user_skills or [])[:10]]
        
        prompt = f"""Generate {num_questions} {interview_type} interview questions for a {target_role} position.

Difficulty: {difficulty}
Candidate's skills: {', '.join(skill_list) if skill_list else 'General'}

Interview type description: {self.INTERVIEW_TYPES.get(interview_type, {}).get("description", "")}

For each question provide:
- question: The interview question
- category: Specific category (e.g., "teamwork", "problem-solving", "algorithms")
- expected_points: Key points a good answer should cover
- follow_up: A potential follow-up question

Respond with JSON:
{{
    "questions": [
        {{
            "question": "Question text",
            "category": "Category",
            "expected_points": ["Point 1", "Point 2"],
            "follow_up": "Follow-up question"
        }}
    ]
}}"""
        
        response = await self.call_llm(
            prompt=prompt,
            system_prompt=self._get_interview_system_prompt(),
            temperature=0.7
        )
        
        return self._parse_questions(response, num_questions)
    
    def _get_interview_system_prompt(self) -> str:
        """Get the system prompt for interview question generation."""
        return """You are an experienced technical interviewer at a top tech company.
Generate realistic, challenging interview questions that:
- Are appropriate for the specified difficulty level
- Test both technical skills and soft skills
- Have clear evaluation criteria
- Are commonly asked in real interviews

For behavioral questions, focus on STAR-method friendly scenarios.
For technical questions, ensure they test practical knowledge.

Always respond with valid JSON only."""
    
    def _parse_questions(self, response: str, num_questions: int) -> List[Dict]:
        """Parse LLM response into question objects."""
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                questions = data.get("questions", [])
                
                for i, q in enumerate(questions):
                    q["id"] = str(uuid.uuid4())
                    q["index"] = i + 1
                
                return questions[:num_questions]
        except json.JSONDecodeError:
            pass
        
        # Fallback
        return [{
            "id": str(uuid.uuid4()),
            "index": i + 1,
            "question": f"Tell me about a challenging project you worked on.",
            "category": "experience",
            "expected_points": ["Context", "Actions", "Results"],
            "follow_up": "What would you do differently?"
        } for i in range(num_questions)]
    
    async def _evaluate_answer(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a single interview answer."""
        interview_id = context.get("interview_id")
        question_index = context.get("question_index", 1)
        answer = context.get("answer", "")
        
        # Fetch interview
        try:
            result = self.supabase.table("mock_interviews")\
                .select("*")\
                .eq("id", interview_id)\
                .single()\
                .execute()
            interview = result.data
        except Exception:
            return {"error": "Interview not found"}
        
        if not interview:
            return {"error": "Interview not found"}
        
        questions = interview.get("questions", [])
        current_question = questions[question_index - 1] if question_index <= len(questions) else None
        
        if not current_question:
            return {"error": "Invalid question index"}
        
        # Evaluate with LLM
        evaluation = await self._evaluate_with_llm(
            question=current_question["question"],
            answer=answer,
            expected_points=current_question.get("expected_points", []),
            interview_type=interview.get("interview_type", "behavioral")
        )
        
        # Store response
        responses = interview.get("responses", [])
        responses.append({
            "question_index": question_index,
            "answer": answer,
            "evaluation": evaluation,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        try:
            self.supabase.table("mock_interviews")\
                .update({"responses": responses})\
                .eq("id", interview_id)\
                .execute()
        except Exception as e:
            print(f"Failed to update interview: {e}")
        
        # Check if more questions
        has_more = question_index < len(questions)
        next_question = None
        if has_more:
            next_q = questions[question_index]
            next_question = {
                "index": question_index + 1,
                "question": next_q["question"],
                "category": next_q.get("category", "")
            }
        
        return {
            "evaluation": evaluation,
            "has_more_questions": has_more,
            "next_question": next_question,
            "progress": f"{question_index}/{len(questions)}"
        }
    
    async def _evaluate_with_llm(
        self,
        question: str,
        answer: str,
        expected_points: List[str],
        interview_type: str
    ) -> Dict[str, Any]:
        """Evaluate an answer using LLM."""
        criteria = self.INTERVIEW_TYPES.get(interview_type, {}).get(
            "evaluation_criteria", 
            ["clarity", "relevance", "depth"]
        )
        
        prompt = f"""Evaluate this interview response:

QUESTION: {question}

CANDIDATE'S ANSWER: {answer}

EXPECTED KEY POINTS: {', '.join(expected_points)}

EVALUATION CRITERIA: {', '.join(criteria)}

Provide evaluation with:
- overall_score: 0-100
- strengths: List of strong points
- improvements: Areas to improve
- criteria_scores: Score for each criterion (0-100)
- feedback: Detailed constructive feedback

Respond with JSON:
{{
    "overall_score": 75,
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Improvement 1"],
    "criteria_scores": {{"clarity": 80, "relevance": 70}},
    "feedback": "Detailed feedback"
}}"""
        
        response = await self.call_llm(prompt=prompt, temperature=0.3)
        
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
        
        return {
            "overall_score": 70,
            "strengths": ["Good attempt"],
            "improvements": ["Add more specific examples"],
            "criteria_scores": {c: 70 for c in criteria},
            "feedback": "Consider providing more detailed examples using the STAR method."
        }
    
    async def _complete_interview(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Complete an interview and generate overall feedback."""
        interview_id = context.get("interview_id")
        
        # Fetch interview
        try:
            result = self.supabase.table("mock_interviews")\
                .select("*")\
                .eq("id", interview_id)\
                .single()\
                .execute()
            interview = result.data
        except Exception:
            return {"error": "Interview not found"}
        
        if not interview:
            return {"error": "Interview not found"}
        
        responses = interview.get("responses", [])
        
        # Calculate overall score
        scores = [r.get("evaluation", {}).get("overall_score", 0) for r in responses]
        overall_score = sum(scores) / len(scores) if scores else 0
        
        # Aggregate strengths and improvements
        all_strengths = []
        all_improvements = []
        for r in responses:
            eval_data = r.get("evaluation", {})
            all_strengths.extend(eval_data.get("strengths", []))
            all_improvements.extend(eval_data.get("improvements", []))
        
        # Generate overall feedback with LLM
        overall_feedback = await self._generate_overall_feedback(
            interview_type=interview.get("interview_type"),
            target_role=interview.get("target_role"),
            overall_score=overall_score,
            strengths=all_strengths[:5],
            improvements=all_improvements[:5]
        )
        
        # Update interview as completed
        try:
            self.supabase.table("mock_interviews")\
                .update({
                    "status": "completed",
                    "overall_score": overall_score,
                    "overall_feedback": overall_feedback,
                    "completed_at": datetime.utcnow().isoformat()
                })\
                .eq("id", interview_id)\
                .execute()
        except Exception as e:
            print(f"Failed to complete interview: {e}")
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="complete_interview",
            input_summary=f"Interview: {interview_id}",
            output_summary=f"Score: {overall_score:.0f}%",
            metadata={
                "interview_id": interview_id,
                "score": overall_score
            }
        )
        
        return {
            "interview_id": interview_id,
            "overall_score": overall_score,
            "questions_answered": len(responses),
            "strengths": list(set(all_strengths))[:5],
            "improvements": list(set(all_improvements))[:5],
            "overall_feedback": overall_feedback,
            "recommendation": self._get_recommendation(overall_score)
        }
    
    async def _generate_overall_feedback(
        self,
        interview_type: str,
        target_role: str,
        overall_score: float,
        strengths: List[str],
        improvements: List[str]
    ) -> str:
        """Generate overall interview feedback."""
        prompt = f"""Generate brief overall feedback for this mock interview:

Interview Type: {interview_type}
Target Role: {target_role}
Overall Score: {overall_score:.0f}%
Strengths: {', '.join(strengths)}
Areas for Improvement: {', '.join(improvements)}

Provide 2-3 sentences of constructive, encouraging feedback."""
        
        response = await self.call_llm(prompt=prompt, temperature=0.5, max_tokens=200)
        return response.strip()
    
    def _get_recommendation(self, score: float) -> str:
        """Get recommendation based on score."""
        if score >= 85:
            return "Ready for real interviews! Consider scheduling with target companies."
        elif score >= 70:
            return "Good progress! Practice a few more times to build confidence."
        elif score >= 50:
            return "Keep practicing! Focus on the areas for improvement mentioned above."
        else:
            return "More preparation needed. Review common interview questions and practice with the STAR method."
    
    async def _get_interview_history(self, user_id: str) -> Dict[str, Any]:
        """Get user's interview history."""
        try:
            result = self.supabase.table("mock_interviews")\
                .select("id, interview_type, target_role, difficulty, overall_score, completed_at")\
                .eq("user_id", user_id)\
                .eq("status", "completed")\
                .order("completed_at", desc=True)\
                .limit(20)\
                .execute()
            
            interviews = result.data or []
            
            # Calculate stats
            avg_score = sum(i.get("overall_score", 0) for i in interviews) / len(interviews) if interviews else 0
            
            return {
                "interviews": interviews,
                "total_completed": len(interviews),
                "average_score": avg_score
            }
        except Exception:
            return {"interviews": [], "total_completed": 0}
