"""Tool definitions for the HR agentic workflow.

Each tool maps to a backend capability.  Tools that mutate sensitive data
use ``approval_mode="always_require"`` so AG-UI emits an interrupt and the
frontend can render an approval card before proceeding.
"""

from __future__ import annotations

import json
import uuid
import logging
from datetime import datetime, timezone

from agent_framework import tool

from integrations.servicenow_a2a import servicenow_client
from config import settings

logger = logging.getLogger(__name__)
_ts = lambda: datetime.now(timezone.utc).isoformat()


# ═══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE RETRIEVAL – Foundry IQ / SharePoint
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def query_knowledge_base(query: str) -> str:
    """Search the HR policy knowledge base (SharePoint via Foundry IQ) for answers.

    Use this tool when the employee asks a question about HR policies, benefits,
    leave entitlements, PTO, 401(k), health insurance, code of conduct,
    grievance procedures, pay schedules, anti-harassment policy, EEO, FMLA,
    sick leave, or any other HR policy topic.

    Do NOT use this for employees who want to make changes to their records
    (use Workday tools instead) or who are reporting an actual workplace
    incident (use structure_narrative / create_grievance_case instead).

    *query* is the employee's question in natural language.
    Returns the grounded answer text from SharePoint HR policy documents.
    """
    import asyncio
    import httpx

    if not settings.azure_search_endpoint or not settings.azure_search_api_key:
        return json.dumps({"answer": None, "error": "Knowledge base not configured"})

    url = (
        f"{settings.azure_search_endpoint}/knowledgebases/"
        f"{settings.azure_search_knowledge_base}/retrieve"
        f"?api-version=2025-11-01-preview"
    )
    body = {
        "messages": [
            {"role": "user", "content": [{"type": "text", "text": query}]}
        ],
    }
    headers = {
        "Content-Type": "application/json",
        "api-key": settings.azure_search_api_key,
    }

    async def _call():
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            return resp.json()

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                data = pool.submit(asyncio.run, _call()).result()
        else:
            data = asyncio.run(_call())

        response_msgs = data.get("response", [])
        if response_msgs:
            content_parts = response_msgs[0].get("content", [])
            if content_parts:
                answer = content_parts[0].get("text", "")
                if answer:
                    return json.dumps({"answer": answer, "source": "SharePoint HR Policy Knowledge Base"})
    except Exception as e:
        logger.warning(f"Knowledge base query failed: {e}")

    return json.dumps({"answer": None, "source": "SharePoint HR Policy Knowledge Base", "note": "No matching documents found"})


# ═══════════════════════════════════════════════════════════════════════════════
# LIFE EVENT / PERSONAL DATA CHANGE TOOLS
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def retrieve_policy_guidance(topics: str) -> str:
    """Look up relevant HR policy articles from ServiceNow knowledge base.

    *topics* is a comma-separated list of keywords, e.g. "name change, marriage".
    """
    import asyncio
    loop = asyncio.get_event_loop()
    if loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = pool.submit(asyncio.run, servicenow_client.search_knowledge(topics)).result()
    else:
        result = asyncio.run(servicenow_client.search_knowledge(topics))

    # Extract articles from mock or live response
    try:
        parts = result.get("result", {}).get("parts", [])
        if parts:
            text = parts[0].get("text", "{}")
            articles_data = json.loads(text)
            articles = articles_data.get("articles", [])
            return json.dumps({"articles": articles, "source": "ServiceNow Knowledge Base"})
    except Exception:
        pass
    return json.dumps({"articles": [], "source": "ServiceNow Knowledge Base", "note": "No articles found"})


@tool
def assess_risk_and_compliance(intents_json: str) -> str:
    """Evaluate risk levels for each detected intent and determine approval requirements.

    Returns risk assessment with approval needs, blocked paths, and rationale.
    """
    intents = json.loads(intents_json)
    if isinstance(intents, dict):
        intents = intents.get("intents", [intents])

    assessments = []
    needs_approval = False
    for intent in intents:
        risk = intent.get("risk_level", "low")
        assessment = {
            "intent_id": intent.get("id", "unknown"),
            "risk_level": risk,
            "requires_approval": risk in ("high", "critical"),
            "requires_document": intent.get("requires_document", False),
            "can_auto_complete": intent.get("auto_completable", False) and risk == "low",
            "rationale": _risk_rationale(intent.get("id", ""), risk),
            "approver": "HR Operations Manager" if risk in ("high", "critical") else None,
        }
        if assessment["requires_approval"]:
            needs_approval = True
        assessments.append(assessment)

    return json.dumps({
        "assessments": assessments,
        "overall_needs_approval": needs_approval,
        "overall_risk": max((a["risk_level"] for a in assessments), key=lambda r: ["low", "medium", "high", "critical"].index(r)),
    })


def _risk_rationale(intent_id: str, risk: str) -> str:
    rationales = {
        "name-change": "Legal name changes affect payroll tax records, benefits enrollment, and corporate identity systems. Requires verified documentation and dual approval.",
        "bank-details": "Bank account changes are a common target for payroll fraud. Identity verification and fraud prevention review are mandatory.",
        "id-update": "Government ID updates require verified documentation and affect compliance records. Dual approval from manager and HR Ops required.",
        "marriage": "Marriage events trigger multiple downstream updates to benefits, tax withholding, and emergency contacts. Some changes need supporting documents.",
        "address-change": "Standard address changes can be self-served. If crossing state lines, payroll tax implications may require review.",
        "emergency-contact": "Emergency contact updates are low-risk and can be self-served immediately.",
        "preferred-name": "Preferred name updates affect display systems only and do not impact legal/payroll records.",
        "beneficiary-update": "Beneficiary changes affect life insurance and retirement plan distributions. Review recommended.",
    }
    return rationales.get(intent_id, f"Standard {risk}-risk assessment applies.")


@tool
def build_impact_map(intents_json: str) -> str:
    """Generate a dependency/impact map showing which downstream systems are affected.

    Returns nodes and edges for visual rendering.
    """
    intents = json.loads(intents_json)
    if isinstance(intents, dict):
        intents = intents.get("intents", [intents])

    system_labels = {
        "payroll": "Payroll & Tax",
        "benefits": "Benefits & Insurance",
        "identity": "Corporate Identity",
        "it-systems": "IT Systems (AD/Email)",
        "compliance": "Compliance & Legal",
        "hr-records": "HR Records",
    }
    nodes = {}
    for intent in intents:
        for sys in intent.get("downstream_systems", []):
            if sys not in nodes:
                risk = "medium" if sys in ("payroll", "compliance") else "low"
                nodes[sys] = {
                    "id": sys,
                    "label": system_labels.get(sys, sys.title()),
                    "category": sys,
                    "status": "pending",
                    "risk": risk,
                    "description": f"Updates required in {system_labels.get(sys, sys)}",
                    "triggered_by": [],
                }
            nodes[sys]["triggered_by"].append(intent.get("id", "unknown"))

    return json.dumps({"impact_nodes": list(nodes.values()), "total_systems": len(nodes)})


@tool(approval_mode="always_require")
def submit_high_risk_changes(changes_summary: str) -> str:
    """Submit high-risk personal data changes for processing.

    This action requires human approval before execution because it modifies
    sensitive employee records (legal name, bank details, government ID).
    """
    logger.info(f"[ACTION] Submitting high-risk changes: {changes_summary[:100]}…")
    ref_id = f"CHG-{uuid.uuid4().hex[:8].upper()}"
    return json.dumps({
        "status": "submitted",
        "reference_id": ref_id,
        "message": f"High-risk changes submitted as {ref_id}. HR Operations will process within 5-7 business days.",
        "tracking_url": f"https://hr-portal.example.com/changes/{ref_id}",
    })


@tool
def execute_self_service_changes(changes_json: str) -> str:
    """Execute low-risk self-service changes immediately.

    These are changes that don't require approval (e.g., address, emergency contact, preferred name).
    """
    changes = json.loads(changes_json) if isinstance(changes_json, str) else changes_json
    results = []
    for change in (changes if isinstance(changes, list) else [changes]):
        results.append({
            "change_type": change.get("type", "unknown"),
            "status": "completed",
            "effective_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "confirmation_id": f"SC-{uuid.uuid4().hex[:6].upper()}",
        })
    return json.dumps({"completed_changes": results, "message": "Self-service changes applied successfully."})


@tool
def generate_completion_summary(workflow_data: str) -> str:
    """Generate a clean executive summary of all actions taken and pending items."""
    data = json.loads(workflow_data) if isinstance(workflow_data, str) else workflow_data
    return json.dumps({
        "summary": {
            "total_changes_requested": data.get("total", 0),
            "auto_completed": data.get("auto_completed", 0),
            "pending_approval": data.get("pending_approval", 0),
            "documents_needed": data.get("documents_needed", []),
            "estimated_completion": "5-7 business days for approved changes",
            "next_steps": [
                "Upload any required supporting documents",
                "Monitor your HR portal for approval status",
                "Contact HR Operations if you have questions",
            ],
        }
    })


# ═══════════════════════════════════════════════════════════════════════════════
# WORKDAY INTEGRATION – Simulated API
# ═══════════════════════════════════════════════════════════════════════════════

# Form-field definitions per change type so agents know what to collect.
WORKDAY_FORM_SCHEMAS: dict[str, list[dict]] = {
    "name-change": [
        {"id": "current_legal_first", "label": "Current Legal First Name", "type": "text", "required": True, "group": "Current Name"},
        {"id": "current_legal_last",  "label": "Current Legal Last Name",  "type": "text", "required": True, "group": "Current Name"},
        {"id": "new_legal_first",     "label": "New Legal First Name",     "type": "text", "required": True, "group": "New Name"},
        {"id": "new_legal_last",      "label": "New Legal Last Name",      "type": "text", "required": True, "group": "New Name"},
        {"id": "reason",              "label": "Reason for Change",        "type": "select", "required": True,
         "options": [{"label": "Marriage", "value": "marriage"}, {"label": "Court Order", "value": "court_order"},
                     {"label": "Personal Preference", "value": "personal"}, {"label": "Other", "value": "other"}]},
        {"id": "effective_date",      "label": "Effective Date",           "type": "date",   "required": True},
        {"id": "document_type",       "label": "Supporting Document",      "type": "select", "required": True,
         "options": [{"label": "Marriage Certificate", "value": "marriage_cert"}, {"label": "Court Order", "value": "court_order"},
                     {"label": "Government ID", "value": "govt_id"}]},
    ],
    "address-change": [
        {"id": "address_line1", "label": "Street Address",    "type": "text",   "required": True, "group": "New Address"},
        {"id": "address_line2", "label": "Apt / Suite / Unit", "type": "text",   "required": False, "group": "New Address"},
        {"id": "city",          "label": "City",               "type": "text",   "required": True, "group": "New Address"},
        {"id": "state",         "label": "State / Province",   "type": "select", "required": True, "group": "New Address",
         "options": [{"label": s, "value": s} for s in [
             "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
             "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
             "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]]},
        {"id": "zip_code",      "label": "ZIP Code",           "type": "text",   "required": True, "group": "New Address"},
        {"id": "country",       "label": "Country",            "type": "select", "required": True, "group": "New Address",
         "options": [{"label": "United States", "value": "US"}, {"label": "Canada", "value": "CA"}, {"label": "United Kingdom", "value": "UK"}]},
        {"id": "effective_date", "label": "Move Date",          "type": "date",   "required": True},
    ],
    "bank-details": [
        {"id": "bank_name",      "label": "Bank Name",          "type": "text",   "required": True, "group": "Bank Information"},
        {"id": "routing_number", "label": "Routing Number",     "type": "text",   "required": True, "group": "Bank Information"},
        {"id": "account_number", "label": "Account Number",     "type": "text",   "required": True, "group": "Bank Information"},
        {"id": "account_type",   "label": "Account Type",       "type": "select", "required": True, "group": "Bank Information",
         "options": [{"label": "Checking", "value": "checking"}, {"label": "Savings", "value": "savings"}]},
        {"id": "deposit_type",   "label": "Deposit Type",       "type": "select", "required": True,
         "options": [{"label": "Full Deposit", "value": "full"}, {"label": "Partial Amount", "value": "partial"}, {"label": "Remainder", "value": "remainder"}]},
        {"id": "deposit_amount", "label": "Amount (if partial)", "type": "text",   "required": False},
    ],
    "emergency-contact": [
        {"id": "contact_name",  "label": "Contact Full Name",  "type": "text",   "required": True, "group": "Emergency Contact"},
        {"id": "relationship",  "label": "Relationship",       "type": "select", "required": True, "group": "Emergency Contact",
         "options": [{"label": "Spouse / Partner", "value": "spouse"}, {"label": "Parent", "value": "parent"},
                     {"label": "Sibling", "value": "sibling"}, {"label": "Friend", "value": "friend"}, {"label": "Other", "value": "other"}]},
        {"id": "phone",         "label": "Phone Number",       "type": "text",   "required": True, "group": "Emergency Contact"},
        {"id": "email",         "label": "Email Address",      "type": "text",   "required": False, "group": "Emergency Contact"},
        {"id": "is_primary",    "label": "Primary Contact?",   "type": "select", "required": True,
         "options": [{"label": "Yes", "value": "true"}, {"label": "No", "value": "false"}]},
    ],
    "marriage": [
        {"id": "spouse_first_name", "label": "Spouse First Name",     "type": "text",   "required": True, "group": "Spouse Information"},
        {"id": "spouse_last_name",  "label": "Spouse Last Name",      "type": "text",   "required": True, "group": "Spouse Information"},
        {"id": "marriage_date",     "label": "Date of Marriage",      "type": "date",   "required": True},
        {"id": "name_changing",     "label": "Are you changing your last name?", "type": "select", "required": True,
         "options": [{"label": "Yes", "value": "yes"}, {"label": "No", "value": "no"}]},
        {"id": "new_last_name",     "label": "New Last Name (if changing)", "type": "text", "required": False},
        {"id": "add_spouse_benefits", "label": "Add spouse to benefits?", "type": "select", "required": True,
         "options": [{"label": "Yes", "value": "yes"}, {"label": "No", "value": "no"}]},
        {"id": "update_tax_status", "label": "Update tax filing status?", "type": "select", "required": True,
         "options": [{"label": "Yes – Married Filing Jointly", "value": "mfj"}, {"label": "Yes – Married Filing Separately", "value": "mfs"},
                     {"label": "No change", "value": "no"}]},
    ],
    "beneficiary-update": [
        {"id": "beneficiary_name",     "label": "Beneficiary Full Name",  "type": "text",   "required": True, "group": "Beneficiary"},
        {"id": "beneficiary_relation", "label": "Relationship",           "type": "select", "required": True, "group": "Beneficiary",
         "options": [{"label": "Spouse", "value": "spouse"}, {"label": "Child", "value": "child"},
                     {"label": "Parent", "value": "parent"}, {"label": "Other", "value": "other"}]},
        {"id": "beneficiary_pct",      "label": "Benefit Percentage",     "type": "text",   "required": True, "group": "Beneficiary"},
        {"id": "benefit_plan",         "label": "Benefit Plan",           "type": "select", "required": True,
         "options": [{"label": "Life Insurance", "value": "life"}, {"label": "401(k)", "value": "401k"},
                     {"label": "All Plans", "value": "all"}]},
    ],
    "preferred-name": [
        {"id": "preferred_first", "label": "Preferred First Name", "type": "text", "required": True},
        {"id": "preferred_last",  "label": "Preferred Last Name",  "type": "text", "required": False},
        {"id": "display_name",    "label": "Display Name",        "type": "text", "required": False,
         "placeholder": "How you would like to be addressed"},
    ],
}


def get_form_fields_for_intents(intent_ids: list[str]) -> list[dict]:
    """Return merged form fields for the given intent IDs."""
    fields: list[dict] = []
    seen: set[str] = set()
    for iid in intent_ids:
        for f in WORKDAY_FORM_SCHEMAS.get(iid, []):
            if f["id"] not in seen:
                seen.add(f["id"])
                fields.append(f)
    return fields


@tool
def update_workday_employee(employee_id: str, change_type: str, field_data_json: str) -> str:
    """Submit a personal data change to the Workday HCM system.

    This simulates calling the Workday REST API to update an employee record.
    *employee_id* – the Workday employee ID (e.g. "EMP-001234").
    *change_type* – one of: name-change, address-change, bank-details,
                    emergency-contact, marriage, beneficiary-update, preferred-name.
    *field_data_json* – JSON object with the field values collected from the employee.
    """
    field_data = json.loads(field_data_json) if isinstance(field_data_json, str) else field_data_json
    ts = _ts()
    txn_id = f"WD-{uuid.uuid4().hex[:8].upper()}"

    # Validate required fields
    schema = WORKDAY_FORM_SCHEMAS.get(change_type, [])
    missing = [f["label"] for f in schema if f.get("required") and not field_data.get(f["id"])]

    if missing:
        return json.dumps({
            "status": "validation_error",
            "transaction_id": txn_id,
            "missing_fields": missing,
            "message": f"Cannot submit — the following required fields are missing: {', '.join(missing)}",
        })

    logger.info(f"[WORKDAY] {txn_id} — updating {change_type} for employee {employee_id}")

    return json.dumps({
        "status": "success",
        "transaction_id": txn_id,
        "workday_worker_id": employee_id,
        "change_type": change_type,
        "effective_date": field_data.get("effective_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "fields_updated": list(field_data.keys()),
        "timestamp": ts,
        "message": f"Workday record updated successfully. Transaction {txn_id} is now in effect.",
        "next_steps": [
            "Changes will sync to downstream systems within 24 hours",
            "Employee will receive a confirmation email from Workday",
            "Manager notified if applicable",
        ],
    })


@tool
def get_workday_form_schema(change_types_csv: str) -> str:
    """Return the Workday form schema (fields needed) for the given change type(s).

    *change_types_csv* – comma-separated list of change type IDs,
                         e.g. "name-change,address-change".
    Returns JSON with the form field definitions the front-end should render.
    """
    ids = [ct.strip() for ct in change_types_csv.split(",")]
    fields = get_form_fields_for_intents(ids)
    return json.dumps({
        "change_types": ids,
        "fields": fields,
        "total_fields": len(fields),
        "instructions": "Please collect the following information from the employee before submitting to Workday.",
    })


# ═══════════════════════════════════════════════════════════════════════════════
# USE CASE 2 – Grievance / Workplace Concern
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def structure_narrative(raw_narrative: str, classification_json: str) -> str:
    """Convert an unstructured employee narrative into a structured intake summary.

    Extracts key facts, dates, persons involved, and identifies missing information.
    """
    classification = json.loads(classification_json) if isinstance(classification_json, str) else classification_json

    # Extract structured elements
    facts = []
    missing = []

    if "manager" in raw_narrative.lower() or "supervisor" in raw_narrative.lower():
        facts.append("Involves direct manager/supervisor")
    if "meeting" in raw_narrative.lower():
        facts.append("Related to meeting exclusion or conduct")
    if "unfair" in raw_narrative.lower() or "treat" in raw_narrative.lower():
        facts.append("Employee perceives unfair treatment")
    if "exclud" in raw_narrative.lower():
        facts.append("Reports being excluded from activities or decisions")

    # Identify what's missing
    if not any(w in raw_narrative.lower() for w in ["date", "when", "last week", "yesterday", "month"]):
        missing.append("Specific dates or timeframe of incidents")
    if not any(w in raw_narrative.lower() for w in ["witness", "saw", "observed", "others"]):
        missing.append("Any witnesses to the incidents")
    if not any(w in raw_narrative.lower() for w in ["report", "told", "spoke", "hr", "informed"]):
        missing.append("Whether this has been previously reported")
    missing.append("Documentation or evidence if available")

    return json.dumps({
        "structured_intake": {
            "summary": f"Employee reports: {raw_narrative[:200]}",
            "facts": facts,
            "categories": classification.get("categories", []),
            "severity": classification.get("severity", "medium"),
            "missing_information": missing,
            "followup_questions": [
                "Can you provide specific dates when these incidents occurred?",
                "Were there any witnesses present?",
                "Have you raised this concern with anyone else previously?",
                "Do you have any documentation (emails, messages) related to this?",
            ] if missing else [],
        }
    })


@tool(approval_mode="always_require")
def create_grievance_case(case_details: str) -> str:
    """Create a formal grievance case in the system.

    This requires employee confirmation before submission as it initiates
    a formal Employee Relations investigation.
    """
    details = json.loads(case_details) if isinstance(case_details, str) else case_details
    case_id = f"GRV-{uuid.uuid4().hex[:8].upper()}"

    logger.info(f"[ACTION] Creating grievance case {case_id}")

    return json.dumps({
        "case_id": case_id,
        "status": "created",
        "assigned_to": "Employee Relations Team",
        "priority": details.get("severity", "medium"),
        "sla": "Initial review within 48 hours",
        "message": f"Grievance case {case_id} has been created and assigned to the Employee Relations team.",
        "next_steps": [
            "An ER specialist will contact you within 48 hours",
            "All communications will be kept confidential",
            "You may add additional information at any time",
        ],
        "confidentiality_notice": "This case is handled under strict confidentiality. Only authorized ER personnel will have access.",
    })


# ═══════════════════════════════════════════════════════════════════════════════
# USE CASE 3 – Expense Report Submission
# ═══════════════════════════════════════════════════════════════════════════════


@tool(approval_mode="always_require")
def submit_expense_report(report_json: str) -> str:
    """Submit a validated expense report for processing and reimbursement.

    This action requires human approval before execution because it commits
    financial transactions. The report_json should contain employee_id,
    line_items (each with date, category, amount, description), and
    an optional trip_name.

    Call this only AFTER validating the report with the expense-report skill's
    validate script and confirming the summary with the employee.
    """
    report = json.loads(report_json) if isinstance(report_json, str) else report_json
    report_id = f"EXP-{uuid.uuid4().hex[:8].upper()}"
    line_items = report.get("line_items", [])
    total = sum(float(item.get("amount", 0)) for item in line_items)

    # Determine approval level
    if total < 500:
        approval = "auto-approved"
        status = "approved"
    elif total <= 2000:
        approval = "manager"
        status = "pending_manager_approval"
    elif total <= 10000:
        approval = "vp"
        status = "pending_vp_approval"
    else:
        approval = "cfo"
        status = "pending_cfo_approval"

    logger.info(f"[EXPENSE] Submitting report {report_id} — ${total:.2f} — {approval}")

    return json.dumps({
        "report_id": report_id,
        "status": status,
        "total_amount": round(total, 2),
        "line_items_count": len(line_items),
        "approval_level": approval,
        "employee_id": report.get("employee_id", "EMP-001234"),
        "submitted_at": _ts(),
        "estimated_reimbursement": "3-5 business days" if status == "approved" else "After approval (5-10 business days)",
        "tracking_url": f"https://hr-portal.example.com/expenses/{report_id}",
        "message": f"Expense report {report_id} submitted successfully. Total: ${total:.2f}. Status: {status.replace('_', ' ').title()}.",
    })
