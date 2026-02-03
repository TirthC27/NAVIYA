"""
Mentor Messages API Routes

Endpoints for retrieving and managing mentor messages.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List
import httpx

from app.config import settings


router = APIRouter(prefix="/api/mentor", tags=["mentor"])

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
# Message Retrieval Endpoints
# ============================================

@router.get("/messages/{user_id}")
async def get_mentor_messages(user_id: str, limit: int = 10):
    """
    Get mentor messages for a user, ordered by most recent first.
    
    Args:
        user_id: User's UUID
        limit: Maximum number of messages to return
        
    Returns:
        List of mentor messages
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/mentor_messages"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "*",
                "order": "created_at.desc",
                "limit": str(limit)
            }
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                messages = response.json()
                return {
                    "success": True,
                    "messages": messages,
                    "count": len(messages)
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch messages: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/messages/{user_id}/latest")
async def get_latest_mentor_message(user_id: str):
    """
    Get the most recent mentor message for a user.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Latest mentor message or null if none exists
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/mentor_messages"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "*",
                "order": "created_at.desc",
                "limit": "1"
            }
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                messages = response.json()
                return {
                    "success": True,
                    "message": messages[0] if messages else None,
                    "has_message": len(messages) > 0
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch message: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/messages/{user_id}/unread-count")
async def get_unread_message_count(user_id: str):
    """
    Get count of unread messages for a user.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Count of unread messages
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/mentor_messages"
            params = {
                "user_id": f"eq.{user_id}",
                "read_at": "is.null",
                "select": "id"
            }
            
            # Use HEAD with Prefer: count=exact for efficiency
            headers = get_headers()
            headers["Prefer"] = "count=exact"
            
            response = await client.get(
                url,
                headers=headers,
                params=params
            )
            
            if response.status_code == 200:
                # Get count from Content-Range header or count messages
                messages = response.json()
                count = len(messages)
                
                return {
                    "success": True,
                    "unread_count": count
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to count messages: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


# ============================================
# Message Management Endpoints
# ============================================

@router.post("/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """
    Mark a mentor message as read.
    
    Args:
        message_id: Message UUID
        
    Returns:
        Updated message
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/mentor_messages"
            params = {"id": f"eq.{message_id}"}
            
            response = await client.patch(
                url,
                headers=get_headers(),
                params=params,
                json={"read_at": "now()"}
            )
            
            if response.status_code in [200, 204]:
                return {
                    "success": True,
                    "message": "Message marked as read"
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to update message: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.post("/messages/{user_id}/read-all")
async def mark_all_messages_read(user_id: str):
    """
    Mark all mentor messages as read for a user.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Success status
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/mentor_messages"
            params = {
                "user_id": f"eq.{user_id}",
                "read_at": "is.null"
            }
            
            response = await client.patch(
                url,
                headers=get_headers(),
                params=params,
                json={"read_at": "now()"}
            )
            
            if response.status_code in [200, 204]:
                return {
                    "success": True,
                    "message": "All messages marked as read"
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to update messages: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


# ============================================
# Message History Endpoint
# ============================================

@router.get("/messages/{user_id}/history")
async def get_message_history(user_id: str, page: int = 1, per_page: int = 20):
    """
    Get paginated message history for a user.
    
    Args:
        user_id: User's UUID
        page: Page number (1-indexed)
        per_page: Messages per page
        
    Returns:
        Paginated list of messages
    """
    try:
        offset = (page - 1) * per_page
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{SUPABASE_REST_URL}/mentor_messages"
            params = {
                "user_id": f"eq.{user_id}",
                "select": "*",
                "order": "created_at.desc",
                "limit": str(per_page),
                "offset": str(offset)
            }
            
            response = await client.get(
                url,
                headers=get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                messages = response.json()
                return {
                    "success": True,
                    "messages": messages,
                    "page": page,
                    "per_page": per_page,
                    "count": len(messages),
                    "has_more": len(messages) == per_page
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch history: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
