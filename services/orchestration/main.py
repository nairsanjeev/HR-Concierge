"""HR Concierge — AG-UI Backend Server.

Uses Microsoft Agent Framework to handle the tool-calling loop automatically.
No manual iteration — the framework manages tool detection, parallel execution,
and streaming.
"""

from __future__ import annotations

import logging

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent_framework import Agent
from agent_framework_openai import OpenAIChatCompletionClient
from agent_framework_ag_ui import add_agent_framework_fastapi_endpoint

from config import settings
from agents import HR_CONCIERGE_PROMPT, TOOLS

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("hr_concierge")

# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="HR Concierge — AG-UI Backend",
    version="3.0.0",
    description="Single-agent HR orchestration powered by Microsoft Agent Framework",
)

# ── Azure OpenAI Chat Client (Agent Framework connector) ─────────────────────

chat_client = OpenAIChatCompletionClient(
    model=settings.azure_openai_model,
    azure_endpoint=settings.azure_openai_endpoint,
    api_key=settings.azure_openai_api_key,
    api_version=settings.azure_openai_api_version,
)

# ── HR Concierge Agent ───────────────────────────────────────────────────────

hr_concierge = Agent(
    chat_client,
    instructions=HR_CONCIERGE_PROMPT,
    name="HR Concierge",
    description="Warm, professional AI assistant that helps employees with HR requests",
    tools=TOOLS,
    default_options={"temperature": 0.3},
)

# ── AG-UI Endpoint (framework handles the loop, streaming, and tool execution)

add_agent_framework_fastapi_endpoint(
    app,
    hr_concierge,
    path="/api/agent",
    allow_origins=settings.cors_origin_list,
)


# ── REST API Endpoints ───────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "healthy", "mode": "agent-framework", "demo_mode": settings.demo_mode}


@app.get("/api/scenarios")
async def get_scenarios():
    return {
        "scenarios": [
            {
                "id": "life-event",
                "title": "Life Event Concierge",
                "description": "Handle personal data changes triggered by life events — marriage, relocation, name change, and more.",
                "icon": "heart",
                "color": "violet",
                "sample_prompts": [
                    "I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details.",
                    "I changed my preferred name and need to update my passport and government ID information.",
                    "Update my address, emergency contact, and payment election details.",
                    "I recently got divorced and need to revert my last name and update my beneficiary information.",
                    "I moved to a different state and need to update my home address for tax purposes.",
                ],
            },
            {
                "id": "grievance",
                "title": "Grievance / Workplace Concern",
                "description": "Confidential intake for workplace concerns — structures narratives and routes appropriately.",
                "icon": "shield",
                "color": "blue",
                "sample_prompts": [
                    "My manager has been excluding me from important meetings and I feel I'm being treated unfairly.",
                    "I'm not sure if this is a grievance or just a team issue.",
                    "I want to report an issue but I don't know the correct category.",
                    "I believe I'm being discriminated against because of my age. Younger colleagues are promoted over me.",
                    "A coworker has been making inappropriate comments and I feel uncomfortable at work.",
                ],
            },
        ]
    }


@app.get("/api/prompts")
async def get_prompt_gallery():
    return {
        "categories": [
            {
                "name": "Life Events",
                "icon": "heart",
                "prompts": [
                    {"text": "I got married and need to update my name, benefits, and emergency contact.", "scenario": "life-event"},
                    {"text": "I moved to a new state — update my address and tax info.", "scenario": "life-event"},
                    {"text": "Update my bank details for direct deposit.", "scenario": "life-event"},
                    {"text": "I need to change my preferred name and pronouns.", "scenario": "life-event"},
                    {"text": "Update my passport information and government ID.", "scenario": "life-event"},
                ],
            },
            {
                "name": "Workplace Concerns",
                "icon": "shield",
                "prompts": [
                    {"text": "My manager excludes me from meetings and I feel treated unfairly.", "scenario": "grievance"},
                    {"text": "I'm experiencing what I believe is age discrimination.", "scenario": "grievance"},
                    {"text": "I want to report workplace harassment.", "scenario": "grievance"},
                    {"text": "I'm not sure if my issue is a formal grievance or a team conflict.", "scenario": "grievance"},
                ],
            },
            {
                "name": "HR Policy Questions",
                "icon": "book-open",
                "prompts": [
                    {"text": "What is the formal grievance filing procedure?", "scenario": "general"},
                    {"text": "How many PTO days do I get per year?", "scenario": "general"},
                    {"text": "What does our 401(k) match policy look like?", "scenario": "general"},
                    {"text": "What is our company's anti-harassment policy?", "scenario": "general"},
                    {"text": "How does FMLA leave work?", "scenario": "general"},
                ],
            },
            {
                "name": "Quick Actions",
                "icon": "zap",
                "prompts": [
                    {"text": "Update my emergency contact information.", "scenario": "life-event"},
                    {"text": "Change my preferred name.", "scenario": "life-event"},
                    {"text": "What documents do I need for a legal name change?", "scenario": "general"},
                    {"text": "I just had a baby and need to add them to my health insurance, update my tax withholdings, and request parental leave.", "scenario": "life-event"},
                ],
            },
        ]
    }


# ── Entry Point ──────────────────────────────────────────────────────────────

# ── CORS for MCP Server ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Tool Invocation Endpoint (for MCP Server to call individual tools) ────────

from agents.tools import (
    query_knowledge_base,
    retrieve_policy_guidance,
    assess_risk_and_compliance,
    build_impact_map,
    submit_high_risk_changes,
    execute_self_service_changes,
    generate_completion_summary,
    get_workday_form_schema,
    update_workday_employee,
    structure_narrative,
    create_grievance_case,
)

_TOOL_FUNCTIONS = {
    "query_knowledge_base": query_knowledge_base,
    "retrieve_policy_guidance": retrieve_policy_guidance,
    "assess_risk_and_compliance": assess_risk_and_compliance,
    "build_impact_map": build_impact_map,
    "submit_high_risk_changes": submit_high_risk_changes,
    "execute_self_service_changes": execute_self_service_changes,
    "generate_completion_summary": generate_completion_summary,
    "get_workday_form_schema": get_workday_form_schema,
    "update_workday_employee": update_workday_employee,
    "structure_narrative": structure_narrative,
    "create_grievance_case": create_grievance_case,
}


class ToolCallRequest(BaseModel):
    """Request body for tool invocation."""
    class Config:
        extra = "allow"


@app.post("/api/tools/{tool_name}")
async def invoke_tool(tool_name: str, body: ToolCallRequest):
    """Invoke an individual HR tool by name. Used by the MCP Server."""
    if tool_name not in _TOOL_FUNCTIONS:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")

    fn = _TOOL_FUNCTIONS[tool_name]
    kwargs = body.model_dump(exclude_unset=True)

    try:
        import inspect
        if inspect.iscoroutinefunction(fn):
            result = await fn(**kwargs)
        else:
            result = fn(**kwargs)
        return result
    except Exception as e:
        logger.error(f"Tool invocation failed: {tool_name} — {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting HR Concierge AG-UI Backend (Agent Framework)…")
    uvicorn.run(app, host="0.0.0.0", port=8000)
