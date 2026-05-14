"""ServiceNow A2A protocol integration adapter.

Supports both live A2A calls and a mock/demo mode with seeded responses.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)


class ServiceNowA2AClient:
    """Client for ServiceNow Agent-to-Agent (A2A) protocol."""

    def __init__(self) -> None:
        self.base_url = settings.servicenow_instance_url.rstrip("/")
        self.use_mock = settings.servicenow_use_mock
        self.client_id = settings.servicenow_client_id
        self.client_secret = settings.servicenow_client_secret
        self.username = settings.servicenow_username
        self.password = settings.servicenow_password
        self.auth_scope = settings.servicenow_auth_scope
        self._access_token: str | None = None

    # ── OAuth Token ──────────────────────────────────────────────────────

    async def _get_access_token(self) -> str:
        if self._access_token:
            return self._access_token
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/oauth_token.do",
                data={
                    "grant_type": "password",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "username": self.username,
                    "password": self.password,
                    "scope": self.auth_scope,
                },
            )
            resp.raise_for_status()
            self._access_token = resp.json()["access_token"]
            return self._access_token

    # ── A2A Message/Send ─────────────────────────────────────────────────

    async def send_message(self, agent_id: str, text: str) -> dict[str, Any]:
        """Send an A2A message/send request to a ServiceNow agent."""
        if self.use_mock:
            return self._mock_response(agent_id, text)

        token = await self._get_access_token()
        url = f"{self.base_url}/api/sn_aia/a2a/v1/agent/id/{agent_id}"
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "message/send",
            "params": {
                "message": {
                    "kind": "message",
                    "role": "user",
                    "parts": [{"kind": "text", "text": text}],
                    "messageId": str(uuid.uuid4())[:8],
                }
            },
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            return resp.json()

    # ── Agent Card (no auth) ─────────────────────────────────────────────

    async def get_agent_card(self, agent_id: str) -> dict[str, Any]:
        if self.use_mock:
            return {"name": f"Mock Agent {agent_id[:8]}", "description": "Mock ServiceNow agent"}
        url = f"{self.base_url}/api/sn_aia/a2a/id/{agent_id}/well_known/agent_json"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()

    # ── Convenience Wrappers ─────────────────────────────────────────────

    async def search_knowledge(self, query: str) -> dict[str, Any]:
        return await self.send_message(settings.servicenow_knowledge_agent_id, f"Search for knowledge related to {query}")

    async def create_incident(self, short_desc: str, description: str) -> dict[str, Any]:
        return await self.send_message(
            settings.servicenow_incident_agent_id,
            f"Create an Incident with Short Description \"{short_desc}\" and Description \"{description}\"",
        )

    async def add_incident_comment(self, comment: str) -> dict[str, Any]:
        return await self.send_message(
            settings.servicenow_incident_agent_id,
            f"Add comment to Incident that says \"{comment}\"",
        )

    async def resolve_incident(self, comments: str) -> dict[str, Any]:
        return await self.send_message(
            settings.servicenow_incident_agent_id,
            f"Resolve Incident with comments \"{comments}\"",
        )

    # ── Mock Responses ───────────────────────────────────────────────────

    def _mock_response(self, agent_id: str, text: str) -> dict[str, Any]:
        logger.info(f"[MOCK] ServiceNow A2A → agent={agent_id[:8]}… text={text[:60]}…")
        text_lower = text.lower()

        if "knowledge" in text_lower or "search" in text_lower:
            return self._mock_knowledge_response(text)
        elif "create" in text_lower and "incident" in text_lower:
            return self._mock_incident_create()
        elif "comment" in text_lower:
            return self._mock_comment_response()
        elif "resolve" in text_lower:
            return self._mock_resolve_response()
        else:
            return self._mock_generic_response(text)

    def _mock_knowledge_response(self, query: str) -> dict[str, Any]:
        articles = MOCK_KNOWLEDGE_ARTICLES
        # Filter by relevance
        results = []
        q = query.lower()
        for article in articles:
            if any(kw in q for kw in article.get("keywords", [])):
                results.append(article)
        if not results:
            results = articles[:3]
        return {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "kind": "message",
                "role": "assistant",
                "parts": [{"kind": "text", "text": json.dumps({"articles": results}, indent=2)}],
                "messageId": str(uuid.uuid4())[:8],
            },
        }

    def _mock_incident_create(self) -> dict[str, Any]:
        ticket_num = f"INC{uuid.uuid4().hex[:7].upper()}"
        return {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "kind": "message",
                "role": "assistant",
                "parts": [
                    {
                        "kind": "text",
                        "text": f"Incident {ticket_num} has been created successfully. "
                        f"You can track it in ServiceNow.",
                    }
                ],
                "messageId": str(uuid.uuid4())[:8],
            },
        }

    def _mock_comment_response(self) -> dict[str, Any]:
        return {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "kind": "message",
                "role": "assistant",
                "parts": [{"kind": "text", "text": "Comment has been added to the incident."}],
                "messageId": str(uuid.uuid4())[:8],
            },
        }

    def _mock_resolve_response(self) -> dict[str, Any]:
        return {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "kind": "message",
                "role": "assistant",
                "parts": [{"kind": "text", "text": "Incident has been resolved."}],
                "messageId": str(uuid.uuid4())[:8],
            },
        }

    def _mock_generic_response(self, text: str) -> dict[str, Any]:
        return {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "kind": "message",
                "role": "assistant",
                "parts": [{"kind": "text", "text": f"Processed request: {text[:100]}"}],
                "messageId": str(uuid.uuid4())[:8],
            },
        }


# ── Mock Knowledge Base ──────────────────────────────────────────────────────

MOCK_KNOWLEDGE_ARTICLES = [
    {
        "id": "KB0010001",
        "title": "How to Update Your Legal Name After Marriage",
        "content": (
            "To update your legal name following a marriage, you must submit a certified copy of your marriage "
            "certificate and a government-issued ID reflecting your new name. Changes will propagate to payroll, "
            "benefits, IT systems (email/AD), and building access within 5-7 business days. High-sensitivity "
            "change — requires HR Ops approval."
        ),
        "category": "Personal Data Changes",
        "keywords": ["name", "marriage", "legal", "update"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010001",
    },
    {
        "id": "KB0010002",
        "title": "Address Change Procedure",
        "content": (
            "Employees can self-service update their home address through the HR portal. Changes affect payroll "
            "tax withholding (state/local), benefits eligibility (if crossing state lines), and emergency contact "
            "records. No approval needed for standard address changes. Allow 2-3 business days for payroll system sync."
        ),
        "category": "Personal Data Changes",
        "keywords": ["address", "move", "relocation", "home"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010002",
    },
    {
        "id": "KB0010003",
        "title": "Emergency Contact Update Policy",
        "content": (
            "Emergency contacts can be updated at any time through self-service. Recommended to update whenever "
            "there is a life event such as marriage, divorce, or moving. No approval required. Changes take "
            "effect immediately."
        ),
        "category": "Personal Data Changes",
        "keywords": ["emergency", "contact", "update"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010003",
    },
    {
        "id": "KB0010004",
        "title": "Bank Account / Direct Deposit Changes",
        "content": (
            "To change your bank account for direct deposit, navigate to Payroll > Payment Elections. You will "
            "need your new bank routing number and account number. Changes require identity verification and "
            "take effect in the next pay cycle. High-sensitivity change — fraud prevention review may apply."
        ),
        "category": "Payroll",
        "keywords": ["bank", "direct deposit", "payment", "payroll", "account"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010004",
    },
    {
        "id": "KB0010005",
        "title": "Grievance Filing Procedure",
        "content": (
            "Employees may file a formal grievance for issues involving discrimination, harassment, retaliation, "
            "or serious policy violations. Step 1: Document the issue with dates, witnesses, and specifics. "
            "Step 2: Submit through the Employee Relations portal or contact HR directly. Step 3: An ER specialist "
            "will review within 48 hours. Anonymous reporting is available through the Ethics Hotline."
        ),
        "category": "Employee Relations",
        "keywords": ["grievance", "complaint", "harassment", "discrimination", "file", "report"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010005",
    },
    {
        "id": "KB0010006",
        "title": "Workplace Conflict vs. Formal Grievance — Know the Difference",
        "content": (
            "Not all workplace issues are grievances. Team conflicts, communication breakdowns, or management "
            "style disagreements are typically handled through mediation or manager coaching. A formal grievance "
            "applies when there is a potential violation of policy, law, or employee rights. If unsure, contact "
            "Employee Relations for a confidential consultation."
        ),
        "category": "Employee Relations",
        "keywords": ["conflict", "team", "manager", "grievance", "difference", "scope"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010006",
    },
    {
        "id": "KB0010007",
        "title": "ID and Passport Information Updates",
        "content": (
            "Government-issued ID and passport details can only be updated by submitting verified documents "
            "to HR Operations. Required documents: copy of new ID/passport, supporting change document "
            "(e.g., court order, marriage certificate). Processing time: 7-10 business days. This is a "
            "high-sensitivity change requiring manager and HR Ops dual approval."
        ),
        "category": "Personal Data Changes",
        "keywords": ["passport", "id", "government", "identity", "document"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010007",
    },
    {
        "id": "KB0010008",
        "title": "Preferred Name and Pronoun Updates",
        "content": (
            "Employees can update their preferred name and pronouns through the HR self-service portal. Preferred "
            "name changes are reflected in email display, Teams, org directory, and badge within 24-48 hours. "
            "Legal name in payroll/tax systems is not affected — that requires a separate legal name change process."
        ),
        "category": "Personal Data Changes",
        "keywords": ["preferred", "name", "pronoun", "display"],
        "source": "ServiceNow Knowledge Base",
        "url": "https://copilota2a.service-now.com/kb/KB0010008",
    },
]


# Singleton instance
servicenow_client = ServiceNowA2AClient()
