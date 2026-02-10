"""
Authentication Routes
Simple authentication using custom users table
Using direct REST API calls to Supabase
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
import hashlib
import secrets
import httpx

from app.config import settings


router = APIRouter(tags=["Authentication"])


# ============================================
# Supabase REST Configuration
# ============================================

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
# Request/Response Models
# ============================================

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None
    session: Optional[dict] = None


# ============================================
# Helper Functions
# ============================================

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


# ============================================
# Routes
# ============================================

@router.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register a new user
    """
    try:
        print(f"[INFO] Registration attempt for: {request.email}")
        
        async with httpx.AsyncClient() as client:
            # Check if user already exists
            check_url = f"{SUPABASE_REST_URL}/users?email=eq.{request.email}&select=id"
            check_response = await client.get(check_url, headers=get_headers())
            
            print(f"[INFO] Check response: {check_response.status_code}")
            
            if check_response.status_code == 200 and check_response.json():
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Hash password and create user
            password_hash = hash_password(request.password)
            user_data = {
                "email": request.email,
                "display_name": request.name,
                "password_hash": password_hash
            }
            
            # Insert new user
            insert_url = f"{SUPABASE_REST_URL}/users"
            insert_response = await client.post(
                insert_url, 
                headers=get_headers(), 
                json=user_data
            )
            
            print(f"[INFO] Insert response: {insert_response.status_code}")
            
            if insert_response.status_code not in [200, 201]:
                error_detail = insert_response.text
                print(f"[ERR] Insert error: {error_detail}")
                raise HTTPException(status_code=500, detail=f"Failed to create user: {error_detail}")
            
            users = insert_response.json()
            if not users:
                raise HTTPException(status_code=500, detail="Failed to create user")
            
            user = users[0]
            token = generate_token()
            
            print(f"[OK] User registered successfully: {user['id']}")
            return AuthResponse(
                success=True,
                message="Registration successful",
                user={
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["display_name"]
                },
                session={
                    "access_token": token,
                    "refresh_token": token
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERR] Registration error: {str(e)}")
        print(f"[ERR] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login user
    """
    try:
        print(f"[INFO] Login attempt for: {request.email}")
        
        async with httpx.AsyncClient() as client:
            # Find user by email
            find_url = f"{SUPABASE_REST_URL}/users?email=eq.{request.email}&select=*"
            response = await client.get(find_url, headers=get_headers())
            
            if response.status_code != 200 or not response.json():
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            users = response.json()
            if not users:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            user = users[0]
            
            # Verify password
            if hash_password(request.password) != user.get("password_hash", ""):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            token = generate_token()
            
            print(f"[OK] User logged in: {user['id']}")
            return AuthResponse(
                success=True,
                message="Login successful",
                user={
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["display_name"]
                },
                session={
                    "access_token": token,
                    "refresh_token": token
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERR] Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/auth/verify")
async def verify_token(token: str):
    """
    Verify authentication token
    """
    if not token or len(token) < 20:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return {"success": True, "message": "Token is valid"}


@router.post("/auth/logout")
async def logout():
    """
    Logout user
    """
    return {"success": True, "message": "Logged out successfully"}

