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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from pathlib import Path

from agent_framework import Agent, SkillsProvider
from agent_framework_openai import OpenAIChatCompletionClient
from agent_framework_ag_ui import add_agent_framework_fastapi_endpoint, AGUIRequest, AgentFrameworkAgent

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

# ── Sync Azure OpenAI client (for /api/invoke endpoint) ─────────────────────

from openai import AzureOpenAI as _AzureOpenAI

_sync_openai = _AzureOpenAI(
    azure_endpoint=settings.azure_openai_endpoint,
    api_key=settings.azure_openai_api_key,
    api_version=settings.azure_openai_api_version,
)

# ── Skills Provider (file-based expense-report skill) ────────────────────────

def _expense_script_runner(skill, script, args=None):
    """Run a skill script in-process (safe for demo — single known script)."""
    import importlib.util
    import os

    script_path = os.path.join(skill.path, script.path)
    spec = importlib.util.spec_from_file_location(script.name, script_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    input_json = (args or {}).get("report_json", "{}")
    return mod.validate_expense_report(input_json)


skills_provider = SkillsProvider.from_paths(
    Path(__file__).parent / "skills",
    script_runner=_expense_script_runner,
)

# ── HR Concierge Agent ───────────────────────────────────────────────────────

hr_concierge = Agent(
    chat_client,
    instructions=HR_CONCIERGE_PROMPT,
    name="HR Concierge",
    description="Warm, professional AI assistant that helps employees with HR requests",
    tools=TOOLS,
    context_providers=[skills_provider],
    default_options={"temperature": 0.3},
)

# ── AG-UI Endpoint (custom wrapper to inject routing_decision events) ────────

from collections.abc import AsyncGenerator
from ag_ui.core import CustomEvent, RunErrorEvent
from ag_ui.encoder import EventEncoder

# Build the framework protocol runner for streaming
_protocol_runner = AgentFrameworkAgent(agent=hr_concierge)

CLASSIFICATION_SYSTEM = (
    "You are an intent classifier for an HR Concierge system. "
    "Given the user message, output EXACTLY 4 lines:\n"
    "Classification: <category> (Policy Question / Life Event / Grievance / Trivial Complaint / Expense Report)\n"
    "Severity: <severity or N/A>\n"
    "Reasoning: <one sentence why>\n"
    "Action: <what tools/actions will be taken>\n\n"
    "Be concise. One line each. No markdown formatting."
)


@app.post("/api/agent", tags=["AG-UI"], response_model=None)
async def agent_endpoint_with_reasoning(request_body: AGUIRequest) -> StreamingResponse:
    """AG-UI endpoint that emits a routing_decision CUSTOM event before agent response."""

    # Extract last user message for classification
    user_message = ""
    for msg in reversed(request_body.messages or []):
        if msg.get("role") in ("human", "user"):
            content = msg.get("content", "")
            if isinstance(content, str):
                user_message = content
            elif isinstance(content, list):
                user_message = " ".join(
                    p.get("text", "") for p in content if p.get("type") == "text"
                )
            break

    # Quick classification call (non-streaming, fast)
    classification = None
    if user_message:
        try:
            cls_resp = _sync_openai.chat.completions.create(
                model=settings.azure_openai_model,
                messages=[
                    {"role": "system", "content": CLASSIFICATION_SYSTEM},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.1,
                max_completion_tokens=150,
            )
            cls_text = cls_resp.choices[0].message.content or ""
            # Parse the 4 lines into a structured routing decision
            lines = [l.strip() for l in cls_text.strip().split("\n") if l.strip()]
            decision_parts = {}
            for line in lines:
                if line.lower().startswith("classification:"):
                    decision_parts["classification"] = line.split(":", 1)[1].strip()
                elif line.lower().startswith("severity:"):
                    decision_parts["severity"] = line.split(":", 1)[1].strip()
                elif line.lower().startswith("reasoning:"):
                    decision_parts["reasoning"] = line.split(":", 1)[1].strip()
                elif line.lower().startswith("action:"):
                    decision_parts["action"] = line.split(":", 1)[1].strip()

            if decision_parts.get("classification"):
                # Determine decision type for UI coloring
                cls_lower = decision_parts["classification"].lower()
                if "trivial" in cls_lower or "not" in cls_lower:
                    decision_type = "grievance_rejected"
                elif "grievance" in cls_lower:
                    decision_type = "grievance_accepted"
                elif "life event" in cls_lower:
                    decision_type = "life_event"
                elif "expense" in cls_lower:
                    decision_type = "expense_report"
                else:
                    decision_type = "knowledge_retrieval"

                reason_text = (
                    f"Classification: {decision_parts.get('classification', 'Unknown')}\n"
                    f"Severity: {decision_parts.get('severity', 'N/A')}\n"
                    f"Reasoning: {decision_parts.get('reasoning', '')}\n"
                    f"Action: {decision_parts.get('action', '')}"
                )
                classification = {
                    "decision": decision_type,
                    "reason": reason_text,
                }
        except Exception as e:
            logger.warning(f"Classification call failed (non-fatal): {e}")

    async def event_generator() -> AsyncGenerator[str]:
        encoder = EventEncoder()

        # Emit routing_decision CUSTOM event FIRST
        if classification:
            routing_event = CustomEvent(
                name="routing_decision",
                value=classification,
            )
            yield encoder.encode(routing_event)

        # Then stream the full agent response from the framework
        input_data = request_body.model_dump(exclude_none=True)
        try:
            async for event in _protocol_runner.run(input_data):
                try:
                    yield encoder.encode(event)
                except Exception as encode_error:
                    logger.exception("Failed to encode event")
                    run_error = RunErrorEvent(
                        message="An internal error has occurred while streaming events.",
                        code=type(encode_error).__name__,
                    )
                    yield encoder.encode(run_error)
                    return
        except Exception as stream_error:
            logger.exception("Streaming failed")
            run_error = RunErrorEvent(
                message="An internal error has occurred while streaming events.",
                code=type(stream_error).__name__,
            )
            yield encoder.encode(run_error)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Synchronous Invoke Endpoint (for M365 CEA bot relay) ─────────────────────

class InvokeRequest(BaseModel):
    message: str
    conversation_id: str = "default"
    history: Optional[list[dict]] = None

class ToolCallDetail(BaseModel):
    name: str
    arguments: dict
    result: str

class InvokeResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCallDetail] = []
    reasoning: str = ""

@app.post("/api/invoke", response_model=InvokeResponse)
async def invoke_agent(req: InvokeRequest):
    """Run the HR Concierge agent synchronously and return the final answer.

    Used by the M365 Custom Engine Agent (CEA bot) as a relay — the CEA
    sends the user message here, we run the full agent loop with real tools,
    and return the structured result for Adaptive Card rendering.
    """
    import json as _json

    # Build messages: optional history + current message
    messages = []
    if req.history:
        for msg in req.history[-10:]:  # keep last 10 turns
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": req.message})

    # Build tool definitions from our @tool-decorated functions
    tool_defs = []
    tool_map = {}
    for t in TOOLS:
        tool_defs.append(t.to_json_schema_spec())
        tool_map[t.name] = t

    api_messages = [{"role": "system", "content": HR_CONCIERGE_PROMPT}] + messages
    collected_tool_calls: list[ToolCallDetail] = []

    # Step 1: Classify intent and generate reasoning
    reasoning_response = _sync_openai.chat.completions.create(
        model=settings.azure_openai_model,
        messages=[{"role": "system", "content": (
            "You are an intent classifier for an HR Concierge system. "
            "Given the user message, output a brief reasoning trace (2-4 lines) showing:\n"
            "1. What category this falls into (Policy Question / Life Event Change / Grievance / Trivial Complaint / Expense Report)\n"
            "2. What tools/actions you would invoke and why\n"
            "3. Any risk assessment (e.g., high-risk change requiring approval)\n\n"
            "Format: short bullet points. Be concise."
        )}] + messages,
        temperature=0.2,
        max_completion_tokens=200,
    )
    reasoning_text = reasoning_response.choices[0].message.content or ""

    # Run the tool-calling loop (max 10 iterations)
    for _ in range(10):
        response = _sync_openai.chat.completions.create(
            model=settings.azure_openai_model,
            messages=api_messages,
            tools=tool_defs if tool_defs else None,
            temperature=0.3,
        )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            # Append assistant message with tool calls
            api_messages.append(choice.message.model_dump())

            # Execute each tool call using our real tool implementations
            for tc in choice.message.tool_calls:
                tool_name = tc.function.name
                tool_args_str = tc.function.arguments
                try:
                    tool_args = _json.loads(tool_args_str)
                except Exception:
                    tool_args = {}

                # Execute the real tool
                tool_fn = tool_map.get(tool_name)
                if tool_fn:
                    try:
                        result = tool_fn.func(**tool_args)
                    except Exception as e:
                        result = _json.dumps({"error": str(e)})
                else:
                    result = _json.dumps({"error": f"Unknown tool: {tool_name}"})

                collected_tool_calls.append(ToolCallDetail(
                    name=tool_name,
                    arguments=tool_args,
                    result=result if isinstance(result, str) else _json.dumps(result),
                ))

                # Append tool result to messages
                api_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result if isinstance(result, str) else _json.dumps(result),
                })
        else:
            # Final answer
            answer = choice.message.content or "I processed your request but didn't generate a text response."
            return InvokeResponse(answer=answer, tool_calls=collected_tool_calls, reasoning=reasoning_text)

    # If we exhausted iterations
    return InvokeResponse(
        answer="I completed processing but reached the maximum number of steps. Please try again or simplify your request.",
        tool_calls=collected_tool_calls,
        reasoning=reasoning_text,
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
            {
                "id": "expense-report",
                "title": "Expense Report",
                "description": "Submit and validate expense reports against company policy — with automated limit checks and approval routing.",
                "icon": "receipt",
                "color": "green",
                "sample_prompts": [
                    "I need to submit an expense report for my business trip to Chicago last week.",
                    "I have a few client dinner receipts and a hotel bill to expense.",
                    "Can you help me file expenses for a conference I attended?",
                    "I need to expense a team lunch, an Uber ride, and two nights at a hotel.",
                    "Submit my expense report: flight $450, hotel $380, meals $120, rideshare $45.",
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
            {
                "name": "Expense Reports",
                "icon": "receipt",
                "prompts": [
                    {"text": "I need to submit an expense report for my trip to Chicago.", "scenario": "expense-report"},
                    {"text": "Help me expense a client dinner ($120) and an Uber ($35).", "scenario": "expense-report"},
                    {"text": "Submit expenses: flight $450, 2 nights hotel $380, meals $95.", "scenario": "expense-report"},
                    {"text": "What are the meal expense limits for client entertainment?", "scenario": "general"},
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
    submit_expense_report,
    WORKDAY_FORM_SCHEMAS,
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
    "submit_expense_report": submit_expense_report,
}


class ToolCallRequest(BaseModel):
    """Request body for tool invocation."""
    class Config:
        extra = "allow"


class ProcessHRRequest(BaseModel):
    """Request body for processHRRequest endpoint."""
    message: str
    scenario: str = "auto"


# ── Intent detection mapping ──────────────────────────────────────────────────

_KEYWORD_TO_INTENTS = {
    "married": ["marriage", "name-change", "beneficiary-update"],
    "marriage": ["marriage", "name-change", "beneficiary-update"],
    "name": ["name-change"],
    "legal name": ["name-change"],
    "address": ["address-change"],
    "moved": ["address-change"],
    "relocat": ["address-change"],
    "bank": ["bank-details"],
    "direct deposit": ["bank-details"],
    "emergency contact": ["emergency-contact"],
    "beneficiary": ["beneficiary-update"],
    "benefits": ["beneficiary-update", "marriage"],
    "spouse": ["marriage", "beneficiary-update"],
    "tax": ["marriage"],
    "preferred name": ["preferred-name"],
    "pronouns": ["preferred-name"],
    "grievance": [],
    "harass": [],
    "discriminat": [],
    "unfair": [],
}


def _detect_intents(message: str) -> list[str]:
    """Detect change types from the user message."""
    msg_lower = message.lower()
    detected = set()
    for keyword, intents in _KEYWORD_TO_INTENTS.items():
        if keyword in msg_lower:
            detected.update(intents)
    return list(detected) if detected else ["marriage"]


def _build_adaptive_card(change_types: list[str], message: str) -> dict:
    """Build an Adaptive Card with form fields for the detected change types."""
    # Gather all form fields
    all_fields = []
    seen_ids = set()
    for ct in change_types:
        for field in WORKDAY_FORM_SCHEMAS.get(ct, []):
            if field["id"] not in seen_ids:
                seen_ids.add(field["id"])
                all_fields.append(field)

    # Build card body
    card_body = [
        {
            "type": "TextBlock",
            "text": "HR Concierge — Workday Change Form",
            "weight": "Bolder",
            "size": "Large",
            "color": "Accent",
        },
        {
            "type": "TextBlock",
            "text": f"Based on your request, I've identified the following changes needed: **{', '.join(ct.replace('-', ' ').title() for ct in change_types)}**",
            "wrap": True,
        },
        {"type": "TextBlock", "text": " ", "spacing": "Small"},
    ]

    # Group fields by group name
    groups: dict[str, list] = {}
    for field in all_fields:
        group = field.get("group", "Details")
        groups.setdefault(group, []).append(field)

    for group_name, fields in groups.items():
        card_body.append({
            "type": "TextBlock",
            "text": group_name,
            "weight": "Bolder",
            "size": "Medium",
            "spacing": "Medium",
        })

        for field in fields:
            required_marker = " *" if field.get("required") else ""
            if field["type"] == "select" and "options" in field:
                card_body.append({
                    "type": "Input.ChoiceSet",
                    "id": field["id"],
                    "label": f"{field['label']}{required_marker}",
                    "isRequired": field.get("required", False),
                    "choices": [{"title": opt["label"], "value": opt["value"]} for opt in field["options"]],
                    "style": "compact",
                })
            elif field["type"] == "date":
                card_body.append({
                    "type": "Input.Date",
                    "id": field["id"],
                    "label": f"{field['label']}{required_marker}",
                    "isRequired": field.get("required", False),
                })
            else:
                card_body.append({
                    "type": "Input.Text",
                    "id": field["id"],
                    "label": f"{field['label']}{required_marker}",
                    "isRequired": field.get("required", False),
                    "placeholder": field.get("placeholder", f"Enter {field['label'].lower()}"),
                })

    # Summary section
    card_body.append({"type": "TextBlock", "text": " ", "spacing": "Medium"})
    card_body.append({
        "type": "TextBlock",
        "text": "⚠️ High-risk changes (legal name, bank details) will require HR Operations approval after submission.",
        "wrap": True,
        "size": "Small",
        "isSubtle": True,
    })

    card = {
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.5",
        "body": card_body,
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Submit Changes to Workday",
                "style": "positive",
                "data": {
                    "action": "submit_workday_changes",
                    "change_types": change_types,
                },
            }
        ],
    }
    return card


@app.post("/api/process")
async def process_hr_request(body: ProcessHRRequest):
    """Process an HR request and return an Adaptive Card with form fields."""
    message = body.message
    scenario = body.scenario

    # Detect if it's a grievance
    grievance_keywords = ["grievance", "harass", "discriminat", "unfair", "hostile", "bully"]
    is_grievance = scenario == "grievance" or any(kw in message.lower() for kw in grievance_keywords)

    if is_grievance:
        return {
            "status": "grievance_intake",
            "message": "I understand you're reporting a workplace concern. Let me help you structure this properly.",
            "card": {
                "type": "AdaptiveCard",
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.5",
                "body": [
                    {"type": "TextBlock", "text": "Grievance / Workplace Concern Intake", "weight": "Bolder", "size": "Large", "color": "Accent"},
                    {"type": "TextBlock", "text": "This form will help structure your concern for proper routing. All information is confidential.", "wrap": True},
                    {"type": "Input.ChoiceSet", "id": "category", "label": "Category *", "isRequired": True, "choices": [
                        {"title": "Harassment", "value": "harassment"},
                        {"title": "Discrimination", "value": "discrimination"},
                        {"title": "Retaliation", "value": "retaliation"},
                        {"title": "Workplace Safety", "value": "safety"},
                        {"title": "Management Conduct", "value": "management"},
                        {"title": "Other", "value": "other"},
                    ]},
                    {"type": "Input.ChoiceSet", "id": "severity", "label": "Severity *", "isRequired": True, "choices": [
                        {"title": "Low — Informal resolution preferred", "value": "low"},
                        {"title": "Medium — Formal investigation needed", "value": "medium"},
                        {"title": "High — Immediate intervention required", "value": "high"},
                    ]},
                    {"type": "Input.Text", "id": "narrative", "label": "Describe what happened *", "isRequired": True, "isMultiline": True, "placeholder": "Please provide details including dates, people involved, and specific incidents..."},
                    {"type": "Input.Text", "id": "persons_involved", "label": "Person(s) involved", "placeholder": "Names and roles of those involved"},
                    {"type": "Input.Date", "id": "incident_date", "label": "Date of most recent incident"},
                    {"type": "Input.ChoiceSet", "id": "previous_reports", "label": "Have you reported this before?", "choices": [
                        {"title": "No, this is the first report", "value": "no"},
                        {"title": "Yes, verbally to my manager", "value": "verbal"},
                        {"title": "Yes, formally to HR", "value": "formal"},
                    ]},
                ],
                "actions": [
                    {"type": "Action.Submit", "title": "Submit Grievance", "style": "positive", "data": {"action": "submit_grievance"}},
                ],
            },
        }

    # Life event / personal data change flow
    change_types = _detect_intents(message)
    card = _build_adaptive_card(change_types, message)

    return {
        "status": "form_ready",
        "change_types": change_types,
        "total_fields": sum(len(WORKDAY_FORM_SCHEMAS.get(ct, [])) for ct in change_types),
        "message": f"I've identified {len(change_types)} type(s) of changes needed. Please fill out the form below to submit your updates to Workday.",
        "card": card,
    }


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
