# Agentic HR Concierge — Solution Overview

## 1. The Business Problem

### The HR Service Delivery Challenge

Enterprise HR departments face a fundamental scalability problem. Employees have hundreds of different HR needs — policy questions, life event changes, grievance filings, expense submissions — yet the delivery model hasn't evolved:

- **Siloed Systems**: Employees must navigate 5–10 disconnected systems (Workday, ServiceNow, SharePoint, benefits portals, expense tools) for routine tasks.
- **High Ticket Volume**: HR service desks handle thousands of repetitive Tier-1 questions that could be self-served ("How many PTO days do I have?", "What's the 401k match?").
- **Complex Multi-Step Workflows**: A single life event like "I just got married" triggers 4–6 downstream changes (name change, benefits enrollment, tax withholding update, emergency contact, beneficiary update) across different systems with different approval chains.
- **Compliance Risk**: Sensitive changes (legal name, bank details, grievances) require documentation, risk assessment, and audit trails — manual processes are error-prone.
- **Employee Frustration**: Average resolution time for a multi-system HR request is 5–10 business days. Employees don't know what they don't know — they miss steps, submit incomplete forms, and circle back repeatedly.

### What's Needed

An **intelligent orchestration layer** that:
1. Understands natural-language employee requests
2. Decomposes complex life events into atomic actions
3. Connects to backend HR systems (Workday, ServiceNow, Knowledge Bases)
4. Assesses risk and routes accordingly (self-service vs. approval-required)
5. Meets employees where they already are — Teams, M365 Copilot, and web portals

---

## 2. The Orchestration Need

Traditional approaches to HR automation fail because they treat each request type as a separate bot or workflow. The real business need is a **single orchestration brain** that:

| Requirement | Why It Matters |
|---|---|
| **Unified Intent Understanding** | An employee saying "I got married" implies name change + benefits + tax + emergency contact — not just one thing |
| **Multi-System Coordination** | A name change touches Workday, Active Directory, Email, Payroll, Benefits, and Compliance systems simultaneously |
| **Risk-Aware Routing** | Address change = self-service; bank details change = identity verification + fraud prevention review |
| **Policy Grounding** | Answers must come from approved policy documents, not hallucinated general knowledge |
| **Human-in-the-Loop** | High-risk actions require employee confirmation and sometimes manager/HR approval before execution |
| **Multi-Surface Delivery** | The same orchestration must serve web apps, Teams bots, and M365 Copilot agents |

---

## 3. Three Approaches — One Orchestrator

This solution delivers the HR Concierge through **three distinct user surfaces**, all connecting to a single shared orchestration backend:

### Approach 1: React Web Application (AG-UI Protocol)

**Surface**: Full-featured web app at `hr-concierge-web.azurecontainerapps.io`

**How it works**:
- Rich React frontend (Vite + TailwindCSS) with real-time streaming UI
- Connects via **AG-UI Protocol** (Server-Sent Events) to the orchestrator
- Renders adaptive generative UI — the interface transforms based on workflow stage
- Shows reasoning traces, tool execution progress, form cards, and impact maps in real-time
- Includes an HR Portal landing page with benefits, leave, and policy quick-access cards

**Best for**: Power users, HR staff, detailed multi-step workflows with rich visual feedback

**Protocol**: `POST /api/agent` → SSE stream with AG-UI events (RUN_STARTED, STEP_STARTED, TOOL_CALL_START, TEXT_MESSAGE_CONTENT, etc.)

---

### Approach 2: Microsoft 365 Copilot (Declarative Agent + MCP)

**Surface**: Appears in the M365 Copilot agent picker in Teams and microsoft365.com

**How it works**:
- **Declarative Agent** manifest defines the agent's personality, instructions, and available tools
- Connects to the orchestrator via **MCP (Model Context Protocol)** plugin
- MCP server exposes the same tool functions (get_workday_form, create_grievance_case, submit_expense_report, etc.) as MCP actions
- Returns **interactive HTML widgets** (Workday forms, grievance intake, expense forms, completion dashboards) rendered inline in the Copilot chat
- Leverages Microsoft's enterprise Copilot infrastructure for auth, compliance, and data governance

**Best for**: Organizations with M365 Copilot licenses, users who live in the Copilot experience

**Protocol**: M365 Copilot → MCP Plugin → `hr-concierge-mcp` server → same backend tool logic

---

### Approach 3: Microsoft Teams Custom Engine Agent (CEA Bot)

**Surface**: Teams personal chat, team channels, and group chats

**How it works**:
- **Thin relay bot** built on `@microsoft/agents-hosting` SDK (Node.js/TypeScript)
- Receives user messages via the Bot Framework messaging endpoint (`/api/messages`)
- Forwards the message to the orchestrator's `/api/invoke` synchronous endpoint
- Receives structured response: `{ answer, reasoning, tool_calls }`
- Renders the response with:
  - Reasoning trace (what the agent is thinking)
  - Tool call badges (which backends were invoked)
  - Rich Adaptive Card forms (Workday change forms, grievance intake, expense forms)
  - Footer with link to the HR Portal web app for additional detail
- Registered as a Custom Engine Agent (CEA) so it appears in the M365 Chat agent picker alongside Copilot

**Best for**: Broad employee base, quick conversational access, meeting employees in Teams where they already work

**Protocol**: Bot Framework → CEA bot → `POST /api/invoke` → JSON response → Adaptive Cards

---

### Why Three Approaches?

| | React Web (AG-UI) | M365 Copilot (MCP) | Teams CEA Bot |
|---|---|---|---|
| **Real-time streaming** | ✅ SSE with live token rendering | ❌ Request/response | ❌ Request/response |
| **Rich adaptive UI** | ✅ Full generative React components | ✅ HTML widgets inline | ✅ Adaptive Cards |
| **Enterprise auth** | Custom (session-based) | ✅ M365 Entra ID | ✅ M365 Entra ID |
| **Copilot integration** | ❌ Standalone | ✅ Native | ✅ Agent picker |
| **Deployment complexity** | Low (static web + API) | Medium (MCP server + manifest) | Medium (Bot Service + manifest) |
| **Best scenario** | Detailed HR workflows | Policy Q&A in Copilot | Quick actions in Teams chat |

All three hit the **same orchestrator** — there's zero divergence in business logic, tool implementations, or policy grounding.

---

## 4. Architecture — How It All Connects

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER SURFACES                                      │
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────────┐    │
│  │  React Web   │    │  M365 Copilot    │    │  Teams CEA Bot          │    │
│  │  (AG-UI SSE) │    │  (MCP Plugin)    │    │  (Bot Framework)        │    │
│  └──────┬───────┘    └────────┬─────────┘    └───────────┬─────────────┘    │
│         │                     │                           │                  │
└─────────┼─────────────────────┼───────────────────────────┼──────────────────┘
          │                     │                           │
          │ SSE /api/agent      │ MCP Actions               │ POST /api/invoke
          │                     │                           │
┌─────────┼─────────────────────┼───────────────────────────┼──────────────────┐
│         ▼                     ▼                           ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    ORCHESTRATION LAYER                               │     │
│  │                    FastAPI (Python)                                  │     │
│  │                                                                     │     │
│  │  ┌─────────────────────────────────────────────────────────────┐   │     │
│  │  │              Microsoft Agent Framework                       │   │     │
│  │  │                                                             │   │     │
│  │  │  • Single HR Concierge Agent                                │   │     │
│  │  │  • System prompt with routing logic                         │   │     │
│  │  │  • Tool-calling loop (max 10 iterations)                    │   │     │
│  │  │  • Temperature 0.3 for deterministic output                 │   │     │
│  │  │  • Skills Provider (expense-report validation)              │   │     │
│  │  └─────────────────────────────────────────────────────────────┘   │     │
│  │                              │                                      │     │
│  │                    ┌─────────┴─────────┐                           │     │
│  │                    │   TOOL CALLS      │                           │     │
│  │                    └─────────┬─────────┘                           │     │
│  └──────────────────────────────┼──────────────────────────────────────┘     │
│                                 │                                            │
└─────────────────────────────────┼────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────────┐
          │                       │                           │
          ▼                       ▼                           ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│  Azure AI Search │  │   ServiceNow     │  │     Workday HCM          │
│  (SharePoint KB) │  │   (A2A Protocol) │  │     (REST API)           │
│                  │  │                  │  │                          │
│  Policy docs,    │  │  Knowledge base  │  │  Employee records,       │
│  benefits info,  │  │  articles,       │  │  personal data changes,  │
│  leave policies  │  │  incident cases  │  │  form schemas            │
└──────────────────┘  └──────────────────┘  └──────────────────────────┘
```

### The Thin Relay Pattern

The key architectural insight is that **each surface is just a thin transport adapter**:

- **React Web App**: Manages SSE connection, renders streaming tokens, transforms AG-UI events into React components. Zero business logic.
- **MCP Server**: Wraps the same tool functions as MCP-compatible actions, returns rich HTML widgets. Zero independent reasoning.
- **Teams CEA Bot**: Receives Bot Framework activity, extracts user text, calls `/api/invoke`, renders the structured JSON response as Adaptive Cards. ~50 lines of core logic.

All intelligence lives in the orchestrator. The surfaces are interchangeable presentation layers.

---

## 5. Orchestration Deep Dive — How the Agent Works

### Microsoft Agent Framework

The orchestrator uses the **Microsoft Agent Framework** Python SDK, which provides:

- **Agent abstraction**: Wraps an LLM (Azure OpenAI GPT-4o) with tools, system prompt, and configuration
- **Automatic tool-calling loop**: The framework detects when the LLM requests a tool call, executes the function, feeds the result back, and continues until the LLM produces a final text response
- **Parallel tool execution**: Multiple tool calls in a single turn are executed concurrently
- **AG-UI streaming**: Built-in SSE endpoint that emits standardized events for real-time UIs
- **Skills Provider**: File-based skill packages (e.g., expense-report validation scripts)
- **Approval mode**: Tools marked with `approval_mode="always_require"` emit an interrupt event so the frontend can show a confirmation dialog before execution

### Two Endpoint Patterns

| Endpoint | Protocol | Consumer | Behavior |
|---|---|---|---|
| `POST /api/agent` | AG-UI (SSE) | React Web App | Streaming — emits events as agent reasons and acts |
| `POST /api/invoke` | JSON request/response | CEA Bot | Synchronous — runs full tool loop, returns final answer + tool call details |

### The Tool-Calling Loop

```
User Message
    │
    ▼
┌─────────────────────────────────────┐
│  Azure OpenAI GPT-4o (temp 0.3)    │
│  System Prompt: HR Concierge rules  │
│  Available tools: 14 functions      │
└───────────────┬─────────────────────┘
                │
    ┌───────────┴──────────┐
    │ finish_reason?       │
    │                      │
    ▼                      ▼
"tool_calls"           "stop"
    │                      │
    ▼                      ▼
Execute tool(s)        Return final
Feed results back      text answer
to message history     to user
    │
    └──── Loop (max 10 iterations) ────┘
```

### Intent Classification & Reasoning

For the CEA bot surface (which doesn't stream), the orchestrator runs a **two-pass approach**:

1. **Reasoning pass**: A lightweight LLM call classifies the intent and generates a 2–4 line reasoning trace showing category, planned tools, and risk assessment
2. **Execution pass**: The full tool-calling loop runs with real tool implementations

This gives the Teams bot a "thinking" display ("⚠️ Assessing Risk & Compliance", "📄 Loading Form Schema") even though it can't stream.

---

## 6. Backend Tool Catalog

The orchestrator exposes 14 tools organized by use case:

### Knowledge Retrieval
| Tool | Backend | Purpose |
|---|---|---|
| `query_knowledge_base` | Azure AI Search (SharePoint index) | Answer policy questions from HR documents |
| `retrieve_policy_guidance` | ServiceNow Knowledge Base (A2A) | Look up procedural guidance articles |

### Life Event / Personal Data Changes
| Tool | Backend | Purpose |
|---|---|---|
| `get_workday_form_schema` | Internal schema registry | Return form field definitions for Workday changes |
| `update_workday_employee` | Workday REST API (simulated) | Submit personal data changes |
| `assess_risk_and_compliance` | Rule engine | Evaluate risk levels and approval requirements |
| `build_impact_map` | Dependency graph | Show downstream systems affected by changes |
| `execute_self_service_changes` | Workday (low-risk path) | Immediately apply safe changes |
| `submit_high_risk_changes` | HR Ops queue (approval-required) | Route sensitive changes for human review |
| `generate_completion_summary` | Aggregator | Produce final status report of all actions |

### Grievance / Workplace Concerns
| Tool | Backend | Purpose |
|---|---|---|
| `structure_narrative` | NLP extraction | Parse unstructured employee account into structured intake |
| `create_grievance_case` | ServiceNow (approval-required) | File a formal Employee Relations case |

### Expense Reports
| Tool | Backend | Purpose |
|---|---|---|
| `submit_expense_report` | Finance system (approval-required) | Submit validated expenses for reimbursement |

### Approval Levels (Expense Reports)
| Amount | Approval |
|---|---|
| < $500 | Auto-approved |
| $500–$2,000 | Manager approval |
| $2,000–$10,000 | VP approval |
| > $10,000 | CFO approval |

---

## 7. ServiceNow A2A Integration

The orchestrator connects to ServiceNow using the **Agent-to-Agent (A2A) protocol**:

- OAuth 2.0 authentication (client credentials + password grant)
- Knowledge base search for policy articles
- Incident creation for grievance cases
- Supports both **live mode** (real ServiceNow instance) and **mock mode** (seeded responses for demos)

---

## 8. Security & Compliance Architecture

| Layer | Mechanism |
|---|---|
| **User authentication** | M365 Entra ID (Teams/Copilot), session-based (web) |
| **Bot authentication** | Bot Framework JWT validation (audience/issuer) |
| **API security** | Container Apps with HTTPS, no public backend endpoints |
| **Tool approval gates** | `approval_mode="always_require"` on sensitive operations |
| **Policy grounding** | All answers sourced from indexed SharePoint documents — no hallucination |
| **Grievance confidentiality** | Cases handled under strict access controls, ER-only visibility |
| **Audit trail** | Every tool execution logged with timestamps and transaction IDs |

---

## 9. Deployment Topology

| Container | Image | Role |
|---|---|---|
| `hr-concierge-api` | `api:v8` | Python FastAPI orchestrator |
| `hr-concierge-cea` | `cea-bot:v16` | Node.js Teams bot (thin relay) |
| `hr-concierge-web` | `hr-concierge-web:v7` | React frontend (Nginx) |
| `hr-concierge-mcp` | `mcp:v4` | MCP server for M365 Copilot |

All deployed as **Azure Container Apps** in a shared environment with:
- Managed HTTPS/TLS
- Auto-scaling (0 to N replicas)
- Private VNet connectivity between containers
- ACR (Azure Container Registry) for image storage

---

## 10. Summary

This solution demonstrates that **complex HR orchestration doesn't require complex surface logic**. By centralizing all intelligence in a single Agent Framework–powered orchestrator and exposing it through three thin transport adapters (AG-UI streaming, MCP actions, Bot Framework relay), we achieve:

- **Consistency**: Same business logic, same tools, same policy grounding across all surfaces
- **Maintainability**: Change a tool or policy once → all surfaces reflect it immediately
- **Extensibility**: Add a new surface (Slack, mobile app, voice) by writing a new thin adapter
- **Enterprise-grade**: Built on Azure OpenAI, M365, Teams, and Azure Container Apps — production-ready compliance, auth, and governance
