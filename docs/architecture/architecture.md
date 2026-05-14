# Architecture Overview

## System Architecture

The HR Concierge demo is an **agentic orchestration system** built on three pillars:

1. **Microsoft Agent Framework** — Python SDK for defining agents, tools, and workflows
2. **AG-UI Protocol** — Server-Sent Events streaming for real-time UI updates
3. **Adaptive Generative UI** — React frontend that transforms based on workflow stage

## Component Diagram

```mermaid
graph TB
    subgraph "Frontend Surfaces"
        WEB[React Web App<br/>Vite + TailwindCSS]
        M365[M365 Copilot Agent<br/>Declarative Agent]
    end

    subgraph "Backend Service"
        API[FastAPI Server<br/>AG-UI Endpoint]
        WF[Agent Framework Workflow<br/>HandoffBuilder]

        subgraph "Life Event Pipeline"
            A1[Orchestrator Agent]
            A2[Intent Classifier]
            A3[Policy Advisor]
            A4[Risk Assessor]
            A5[Action Executor]
            A6[Summary Generator]
        end

        subgraph "Grievance Pipeline"
            A7[Grievance Classifier]
            A8[Narrative Structurer]
        end
    end

    subgraph "External Services"
        SN[ServiceNow<br/>A2A Protocol]
        SP[SharePoint<br/>Foundry IQ]
        AOI[Azure OpenAI<br/>GPT-4o]
    end

    WEB -->|SSE AG-UI| API
    M365 -->|REST| API
    API --> WF
    WF --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> A6
    A1 --> A7
    A7 --> A8
    A3 -.->|Knowledge Search| SN
    A5 -.->|Create Incident| SN
    A3 -.->|Policy Docs| SP
    WF -.->|LLM| AOI
```

## AG-UI Event Flow

```mermaid
sequenceDiagram
    participant User
    participant React as React App
    participant SSE as SSE Stream
    participant API as FastAPI
    participant WF as Workflow
    participant Agent as Agents

    User->>React: Type message
    React->>API: POST /agent (message)
    API->>SSE: Open SSE stream
    API->>WF: Run workflow

    WF->>Agent: Orchestrator starts
    Agent-->>SSE: RUN_STARTED
    Agent-->>SSE: STEP_STARTED (orchestrator)
    Agent-->>SSE: TEXT_MESSAGE_START
    Agent-->>SSE: TEXT_MESSAGE_CONTENT (chunks)
    Agent-->>SSE: TEXT_MESSAGE_END

    Agent->>Agent: Orchestrator calls get_workday_form_schema
    Agent-->>SSE: STEP_STARTED (workday_form_retrieval)
    Agent-->>SSE: TOOL_CALL_START (get_workday_form_schema)
    Agent-->>SSE: TOOL_CALL_ARGS
    Agent-->>SSE: TOOL_CALL_END
    Agent-->>SSE: CUSTOM {ui_state: triage screen}
    Agent-->>SSE: TEXT_MESSAGE_*

    Note over Agent: ... More agent handoffs ...

    Agent-->>SSE: CUSTOM {ui_state: review screen}
    Agent-->>SSE: RUN_FINISHED {interrupt: approval}

    SSE-->>React: Stream events
    React->>React: Update adaptive UI

    User->>React: Click Approve
    React->>API: POST /agent (approval)
    API->>WF: Resume workflow

    Agent-->>SSE: CUSTOM {ui_state: completed screen}
    Agent-->>SSE: RUN_FINISHED
```

## Data Flow

### Life Event Flow
1. **Intake** → User describes life event
2. **Intent Classification** → `classify_life_event` tool detects event type and affected fields
3. **Policy Retrieval** → `retrieve_policy_guidance` queries ServiceNow knowledge base
4. **Risk Assessment** → `assess_risk_and_compliance` evaluates each change
5. **Action Execution** → Low-risk: `execute_self_service_changes` / High-risk: `submit_high_risk_changes` (requires approval)
6. **Completion** → `generate_completion_summary` produces audit trail

### Grievance Flow
1. **Intake** → User describes workplace issue
2. **Classification** → `classify_grievance` determines type, severity, routing
3. **Structuring** → `structure_narrative` extracts facts, identifies gaps, creates case draft
4. **Review** → Case draft presented for HR review (human-in-the-loop)

## UI State Machine

```mermaid
stateDiagram-v2
    [*] --> intake
    intake --> triage: Intents detected
    triage --> action_plan: Risk assessed
    action_plan --> review: Approval needed
    review --> completed: Approved/Executed
    action_plan --> completed: Auto-completed (low risk)

    [*] --> grievance_intake
    grievance_intake --> grievance_triage: Classified
    grievance_triage --> case_draft: Structured
    case_draft --> completed: Filed
```

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | SPA with adaptive UI |
| Styling | TailwindCSS + Framer Motion | Design system + animations |
| Streaming | EventSource (SSE) | AG-UI protocol client |
| Backend | FastAPI + Python 3.11 | API server + SSE endpoint |
| Orchestration | Microsoft Agent Framework | Agentic tool workflow |
| LLM | Azure OpenAI GPT-4o | Agent reasoning |
| Knowledge | ServiceNow A2A | HR knowledge base |
| Documents | SharePoint / Foundry IQ | Policy document grounding |
| M365 | Declarative Agent | Copilot integration |
