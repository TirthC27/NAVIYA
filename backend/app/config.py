"""
LearnTube AI - Configuration Module
Loads environment variables using python-dotenv
"""

import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import Optional

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # OpenRouter API Configuration
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "google/gemini-pro")
    
    # YouTube API Configuration
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Application Settings
    APP_NAME: str = "LearnTube AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create a global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Returns the application settings instance"""
    return settings


def validate_settings() -> dict:
    """Validate that all required settings are configured"""
    validation_result = {
        "valid": True,
        "missing": [],
        "configured": []
    }
    
    required_keys = [
        "OPENROUTER_API_KEY",
        "YOUTUBE_API_KEY", 
        "SUPABASE_URL",
        "SUPABASE_KEY"
    ]
    
    for key in required_keys:
        value = getattr(settings, key, "")
        if not value or value == "":
            validation_result["valid"] = False
            validation_result["missing"].append(key)
        else:
            validation_result["configured"].append(key)
    
    return validation_result
