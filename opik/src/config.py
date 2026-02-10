"""config.py - Load and validate environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


class Settings:
    OPIK_API_KEY: str = os.getenv("OPIK_API_KEY", "")
    OPIK_WORKSPACE: str = os.getenv("OPIK_WORKSPACE", "")
    OPIK_PROJECT: str = os.getenv("OPIK_PROJECT", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    )

    def validate(self) -> None:
        missing = []
        if not self.OPIK_API_KEY:
            missing.append("OPIK_API_KEY")
        if not self.OPENROUTER_API_KEY:
            missing.append("OPENROUTER_API_KEY")
        if missing:
            raise EnvironmentError(
                f"Missing required env vars: {', '.join(missing)}. "
                "Fill in your .env file."
            )


settings = Settings()
