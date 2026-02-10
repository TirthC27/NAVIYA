"""
Resume Analysis API Routes

Endpoints for resume upload, analysis retrieval, and skills management.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import Optional
import httpx
import json

from app.config import settings
from app.agents.task_executor import process_pending_tasks
from app.services.dashboard_state import get_dashboard_state_service
from app.services.document_ingestion import (
    get_document_ingestion_service,
    ExtractionConfidence,
    ALLOWED_EXTENSIONS,
    REJECTED_EXTENSIONS,
    MAX_FILE_SIZE
)


router = APIRouter(prefix="/api/resume", tags=["resume"])

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"


def get_headers():
    """Get headers for Supabase REST API calls"""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


# ============================================
# Background Task Function
# ============================================

async def process_resume_and_update_dashboard(user_id: str):
    """
    Background task to process resume and update dashboard state.
    
    This function:
    1. Processes pending ResumeIntelligenceAgent tasks
    2. Updates dashboard_state to mark resume_ready = true
    """
    try:
        import asyncio
        print(f"[SYNC] Starting resume processing for user: {user_id}")
        
        # Process the pending resume task
        processed = await process_pending_tasks("ResumeIntelligenceAgent", limit=1)
        print(f"[OK] Processed {processed} resume tasks")
        
        if processed > 0:
            # Update dashboard state
            dashboard_service = get_dashboard_state_service()
            await dashboard_service.mark_resume_ready(user_id)
            print(f"[OK] Dashboard state updated: resume_ready=true for user {user_id}")
        else:
            print(f"[WARN] No resume tasks processed for user {user_id}")
            
    except Exception as e:
        print(f"[ERR] Error processing resume: {str(e)}")
        import traceback
        traceback.print_exc()


# ============================================
# Document Ingestion Endpoint (NEW)
# ============================================

@router.post("/upload-file/{user_id}")
async def upload_resume_file(
    user_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload and process a resume file.
    
    This endpoint:
    1. Validates the file (type, size, MIME)
    2. Extracts text using DocumentIngestionService
    3. Stores extraction in resume_documents table
    4. Creates agent task for ResumeIntelligenceAgent
    5. Triggers background processing
    
    Supported formats: PDF, DOCX, DOC, TXT, PNG, JPG
    
    Args:
        user_id: User's UUID
        file: The uploaded file
        
    Returns:
        Extraction result and processing status
    """
    import os
    
    # Validate filename exists
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    filename = file.filename
    ext = os.path.splitext(filename.lower())[1]
    
    # Check for rejected extensions early
    if ext in REJECTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed for security reasons."
        )
    
    # Check for allowed extensions
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Please upload PDF, DOCX, DOC, TXT, or image files."
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
            )
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="File is empty.")
        
        print(f"[FILE] Processing resume upload: {filename} ({len(content)} bytes)")
        
        # Get document ingestion service
        ingestion_service = get_document_ingestion_service()
        
        # Extract text
        result = await ingestion_service.extract_text(
            file_content=content,
            filename=filename,
            mime_type=file.content_type
        )
        
        if not result.success:
            # Store failed extraction
            await _store_document_extraction(
                user_id=user_id,
                filename=filename,
                content=content,
                extraction_result=result,
                status="failed"
            )
            
            raise HTTPException(
                status_code=400,
                detail=result.error or "We couldn't read your resume. Please upload a clearer file."
            )
        
        print(f"[OK] Text extracted: {result.word_count} words, confidence: {result.confidence}")
        
        # Store successful extraction
        doc_id = await _store_document_extraction(
            user_id=user_id,
            filename=filename,
            content=content,
            extraction_result=result,
            status="completed"
        )
        
        # Get user context for domain
        async with httpx.AsyncClient(timeout=30.0) as client:
            context_url = f"{SUPABASE_REST_URL}/user_context"
            context_response = await client.get(
                context_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "selected_domain,career_goal_raw"
                }
            )
            
            domain = "tech"
            career_goal = ""
            
            if context_response.status_code == 200:
                context_data = context_response.json()
                if context_data:
                    user_context = context_data[0]
                    domain_raw = user_context.get("selected_domain", "")
                    career_goal = user_context.get("career_goal_raw", "")
                    
                    # Map domain
                    domain_map = {
                        "Technology / Engineering": "tech",
                        "Medical / Healthcare": "medical"
                    }
                    domain = domain_map.get(domain_raw, "tech")
        
        # Create agent task
        task_id = await _create_resume_analysis_task(
            user_id=user_id,
            resume_text=result.text,
            extraction_confidence=result.confidence.value,
            domain=domain,
            career_goal=career_goal,
            filename=filename,
            word_count=result.word_count,
            extraction_method=result.method,
            warnings=result.warnings
        )
        
        # Trigger background processing
        background_tasks.add_task(process_resume_and_update_dashboard, user_id)
        
        # Build response
        response = {
            "success": True,
            "message": "Resume uploaded and processing started",
            "document_id": doc_id,
            "task_id": task_id,
            "extraction": {
                "method": result.method,
                "confidence": result.confidence.value,
                "word_count": result.word_count,
                "page_count": result.page_count
            },
            "status": "processing"
        }
        
        # Add warnings if any
        if result.warnings:
            response["warnings"] = result.warnings
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERR] Upload failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your resume. Please try again."
        )


async def _store_document_extraction(
    user_id: str,
    filename: str,
    content: bytes,
    extraction_result,
    status: str
) -> Optional[str]:
    """Store document extraction result in resume_documents table"""
    import os
    
    ingestion_service = get_document_ingestion_service()
    ext = os.path.splitext(filename.lower())[1]
    file_hash = ingestion_service.get_file_hash(content)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SUPABASE_REST_URL}/resume_documents",
                headers=get_headers(),
                json={
                    "user_id": user_id,
                    "original_filename": filename,
                    "file_extension": ext,
                    "file_size": len(content),
                    "file_hash": file_hash,
                    "mime_type": ingestion_service._detect_mime_type(content, ext),
                    "extracted_text": extraction_result.text if extraction_result.success else None,
                    "extraction_method": extraction_result.method,
                    "extraction_confidence": extraction_result.confidence.value if extraction_result.confidence else None,
                    "status": status,
                    "error_message": extraction_result.error if not extraction_result.success else None,
                    "page_count": extraction_result.page_count,
                    "word_count": extraction_result.word_count,
                    "warnings": json.dumps(extraction_result.warnings or [])
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return data[0]["id"] if data else None
            else:
                print(f"[WARN] Failed to store document: {response.text}")
                return None
                
    except Exception as e:
        print(f"[WARN] Failed to store document: {str(e)}")
        return None


async def _create_resume_analysis_task(
    user_id: str,
    resume_text: str,
    extraction_confidence: str,
    domain: str,
    career_goal: str,
    filename: str,
    word_count: int,
    extraction_method: str,
    warnings: list
) -> Optional[str]:
    """Create or update agent task for ResumeIntelligenceAgent"""
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks_url = f"{SUPABASE_REST_URL}/agent_tasks"
        
        # Check for existing await_resume_upload task
        task_response = await client.get(
            tasks_url,
            headers=get_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "agent_name": "eq.ResumeIntelligenceAgent",
                "task_type": "eq.await_resume_upload",
                "status": "eq.pending",
                "select": "id",
                "limit": "1"
            }
        )
        
        task_payload = {
            "user_id": user_id,
            "domain": domain,
            "career_goal_raw": career_goal,
            "resume_text": resume_text,
            "extraction_confidence": extraction_confidence,
            "resume_metadata": {
                "filename": filename,
                "word_count": word_count,
                "extraction_method": extraction_method,
                "warnings": warnings
            },
            "task_type": "analyze_resume"
        }
        
        if task_response.status_code == 200:
            tasks = task_response.json()
            
            if tasks:
                # Update existing task
                task_id = tasks[0]["id"]
                update_response = await client.patch(
                    f"{tasks_url}?id=eq.{task_id}",
                    headers=get_headers(),
                    json={
                        "task_type": "analyze_resume",
                        "task_payload": task_payload,
                        "status": "pending"
                    }
                )
                
                if update_response.status_code in [200, 204]:
                    return task_id
        
        # Create new task
        create_response = await client.post(
            tasks_url,
            headers=get_headers(),
            json={
                "user_id": user_id,
                "agent_name": "ResumeIntelligenceAgent",
                "task_type": "analyze_resume",
                "task_payload": task_payload,
                "status": "pending"
            }
        )
        
        if create_response.status_code in [200, 201]:
            created = create_response.json()
            return created[0]["id"] if created else None
        
        return None


# ============================================
# Resume Analysis Endpoints
# ============================================

@router.get("/analysis/{user_id}")
async def get_resume_analysis(user_id: str):
    """
    Get resume analysis for a user.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Resume analysis data or null if not found
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/resume_analysis"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "*"
            }
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return {
                        "success": True,
                        "analysis": data[0],
                        "has_analysis": True
                    }
                return {
                    "success": True,
                    "analysis": None,
                    "has_analysis": False
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch analysis: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/analysis/{user_id}/scores")
async def get_resume_scores(user_id: str):
    """
    Get just the scores from resume analysis.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Quality scores and overall score
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/resume_analysis"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "overall_score,quality_scores,confidence_level,domain"
            }
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    analysis = data[0]
                    return {
                        "success": True,
                        "overall_score": analysis.get("overall_score"),
                        "quality_scores": analysis.get("quality_scores"),
                        "confidence_level": analysis.get("confidence_level"),
                        "domain": analysis.get("domain")
                    }
                return {
                    "success": True,
                    "overall_score": None,
                    "has_analysis": False
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch scores: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/analysis/{user_id}/gaps")
async def get_resume_gaps(user_id: str):
    """
    Get missing elements and recommendations from resume analysis.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Missing elements and recommendations
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/resume_analysis"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "missing_elements,recommendations"
            }
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    analysis = data[0]
                    return {
                        "success": True,
                        "missing_elements": analysis.get("missing_elements", []),
                        "recommendations": analysis.get("recommendations", []),
                        "has_analysis": True
                    }
                return {
                    "success": True,
                    "missing_elements": [],
                    "recommendations": [],
                    "has_analysis": False
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch gaps: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


# ============================================
# Skills Endpoints
# ============================================

@router.get("/skills/{user_id}")
async def get_user_skills(user_id: str, category: Optional[str] = None):
    """
    Get extracted skills for a user.
    
    Args:
        user_id: User's UUID
        category: Optional filter by skill category
        
    Returns:
        List of user skills
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/user_skills"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "*",
                "order": "skill_category,skill_name"
            }
            
            if category:
                params["skill_category"] = f"eq.{category}"
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                skills = response.json()
                
                # Group by category
                grouped = {}
                for skill in skills:
                    cat = skill.get("skill_category", "other")
                    if cat not in grouped:
                        grouped[cat] = []
                    grouped[cat].append(skill.get("skill_name"))
                
                return {
                    "success": True,
                    "skills": skills,
                    "grouped": grouped,
                    "total_count": len(skills)
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch skills: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/skills/{user_id}/summary")
async def get_skills_summary(user_id: str):
    """
    Get a summary of user skills grouped by category.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Skills grouped by category with counts
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/user_skills"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "skill_name,skill_category,proficiency_level"
            }
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                skills = response.json()
                
                # Build summary
                summary = {}
                for skill in skills:
                    cat = skill.get("skill_category", "other")
                    if cat not in summary:
                        summary[cat] = {
                            "skills": [],
                            "count": 0
                        }
                    summary[cat]["skills"].append(skill.get("skill_name"))
                    summary[cat]["count"] += 1
                
                return {
                    "success": True,
                    "summary": summary,
                    "total_skills": len(skills),
                    "categories": list(summary.keys())
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch skills: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


# ============================================
# Resume Upload Trigger Endpoint
# ============================================

@router.post("/upload/{user_id}")
async def trigger_resume_analysis(
    user_id: str,
    background_tasks: BackgroundTasks,
    resume_text: str = Form(...),
    filename: Optional[str] = Form(None)
):
    """
    Trigger resume analysis by creating/updating an agent task.
    
    This endpoint:
    1. Finds the existing await_resume_upload task for the user
    2. Updates it to analyze_resume with the resume text
    
    Args:
        user_id: User's UUID
        resume_text: The extracted text from the resume
        filename: Optional original filename
        
    Returns:
        Task creation/update status
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First, get user's domain from user_context
            context_url = f"{SUPABASE_REST_URL}/user_context"
            context_response = await client.get(
                context_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "selected_domain,career_goal_raw"
                }
            )
            
            if context_response.status_code != 200:
                raise HTTPException(status_code=404, detail="User context not found")
            
            context_data = context_response.json()
            if not context_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_context = context_data[0]
            domain = user_context.get("selected_domain", "")
            career_goal = user_context.get("career_goal_raw", "")
            
            # Map domain to tech/medical
            domain_map = {
                "Technology / Engineering": "tech",
                "Medical / Healthcare": "medical"
            }
            mapped_domain = domain_map.get(domain, "tech")
            
            # Find existing await_resume_upload task
            tasks_url = f"{SUPABASE_REST_URL}/agent_tasks"
            task_response = await client.get(
                tasks_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "agent_name": "eq.ResumeIntelligenceAgent",
                    "task_type": "eq.await_resume_upload",
                    "status": "eq.pending",
                    "select": "id",
                    "limit": "1"
                }
            )
            
            word_count = len(resume_text.split())
            
            if task_response.status_code == 200:
                tasks = task_response.json()
                
                if tasks:
                    # Update existing task
                    task_id = tasks[0]["id"]
                    update_response = await client.patch(
                        f"{tasks_url}?id=eq.{task_id}",
                        headers=get_headers(),
                        json={
                            "task_type": "analyze_resume",
                            "task_payload": {
                                "user_id": user_id,
                                "domain": mapped_domain,
                                "career_goal_raw": career_goal,
                                "resume_text": resume_text,
                                "resume_metadata": {
                                    "filename": filename,
                                    "word_count": word_count
                                },
                                "task_type": "analyze_resume"
                            },
                            "status": "pending"
                        }
                    )
                    
                    if update_response.status_code in [200, 204]:
                        # Trigger task processing in background
                        background_tasks.add_task(process_resume_and_update_dashboard, user_id)
                        
                        return {
                            "success": True,
                            "message": "Resume analysis started",
                            "task_id": task_id,
                            "word_count": word_count,
                            "status": "processing"
                        }
                    else:
                        raise HTTPException(
                            status_code=update_response.status_code,
                            detail=f"Failed to update task: {update_response.text}"
                        )
                else:
                    # Create new task
                    create_response = await client.post(
                        tasks_url,
                        headers=get_headers(),
                        json={
                            "user_id": user_id,
                            "agent_name": "ResumeIntelligenceAgent",
                            "task_type": "analyze_resume",
                            "task_payload": {
                                "user_id": user_id,
                                "domain": mapped_domain,
                                "career_goal_raw": career_goal,
                                "resume_text": resume_text,
                                "resume_metadata": {
                                    "filename": filename,
                                    "word_count": word_count
                                },
                                "task_type": "analyze_resume"
                            },
                            "status": "pending"
                        }
                    )
                    
                    if create_response.status_code in [200, 201]:
                        created = create_response.json()
                        # Trigger task processing in background
                        background_tasks.add_task(process_resume_and_update_dashboard, user_id)
                        
                        return {
                            "success": True,
                            "message": "Resume analysis started",
                            "task_id": created[0]["id"] if created else None,
                            "word_count": word_count,
                            "status": "processing"
                        }
                    else:
                        raise HTTPException(
                            status_code=create_response.status_code,
                            detail=f"Failed to create task: {create_response.text}"
                        )
            else:
                raise HTTPException(
                    status_code=task_response.status_code,
                    detail=f"Failed to query tasks: {task_response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


# ============================================
# Dashboard Data Endpoint
# ============================================

@router.get("/dashboard/{user_id}")
async def get_resume_dashboard_data(user_id: str):
    """
    Get all resume-related data for dashboard display.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Combined analysis, scores, gaps, and skills data
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fetch analysis
            analysis_url = f"{SUPABASE_REST_URL}/resume_analysis"
            analysis_response = await client.get(
                analysis_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "*"
                }
            )
            
            # Fetch skills
            skills_url = f"{SUPABASE_REST_URL}/user_skills"
            skills_response = await client.get(
                skills_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "skill_name,skill_category"
                }
            )
            
            analysis = None
            if analysis_response.status_code == 200:
                data = analysis_response.json()
                if data:
                    analysis = data[0]
            
            skills = []
            skills_grouped = {}
            if skills_response.status_code == 200:
                skills = skills_response.json()
                for skill in skills:
                    cat = skill.get("skill_category", "other")
                    if cat not in skills_grouped:
                        skills_grouped[cat] = []
                    skills_grouped[cat].append(skill.get("skill_name"))
            
            return {
                "success": True,
                "has_analysis": analysis is not None,
                "analysis": {
                    "overall_score": analysis.get("overall_score") if analysis else None,
                    "quality_scores": analysis.get("quality_scores") if analysis else {},
                    "missing_elements": analysis.get("missing_elements") if analysis else [],
                    "recommendations": analysis.get("recommendations") if analysis else [],
                    "confidence_level": analysis.get("confidence_level") if analysis else None,
                    "domain": analysis.get("domain") if analysis else None,
                    "created_at": analysis.get("created_at") if analysis else None
                },
                "skills": {
                    "grouped": skills_grouped,
                    "total_count": len(skills)
                }
            }
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
