# HR Concierge — Demo Script

> **Purpose**: Walk through all platform capabilities in a single, cohesive narrative.  
> **Duration**: ~15 minutes  
> **Persona**: "Alex Rivera," Employee ID EMP-001234, Software Engineer at Contoso.  
> **Pre-requisites**: Backend running on `localhost:8000`, Frontend on `localhost:5174`.

---

## Context & Story

Alex Rivera just got married last weekend. Over the next few days Alex needs to:
1. Ask about company policies (PTO carryover, grievance procedures).
2. Update personal records in Workday (name, address, benefits, emergency contact).
3. Report a separate workplace concern about a peer's behavior at the wedding after-party.

This single narrative exercises **every** integration: Foundry IQ knowledge base, Workday HCM data collection, ServiceNow A2A knowledge retrieval, risk & compliance assessment, human-in-the-loop approval, and grievance case creation.

---

## Act 1 — HR Policy Questions (Foundry IQ Knowledge Retrieval)

**Goal**: Show the LLM correctly routes factual policy questions to the SharePoint knowledge base via Azure Foundry IQ — no workflows triggered, no forms rendered.

### Scene 1.1 — PTO & Vacation Policy

| | |
|---|---|
| **Prompt** | *"How many PTO days do I get per year, and what is the carryover limit?"* |
| **Expected Tool** | `query_knowledge_base` |
| **Expected Step** | `knowledge_retrieval` |
| **What to Show** | The assistant returns a grounded answer sourced from the SharePoint PTO policy document. No Gen UI form appears — just a clean text response with policy details. |

**Talking Points**:
- The LLM selected `query_knowledge_base` autonomously — no keyword classifier needed.
- The answer is grounded in the company's actual SharePoint documents (22 HR policy docs indexed).
- Source attribution is included: "SharePoint HR Policy Knowledge Base."

### Scene 1.2 — Grievance Procedure (The Misclassification Fix)

| | |
|---|---|
| **Prompt** | *"What is the formal grievance filing procedure?"* |
| **Expected Tool** | `query_knowledge_base` |
| **Expected Step** | `knowledge_retrieval` |
| **What to Show** | The assistant answers the policy question. It does **NOT** open a grievance intake form. |

**Talking Points**:
- This is the exact prompt that previously triggered the wrong flow (grievance intake instead of policy lookup).
- The old system used keyword matching — "grievance" → grievance workflow. The new agentic loop understands *intent*: asking *about* a procedure vs. *filing* a grievance.
- The system prompt has an explicit `CRITICAL DISTINCTION` section that guides the LLM.

### Scene 1.3 — Benefits & 401(k)

| | |
|---|---|
| **Prompt** | *"What does our 401(k) match policy look like?"* |
| **Expected Tool** | `query_knowledge_base` |
| **What to Show** | Grounded answer from the retirement benefits policy document. |

---

## Act 2 — Life Event Processing (Workday Integration)

**Goal**: Show the full life-event workflow — intent detection, Workday form schema retrieval, data collection via Gen UI, risk assessment, and record submission with human-in-the-loop approval for sensitive changes.

### Scene 2.1 — Marriage + Name Change (Multi-Intent Detection)

| | |
|---|---|
| **Prompt** | *"I got married last weekend and need to update my legal name, add my spouse to benefits, and change my emergency contact."* |
| **Expected Tools** | `get_workday_form_schema` (with `name-change,marriage,emergency-contact`) |
| **Expected Step** | `workday_form_retrieval` |
| **What to Show** | Gen UI renders a **data-collection** screen with Workday form fields grouped by section. The assistant explains which fields are required. |

**Talking Points**:
- The LLM detected **three** change intents from a single natural-language request.
- `get_workday_form_schema` returned the exact field definitions from the Workday HCM API schema.
- The Gen UI automatically synthesized a data-collection form — the frontend detects the `workday_form_retrieval` step and renders forms for each change type.
- Form fields include dropdowns (Reason for Change, State), date pickers (Effective Date, Marriage Date), and required-field indicators.

### Scene 2.2 — Filling the Workday Form

| | |
|---|---|
| **Action** | Fill in the data-collection form fields in the Gen UI panel. |
| **Example Data** | Name: Alex Rivera → Alex Chen-Rivera, Marriage Date: 2026-05-03, Spouse: Jordan Chen, Emergency Contact: Jordan Chen (Spouse), Phone: 555-0198 |
| **What to Show** | Fields grouped by change type: Name Change, Marriage, Emergency Contact. Required fields highlighted. |

**Talking Points**:
- Workday form schemas are pulled dynamically (7 change types supported: name-change, address-change, bank-details, emergency-contact, marriage, beneficiary-update, preferred-name).
- The form adapts to the detected intents — if Alex had said "just update my address," only address fields would appear.
- Each field includes type metadata (text, select, date) so the frontend renders the right input control.

### Scene 2.3 — Risk Assessment & Compliance

| | |
|---|---|
| **Prompt** | *(Continue from 2.1 — the LLM may auto-call these, or prompt:)* *"Go ahead and process these changes."* |
| **Expected Tools** | `assess_risk_and_compliance` → `build_impact_map` |
| **Expected Steps** | `risk_assessment` |
| **What to Show** | Gen UI shows an **action-plan** screen with risk levels per change and downstream system impact. |

**Talking Points**:
- **Name Change** = High Risk — affects payroll tax records, benefits enrollment, corporate identity. Requires verified documentation and dual approval.
- **Marriage Update** = Medium Risk — triggers downstream updates to benefits, tax withholding. Supporting documents needed.
- **Emergency Contact** = Low Risk — can be self-served immediately, no approval required.
- The impact map shows affected downstream systems: Payroll & Tax, Benefits & Insurance, Corporate Identity, IT Systems (AD/Email).

### Scene 2.4 — Submission (Human-in-the-Loop Approval)

| | |
|---|---|
| **Expected Tools** | `execute_self_service_changes` (emergency contact) → `submit_high_risk_changes` (name change, marriage) |
| **Expected Steps** | `change_execution` |
| **What to Show** | Low-risk changes execute immediately. High-risk changes trigger an **approval gate** — the AG-UI `approval_mode="always_require"` pauses the flow and shows an approval card. |

**Talking Points**:
- **Self-service changes** (emergency contact) complete instantly with a confirmation ID (e.g., `SC-A1B2C3`).
- **High-risk changes** (legal name, bank details) are flagged with `approval_mode="always_require"` — the system pauses and presents a review/approve card before executing.
- This is a core safety feature: sensitive HR mutations never execute without explicit human confirmation.
- Each Workday transaction gets a unique ID (e.g., `WD-4F8E2A1B`) for audit trail.

### Scene 2.5 — Completion Summary

| | |
|---|---|
| **Expected Tool** | `generate_completion_summary` |
| **Expected Step** | `completion_summary` |
| **What to Show** | Gen UI shows a **completed** screen with a timeline of all actions, statuses, and next steps. |

**Talking Points**:
- Summary shows: total changes requested, auto-completed count, pending approval count, documents needed.
- Next steps listed: upload supporting documents, monitor HR portal, contact HR Operations.
- Downstream systems will sync within 24 hours; employee gets a confirmation email from Workday.

---

## Act 3 — ServiceNow Knowledge Retrieval (A2A Protocol)

**Goal**: Show agent-to-agent communication with ServiceNow for policy article lookup.

### Scene 3.1 — Policy Guidance via ServiceNow

| | |
|---|---|
| **Prompt** | *"What documentation do I need for a legal name change?"* |
| **Expected Tools** | `query_knowledge_base` and/or `retrieve_policy_guidance` |
| **What to Show** | The assistant retrieves policy articles from the ServiceNow Knowledge Base via A2A protocol and presents requirements. |

**Talking Points**:
- `retrieve_policy_guidance` calls the **ServiceNow A2A protocol adapter** — a Google-standard Agent-to-Agent integration.
- The ServiceNow client (`ServiceNowA2AClient`) supports OAuth2 authentication, message/send endpoints, and knowledge search.
- In demo mode (`SERVICENOW_USE_MOCK=true`), mock responses are returned; in production, this hits a live ServiceNow instance.
- The A2A protocol enables seamless agent-to-agent orchestration across enterprise platforms.

---

## Act 4 — Grievance / Workplace Concern (Confidential Intake)

**Goal**: Show the grievance pathway — narrative structuring, confidential intake, and formal case creation with employee confirmation.

### Scene 4.1 — Reporting a Workplace Concern

| | |
|---|---|
| **Prompt** | *"I need to report something confidential. A coworker made some really inappropriate comments at a team event last week. Several people heard it and I feel very uncomfortable."* |
| **Expected Tool** | `structure_narrative` |
| **Expected Step** | `grievance_intake` |
| **What to Show** | Gen UI switches to **grievance-intake** screen. The assistant acknowledges the concern empathetically, structures the narrative, and asks follow-up questions. |

**Talking Points**:
- The LLM recognized this as a **workplace incident report**, not a policy question — even though it doesn't contain the word "grievance."
- `structure_narrative` extracts key facts (involves coworker, related to conduct at team event, witnesses present), classifies severity, and identifies missing information.
- The system asks targeted follow-up questions: specific dates, witness names, whether previously reported, available documentation.
- Tone is warm, empathetic, and assures confidentiality throughout.

### Scene 4.2 — Follow-Up Information

| | |
|---|---|
| **Prompt** | *"It happened last Thursday at the team offsite. Sarah and Mike were both there and heard it. I haven't reported it to anyone yet."* |
| **What to Show** | The assistant incorporates the new details into the structured intake and confirms the narrative back to the employee. |

**Talking Points**:
- The agentic loop maintains context across turns — the conversation history is sent to the LLM on each iteration.
- The structured intake now includes: dates (last Thursday), witnesses (Sarah, Mike), prior reporting status (none).
- Missing information list shrinks as the employee provides details.

### Scene 4.3 — Filing the Formal Case (Human-in-the-Loop)

| | |
|---|---|
| **Prompt** | *"Yes, please go ahead and file this formally."* |
| **Expected Tool** | `create_grievance_case` |
| **Expected Step** | `grievance_filing` |
| **What to Show** | An **approval gate** appears because `create_grievance_case` uses `approval_mode="always_require"`. The employee must explicitly confirm before submission. |

**Talking Points**:
- Filing a formal grievance initiates an Employee Relations investigation — this is an irreversible action that requires explicit consent.
- The case gets a unique ID (e.g., `GRV-8A2F1E3B`), assigned to the Employee Relations Team.
- SLA: initial review within 48 hours.
- All communications are flagged as confidential.
- The employee can add additional information at any time.

---

## Act 5 — Edge Cases & Intelligence Demonstration

**Goal**: Show the LLM's ability to correctly triage ambiguous or tricky prompts.

### Scene 5.1 — Ambiguous Intent (Grievance vs. Team Issue)

| | |
|---|---|
| **Prompt** | *"I'm not sure if this is a grievance or just a team issue. My team lead keeps assigning me less important tasks."* |
| **Expected Behavior** | The assistant should explore the situation before routing — it may call `structure_narrative` to help classify, or ask clarifying questions first. |
| **What to Show** | The LLM doesn't prematurely trigger a formal case. It helps the employee understand the difference and decide on the appropriate path. |

### Scene 5.2 — Mixed Intent (Policy Question + Action)

| | |
|---|---|
| **Prompt** | *"What's the process for updating my address, and can you also go ahead and update my emergency contact to my spouse Jordan Chen, phone 555-0198?"* |
| **Expected Tools** | `query_knowledge_base` (address process) + `get_workday_form_schema` (emergency-contact) or direct `update_workday_employee` |
| **What to Show** | The LLM handles both intents in a single turn — answers the policy question AND initiates the data change. |

### Scene 5.3 — Trivial Complaints (Grievance Pushback)

**Goal**: Show the LLM's intelligence in distinguishing genuine workplace grievances from trivial annoyances that don't warrant formal intake.

| | |
|---|---|
| **Prompt** | *"My coworker stole my chair from my desk. I want to file a grievance about this."* |
| **Expected Tool** | None — no tools called |
| **Expected Step** | `hr_concierge` only (no `grievance_intake` or `grievance_filing`) |
| **What to Show** | The assistant empathetically acknowledges the frustration but explains that a missing chair does not qualify as a formal grievance. It suggests alternatives (talk to coworker, contact manager, facilities request). |

**Additional Trivial Prompts to Demo**:

| Prompt | Why It's Rejected |
|--------|-------------------|
| *"Someone keeps eating my lunch from the fridge. I want to file a formal complaint."* | Personal item issue — not harassment/discrimination |
| *"My coworker plays music too loud. How do I file a grievance?"* | Noise complaint — facilities/manager issue |
| *"The thermostat is always too cold. I want to file a grievance."* | Environmental comfort — facilities request |
| *"A colleague didn't say good morning to me. I feel disrespected."* | One-time social slight — no pattern of mistreatment |
| *"Someone moved my desk plants without asking. I want to report this as harassment."* | Minor workspace issue — not harassment |

**Talking Points**:
- The LLM does NOT call `structure_narrative` or `create_grievance_case` for trivial complaints.
- The response uses phrases like "does not qualify as a formal grievance" — the frontend detects these rejection phrases and prevents the grievance UI from rendering.
- The assistant still acknowledges the employee's feelings and offers practical alternatives.
- Compare this to a genuine grievance (Act 4) where the same system immediately enters confidential intake — demonstrating true intent understanding, not keyword matching.
- Key: saying "I want to file a grievance" doesn't auto-trigger the grievance flow. The LLM evaluates whether the underlying issue actually warrants formal process.

### Scene 5.4 — Out-of-Scope Request

| | |
|---|---|
| **Prompt** | *"Can you book me a flight to the New York office?"* |
| **Expected Behavior** | The assistant politely declines — travel booking is outside the HR Concierge's scope. It may suggest contacting the travel desk or office admin. |

---

## Architecture Highlights (for Technical Audience)

Pause the demo at any point to show these architectural details:

### Single-Agent Agentic Loop
- **Before**: 9 specialized agents wired via `HandoffBuilder` with keyword-based classifiers.
- **After**: 1 agent (HR Concierge) with 11 tools. The LLM selects tools based on intent understanding.
- The loop runs up to 12 iterations, calling tools as needed, until a final text response is produced.

### Tool Inventory (11 Tools)
| # | Tool | Integration | Approval |
|---|------|-------------|----------|
| 1 | `query_knowledge_base` | Azure Foundry IQ → SharePoint | — |
| 2 | `retrieve_policy_guidance` | ServiceNow A2A | — |
| 3 | `assess_risk_and_compliance` | Internal logic | — |
| 4 | `build_impact_map` | Internal logic | — |
| 5 | `submit_high_risk_changes` | HR Operations | **Required** |
| 6 | `execute_self_service_changes` | Workday (self-serve) | — |
| 7 | `generate_completion_summary` | Internal logic | — |
| 8 | `structure_narrative` | Internal logic | — |
| 9 | `create_grievance_case` | Employee Relations | **Required** |
| 10 | `update_workday_employee` | Workday HCM API | — |
| 11 | `get_workday_form_schema` | Workday HCM API | — |

### Technology Stack
| Layer | Technology |
|-------|-----------|
| LLM | Azure OpenAI (gpt-5.4-nano) |
| Knowledge Base | Azure Foundry IQ → SharePoint (22 HR policy docs) |
| Search | Azure AI Search (`hr-foundry-iq-search`) |
| Agent Framework | Microsoft Agent Framework (`@tool` decorator, `FunctionTool` API) |
| Protocol | AG-UI (SSE streaming: RUN, STEP, TOOL_CALL, TEXT_MESSAGE events) |
| Backend | FastAPI + Uvicorn (Python) |
| Frontend | React + Vite + TypeScript |
| Workday | Simulated HCM REST API (7 form schemas, transaction IDs) |
| ServiceNow | A2A Protocol adapter (OAuth2, message/send, knowledge search) |
| Approval | `approval_mode="always_require"` on sensitive tools |

### Gen UI State Machine
The frontend's `synthesizeUIState()` automatically determines which UI screen to render based on agent step names and text content:

| Step Name | Gen UI Screen |
|-----------|--------------|
| `knowledge_retrieval` | Clean text response (no form) |
| `workday_form_retrieval` | Data-collection form (Workday fields) |
| `risk_assessment` | Action plan with risk levels |
| `change_execution` | Execution with approval gates |
| `completion_summary` | Completion timeline |
| `grievance_intake` | Grievance intake form |
| `grievance_filing` | Case creation with confirmation |

---

## Quick Reference — Demo Prompts

Copy-paste these prompts in order for the full narrative:

```
Act 1 — Knowledge Retrieval
1. "How many PTO days do I get per year, and what is the carryover limit?"
2. "What is the formal grievance filing procedure?"
3. "What does our 401(k) match policy look like?"

Act 2 — Life Event (Workday)
4. "I got married last weekend and need to update my legal name, add my spouse to benefits, and change my emergency contact."
5. [Fill form fields in Gen UI]
6. "Go ahead and process these changes."

Act 3 — ServiceNow
7. "What documentation do I need for a legal name change?"

Act 4 — Grievance
8. "I need to report something confidential. A coworker made inappropriate comments at a team event last week. Several people heard it."
9. "It happened last Thursday at the team offsite. Sarah and Mike were both there. I haven't reported it yet."
10. "Yes, please go ahead and file this formally."

Act 5 — Edge Cases
11. "I'm not sure if this is a grievance or just a team issue."
12. "What's the process for updating my address, and can you update my emergency contact to Jordan Chen, 555-0198?"
13. "My coworker stole my chair from my desk. I want to file a grievance about this."
14. "Someone keeps eating my lunch from the fridge. I want to file a formal complaint."
15. "Can you book me a flight to New York?"
```

---

*Document generated for the Agentic RFI HR Demo — Microsoft Agent Framework + AG-UI + Foundry IQ + ServiceNow A2A.*
