"""Pydantic models for adaptive UI state — the contract between backend and frontend."""

from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


# ── Screen Types ──────────────────────────────────────────────────────────────

class ScreenType(str, Enum):
    INTAKE = "intake"
    TRIAGE = "triage"
    ACTION_PLAN = "action-plan"
    REVIEW = "review"
    COMPLETED = "completed"
    GRIEVANCE_INTAKE = "grievance-intake"
    GRIEVANCE_TRIAGE = "grievance-triage"
    CASE_DRAFT = "case-draft"


# ── Risk / Severity ──────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    AWAITING_APPROVAL = "awaiting-approval"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


# ── Cards & Components ───────────────────────────────────────────────────────

class UICard(BaseModel):
    id: str
    title: str
    description: str = ""
    type: str = "info"  # info, warning, success, error, action, summary
    icon: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    actions: list[UIAction] = Field(default_factory=list)
    collapsed: bool = False


class UIAction(BaseModel):
    id: str
    label: str
    type: str = "button"  # button, link, confirm, approve, reject
    variant: str = "default"  # default, primary, danger, success, ghost
    disabled: bool = False
    requires_confirmation: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class UIWarning(BaseModel):
    id: str
    message: str
    severity: RiskLevel = RiskLevel.MEDIUM
    dismissible: bool = True


class UIApproval(BaseModel):
    id: str
    title: str
    description: str
    risk_level: RiskLevel
    rationale: str
    details: dict[str, Any] = Field(default_factory=dict)
    status: str = "pending"  # pending, approved, rejected


class TimelineEntry(BaseModel):
    id: str
    timestamp: str
    agent: str
    action: str
    detail: str = ""
    status: ActionStatus = ActionStatus.COMPLETED
    icon: str | None = None


class Reference(BaseModel):
    id: str
    title: str
    source: str  # servicenow, sharepoint, policy, internal
    url: str = ""
    snippet: str = ""
    relevance: float = 0.0


class ProgressState(BaseModel):
    current_step: int = 0
    total_steps: int = 0
    label: str = ""
    percentage: float = 0.0
    substeps: list[SubStep] = Field(default_factory=list)


class SubStep(BaseModel):
    id: str
    label: str
    status: ActionStatus = ActionStatus.PENDING
    agent: str = ""


class AgentActivity(BaseModel):
    agent_name: str
    agent_role: str
    status: str  # thinking, working, completed, waiting, error
    message: str = ""
    timestamp: str = ""


class FormField(BaseModel):
    id: str
    label: str
    type: str = "text"  # text, select, date, textarea, checkbox, file
    value: Any = None
    placeholder: str = ""
    required: bool = False
    options: list[dict[str, str]] = Field(default_factory=list)
    validation: str = ""
    group: str = ""
    editable: bool = True


class ImpactNode(BaseModel):
    id: str
    label: str
    category: str  # payroll, benefits, identity, compliance, it-systems
    status: ActionStatus = ActionStatus.PENDING
    risk: RiskLevel = RiskLevel.LOW
    dependencies: list[str] = Field(default_factory=list)
    description: str = ""


class DetectedIntent(BaseModel):
    id: str
    label: str
    category: str
    confidence: float
    sub_intents: list[str] = Field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.LOW
    auto_completable: bool = False


class CaseDraft(BaseModel):
    id: str
    category: str
    priority: str
    summary: str
    description: str
    facts: list[str] = Field(default_factory=list)
    missing_info: list[str] = Field(default_factory=list)
    routing: str = ""
    rationale: str = ""


# ── Main UI State ────────────────────────────────────────────────────────────

class UIState(BaseModel):
    """Complete UI state emitted by the orchestrator.  The frontend renders
    different adaptive views based on ``screen_type``."""

    screen_type: ScreenType = ScreenType.INTAKE
    title: str = ""
    subtitle: str = ""
    cards: list[UICard] = Field(default_factory=list)
    actions: list[UIAction] = Field(default_factory=list)
    warnings: list[UIWarning] = Field(default_factory=list)
    approvals: list[UIApproval] = Field(default_factory=list)
    timeline: list[TimelineEntry] = Field(default_factory=list)
    references: list[Reference] = Field(default_factory=list)
    progress: ProgressState = Field(default_factory=ProgressState)
    agent_activity: list[AgentActivity] = Field(default_factory=list)
    form_fields: list[FormField] = Field(default_factory=list)
    impact_map: list[ImpactNode] = Field(default_factory=list)
    detected_intents: list[DetectedIntent] = Field(default_factory=list)
    case_draft: CaseDraft | None = None
    summary_text: str = ""
    explanation_text: str = ""
    scenario: str = ""  # life-event | grievance
    conversation_id: str = ""
