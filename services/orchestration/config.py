"""Configuration management for the orchestration service."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

_ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Azure OpenAI
    azure_openai_endpoint: str = Field(default="", alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_key: str = Field(default="", alias="AZURE_OPENAI_API_KEY")
    azure_openai_model: str = Field(default="gpt-4o-mini", alias="AZURE_OPENAI_CHAT_COMPLETION_MODEL")
    azure_openai_api_version: str = Field(default="2024-12-01-preview", alias="AZURE_OPENAI_API_VERSION")

    # Azure AI Project
    azure_ai_project_endpoint: str = Field(default="", alias="AZURE_AI_PROJECT_ENDPOINT")

    # Azure AI Search (Foundry IQ)
    azure_search_endpoint: str = Field(default="", alias="AZURE_SEARCH_ENDPOINT")
    azure_search_api_key: str = Field(default="", alias="AZURE_SEARCH_API_KEY")
    azure_search_knowledge_base: str = Field(default="hr-policy-knowledgebase", alias="AZURE_SEARCH_KNOWLEDGE_BASE")

    # ServiceNow
    servicenow_instance_url: str = Field(default="https://copilota2a.service-now.com", alias="SERVICENOW_INSTANCE_URL")
    servicenow_username: str = Field(default="", alias="SERVICENOW_USERNAME")
    servicenow_password: str = Field(default="", alias="SERVICENOW_PASSWORD")
    servicenow_client_id: str = Field(default="", alias="SERVICENOW_CLIENT_ID")
    servicenow_client_secret: str = Field(default="", alias="SERVICENOW_CLIENT_SECRET")
    servicenow_auth_scope: str = Field(default="a2aauthscope", alias="SERVICENOW_AUTH_SCOPE")
    servicenow_use_mock: bool = Field(default=True, alias="SERVICENOW_USE_MOCK")
    servicenow_incident_agent_id: str = Field(default="26315fbaeb7e6e1086d3f20dbad0cdef", alias="SERVICENOW_INCIDENT_AGENT_ID")
    servicenow_knowledge_agent_id: str = Field(default="37d5facaeb036a10c51af963bad0cd39", alias="SERVICENOW_KNOWLEDGE_AGENT_ID")

    # SharePoint
    sharepoint_site_url: str = Field(default="", alias="SHAREPOINT_SITE_URL")

    # App Settings
    demo_mode: bool = Field(default=True, alias="DEMO_MODE")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    cors_origins: str = Field(default="http://localhost:5173,http://localhost:3000", alias="CORS_ORIGINS")

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
