"""
Configuration for Skill Roadmap Agent
"""

import os
from pathlib import Path


class AgentConfig:
    """Configuration settings for the Skill Roadmap Agent"""
    
    # API Keys
    OPENROUTER_API_KEY: str = ""
    YOUTUBE_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # LLM Settings
    LLM_MODEL: str = "google/gemini-flash-1.5"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 8000
    
    # YouTube Settings
    MAX_VIDEOS_PER_SKILL: int = 3
    PREFERRED_LANGUAGE: str = "English"
    
    # Database
    SKILL_ROADMAP_TABLE: str = "skill_roadmap"
    
    @classmethod
    def from_env(cls):
        """Load configuration from environment variables"""
        config = cls()
        config.OPENROUTER_API_KEY = cls._read_env_key("OPENROUTER_API_KEY")
        config.YOUTUBE_API_KEY = cls._read_env_key("YOUTUBE_API_KEY")
        config.SUPABASE_URL = cls._read_env_key("SUPABASE_URL")
        config.SUPABASE_KEY = cls._read_env_key("SUPABASE_KEY")
        return config
    
    @staticmethod
    def _read_env_key(key_name: str) -> str:
        """Read key from environment or .env file"""
        # First check environment
        val = os.environ.get(key_name)
        if val:
            return val
        
        # Then check .env file
        env_path = Path(__file__).parent / '.env'
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(f'{key_name}='):
                        return line.split('=', 1)[1].strip().strip('"').strip("'")
        
        return ""
