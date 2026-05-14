"""Domain models for HR use cases."""

from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, Field
from typing import Any


class Scenario(str, Enum):
    LIFE_EVENT = "life-event"
    GRIEVANCE = "grievance"


class LifeEventType(str, Enum):
    MARRIAGE = "marriage"
    DIVORCE = "divorce"
    NEW_CHILD = "new-child"
    ADDRESS_CHANGE = "address-change"
    NAME_CHANGE = "name-change"
    EMERGENCY_CONTACT = "emergency-contact"
    BANK_DETAILS = "bank-details"
    BENEFICIARY_UPDATE = "beneficiary-update"
    ID_UPDATE = "id-update"
    PREFERRED_NAME = "preferred-name"


class GrievanceCategory(str, Enum):
    DISCRIMINATION = "discrimination"
    HARASSMENT = "harassment"
    RETALIATION = "retaliation"
    WORKPLACE_SAFETY = "workplace-safety"
    POLICY_VIOLATION = "policy-violation"
    MANAGEMENT_ISSUE = "management-issue"
    TEAM_CONFLICT = "team-conflict"
    COMPENSATION = "compensation"
    OTHER = "other"


class ChangeRequest(BaseModel):
    change_type: LifeEventType
    current_value: str = ""
    new_value: str = ""
    requires_document: bool = False
    document_type: str = ""
    auto_completable: bool = False
    risk_level: str = "low"
    status: str = "pending"
    downstream_systems: list[str] = Field(default_factory=list)


class LifeEventRequest(BaseModel):
    employee_id: str = "EMP-2024-001"
    employee_name: str = "Alex Johnson"
    scenario: str = "life-event"
    primary_event: str = ""
    description: str = ""
    changes: list[ChangeRequest] = Field(default_factory=list)
    requires_approval: bool = False
    approval_reason: str = ""


class GrievanceIntake(BaseModel):
    employee_id: str = "EMP-2024-001"
    employee_name: str = "Alex Johnson"
    narrative: str = ""
    category: GrievanceCategory | None = None
    is_grievance: bool | None = None
    in_scope: bool | None = None
    scope_reason: str = ""
    severity: str = ""
    facts: list[str] = Field(default_factory=list)
    missing_info: list[str] = Field(default_factory=list)
    recommended_action: str = ""
    case_id: str = ""


class ServiceNowTicket(BaseModel):
    sys_id: str = ""
    number: str = ""
    short_description: str = ""
    description: str = ""
    category: str = ""
    priority: str = "3"
    state: str = "new"
    assignment_group: str = ""
    comments: list[str] = Field(default_factory=list)


class PolicyDocument(BaseModel):
    id: str
    title: str
    content: str
    source: str = "servicenow"
    category: str = ""
    relevance_score: float = 0.0
    url: str = ""
