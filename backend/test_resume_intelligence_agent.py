"""
ResumeIntelligenceAgent Test Cases

Test scenarios:
1. Strong tech resume
2. Weak tech resume (no projects)
3. Medical CV with exams
4. Medical CV missing research
5. Empty / corrupted resume
6. Resume uploaded before onboarding (reject)
7. Invalid domain
8. Missing resume_text for analyze_resume

Validates:
- Correct branching
- Correct scoring
- No hallucination
- JSON validity
"""

import asyncio
import json
from typing import Dict, Any
from datetime import datetime

# Add parent directory to path for imports
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.resume_intelligence_agent import (
    ResumeIntelligenceAgentWorker,
    create_resume_intelligence_agent,
    SUPPORTED_DOMAINS
)
from app.agents.worker_base import TaskResult


# ============================================
# Sample Resume Data
# ============================================

STRONG_TECH_RESUME = """
JOHN DOE
Software Engineer
john.doe@email.com | github.com/johndoe | LinkedIn: linkedin.com/in/johndoe

SUMMARY
Full-stack developer with 3 years of experience building scalable web applications.
Passionate about clean code and modern development practices.

SKILLS
Languages: Python, JavaScript, TypeScript, Java, SQL
Frameworks: React, Node.js, Django, FastAPI, Express.js
Databases: PostgreSQL, MongoDB, Redis
Cloud/DevOps: AWS (EC2, S3, Lambda), Docker, Kubernetes, GitHub Actions
Tools: Git, VS Code, Postman, Jira

EXPERIENCE
Software Engineer | TechCorp Inc. | Jan 2022 - Present
- Built RESTful APIs serving 100K+ daily requests using FastAPI
- Implemented CI/CD pipeline reducing deployment time by 60%
- Led migration from monolith to microservices architecture

Junior Developer | StartupXYZ | Jun 2020 - Dec 2021
- Developed React components for customer-facing dashboard
- Wrote unit tests achieving 85% code coverage
- Participated in agile sprints and code reviews

PROJECTS
E-Commerce Platform | github.com/johndoe/ecommerce
- Full-stack e-commerce site with React frontend and Node.js backend
- Tech: React, Node.js, PostgreSQL, Stripe API, AWS
- Outcome: 500+ users, 99.9% uptime

AI Chatbot | github.com/johndoe/chatbot
- NLP-powered chatbot using Python and TensorFlow
- Tech: Python, TensorFlow, Flask, Docker
- Outcome: Reduced customer support tickets by 30%

EDUCATION
B.S. Computer Science | State University | 2020
GPA: 3.7/4.0

CERTIFICATIONS
- AWS Certified Solutions Architect
- Google Cloud Professional Developer
"""

WEAK_TECH_RESUME = """
Jane Smith
jane@email.com

Skills: Python, some JavaScript, learning React

Education:
Computer Science, Some College, 2023

Looking for entry-level developer position.
I am hardworking and a quick learner.
"""

STRONG_MEDICAL_CV = """
DR. SARAH JOHNSON, MBBS
Medical Graduate | Aspiring Internal Medicine Physician
sarah.johnson@email.com | +1-555-0123

EDUCATION
MBBS | Harvard Medical School | 2019-2024
- Dean's List all semesters
- Research focus: Cardiology

B.S. Biology | MIT | 2015-2019
- Summa Cum Laude
- Pre-medical track

LICENSING EXAMINATIONS
USMLE Step 1: 255 (2022)
USMLE Step 2 CK: 260 (2023)
USMLE Step 2 CS: Pass (2023)

CLINICAL EXPERIENCE
Internal Medicine Rotation | Massachusetts General Hospital | 12 weeks
- Managed 15-20 patients daily under attending supervision
- Performed history and physical examinations
- Presented cases at morning rounds

Surgery Rotation | Brigham and Women's Hospital | 8 weeks
- Assisted in 50+ surgical procedures
- First-assisted in 5 appendectomies

Emergency Medicine | Boston Medical Center | 6 weeks
- High-volume urban ED experience
- Performed procedures: suturing, splinting, IV placement

Pediatrics Rotation | Boston Children's Hospital | 6 weeks

RESEARCH
Publications:
1. Johnson S, et al. "Cardiac biomarkers in early detection of MI" - JAMA Internal Medicine, 2023
2. Johnson S, et al. "Machine learning in ECG analysis" - Circulation, 2022

Conference Presentations:
- American College of Cardiology Annual Meeting, 2023 - Poster Presentation
- American Heart Association Scientific Sessions, 2022 - Oral Presentation

CERTIFICATIONS
- BLS (Basic Life Support)
- ACLS (Advanced Cardiac Life Support)
- PALS (Pediatric Advanced Life Support)

LEADERSHIP
- President, Internal Medicine Interest Group
- Volunteer, Free Clinic for Underserved Communities
"""

WEAK_MEDICAL_CV = """
John Medical
Medical Student
john@email.com

Education:
MBBS - Medical College (ongoing)

Clinical Experience:
Some rotations at local hospital

Interested in becoming a doctor.
"""

EMPTY_RESUME = ""

CORRUPTED_RESUME = "###$$%%^^&&**()_+=[]{}|;':\",./<>?"


# ============================================
# Test Result Validator
# ============================================

def validate_analysis_schema(result: TaskResult, domain: str) -> Dict[str, Any]:
    """Validate that the result contains a valid analysis schema"""
    errors = []
    
    if not result.success:
        return {
            "valid": False,
            "errors": [f"Task failed: {result.error}"]
        }
    
    output = result.output
    
    # Check required fields
    required_fields = [
        "domain", "extracted_data", "quality_scores",
        "missing_elements", "recommendations", "overall_resume_score",
        "confidence_level"
    ]
    
    for field in required_fields:
        if field not in output:
            errors.append(f"Missing required field: {field}")
    
    # Validate domain matches
    if output.get("domain") != domain:
        errors.append(f"Domain mismatch: expected {domain}, got {output.get('domain')}")
    
    # Validate score range
    score = output.get("overall_resume_score", -1)
    if not (0 <= score <= 100):
        errors.append(f"Score out of range: {score}")
    
    # Validate confidence level
    valid_confidence = ["low", "medium", "high"]
    if output.get("confidence_level") not in valid_confidence:
        errors.append(f"Invalid confidence level: {output.get('confidence_level')}")
    
    # Domain-specific validation
    if domain == "tech":
        quality_scores = output.get("quality_scores", {})
        expected_scores = ["skill_clarity_score", "project_depth_score", "ats_readiness_score"]
        for score_name in expected_scores:
            if score_name not in quality_scores:
                errors.append(f"Missing tech score: {score_name}")
    
    elif domain == "medical":
        quality_scores = output.get("quality_scores", {})
        expected_scores = ["cv_completeness_score", "clinical_exposure_score", "track_alignment_score"]
        for score_name in expected_scores:
            if score_name not in quality_scores:
                errors.append(f"Missing medical score: {score_name}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def check_no_hallucination(output: Dict, resume_text: str) -> List[str]:
    """Check that extracted data doesn't contain hallucinated content"""
    warnings = []
    resume_lower = resume_text.lower()
    
    extracted = output.get("extracted_data", {})
    
    # Check skills
    if "skills" in extracted:
        for category, skills in extracted["skills"].items():
            for skill in skills:
                if skill.lower() not in resume_lower:
                    # Check for common variations
                    variations = [skill.lower(), skill.replace(".", "").lower()]
                    if not any(v in resume_lower for v in variations):
                        warnings.append(f"Potentially hallucinated skill: {skill}")
    
    return warnings


# ============================================
# Test Cases
# ============================================

async def test_1_strong_tech_resume():
    """Test 1: Strong tech resume with all sections"""
    print("\n" + "="*60)
    print("TEST 1: Strong Tech Resume")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-tech-strong",
        "task_type": "analyze_resume",
        "domain": "tech",
        "resume_text": STRONG_TECH_RESUME,
        "career_goal_raw": "Become a senior full-stack developer",
        "rag_context": []
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        print(f"Summary: {result.summary}")
        
        if result.success:
            print(f"\nOverall Score: {result.output.get('overall_resume_score')}/100")
            print(f"Confidence: {result.output.get('confidence_level')}")
            print(f"Quality Scores: {json.dumps(result.output.get('quality_scores'), indent=2)}")
            
            # Validate schema
            validation = validate_analysis_schema(result, "tech")
            print(f"\nSchema Validation: {'PASS' if validation['valid'] else 'FAIL'}")
            if validation['errors']:
                print(f"  Errors: {validation['errors']}")
            
            # Check for hallucination
            hallucination_warnings = check_no_hallucination(result.output, STRONG_TECH_RESUME)
            if hallucination_warnings:
                print(f"⚠️ Potential hallucinations: {hallucination_warnings}")
            else:
                print("✅ No hallucination detected")
            
            # Score should be high for strong resume
            score = result.output.get("overall_resume_score", 0)
            if score >= 70:
                print(f"✅ Score appropriately high: {score}")
            else:
                print(f"⚠️ Score seems low for strong resume: {score}")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_2_weak_tech_resume():
    """Test 2: Weak tech resume with missing sections"""
    print("\n" + "="*60)
    print("TEST 2: Weak Tech Resume (No Projects)")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-tech-weak",
        "task_type": "analyze_resume",
        "domain": "tech",
        "resume_text": WEAK_TECH_RESUME,
        "career_goal_raw": "Get a developer job",
        "rag_context": []
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        
        if result.success:
            print(f"Overall Score: {result.output.get('overall_resume_score')}/100")
            print(f"Missing Elements: {result.output.get('missing_elements')}")
            print(f"Recommendations: {result.output.get('recommendations')}")
            
            # Score should be lower for weak resume
            score = result.output.get("overall_resume_score", 0)
            if score < 60:
                print(f"✅ Score appropriately low: {score}")
            else:
                print(f"⚠️ Score too high for weak resume: {score}")
            
            # Should detect missing projects
            missing = result.output.get("missing_elements", [])
            missing_str = " ".join(missing).lower()
            if "project" in missing_str or len(missing) > 0:
                print("✅ Missing elements detected")
            else:
                print("⚠️ Should have detected missing projects")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_3_medical_cv_with_exams():
    """Test 3: Strong medical CV with exams"""
    print("\n" + "="*60)
    print("TEST 3: Medical CV with Exams")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-medical-strong",
        "task_type": "analyze_resume",
        "domain": "medical",
        "resume_text": STRONG_MEDICAL_CV,
        "career_goal_raw": "Internal Medicine Residency",
        "rag_context": []
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        
        if result.success:
            print(f"Overall Score: {result.output.get('overall_resume_score')}/100")
            print(f"Confidence: {result.output.get('confidence_level')}")
            print(f"Quality Scores: {json.dumps(result.output.get('quality_scores'), indent=2)}")
            
            # Check exams extracted
            extracted = result.output.get("extracted_data", {})
            exams = extracted.get("exams", [])
            print(f"Exams found: {len(exams)}")
            
            # Validate schema
            validation = validate_analysis_schema(result, "medical")
            print(f"\nSchema Validation: {'PASS' if validation['valid'] else 'FAIL'}")
            
            # Should have high score
            score = result.output.get("overall_resume_score", 0)
            if score >= 70:
                print(f"✅ Score appropriately high: {score}")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_4_medical_cv_missing_research():
    """Test 4: Medical CV missing research section"""
    print("\n" + "="*60)
    print("TEST 4: Medical CV Missing Research")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-medical-weak",
        "task_type": "analyze_resume",
        "domain": "medical",
        "resume_text": WEAK_MEDICAL_CV,
        "career_goal_raw": "Become a physician",
        "rag_context": []
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        
        if result.success:
            print(f"Overall Score: {result.output.get('overall_resume_score')}/100")
            print(f"Missing Elements: {result.output.get('missing_elements')}")
            
            # Score should be lower
            score = result.output.get("overall_resume_score", 0)
            if score < 60:
                print(f"✅ Score appropriately low: {score}")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_5_empty_resume():
    """Test 5: Empty / corrupted resume"""
    print("\n" + "="*60)
    print("TEST 5: Empty Resume")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    # Test empty resume
    payload = {
        "user_id": "test-empty",
        "task_type": "analyze_resume",
        "domain": "tech",
        "resume_text": EMPTY_RESUME,
        "rag_context": []
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"Empty Resume Result: success={result.success}")
        
        # Should fail - no resume text
        if not result.success:
            print(f"✅ Correctly rejected empty resume: {result.error}")
        else:
            print("⚠️ Should have rejected empty resume")
            
    except Exception as e:
        print(f"Test exception: {e}")
    
    # Test corrupted resume
    print("\n--- Testing Corrupted Resume ---")
    payload["resume_text"] = CORRUPTED_RESUME
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"Corrupted Resume Result: success={result.success}")
        
        if result.success:
            score = result.output.get("overall_resume_score", 0)
            confidence = result.output.get("confidence_level")
            print(f"Score: {score}, Confidence: {confidence}")
            
            # Should have low confidence
            if confidence == "low":
                print("✅ Correctly assigned low confidence")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_6_missing_resume_text():
    """Test 6: analyze_resume without resume_text"""
    print("\n" + "="*60)
    print("TEST 6: Missing Resume Text for analyze_resume")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-missing-text",
        "task_type": "analyze_resume",
        "domain": "tech",
        # Missing resume_text
        "rag_context": []
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"Result: success={result.success}")
        
        # Should fail - missing resume_text
        if not result.success and "resume_text" in result.error.lower():
            print(f"✅ Correctly rejected: {result.error}")
        else:
            print(f"⚠️ Should have rejected with resume_text error")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_7_invalid_domain():
    """Test 7: Invalid domain"""
    print("\n" + "="*60)
    print("TEST 7: Invalid Domain")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-invalid-domain",
        "task_type": "analyze_resume",
        "domain": "business",  # Invalid
        "resume_text": STRONG_TECH_RESUME,
        "rag_context": []
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"Result: success={result.success}")
        
        # Should fail - invalid domain
        if not result.success and "domain" in result.error.lower():
            print(f"✅ Correctly rejected invalid domain: {result.error}")
        else:
            print(f"⚠️ Should have rejected invalid domain")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_8_unknown_task_type():
    """Test 8: Unknown task_type"""
    print("\n" + "="*60)
    print("TEST 8: Unknown Task Type")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-unknown-task",
        "task_type": "generate_roadmap",  # Invalid for this agent
        "domain": "tech",
        "resume_text": STRONG_TECH_RESUME
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"Result: success={result.success}")
        
        # Should fail - unknown task type
        if not result.success and "task_type" in result.error.lower():
            print(f"✅ Correctly rejected: {result.error}")
        else:
            print(f"⚠️ Should have rejected unknown task type")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_9_await_resume_upload():
    """Test 9: await_resume_upload task"""
    print("\n" + "="*60)
    print("TEST 9: Await Resume Upload (Waiting State)")
    print("="*60)
    
    agent = create_resume_intelligence_agent()
    
    payload = {
        "user_id": "test-await-upload",
        "task_type": "await_resume_upload",
        "domain": "tech"
    }
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"Result: success={result.success}")
        print(f"Output: {result.output}")
        
        # Should succeed with waiting status
        if result.success and result.output.get("status") == "awaiting_upload":
            print("✅ Correctly returned waiting state")
        else:
            print("⚠️ Should have returned awaiting_upload status")
            
    except Exception as e:
        print(f"Test exception: {e}")


# ============================================
# Main Test Runner
# ============================================

async def run_all_tests():
    """Run all ResumeIntelligenceAgent tests"""
    print("\n" + "="*60)
    print("RESUME INTELLIGENCE AGENT TEST SUITE")
    print("="*60)
    print(f"Started: {datetime.now()}")
    
    await test_1_strong_tech_resume()
    await test_2_weak_tech_resume()
    await test_3_medical_cv_with_exams()
    await test_4_medical_cv_missing_research()
    await test_5_empty_resume()
    await test_6_missing_resume_text()
    await test_7_invalid_domain()
    await test_8_unknown_task_type()
    await test_9_await_resume_upload()
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
