"""
Test Cases for SkillEvaluationAgent

Tests:
1. Tech beginner – DSA basics
2. Tech intermediate – Web fundamentals
3. Medical student – Core subject MCQs
4. Empty user responses
5. Invalid skill_or_subject
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
import json
from datetime import datetime

# Import the agent worker
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.skill_evaluation_agent import (
    SkillEvaluationAgentWorker,
    AssessmentInput,
    EvaluationOutput,
    create_skill_evaluation_agent_worker
)


# ============================================
# Fixtures
# ============================================

@pytest.fixture
def worker():
    """Create a SkillEvaluationAgentWorker instance"""
    return SkillEvaluationAgentWorker()


@pytest.fixture
def mock_llm_tech_questions():
    """Mock LLM response for tech assessment generation"""
    return json.dumps({
        "questions": [
            {
                "question_id": "q1",
                "question_text": "What is the time complexity of binary search?",
                "options": ["A) O(n)", "B) O(log n)", "C) O(n²)", "D) O(1)"],
                "correct_answer": "B",
                "skill_tag": "algorithms"
            },
            {
                "question_id": "q2",
                "question_text": "Which data structure uses LIFO principle?",
                "options": ["A) Queue", "B) Stack", "C) Array", "D) Linked List"],
                "correct_answer": "B",
                "skill_tag": "data_structures"
            },
            {
                "question_id": "q3",
                "question_text": "What is the space complexity of merge sort?",
                "options": ["A) O(1)", "B) O(log n)", "C) O(n)", "D) O(n²)"],
                "correct_answer": "C",
                "skill_tag": "algorithms"
            },
            {
                "question_id": "q4",
                "question_text": "A hash table provides average case O(1) lookup.",
                "options": ["A) True", "B) False"],
                "correct_answer": "A",
                "skill_tag": "data_structures"
            },
            {
                "question_id": "q5",
                "question_text": "Which traversal visits root, left, right?",
                "options": ["A) Inorder", "B) Preorder", "C) Postorder", "D) Level order"],
                "correct_answer": "B",
                "skill_tag": "trees"
            }
        ]
    })


@pytest.fixture
def mock_llm_medical_questions():
    """Mock LLM response for medical assessment generation"""
    return json.dumps({
        "questions": [
            {
                "question_id": "q1",
                "question_text": "A 45-year-old patient presents with crushing chest pain radiating to the left arm. ECG shows ST elevation in leads V1-V4. What is the most likely diagnosis?",
                "options": ["A) Pulmonary embolism", "B) Anterior wall MI", "C) Pericarditis", "D) Aortic dissection"],
                "correct_option": "B",
                "subject_tag": "cardiology"
            },
            {
                "question_id": "q2",
                "question_text": "Which cardiac enzyme is most specific for myocardial injury?",
                "options": ["A) AST", "B) LDH", "C) Troponin I", "D) CK-MB"],
                "correct_option": "C",
                "subject_tag": "cardiology"
            },
            {
                "question_id": "q3",
                "question_text": "The first-line treatment for STEMI within 12 hours of symptom onset is:",
                "options": ["A) Thrombolytics", "B) Aspirin only", "C) Primary PCI", "D) Heparin"],
                "correct_option": "C",
                "subject_tag": "cardiology"
            },
            {
                "question_id": "q4",
                "question_text": "Killip class III heart failure is characterized by:",
                "options": ["A) No heart failure", "B) Mild CHF", "C) Pulmonary edema", "D) Cardiogenic shock"],
                "correct_option": "C",
                "subject_tag": "cardiology"
            },
            {
                "question_id": "q5",
                "question_text": "Which artery is most commonly involved in inferior wall MI?",
                "options": ["A) LAD", "B) LCX", "C) RCA", "D) Left main"],
                "correct_option": "C",
                "subject_tag": "cardiology"
            }
        ]
    })


@pytest.fixture
def mock_llm_evaluation():
    """Mock LLM response for evaluation"""
    return json.dumps({
        "domain": "tech",
        "skill_or_subject": "Data Structures and Algorithms",
        "raw_score": 60.0,
        "proficiency_level": "intermediate",
        "confidence_level": "medium",
        "weak_areas": ["algorithms", "time_complexity"],
        "recommendation": "Focus on practicing algorithm complexity analysis and recursive algorithms."
    })


# ============================================
# Test Case 1: Tech Beginner – DSA Basics
# ============================================

@pytest.mark.asyncio
async def test_tech_beginner_dsa_assessment_generation(worker, mock_llm_tech_questions):
    """Test generating DSA assessment for tech beginner"""
    
    with patch.object(worker, '_call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_llm_tech_questions
        
        # Mock database operations
        with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
            with patch.object(worker, '_log_activity', new_callable=AsyncMock):
                
                task = {
                    "id": "test-task-001",
                    "task_type": "generate_skill_assessment",
                    "task_payload": {
                        "user_id": "user-001",
                        "domain": "tech",
                        "current_phase": 1,
                        "skill_or_subject": "Data Structures and Algorithms",
                        "task_type": "generate_skill_assessment"
                    }
                }
                
                result = await worker.execute(task)
                
                assert result["success"] == True
                assert "assessment" in result
                assert result["assessment"]["domain"] == "tech"
                assert result["assessment"]["difficulty"] == "basic"
                assert len(result["assessment"]["questions"]) == 5
                
                # Verify question structure
                q1 = result["assessment"]["questions"][0]
                assert "question_id" in q1
                assert "question_text" in q1
                assert "correct_answer" in q1


@pytest.mark.asyncio
async def test_tech_beginner_dsa_evaluation(worker, mock_llm_evaluation):
    """Test evaluating DSA assessment for tech beginner"""
    
    with patch.object(worker, '_call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_llm_evaluation
        
        # Mock database save
        with patch.object(worker, '_save_assessment', new_callable=AsyncMock) as mock_save:
            mock_save.return_value = "assessment-001"
            
            with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
                with patch.object(worker, '_log_activity', new_callable=AsyncMock):
                    
                    task = {
                        "id": "test-task-002",
                        "task_type": "evaluate_skill_assessment",
                        "task_payload": {
                            "user_id": "user-001",
                            "domain": "tech",
                            "current_phase": 1,
                            "skill_or_subject": "Data Structures and Algorithms",
                            "task_type": "evaluate_skill_assessment",
                            "user_responses": [
                                {"question_id": "q1", "user_answer": "B", "correct_answer": "B", "is_correct": True},
                                {"question_id": "q2", "user_answer": "B", "correct_answer": "B", "is_correct": True},
                                {"question_id": "q3", "user_answer": "A", "correct_answer": "C", "is_correct": False},
                                {"question_id": "q4", "user_answer": "A", "correct_answer": "A", "is_correct": True},
                                {"question_id": "q5", "user_answer": "C", "correct_answer": "B", "is_correct": False}
                            ]
                        }
                    }
                    
                    result = await worker.execute(task)
                    
                    assert result["success"] == True
                    assert "evaluation" in result
                    assert result["evaluation"]["domain"] == "tech"
                    assert result["evaluation"]["proficiency_level"] == "intermediate"
                    assert "weak_areas" in result["evaluation"]


# ============================================
# Test Case 2: Tech Intermediate – Web Fundamentals
# ============================================

@pytest.mark.asyncio
async def test_tech_intermediate_web_assessment(worker):
    """Test generating web fundamentals assessment for intermediate level"""
    
    mock_web_questions = json.dumps({
        "questions": [
            {
                "question_id": "q1",
                "question_text": "What does REST stand for?",
                "options": ["A) Remote State Transfer", "B) Representational State Transfer", "C) Request State Transfer", "D) Resource State Transfer"],
                "correct_answer": "B",
                "skill_tag": "web_apis"
            },
            {
                "question_id": "q2",
                "question_text": "Which HTTP method is idempotent?",
                "options": ["A) POST", "B) PUT", "C) PATCH", "D) All of the above"],
                "correct_answer": "B",
                "skill_tag": "http"
            },
            {
                "question_id": "q3",
                "question_text": "What is the purpose of CORS?",
                "options": ["A) Database security", "B) Cross-origin resource sharing", "C) Caching", "D) Compression"],
                "correct_answer": "B",
                "skill_tag": "web_security"
            }
        ]
    })
    
    with patch.object(worker, '_call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_web_questions
        
        with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
            with patch.object(worker, '_log_activity', new_callable=AsyncMock):
                
                task = {
                    "id": "test-task-003",
                    "task_type": "generate_skill_assessment",
                    "task_payload": {
                        "user_id": "user-002",
                        "domain": "tech",
                        "current_phase": 2,
                        "skill_or_subject": "Web Development Fundamentals",
                        "task_type": "generate_skill_assessment"
                    }
                }
                
                result = await worker.execute(task)
                
                assert result["success"] == True
                assert result["assessment"]["difficulty"] == "intermediate"
                assert result["assessment"]["skill_or_subject"] == "Web Development Fundamentals"


# ============================================
# Test Case 3: Medical Student – Core Subject MCQs
# ============================================

@pytest.mark.asyncio
async def test_medical_core_subject_assessment(worker, mock_llm_medical_questions):
    """Test generating medical assessment for core subject"""
    
    with patch.object(worker, '_call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_llm_medical_questions
        
        with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
            with patch.object(worker, '_log_activity', new_callable=AsyncMock):
                
                task = {
                    "id": "test-task-004",
                    "task_type": "generate_skill_assessment",
                    "task_payload": {
                        "user_id": "user-003",
                        "domain": "medical",
                        "current_phase": 2,
                        "skill_or_subject": "Cardiology",
                        "task_type": "generate_skill_assessment"
                    }
                }
                
                result = await worker.execute(task)
                
                assert result["success"] == True
                assert "assessment" in result
                assert result["assessment"]["domain"] == "medical"
                
                # Verify medical MCQ structure (A-D options)
                for q in result["assessment"]["questions"]:
                    assert len(q["options"]) == 4
                    assert "correct_option" in q
                    assert q["correct_option"] in ["A", "B", "C", "D"]


@pytest.mark.asyncio
async def test_medical_assessment_evaluation(worker):
    """Test evaluating medical assessment"""
    
    mock_medical_eval = json.dumps({
        "domain": "medical",
        "skill_or_subject": "Cardiology",
        "raw_score": 80.0,
        "proficiency_level": "advanced",
        "confidence_level": "high",
        "weak_areas": [],
        "recommendation": "Excellent understanding of cardiac conditions. Continue with advanced topics."
    })
    
    with patch.object(worker, '_call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_medical_eval
        
        with patch.object(worker, '_save_assessment', new_callable=AsyncMock) as mock_save:
            mock_save.return_value = "assessment-004"
            
            with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
                with patch.object(worker, '_log_activity', new_callable=AsyncMock):
                    
                    task = {
                        "id": "test-task-005",
                        "task_type": "evaluate_skill_assessment",
                        "task_payload": {
                            "user_id": "user-003",
                            "domain": "medical",
                            "current_phase": 2,
                            "skill_or_subject": "Cardiology",
                            "task_type": "evaluate_skill_assessment",
                            "user_responses": [
                                {"question_id": "q1", "user_answer": "B", "correct_option": "B", "is_correct": True},
                                {"question_id": "q2", "user_answer": "C", "correct_option": "C", "is_correct": True},
                                {"question_id": "q3", "user_answer": "C", "correct_option": "C", "is_correct": True},
                                {"question_id": "q4", "user_answer": "C", "correct_option": "C", "is_correct": True},
                                {"question_id": "q5", "user_answer": "A", "correct_option": "C", "is_correct": False}
                            ]
                        }
                    }
                    
                    result = await worker.execute(task)
                    
                    assert result["success"] == True
                    assert result["evaluation"]["domain"] == "medical"
                    assert result["evaluation"]["proficiency_level"] == "advanced"


# ============================================
# Test Case 4: Empty User Responses
# ============================================

@pytest.mark.asyncio
async def test_empty_user_responses(worker):
    """Test evaluation with empty user responses - should fail gracefully"""
    
    with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
        with patch.object(worker, '_log_error', new_callable=AsyncMock):
            
            task = {
                "id": "test-task-006",
                "task_type": "evaluate_skill_assessment",
                "task_payload": {
                    "user_id": "user-004",
                    "domain": "tech",
                    "skill_or_subject": "Python Programming",
                    "task_type": "evaluate_skill_assessment",
                    "user_responses": None  # Empty responses
                }
            }
            
            result = await worker.execute(task)
            
            assert result["success"] == False
            assert "user_responses is required" in result["error"]


@pytest.mark.asyncio
async def test_empty_responses_list(worker):
    """Test evaluation with empty responses list"""
    
    mock_eval = json.dumps({
        "domain": "tech",
        "skill_or_subject": "Python",
        "raw_score": 0,
        "proficiency_level": "beginner",
        "confidence_level": "low",
        "weak_areas": ["all topics"],
        "recommendation": "Start with foundational concepts."
    })
    
    with patch.object(worker, '_call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_eval
        
        with patch.object(worker, '_save_assessment', new_callable=AsyncMock) as mock_save:
            mock_save.return_value = "assessment-006"
            
            with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
                with patch.object(worker, '_log_activity', new_callable=AsyncMock):
                    
                    task = {
                        "id": "test-task-007",
                        "task_type": "evaluate_skill_assessment",
                        "task_payload": {
                            "user_id": "user-004",
                            "domain": "tech",
                            "skill_or_subject": "Python Programming",
                            "task_type": "evaluate_skill_assessment",
                            "user_responses": []  # Empty list
                        }
                    }
                    
                    result = await worker.execute(task)
                    
                    # Empty list should still fail
                    assert result["success"] == False


# ============================================
# Test Case 5: Invalid Skill or Subject
# ============================================

@pytest.mark.asyncio
async def test_invalid_skill_empty_string(worker):
    """Test with empty skill_or_subject - should fail validation"""
    
    with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
        with patch.object(worker, '_log_error', new_callable=AsyncMock):
            
            task = {
                "id": "test-task-008",
                "task_type": "generate_skill_assessment",
                "task_payload": {
                    "user_id": "user-005",
                    "domain": "tech",
                    "skill_or_subject": "",  # Empty string
                    "task_type": "generate_skill_assessment"
                }
            }
            
            result = await worker.execute(task)
            
            assert result["success"] == False
            assert "validation" in result["error"].lower() or "skill_or_subject" in result["error"]


@pytest.mark.asyncio
async def test_invalid_skill_whitespace(worker):
    """Test with whitespace-only skill_or_subject"""
    
    with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
        with patch.object(worker, '_log_error', new_callable=AsyncMock):
            
            task = {
                "id": "test-task-009",
                "task_type": "generate_skill_assessment",
                "task_payload": {
                    "user_id": "user-005",
                    "domain": "tech",
                    "skill_or_subject": "   ",  # Whitespace only
                    "task_type": "generate_skill_assessment"
                }
            }
            
            result = await worker.execute(task)
            
            assert result["success"] == False


@pytest.mark.asyncio
async def test_invalid_domain(worker):
    """Test with invalid domain - should fail validation"""
    
    with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
        with patch.object(worker, '_log_error', new_callable=AsyncMock):
            
            task = {
                "id": "test-task-010",
                "task_type": "generate_skill_assessment",
                "task_payload": {
                    "user_id": "user-005",
                    "domain": "finance",  # Invalid domain
                    "skill_or_subject": "Accounting",
                    "task_type": "generate_skill_assessment"
                }
            }
            
            result = await worker.execute(task)
            
            assert result["success"] == False
            assert "domain" in result["error"].lower()


# ============================================
# Additional Edge Cases
# ============================================

@pytest.mark.asyncio
async def test_invalid_task_type(worker):
    """Test with invalid task_type"""
    
    with patch.object(worker, '_update_task_status', new_callable=AsyncMock):
        with patch.object(worker, '_log_error', new_callable=AsyncMock):
            
            task = {
                "id": "test-task-011",
                "task_type": "invalid_task",
                "task_payload": {
                    "user_id": "user-006",
                    "domain": "tech",
                    "skill_or_subject": "Python"
                }
            }
            
            result = await worker.execute(task)
            
            assert result["success"] == False
            assert "Unknown task_type" in result["error"]


@pytest.mark.asyncio
async def test_proficiency_calculation():
    """Test proficiency level calculation logic"""
    
    worker = SkillEvaluationAgentWorker()
    
    # Test beginner threshold (< 40%)
    assert worker._calculate_proficiency(0) == "beginner"
    assert worker._calculate_proficiency(20) == "beginner"
    assert worker._calculate_proficiency(39.9) == "beginner"
    
    # Test intermediate threshold (40-70%)
    assert worker._calculate_proficiency(40) == "intermediate"
    assert worker._calculate_proficiency(55) == "intermediate"
    assert worker._calculate_proficiency(70) == "intermediate"
    
    # Test advanced threshold (> 70%)
    assert worker._calculate_proficiency(71) == "advanced"
    assert worker._calculate_proficiency(85) == "advanced"
    assert worker._calculate_proficiency(100) == "advanced"


@pytest.mark.asyncio
async def test_difficulty_for_phase():
    """Test phase to difficulty mapping"""
    
    worker = SkillEvaluationAgentWorker()
    
    assert worker._get_difficulty_for_phase(1) == "basic"
    assert worker._get_difficulty_for_phase(2) == "intermediate"
    assert worker._get_difficulty_for_phase(3) == "advanced"
    assert worker._get_difficulty_for_phase(4) == "expert"
    assert worker._get_difficulty_for_phase(5) == "expert"


def test_factory_function():
    """Test the factory function creates correct instance"""
    
    worker = create_skill_evaluation_agent_worker()
    
    assert isinstance(worker, SkillEvaluationAgentWorker)
    assert worker.agent_name == "SkillEvaluationAgent"
    assert "generate_skill_assessment" in worker.VALID_TASK_TYPES
    assert "evaluate_skill_assessment" in worker.VALID_TASK_TYPES


# ============================================
# Run tests
# ============================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
