"""
Naviya AI - Configuration Module
Loads environment variables directly from .env file
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional

# Get the backend directory (parent of app/)
BACKEND_DIR = Path(__file__).parent.parent
ENV_FILE = BACKEND_DIR / ".env"

# Load environment variables from .env file (override system env vars)
load_dotenv(dotenv_path=ENV_FILE, override=True)

# Force-read .env directly to avoid stale session env vars
def _read_env_key(key: str, default: str = "") -> str:
    """Read a key directly from .env file, falling back to os.getenv"""
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            if k.strip() == key:
                return v.strip()
    return os.getenv(key, default)


class Settings:
    """Application settings loaded directly from .env file"""
    
    def __init__(self):
        # OpenRouter API Configuration
        self.OPENROUTER_API_KEY: str = _read_env_key("OPENROUTER_API_KEY")
        self.GEMINI_MODEL: str = _read_env_key("GEMINI_MODEL", "google/gemini-pro")
        
        # YouTube API Configuration
        self.YOUTUBE_API_KEY: str = _read_env_key("YOUTUBE_API_KEY")
        
        # Supabase Configuration
        self.SUPABASE_URL: str = _read_env_key("SUPABASE_URL")
        self.SUPABASE_KEY: str = _read_env_key("SUPABASE_KEY")
        
        # OPIK Observability Configuration
        self.OPIK_API_KEY: str = _read_env_key("OPIK_API_KEY", "ARtXGDhLbJmFIP4VaT0XT14n5")
        self.OPIK_WORKSPACE: str = _read_env_key("OPIK_WORKSPACE", "tirthc27")
        self.OPIK_PROJECT: str = _read_env_key("OPIK_PROJECT", "Naviya")
        
        # Application Settings
        self.APP_NAME: str = "Naviya AI"
        self.APP_VERSION: str = "2.0.0"
        self.DEBUG: bool = _read_env_key("DEBUG", "False").lower() == "true"


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
