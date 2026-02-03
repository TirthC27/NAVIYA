"""
RoadmapAgent Test Cases

Test scenarios:
1. Beginner tech student, low hours
2. Intermediate tech student with resume gaps
3. MBBS student aiming NEET PG
4. Medical student with unclear goal
5. Missing resume_analysis input
"""

import pytest
import asyncio
from typing import Dict, Any
from datetime import datetime

# Import the agent
from app.agents.roadmap_agent import RoadmapAgentWorker, RoadmapInput


# ============================================
# Test Data
# ============================================

BEGINNER_TECH_LOW_HOURS = {
    "id": "test-task-001",
    "task_type": "generate_foundation_roadmap",
    "task_payload": {
        "user_id": "test-user-001",
        "domain": "tech",
        "normalized_goal": "Become a backend developer using Python and Django",
        "self_assessed_level": "Complete beginner, just started learning programming",
        "weekly_hours": 8,
        "resume_analysis": None,
        "task_type": "generate_foundation_roadmap",
        "rag_context": """
Python is a popular backend language.
Django is a web framework for Python.
Backend developers need to understand databases, APIs, and server management.
Common skills: Python, SQL, REST APIs, Git, Docker.
"""
    }
}

INTERMEDIATE_TECH_WITH_GAPS = {
    "id": "test-task-002",
    "task_type": "generate_exam_or_clinical_roadmap",
    "task_payload": {
        "user_id": "test-user-002",
        "domain": "tech",
        "normalized_goal": "Transition from frontend to full-stack developer",
        "self_assessed_level": "Intermediate - 2 years React experience, no backend",
        "weekly_hours": 15,
        "resume_analysis": {
            "overall_score": 62,
            "domain": "tech",
            "quality_scores": {
                "skill_clarity_score": 70,
                "project_depth_score": 55,
                "ats_readiness_score": 60
            },
            "missing_elements": [
                "Backend/API experience",
                "Database skills",
                "DevOps knowledge",
                "System design understanding"
            ],
            "extracted_data": {
                "skills": {
                    "languages": ["JavaScript", "TypeScript"],
                    "frameworks": ["React", "Next.js"],
                    "tools": ["Git", "VS Code"],
                    "databases": [],
                    "cloud_devops": []
                }
            },
            "recommendations": [
                "Add backend projects with Node.js or Python",
                "Learn SQL and database design",
                "Get hands-on with Docker and CI/CD"
            ]
        },
        "task_type": "generate_exam_or_clinical_roadmap",
        "rag_context": """
Full-stack development requires both frontend and backend skills.
Popular backend stacks: Node.js, Python/Django, Go.
Essential skills: REST APIs, GraphQL, databases, authentication.
DevOps basics: Docker, CI/CD, cloud services.
"""
    }
}

MBBS_NEET_PG = {
    "id": "test-task-003",
    "task_type": "generate_exam_or_clinical_roadmap",
    "task_payload": {
        "user_id": "test-user-003",
        "domain": "medical",
        "normalized_goal": "Crack NEET PG with a rank under 10000 for MD Medicine",
        "self_assessed_level": "Final year MBBS, starting PG preparation",
        "weekly_hours": 25,
        "resume_analysis": {
            "overall_score": 75,
            "domain": "medical",
            "quality_scores": {
                "cv_completeness_score": 80,
                "clinical_exposure_score": 70,
                "track_alignment_score": 75
            },
            "missing_elements": [
                "Research publications",
                "Conference presentations"
            ],
            "extracted_data": {
                "education": [
                    {"degree": "MBBS", "institution": "AIIMS Delhi", "year": "2024 (expected)"}
                ],
                "clinical_exposure": [
                    {"type": "Internship rotation", "specialty": "Medicine", "duration": "3 months"},
                    {"type": "Internship rotation", "specialty": "Surgery", "duration": "3 months"}
                ],
                "exams": []
            }
        },
        "task_type": "generate_exam_or_clinical_roadmap",
        "rag_context": """
NEET PG pattern: 200 MCQs, 3.5 hours.
High-yield subjects: Medicine, Surgery, OBG, Pediatrics, PSM.
Recommended resources: PrepLadder, Marrow, standard textbooks.
Subject weightage varies by specialization goal.
"""
    }
}

MEDICAL_UNCLEAR_GOAL = {
    "id": "test-task-004",
    "task_type": "generate_foundation_roadmap",
    "task_payload": {
        "user_id": "test-user-004",
        "domain": "medical",
        "normalized_goal": "Want to become a good doctor",
        "self_assessed_level": "2nd year MBBS student",
        "weekly_hours": 12,
        "resume_analysis": None,
        "task_type": "generate_foundation_roadmap",
        "rag_context": """
MBBS curriculum covers basic sciences and clinical subjects.
Important to build strong foundation in early years.
Focus areas: Anatomy, Physiology, Biochemistry, Pathology, Pharmacology.
"""
    }
}

MISSING_RESUME = {
    "id": "test-task-005",
    "task_type": "generate_foundation_roadmap",
    "task_payload": {
        "user_id": "test-user-005",
        "domain": "tech",
        "normalized_goal": "Become a machine learning engineer",
        "self_assessed_level": "Intermediate Python, no ML experience",
        "weekly_hours": 20,
        "resume_analysis": None,
        "task_type": "generate_foundation_roadmap",
        "rag_context": """
ML engineering requires strong math and programming skills.
Key areas: Linear algebra, statistics, Python, TensorFlow/PyTorch.
Projects and portfolio are crucial for ML roles.
"""
    }
}


# ============================================
# Validation Helpers
# ============================================

def validate_roadmap_structure(roadmap: Dict[str, Any]) -> Dict[str, Any]:
    """Validate basic roadmap structure"""
    errors = []
    
    # Check required top-level fields
    required_fields = ["domain", "roadmap_version", "phases", "overall_duration_estimate", "confidence_level"]
    for field in required_fields:
        if field not in roadmap:
            errors.append(f"Missing required field: {field}")
    
    # Validate domain
    if roadmap.get("domain") not in ["tech", "medical"]:
        errors.append(f"Invalid domain: {roadmap.get('domain')}")
    
    # Validate confidence level
    if roadmap.get("confidence_level") not in ["low", "medium", "high"]:
        errors.append(f"Invalid confidence_level: {roadmap.get('confidence_level')}")
    
    # Validate phases
    phases = roadmap.get("phases", [])
    if len(phases) < 4:
        errors.append(f"Must have at least 4 phases, got {len(phases)}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def validate_phase_structure(phase: Dict[str, Any], phase_num: int) -> Dict[str, Any]:
    """Validate individual phase structure"""
    errors = []
    
    required_fields = [
        "phase_number", "phase_title", "focus_areas",
        "skills_or_subjects", "expected_outcomes", "completion_criteria"
    ]
    
    for field in required_fields:
        if field not in phase:
            errors.append(f"Phase {phase_num} missing '{field}'")
    
    # Validate phase number
    if phase.get("phase_number") != phase_num:
        errors.append(f"Phase number mismatch: expected {phase_num}, got {phase.get('phase_number')}")
    
    # Validate arrays have content
    array_fields = ["focus_areas", "skills_or_subjects", "expected_outcomes", "completion_criteria"]
    for field in array_fields:
        value = phase.get(field, [])
        if not isinstance(value, list) or len(value) == 0:
            errors.append(f"Phase {phase_num} '{field}' must be non-empty array")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def validate_personalization(
    roadmap: Dict[str, Any], 
    level: str, 
    hours: int,
    has_resume: bool
) -> Dict[str, Any]:
    """Validate personalization was applied"""
    issues = []
    
    phases = roadmap.get("phases", [])
    duration = roadmap.get("overall_duration_estimate", "")
    
    # Check level-based personalization
    level_lower = level.lower()
    if "beginner" in level_lower or "complete beginner" in level_lower:
        # Beginners should have substantial Phase 1
        if phases and len(phases[0].get("focus_areas", [])) < 2:
            issues.append("Beginner should have more foundational focus areas")
    
    # Check hours-based personalization
    if hours < 10:
        # Low hours should reflect in duration
        if "month" in duration.lower():
            # Extract numbers from duration
            import re
            numbers = re.findall(r'\d+', duration)
            if numbers and int(numbers[-1]) < 6:
                issues.append("Low weekly hours should result in longer duration estimate")
    
    # Check resume gap handling
    if not has_resume:
        # Without resume, should assume basics
        pass  # This is implicit in the roadmap generation
    
    return {
        "personalized": len(issues) == 0,
        "issues": issues
    }


def check_no_hallucinations(roadmap: Dict[str, Any], domain: str) -> Dict[str, Any]:
    """Check for common hallucination patterns"""
    issues = []
    
    # Forbidden phrases
    forbidden_phrases = [
        "guarantee",
        "100%",
        "definitely",
        "master everything",
        "easy to achieve",
        "http://",
        "https://",
        "www.",
        ".com",
        "udemy",
        "coursera"
    ]
    
    # Convert roadmap to string for checking
    roadmap_str = str(roadmap).lower()
    
    for phrase in forbidden_phrases:
        if phrase.lower() in roadmap_str:
            issues.append(f"Found forbidden phrase/content: '{phrase}'")
    
    # Domain-specific checks
    if domain == "tech":
        # Check for relevant tech terms
        tech_terms = ["programming", "code", "software", "development"]
        has_tech = any(term in roadmap_str for term in tech_terms)
        if not has_tech:
            issues.append("Tech roadmap should mention programming/development concepts")
    
    elif domain == "medical":
        # Check for medical terms
        medical_terms = ["clinical", "medical", "patient", "subject", "exam"]
        has_medical = any(term in roadmap_str for term in medical_terms)
        if not has_medical:
            issues.append("Medical roadmap should mention clinical/medical concepts")
    
    return {
        "clean": len(issues) == 0,
        "issues": issues
    }


# ============================================
# Test Cases
# ============================================

class TestRoadmapAgent:
    """Test suite for RoadmapAgent"""
    
    @pytest.fixture
    def agent(self):
        """Create agent instance"""
        return RoadmapAgentWorker()
    
    # -----------------------------------------
    # Test 1: Beginner tech student, low hours
    # -----------------------------------------
    
    @pytest.mark.asyncio
    async def test_beginner_tech_low_hours(self, agent):
        """
        Test: Beginner tech student with low weekly hours
        
        Expected:
        - Complete foundational content in Phase 1
        - Extended timeline due to low hours
        - No shortcuts on basics
        """
        result = await agent.execute(BEGINNER_TECH_LOW_HOURS)
        
        # Should succeed
        assert result["success"] == True, f"Failed: {result.get('error')}"
        
        roadmap = result["roadmap"]
        
        # Validate structure
        structure_check = validate_roadmap_structure(roadmap)
        assert structure_check["valid"], f"Structure errors: {structure_check['errors']}"
        
        # Validate domain
        assert roadmap["domain"] == "tech"
        
        # Validate phases
        phases = roadmap["phases"]
        assert len(phases) >= 4, "Must have at least 4 phases"
        
        # Phase 1 should be about foundations
        phase1 = phases[0]
        phase1_title_lower = phase1["phase_title"].lower()
        assert any(word in phase1_title_lower for word in ["foundation", "basic", "fundamental"]), \
            f"Phase 1 should be foundational, got: {phase1['phase_title']}"
        
        # Validate personalization
        pers_check = validate_personalization(
            roadmap,
            level="Complete beginner",
            hours=8,
            has_resume=False
        )
        # Just log issues, don't fail
        if not pers_check["personalized"]:
            print(f"Personalization issues: {pers_check['issues']}")
        
        # Check for hallucinations
        halluc_check = check_no_hallucinations(roadmap, "tech")
        assert halluc_check["clean"], f"Hallucination issues: {halluc_check['issues']}"
        
        print("✅ Test 1 PASSED: Beginner tech student, low hours")
    
    # -----------------------------------------
    # Test 2: Intermediate tech with resume gaps
    # -----------------------------------------
    
    @pytest.mark.asyncio
    async def test_intermediate_tech_resume_gaps(self, agent):
        """
        Test: Intermediate tech student with resume gaps
        
        Expected:
        - Lighter Phase 1 (has frontend experience)
        - Heavier focus on backend gaps
        - Resume gaps addressed in phases
        """
        result = await agent.execute(INTERMEDIATE_TECH_WITH_GAPS)
        
        assert result["success"] == True, f"Failed: {result.get('error')}"
        
        roadmap = result["roadmap"]
        
        # Validate structure
        structure_check = validate_roadmap_structure(roadmap)
        assert structure_check["valid"], f"Structure errors: {structure_check['errors']}"
        
        # Should have at least 4 phases
        phases = roadmap["phases"]
        assert len(phases) >= 4
        
        # Validate each phase structure
        for i, phase in enumerate(phases, 1):
            phase_check = validate_phase_structure(phase, i)
            assert phase_check["valid"], f"Phase {i} errors: {phase_check['errors']}"
        
        # Check that backend/gaps are addressed somewhere
        roadmap_str = str(roadmap).lower()
        gap_keywords = ["backend", "api", "database", "server"]
        has_gap_coverage = any(kw in roadmap_str for kw in gap_keywords)
        assert has_gap_coverage, "Roadmap should address resume gaps (backend, database, etc.)"
        
        # Check for hallucinations
        halluc_check = check_no_hallucinations(roadmap, "tech")
        assert halluc_check["clean"], f"Hallucination issues: {halluc_check['issues']}"
        
        print("✅ Test 2 PASSED: Intermediate tech with resume gaps")
    
    # -----------------------------------------
    # Test 3: MBBS student aiming NEET PG
    # -----------------------------------------
    
    @pytest.mark.asyncio
    async def test_mbbs_neet_pg(self, agent):
        """
        Test: MBBS student preparing for NEET PG
        
        Expected:
        - Medical domain roadmap
        - Exam-focused phases
        - NEET PG specific content
        """
        result = await agent.execute(MBBS_NEET_PG)
        
        assert result["success"] == True, f"Failed: {result.get('error')}"
        
        roadmap = result["roadmap"]
        
        # Validate domain
        assert roadmap["domain"] == "medical"
        
        # Validate structure
        structure_check = validate_roadmap_structure(roadmap)
        assert structure_check["valid"], f"Structure errors: {structure_check['errors']}"
        
        # Should have exam prep content
        roadmap_str = str(roadmap).lower()
        exam_keywords = ["neet", "exam", "mcq", "revision", "test", "practice"]
        has_exam_content = any(kw in roadmap_str for kw in exam_keywords)
        assert has_exam_content, "NEET PG roadmap should have exam-focused content"
        
        # Should mention medical subjects
        subject_keywords = ["medicine", "surgery", "anatomy", "physiology", "pathology"]
        has_subjects = any(kw in roadmap_str for kw in subject_keywords)
        assert has_subjects, "Medical roadmap should mention relevant subjects"
        
        # Check for hallucinations
        halluc_check = check_no_hallucinations(roadmap, "medical")
        assert halluc_check["clean"], f"Hallucination issues: {halluc_check['issues']}"
        
        print("✅ Test 3 PASSED: MBBS student aiming NEET PG")
    
    # -----------------------------------------
    # Test 4: Medical student with unclear goal
    # -----------------------------------------
    
    @pytest.mark.asyncio
    async def test_medical_unclear_goal(self, agent):
        """
        Test: Medical student with vague goal
        
        Expected:
        - Foundation-focused roadmap
        - General medical preparation
        - Lower confidence level
        """
        result = await agent.execute(MEDICAL_UNCLEAR_GOAL)
        
        assert result["success"] == True, f"Failed: {result.get('error')}"
        
        roadmap = result["roadmap"]
        
        # Validate domain
        assert roadmap["domain"] == "medical"
        
        # Validate structure
        structure_check = validate_roadmap_structure(roadmap)
        assert structure_check["valid"], f"Structure errors: {structure_check['errors']}"
        
        # Should have foundational content
        phases = roadmap["phases"]
        phase1 = phases[0]
        
        # Phase 1 should focus on core subjects
        phase1_str = str(phase1).lower()
        core_keywords = ["core", "basic", "fundamental", "anatomy", "physiology", "foundation"]
        has_core = any(kw in phase1_str for kw in core_keywords)
        assert has_core, "Unclear goal should result in foundational Phase 1"
        
        # Confidence might be lower for unclear goals
        # (Not enforcing this, just checking it's valid)
        assert roadmap["confidence_level"] in ["low", "medium", "high"]
        
        # Check for hallucinations
        halluc_check = check_no_hallucinations(roadmap, "medical")
        assert halluc_check["clean"], f"Hallucination issues: {halluc_check['issues']}"
        
        print("✅ Test 4 PASSED: Medical student with unclear goal")
    
    # -----------------------------------------
    # Test 5: Missing resume_analysis input
    # -----------------------------------------
    
    @pytest.mark.asyncio
    async def test_missing_resume(self, agent):
        """
        Test: Tech student without resume analysis
        
        Expected:
        - Roadmap still generates successfully
        - Assumes starting from basics
        - No errors about missing resume
        """
        result = await agent.execute(MISSING_RESUME)
        
        assert result["success"] == True, f"Failed: {result.get('error')}"
        
        roadmap = result["roadmap"]
        
        # Validate structure
        structure_check = validate_roadmap_structure(roadmap)
        assert structure_check["valid"], f"Structure errors: {structure_check['errors']}"
        
        # Should have ML-relevant content
        roadmap_str = str(roadmap).lower()
        ml_keywords = ["machine learning", "ml", "data", "python", "model", "algorithm"]
        has_ml = any(kw in roadmap_str for kw in ml_keywords)
        assert has_ml, "ML roadmap should have relevant content"
        
        # Phase ordering should be correct
        phases = roadmap["phases"]
        for i, phase in enumerate(phases, 1):
            assert phase["phase_number"] == i, f"Phase ordering error at phase {i}"
        
        # Check for hallucinations
        halluc_check = check_no_hallucinations(roadmap, "tech")
        assert halluc_check["clean"], f"Hallucination issues: {halluc_check['issues']}"
        
        print("✅ Test 5 PASSED: Missing resume_analysis input")
    
    # -----------------------------------------
    # Additional Validation Tests
    # -----------------------------------------
    
    @pytest.mark.asyncio
    async def test_invalid_domain_rejected(self, agent):
        """Test that invalid domain is rejected"""
        invalid_task = {
            "id": "test-invalid-domain",
            "task_type": "generate_foundation_roadmap",
            "task_payload": {
                "user_id": "test-user",
                "domain": "invalid_domain",
                "normalized_goal": "Some goal",
                "self_assessed_level": "Beginner",
                "weekly_hours": 10,
                "task_type": "generate_foundation_roadmap"
            }
        }
        
        result = await agent.execute(invalid_task)
        
        assert result["success"] == False
        assert "domain" in result["error"].lower() or "validation" in result["error"].lower()
        
        print("✅ Test PASSED: Invalid domain rejected")
    
    @pytest.mark.asyncio
    async def test_missing_goal_rejected(self, agent):
        """Test that missing goal is rejected"""
        invalid_task = {
            "id": "test-missing-goal",
            "task_type": "generate_foundation_roadmap",
            "task_payload": {
                "user_id": "test-user",
                "domain": "tech",
                "normalized_goal": "",
                "self_assessed_level": "Beginner",
                "weekly_hours": 10,
                "task_type": "generate_foundation_roadmap"
            }
        }
        
        result = await agent.execute(invalid_task)
        
        assert result["success"] == False
        assert "goal" in result["error"].lower() or "validation" in result["error"].lower()
        
        print("✅ Test PASSED: Missing goal rejected")
    
    @pytest.mark.asyncio
    async def test_unknown_task_type_rejected(self, agent):
        """Test that unknown task type is rejected"""
        invalid_task = {
            "id": "test-unknown-task",
            "task_type": "unknown_task_type",
            "task_payload": {
                "user_id": "test-user",
                "domain": "tech",
                "normalized_goal": "Some goal",
                "self_assessed_level": "Beginner",
                "weekly_hours": 10,
                "task_type": "unknown_task_type"
            }
        }
        
        result = await agent.execute(invalid_task)
        
        assert result["success"] == False
        assert "unknown" in result["error"].lower() or "task_type" in result["error"].lower()
        
        print("✅ Test PASSED: Unknown task type rejected")


# ============================================
# Run Tests
# ============================================

if __name__ == "__main__":
    # Run with: python -m pytest test_roadmap_agent.py -v
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
