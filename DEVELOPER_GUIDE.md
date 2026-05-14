# HR Concierge — Developer Technical Deep-Dive

> **Audience**: Developers new to agentic architecture, Microsoft AI tooling, and enterprise integration patterns.  
> **Goal**: Understand *how* this system works, *what* each technology does, and *why* we chose it.

---

## Table of Contents

1. [What Is an "Agentic" Application?](#1-what-is-an-agentic-application)
2. [Architecture Overview](#2-architecture-overview)
3. [The Agentic Loop — How Orchestration Actually Works](#3-the-agentic-loop)
4. [Technology Stack & Why We Chose Each Piece](#4-technology-stack)
5. [Code Walkthrough](#5-code-walkthrough)
6. [How a Request Flows End-to-End](#6-request-flow)
7. [Key Patterns & Lessons Learned](#7-patterns-and-lessons)
8. [Glossary](#8-glossary)

---

## 1. What Is an "Agentic" Application?

Traditional chatbots follow **scripted flows** — if the user says X, do Y. An **agentic** application is fundamentally different:

```
Traditional Bot                          Agentic Application
─────────────                            ────────────────────
User → Keyword Match → Hardcoded Flow    User → LLM (brain) → Decides what to do
                                                    ↓
                                              Calls tools as needed
                                                    ↓
                                              Reads tool results
                                                    ↓
                                              Decides: need more tools? Or respond?
                                                    ↓
                                              Loops until done → Final response
```

**Key concepts**:

| Concept | What It Means |
|---------|--------------|
| **Agent** | An LLM + a system prompt + a set of tools. The LLM *decides* which tools to call and in what order. |
| **Tool** | A function the LLM can invoke. It describes what it does via a JSON schema, and the LLM reads the result. |
| **Agentic Loop** | The core pattern: send message → LLM responds with tool calls → execute tools → feed results back → repeat until the LLM produces a final text answer. |
| **Tool Calling** | The LLM doesn't execute code. It outputs structured JSON saying "I want to call function X with arguments Y." Your code executes it and returns the result. |
| **System Prompt** | Instructions that tell the LLM its role, capabilities, and decision-making rules. This is where "intelligence" is configured. |

### Why Agentic > Scripted?

We originally built this with **9 hardcoded agents** wired together with keyword classifiers. The classifier would match "grievance" → route to the grievance agent. Problem: *"What is the formal grievance filing procedure?"* triggered the grievance intake workflow instead of answering the policy question, because the keyword "grievance" appeared.

With the agentic pattern, the LLM **understands intent**:
- "What is the grievance procedure?" → *asking about a policy* → calls `query_knowledge_base`
- "I want to file a grievance" → *reporting an incident* → calls `structure_narrative`

No keyword matching. The LLM reads the tool descriptions and decides.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│                                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────────┐ │
│  │ Chat     │   │ Orchestration│   │ Adaptive Gen UI              │ │
│  │ Panel    │   │ Panel        │   │ (WorkdayForm, GrievanceIntake│ │
│  │          │   │ (live steps) │   │  ActionPlan, CompletedView)  │ │
│  └────┬─────┘   └──────────────┘   └──────────────────────────────┘ │
│       │                                                             │
│       │  useAgentStream() — parses SSE events, synthesizes UI state │
│       │                                                             │
└───────┼─────────────────────────────────────────────────────────────┘
        │  POST /api/agent  (SSE stream)
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Uvicorn)                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              _agentic_loop()                          │           │
│  │                                                       │           │
│  │  ┌─────────────┐                                     │           │
│  │  │ System      │  "You are the HR Concierge..."      │           │
│  │  │ Prompt      │  (role, rules, tool usage guide)     │           │
│  │  └─────────────┘                                     │           │
│  │         │                                             │           │
│  │         ▼                                             │           │
│  │  ┌─────────────┐    ┌───────────────────────┐        │           │
│  │  │ Azure       │───▶│ "I want to call        │        │           │
│  │  │ OpenAI      │    │  query_knowledge_base  │        │           │
│  │  │ (LLM)       │    │  with args {...}"      │        │           │
│  │  └─────────────┘    └───────────┬───────────┘        │           │
│  │                                 │                     │           │
│  │                     ┌───────────▼───────────┐        │           │
│  │                     │ TOOL_MAP[name](**args) │        │           │
│  │                     │ Execute the function   │        │           │
│  │                     └───────────┬───────────┘        │           │
│  │                                 │                     │           │
│  │                     result fed back to LLM            │           │
│  │                     loop continues...                 │           │
│  └──────────────────────────────────────────────────────┘           │
│                            │                                        │
│          ┌─────────────────┼─────────────────────┐                  │
│          ▼                 ▼                     ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐         │
│  │ Foundry IQ   │  │ Workday HCM  │  │ ServiceNow A2A    │         │
│  │ (SharePoint  │  │ (form schemas│  │ (knowledge search │         │
│  │  knowledge)  │  │  + updates)  │  │  + incidents)     │         │
│  └──────────────┘  └──────────────┘  └───────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Agentic Loop — How Orchestration Actually Works

This is the **core of the entire application**. It lives in `main.py → _agentic_loop()`. Here's what happens, step by step:

### Step 1: Build the conversation

```python
conversation = [
    {"role": "system", "content": HR_CONCIERGE_PROMPT},   # Who you are, what tools to use when
    {"role": "user",   "content": user_msg},               # "I got married and need to update my name"
]
```

### Step 2: Call Azure OpenAI with tools

```python
response = await client.chat.completions.create(
    model="gpt-5.4-nano",
    messages=conversation,
    tools=TOOL_DEFINITIONS,    # JSON schemas for all 11 tools
    temperature=0.3,
)
```

The `tools` parameter tells the LLM: "Here are functions you can call." Each tool definition looks like:

```json
{
  "type": "function",
  "function": {
    "name": "get_workday_form_schema",
    "description": "Return the Workday form schema (fields needed) for the given change type(s).",
    "parameters": {
      "type": "object",
      "properties": {
        "change_types_csv": { "type": "string", "title": "Change Types Csv" }
      },
      "required": ["change_types_csv"]
    }
  }
}
```

### Step 3: The LLM decides

The LLM doesn't return text. It returns a **tool call**:

```json
{
  "role": "assistant",
  "tool_calls": [{
    "id": "call_abc123",
    "function": {
      "name": "get_workday_form_schema",
      "arguments": "{\"change_types_csv\": \"name-change,marriage\"}"
    }
  }]
}
```

**This is the magic**: The LLM read the user's message, read all 11 tool descriptions, and autonomously decided: "This person needs Workday form schemas for a name change and marriage update."

### Step 4: Execute the tool and feed results back

```python
tool_func = TOOL_MAP["get_workday_form_schema"]
result = tool_func(change_types_csv="name-change,marriage")
# result = '{"change_types": ["name-change", "marriage"], "fields": [...], "total_fields": 14}'

conversation.append({"role": "tool", "tool_call_id": "call_abc123", "content": result})
```

### Step 5: Loop

Back to Step 2. The LLM now sees the tool result and decides:
- **Need more tools?** → makes another tool call (e.g., `assess_risk_and_compliance`)
- **Ready to respond?** → produces a text answer summarizing everything

The loop runs up to 12 iterations (safety limit), but typically completes in 1-3.

### What the user sees during this loop

While iterating, the backend streams **AG-UI SSE events** to the frontend:

```
→ RUN_STARTED
→ STEP_STARTED (hr_concierge)
→ TOOL_CALL_START (get_workday_form_schema)
→ TOOL_CALL_ARGS ({"change_types_csv": "name-change,marriage"})
→ TOOL_CALL_END
→ TEXT_MESSAGE_START
→ TEXT_MESSAGE_CONTENT ("Congratulations! Here are the Workday fields...")
→ TEXT_MESSAGE_CONTENT ("...you'll need to complete...")
→ TEXT_MESSAGE_END
→ STEP_FINISHED (hr_concierge)
→ RUN_FINISHED
```

---

## 4. Technology Stack & Why We Chose Each Piece

### 4.1 Azure OpenAI (LLM)

| | |
|---|---|
| **What** | Hosted large language model (gpt-5.4-nano) with tool-calling support |
| **Why Azure OpenAI, not raw OpenAI?** | Enterprise requirements: data stays in our Azure tenant, no data sent to public OpenAI APIs, compliant with corporate data residency policies, Azure RBAC for access control, integrated billing. |
| **Why not a local model?** | Tool-calling (function calling) requires a model that reliably outputs structured JSON tool invocations. Azure OpenAI models are optimized for this. Local models (Ollama, etc.) have inconsistent tool-calling support. |
| **Why gpt-5.4-nano?** | Fast, cheap, and accurate enough for routing + summarization. For a production system you might use gpt-4.1 for complex reasoning, but nano handles our 11-tool routing well. |

**Code**: `main.py` → `_get_client()` creates an `AsyncAzureOpenAI` client.

### 4.2 Microsoft Agent Framework SDK

| | |
|---|---|
| **What** | The **Microsoft Agent Framework** is a Python SDK with modular packages. We use two: `agent-framework-core` (the `@tool` decorator and `FunctionTool` class) and `agent-framework-ag-ui` (AG-UI protocol types). The SDK also includes packages we don't use, like `agent-framework-github-copilot` (wraps GitHub Copilot models) and `agent-framework-foundry` (managed agent hosting). |
| **Why?** | The `@tool` decorator automatically: (1) generates OpenAI-compatible JSON schemas from Python type hints, (2) supports `approval_mode="always_require"` for human-in-the-loop safety, (3) wraps functions in `FunctionTool` objects with `.name`, `.func`, `.to_json_schema_spec()`. |
| **Why not just raw functions?** | You'd have to hand-write JSON schemas for every function. The `@tool` decorator does it automatically from your docstring + type annotations. It also gives you approval mode for free. |
| **Why not `GitHubCopilotAgent`?** | `GitHubCopilotAgent` is a higher-level wrapper that manages LLM calls for you. We use `AsyncAzureOpenAI` directly because: (1) we need fine-grained control over the agentic loop (custom SSE streaming, synthetic step emission), (2) we're calling an Azure OpenAI endpoint (not GitHub Copilot), (3) the direct SDK gives us full visibility into tool calls and conversation management. |

**Packages used** (from `requirements.txt`):
- `agent-framework-core` — `@tool` decorator, `FunctionTool`
- `agent-framework-ag-ui` — AG-UI protocol event types

**Code**: `agents/tools.py` — every function decorated with `@tool`.

### 4.3 Azure Foundry IQ + Azure AI Search (Knowledge Base)

| | |
|---|---|
| **What** | Foundry IQ indexes our 22 HR policy documents from SharePoint and provides grounded answers. Azure AI Search powers the retrieval. |
| **Why Foundry IQ?** | (1) Zero-code document ingestion — point it at a SharePoint site, it indexes everything. (2) Built-in answer synthesis — it doesn't just return documents, it returns grounded answers with citations. (3) No RAG pipeline to build — no chunking, embedding, or vector DB to maintain. |
| **Why not raw Azure AI Search?** | You'd need to build the full RAG pipeline yourself: document chunking, embedding generation, vector index management, prompt engineering for synthesis. Foundry IQ handles all of that. |
| **Why not just stuff docs in the system prompt?** | 22 documents × ~10 pages each = way too many tokens. Retrieval is essential. |

**Code**: `agents/tools.py` → `query_knowledge_base()` calls the Foundry IQ `/retrieve` API.

### 4.4 AG-UI Protocol (Frontend Streaming)

| | |
|---|---|
| **What** | A standard protocol for streaming agent execution events over Server-Sent Events (SSE). Defines event types: `RUN_STARTED`, `STEP_STARTED`, `TOOL_CALL_START`, `TEXT_MESSAGE_CONTENT`, etc. |
| **Why AG-UI?** | (1) Standard event vocabulary — the frontend knows exactly what events to expect. (2) Streaming — users see tool calls happening in real-time, not waiting for a full response. (3) Gen UI — the frontend can render different UI screens based on which step/tool is active. |
| **Why not WebSockets?** | SSE is simpler (HTTP, one-way), works through proxies/CDNs, and is sufficient since the agent only streams *to* the client. User input goes via regular POST requests. |

**Code**: `main.py` → `EventSourceResponse(event_stream())` streams events. Frontend: `useAgentStream.ts` consumes them.

### 4.5 FastAPI + Uvicorn (Backend Server)

| | |
|---|---|
| **What** | Python async web framework (FastAPI) + ASGI server (Uvicorn). |
| **Why FastAPI?** | (1) Native async support — essential because the LLM calls are async. (2) Automatic OpenAPI docs. (3) First-class SSE support via `sse-starlette`. (4) Same language as the AI/ML ecosystem (Python). |
| **Why not Node.js/Express?** | The AI SDK ecosystem (OpenAI, Agent Framework, httpx) is Python-first. Using Node would mean maintaining bindings or HTTP proxies to Python tools. |

### 4.6 ServiceNow A2A Protocol (Agent-to-Agent)

| | |
|---|---|
| **What** | Google-standardized Agent-to-Agent protocol. Allows our agent to talk to ServiceNow agents (knowledge base, incident management) via JSON-RPC over HTTPS. |
| **Why A2A?** | (1) Industry standard — not proprietary. (2) ServiceNow is the most common enterprise ITSM platform. (3) Demonstrates cross-platform agent orchestration — our Microsoft agent talks to ServiceNow agents. |
| **Why not a direct ServiceNow REST API?** | A2A is agent-native — you send natural language, the ServiceNow agent interprets it. No need to learn ServiceNow's table API, GlideRecord syntax, or sys_ids. |

**Code**: `integrations/servicenow_a2a.py` → `ServiceNowA2AClient` with OAuth2 + `message/send`.

### 4.7 React + Vite + TypeScript (Frontend)

| | |
|---|---|
| **What** | Single-page application with adaptive generative UI. |
| **Why React?** | Standard, large ecosystem, component model works well for adaptive UI (swap panels based on agent state). |
| **Why Vite?** | Fast dev server, instant HMR. No webpack config to maintain. |
| **Key feature: Generative UI** | The frontend doesn't have hardcoded screens. It **synthesizes** the UI from agent events — `synthesizeUIState()` reads tool calls and text, then decides: show a Workday form? A grievance intake? An action plan? A completion timeline? |

### 4.8 Workday HCM (Simulated)

| | |
|---|---|
| **What** | Simulated Workday REST API with 7 form schemas and transaction tracking. |
| **Why simulate?** | Real Workday APIs require tenant access, OAuth2 setup, and sandboxed environments. The simulation is schema-accurate (same fields, types, required flags) so the frontend and LLM behavior is identical to production. |
| **What's simulated** | `get_workday_form_schema` returns real field definitions. `update_workday_employee` validates required fields and returns transaction IDs. |

---

## 5. Code Walkthrough

### Project Structure

```
AgenticRFIHRDemo/
├── apps/web/                          # Frontend
│   └── src/
│       ├── hooks/useAgentStream.ts    # SSE consumer + Gen UI synthesis
│       ├── components/
│       │   ├── chat/ChatPanel.tsx     # Chat messages
│       │   ├── chat/WorkdayFormPanel  # Workday data collection form
│       │   ├── chat/GrievanceIntake   # Grievance intake form
│       │   ├── adaptive/             # Adaptive UI views (triage, action plan, etc.)
│       │   └── panels/               # Orchestration panel, prompt gallery
│       └── pages/WorkspacePage.tsx    # Main workspace layout
│
└── services/orchestration/            # Backend
    ├── main.py                        # FastAPI app + agentic loop (THE CORE)
    ├── config.py                      # Pydantic settings (env vars)
    ├── agents/
    │   ├── __init__.py                # System prompt + tool registry
    │   └── tools.py                   # All 11 tool definitions
    └── integrations/
        └── servicenow_a2a.py          # ServiceNow A2A client
```

### File-by-File

#### `agents/__init__.py` — The Brain Configuration

Three exports:

| Export | What |
|--------|------|
| `HR_CONCIERGE_PROMPT` | ~2,700-char system prompt. Tells the LLM its role, the three request types (policy question, life event, grievance), and which tools to use for each. Includes a "CRITICAL DISTINCTION" section for ambiguous cases. |
| `TOOL_MAP` | Dict of `{tool_name: callable}`. Used to execute tools when the LLM requests them. |
| `TOOL_DEFINITIONS` | List of 11 OpenAI function-calling JSON schemas. Passed to the `tools=` parameter of the LLM API call. |

Built by `_build_registry()` which imports all `@tool`-decorated functions, reads their `.name`, `.func`, and `.to_json_schema_spec()`.

#### `agents/tools.py` — The 11 Tools

| # | Tool | What It Does | Integration |
|---|------|-------------|-------------|
| 1 | `query_knowledge_base` | Searches SharePoint HR docs via Foundry IQ | Azure AI Search |
| 2 | `retrieve_policy_guidance` | Looks up articles in ServiceNow KB | ServiceNow A2A |
| 3 | `assess_risk_and_compliance` | Evaluates risk per change type, determines approval needs | Internal logic |
| 4 | `build_impact_map` | Maps affected downstream systems (payroll, benefits, IT) | Internal logic |
| 5 | `submit_high_risk_changes` | Submits sensitive changes (**requires approval**) | HR Operations |
| 6 | `execute_self_service_changes` | Executes low-risk changes immediately | Workday |
| 7 | `generate_completion_summary` | Produces executive summary of all actions | Internal logic |
| 8 | `get_workday_form_schema` | Returns field definitions for Workday forms | Workday HCM |
| 9 | `update_workday_employee` | Submits field data to Workday, validates required fields | Workday HCM |
| 10 | `structure_narrative` | Structures a grievance narrative, extracts facts, finds gaps | Internal logic |
| 11 | `create_grievance_case` | Files a formal grievance case (**requires approval**) | Employee Relations |

**Key design choice**: The LLM reads the **docstrings** of these tools to decide when to use them. Good docstrings = good routing. For example:

```python
@tool
def query_knowledge_base(query: str) -> str:
    """Search the HR policy knowledge base (SharePoint via Foundry IQ) for answers.

    Use this tool when the employee asks a question about HR policies, benefits,
    leave entitlements, PTO, 401(k), health insurance...

    Do NOT use this for employees who want to make changes to their records
    (use Workday tools instead) or who are reporting an actual workplace
    incident (use structure_narrative / create_grievance_case instead).
    """
```

The "Do NOT use this for..." is just as important as the "Use this for..." — it prevents misrouting.

#### `main.py` — The Agentic Loop

~200 lines. The entire backend orchestration is this file. Key sections:

1. **`_get_client()`** — lazy singleton `AsyncAzureOpenAI`.
2. **`agent_endpoint()`** — POST `/api/agent`, parses messages, returns SSE stream.
3. **`_agentic_loop()`** — the core loop (covered in Section 3 above). After each tool call, it emits a **synthetic orchestration step** via `TOOL_TO_STEP` — a mapping from tool name to a descriptive step name (e.g., `get_workday_form_schema` → `workday_form_retrieval`). These step names tell the frontend *what the orchestrator is doing* so the Gen UI can render the right screen.
4. **REST endpoints** — `/api/health`, `/api/scenarios`, `/api/prompts`.

#### `useAgentStream.ts` — Frontend Event Consumer

The `sendMessage()` function:
1. POSTs to `/api/agent` with all conversation messages.
2. Reads the SSE stream line by line.
3. For each event type, updates React state:
   - `TOOL_CALL_START` → adds to tool call list (visible in Orchestration panel)
   - `TEXT_MESSAGE_CONTENT` → appends to the chat message being streamed
   - `STEP_FINISHED` → calls `synthesizeUIState()` to decide which Gen UI panel to show

`synthesizeUIState()` is the **Generative UI engine**. It reads completed orchestration steps and text content, then returns the right UI screen:

```typescript
// The agentic loop calls get_workday_form_schema
// → backend emits STEP_FINISHED with step name "workday_form_retrieval"
// → synthesizeUIState detects it → returns { screen_type: "data-collection", ... }
// → frontend renders WorkdayFormPanel with the right fields
```

---

## 6. How a Request Flows End-to-End

### Example: "I got married and need to update my name"

```
 ┌──────────────────────────────────────────────────────────────┐
 │ 1. USER types message in ChatPanel                           │
 │    → sendMessage("I got married and need to update my name") │
 └──────────────┬───────────────────────────────────────────────┘
                │
                │  POST /api/agent  { messages: [...], threadId: "..." }
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 2. BACKEND builds conversation                               │
 │    conversation = [                                          │
 │      { role: "system", content: HR_CONCIERGE_PROMPT },       │
 │      { role: "user", content: "I got married..." }           │
 │    ]                                                         │
 └──────────────┬───────────────────────────────────────────────┘
                │
                │  chat.completions.create(tools=TOOL_DEFINITIONS)
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 3. AZURE OPENAI reads message + 11 tool schemas              │
 │    Decides: "This is a life event. I need the Workday form." │
 │    Returns: tool_call(get_workday_form_schema,               │
 │             args={"change_types_csv": "name-change,marriage"})│
 └──────────────┬───────────────────────────────────────────────┘
                │
                │  SSE: TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 4. BACKEND executes: TOOL_MAP["get_workday_form_schema"]()   │
 │    Returns: { fields: [14 Workday form fields], ... }        │
 │    Appends tool result to conversation                       │
 └──────────────┬───────────────────────────────────────────────┘
                │
                │  conversation now has 3 messages (system, user, tool result)
                │  Loop back to Azure OpenAI...
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 5. AZURE OPENAI sees the form schema in the tool result      │
 │    Decides: "I have what I need. Time to respond."           │
 │    Returns: text message explaining each field               │
 └──────────────┬───────────────────────────────────────────────┘
                │
                │  SSE: TEXT_MESSAGE_START → CONTENT chunks → TEXT_MESSAGE_END
                │  SSE: STEP_FINISHED → RUN_FINISHED
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ 6. FRONTEND receives all events                              │
 │    - Chat: renders streamed text in ChatPanel                │
 │    - Tool calls: shows in OrchestrationPanel                 │
 │    - synthesizeUIState() detects "workday_form_retrieval"     │
 │      step + text mentions "name change" and "marriage"        │
 │      → renders WorkdayFormPanel with grouped form fields     │
 └──────────────────────────────────────────────────────────────┘
```

**Total LLM calls**: 2 (one to decide the tool, one to generate the response).  
**Total time**: ~3-5 seconds.  
**Lines of routing code**: 0. The LLM did it all.

---

## 7. Key Patterns & Lessons Learned

### Pattern 1: Single Agent + Many Tools > Many Agents + Handoffs

**Before**: 9 specialized agents (Intent Classifier, Policy Advisor, Risk Assessor, Action Executor, Grievance Classifier, Narrative Structurer, etc.) connected via `HandoffBuilder`. Each agent had a narrow scope and keyword-based routing.

**After**: 1 agent with 11 tools. The LLM reads all tool descriptions and picks the right ones.

**Why this is better**:
- No brittle keyword classifiers that break on edge cases.
- Zero handoff latency between agents.
- The LLM can combine tools from different "categories" in one turn (e.g., answer a policy question AND start a Workday update).
- Simpler code: ~200 lines vs. ~1,300 lines.

**When to use multi-agent**: When tools require different LLM models, different security contexts, or when the tool count exceeds ~20 (LLM accuracy drops with too many tools).

### Pattern 2: Tool Descriptions Are Your Routing Logic

The LLM chooses tools based on their **docstrings**. This means:
- Write detailed "when to use" instructions in docstrings.
- Write explicit "when NOT to use" guidance.
- Test with adversarial prompts (e.g., "What is the grievance procedure?" should NOT trigger grievance intake).

### Pattern 3: Human-in-the-Loop via Approval Mode

Some tools are decorated with `@tool(approval_mode="always_require")`:
- `submit_high_risk_changes` — legal name, bank details
- `create_grievance_case` — initiates a formal investigation

The AG-UI protocol pauses the stream and the frontend shows an approval card. The tool doesn't execute until the user explicitly approves. This is critical for enterprise HR — you never want accidental data mutations.

### Pattern 4: Generative UI (Gen UI)

The frontend doesn't have a hardcoded page for every workflow. Instead:
1. The backend emits AG-UI events (steps, tool calls, text).
2. `synthesizeUIState()` reads the events and **synthesizes** the right UI panel.
3. The UI components (`WorkdayFormPanel`, `GrievanceIntakePanel`, `ActionPlanView`, `CompletedView`) are generic — they render whatever data the synthesizer provides.

This means adding a new workflow (e.g., "PTO request") only requires:
1. Add a new tool in `tools.py`.
2. Add tool name to `TOOL_TO_STEP` mapping.
3. The existing Gen UI components handle the rest.

### Pattern 5: SSE Streaming for Real-Time UX

Users don't wait 10 seconds for a complete response. They see:
1. Tool calls appearing in the Orchestration panel in real-time.
2. Text being streamed word-by-word in the chat.
3. Gen UI panels appearing as soon as the relevant tool completes.

This is achieved via Server-Sent Events (SSE). The backend `yield`s events as they happen. The frontend `ReadableStream` reader processes them incrementally.

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| **Agentic Loop** | Pattern where an LLM repeatedly calls tools and feeds results back until it can give a final answer. |
| **AG-UI** | Agent-UI protocol. A standard for streaming agent events (steps, tool calls, text) over SSE. |
| **A2A** | Agent-to-Agent protocol (Google standard). Allows agents on different platforms to communicate. |
| **Tool Calling / Function Calling** | LLM capability where the model outputs a structured request to invoke a function, rather than text. |
| **System Prompt** | Hidden instructions sent to the LLM that define its behavior, role, and rules. |
| **Foundry IQ** | Microsoft service that indexes documents (e.g., SharePoint) and provides grounded QA over them. |
| **Azure AI Search** | Search service that powers the retrieval layer under Foundry IQ. |
| **FunctionTool** | Agent Framework class wrapping a `@tool`-decorated function. Provides `.name`, `.func`, `.to_json_schema_spec()`. |
| **Gen UI / Generative UI** | UI that is dynamically generated based on agent output, rather than hardcoded screens. |
| **SSE (Server-Sent Events)** | HTTP-based streaming protocol. Server pushes events to the client over a long-lived connection. |
| **Human-in-the-Loop (HITL)** | Pattern where the system pauses and waits for human approval before executing a sensitive action. |
| **RAG (Retrieval-Augmented Generation)** | Pattern where relevant documents are retrieved and injected into the LLM prompt to ground its answers. Foundry IQ handles this for us. |
| **Workday HCM** | Cloud-based human capital management system. We interact with its REST API for employee record updates. |
| **ASGI** | Asynchronous Server Gateway Interface. Python standard for async web apps. FastAPI + Uvicorn use this. |

---

*Created for the Agentic RFI HR Demo — a reference implementation of LLM-driven enterprise orchestration using Microsoft Agent Framework, Azure OpenAI, Foundry IQ, AG-UI, and ServiceNow A2A.*
