# Custom Engine Agent (CEA) — Deployment Architecture for M365

## Executive Summary

The HR Concierge deploys to Microsoft 365 as a **Custom Engine Agent (CEA)** — a Teams bot that registers in the M365 agent picker alongside Microsoft Copilot. The CEA itself is a **thin relay layer** (~50 lines of core logic) that receives user messages via Bot Framework, forwards them to a shared Python orchestration backend powered by the **Microsoft Agent Framework**, and renders structured responses as **Adaptive Cards** in Teams.

---

## 1. High-Level Deployment Topology

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        MICROSOFT 365 / TEAMS                                  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │               M365 Agent Picker / Teams Chat                            │  │
│  │                                                                         │  │
│  │   User selects "HR Concierge" from agent list                          │  │
│  │   Sends natural language message                                        │  │
│  └──────────────────────────────────┬──────────────────────────────────────┘  │
│                                     │                                         │
│                                     │ Bot Framework Activity                  │
│                                     │ (HTTPS + JWT)                           │
│                                     ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │             Azure Bot Service Registration                              │  │
│  │             (Microsoft.BotService/botServices)                          │  │
│  │                                                                         │  │
│  │   • Endpoint: https://{appDomain}/api/messages                         │  │
│  │   • Channel: MsTeamsChannel                                            │  │
│  │   • Auth: UserAssigned Managed Identity (MSI)                          │  │
│  │   • Scopes: copilot, personal, team                                    │  │
│  └──────────────────────────────────┬──────────────────────────────────────┘  │
│                                     │                                         │
└─────────────────────────────────────┼─────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AZURE APP SERVICE (Node.js)                                 │
│                    "HR Concierge CEA" — Thin Relay Bot                         │
│                                                                               │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  Express Server (port 3978)                                            │  │
│   │                                                                        │  │
│   │  POST /api/messages                                                    │  │
│   │    → JWT validation (authorizeJWT)                                     │  │
│   │    → CloudAdapter.process()                                            │  │
│   │    → AgentApplication.run()                                            │  │
│   │                                                                        │  │
│   │  Logic:                                                                │  │
│   │    1. Extract user text from Activity                                  │  │
│   │    2. Maintain conversation history (in-memory, last 20 messages)      │  │
│   │    3. Send typing indicator                                            │  │
│   │    4. POST to orchestrator /api/invoke                                 │  │
│   │    5. Parse response: { answer, reasoning, tool_calls[] }              │  │
│   │    6. Build Adaptive Cards from tool_calls                             │  │
│   │    7. Send combined response (text + cards + portal link)              │  │
│   └────────────────────────────────┬───────────────────────────────────────┘  │
│                                    │                                          │
│   SDK: @microsoft/agents-hosting   │   Runtime: Node.js 22                    │
│   Auth: UserAssigned MSI           │   SKU: App Service (B1+)                 │
└────────────────────────────────────┼──────────────────────────────────────────┘
                                     │
                                     │ POST /api/invoke (JSON)
                                     │ { message, conversation_id, history }
                                     │ Timeout: 90s
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              AZURE CONTAINER APPS — Orchestration Layer                        │
│              (hr-concierge-api.*.azurecontainerapps.io)                        │
│                                                                               │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │               FastAPI Server (Python)                                   │  │
│   │                                                                        │  │
│   │   ┌────────────────────────────────────────────────────────────────┐   │  │
│   │   │          Microsoft Agent Framework                              │   │  │
│   │   │                                                                │   │  │
│   │   │  Agent(                                                        │   │  │
│   │   │    chat_client = OpenAIChatCompletionClient(GPT-4o),           │   │  │
│   │   │    instructions = HR_CONCIERGE_PROMPT,                         │   │  │
│   │   │    tools = [14 tool functions],                                │   │  │
│   │   │    context_providers = [SkillsProvider],                       │   │  │
│   │   │    default_options = {"temperature": 0.3}                      │   │  │
│   │   │  )                                                             │   │  │
│   │   │                                                                │   │  │
│   │   │  Tool-calling loop (max 10 iterations):                        │   │  │
│   │   │    LLM → tool_calls? → execute → feed back → repeat           │   │  │
│   │   └────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                        │  │
│   │   Returns: { answer, reasoning, tool_calls[] }                         │  │
│   └────────────────────────────────┬───────────────────────────────────────┘  │
│                                    │                                          │
└────────────────────────────────────┼──────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
   ┌───────────────────┐  ┌──────────────────┐  ┌───────────────────┐
   │  Azure AI Search  │  │   ServiceNow     │  │   Workday HCM     │
   │  (SharePoint KB)  │  │   (A2A Protocol) │  │   (REST API)      │
   └───────────────────┘  └──────────────────┘  └───────────────────┘
```

---

## 2. What Makes It a "Custom Engine Agent"

A **Custom Engine Agent** (CEA) is a Teams bot that:

1. **Uses its own AI engine** — not Microsoft Copilot's LLM. The agent brings its own orchestration (here: Azure OpenAI GPT-4o via Microsoft Agent Framework)
2. **Registers in the M365 agent picker** — appears alongside Copilot and other agents via the `copilotAgents.customEngineAgents` manifest entry
3. **Speaks Bot Framework protocol** — standard `/api/messages` endpoint receiving Activity objects

The critical manifest declaration that makes this a CEA:

```json
{
  "copilotAgents": {
    "customEngineAgents": [
      {
        "type": "bot",
        "id": "${{BOT_ID}}"
      }
    ]
  },
  "bots": [
    {
      "botId": "${{BOT_ID}}",
      "scopes": ["copilot", "personal", "team"]
    }
  ]
}
```

The `"copilot"` scope in the bot's scopes array + the `copilotAgents` block is what elevates a standard Teams bot to a Custom Engine Agent visible in the M365 Chat agent picker.

---

## 3. The "Thin Layer" Pattern

### Why the CEA is Thin

The CEA bot contains **zero business logic, zero AI reasoning, and zero tool implementations**. Its entire job:

| Step | What Happens | Lines of Code |
|------|-------------|---------------|
| 1 | Receive Bot Framework Activity | Framework handles |
| 2 | Extract `context.activity.text` | 1 line |
| 3 | Maintain conversation history array | ~10 lines |
| 4 | `fetch(orchestratorUrl + "/api/invoke", { body: { message, history } })` | 5 lines |
| 5 | Parse JSON response `{ answer, reasoning, tool_calls }` | 1 line |
| 6 | Map tool_calls → Adaptive Card form builders | ~15 lines |
| 7 | Send Activity with text + card attachments | 5 lines |

**Total core logic: ~50 lines.** Everything else is card template definitions.

### Architecture Principle

```
┌─────────────────────────────────────────────────┐
│         "THE THIN RELAY PATTERN"                 │
│                                                  │
│   CEA Bot = Transport Adapter                    │
│                                                  │
│   • Converts Bot Framework Activities            │
│     → HTTP POST to orchestrator                  │
│                                                  │
│   • Converts orchestrator JSON response          │
│     → Adaptive Cards + text in Teams             │
│                                                  │
│   • NO intent classification                     │
│   • NO prompt engineering                        │
│   • NO tool execution                            │
│   • NO state management beyond chat history      │
│                                                  │
│   All intelligence lives in the orchestrator.    │
└─────────────────────────────────────────────────┘
```

This means you can swap, upgrade, or replace the orchestrator without touching the Teams deployment. The bot is a "dumb pipe" with a pretty UI layer (Adaptive Cards).

---

## 4. Microsoft Agent Framework — How the Orchestrator Works

The backend uses the **Microsoft Agent Framework** Python SDK (`agent_framework` package):

```python
from agent_framework import Agent, SkillsProvider
from agent_framework_openai import OpenAIChatCompletionClient

hr_concierge = Agent(
    chat_client=OpenAIChatCompletionClient(model="gpt-4o", ...),
    instructions=HR_CONCIERGE_PROMPT,     # System prompt with routing logic
    tools=TOOLS,                           # 14 registered tool functions
    context_providers=[skills_provider],   # File-based skill packages
    default_options={"temperature": 0.3},  # Deterministic output
)
```

### Agent Framework Responsibilities

| Capability | How It Works |
|-----------|-------------|
| **Tool-calling loop** | Detects `finish_reason: tool_calls` from LLM, executes functions, feeds results back, loops until `finish_reason: stop` (max 10 iterations) |
| **Parallel tool execution** | Multiple tool calls in a single LLM turn are executed concurrently |
| **AG-UI streaming** | Built-in SSE endpoint for real-time UIs (used by React web app, not CEA) |
| **Skills Provider** | Loads file-based skill packages (e.g., expense validation scripts) as additional context |
| **Approval gates** | Tools marked `approval_mode="always_require"` emit interrupt events |

### Two Consumption Patterns

| Endpoint | Protocol | Consumer | Behavior |
|----------|----------|----------|----------|
| `POST /api/agent` | AG-UI (SSE stream) | React Web App | Streaming tokens + events in real-time |
| `POST /api/invoke` | JSON request/response | **CEA Bot** | Synchronous — full loop completes, returns final structured result |

The CEA uses `/api/invoke` because Bot Framework doesn't support streaming — it needs a complete response to render as a single Activity.

---

## 5. Adaptive Cards — Rich UI in Teams

When the orchestrator returns tool call results, the CEA maps them to pre-built Adaptive Card templates:

### Card Mapping Logic

```typescript
// Tool call → Adaptive Card form
const workdayFormBuilders: Record<string, () => object> = {
  "name-change":       buildNameChangeFormCard,
  "address-change":    buildAddressChangeFormCard,
  "bank-details":      buildBankDetailsFormCard,
  "emergency-contact": buildEmergencyContactFormCard,
  "marriage":          buildMarriageFormCard,
  "beneficiary-update": buildBeneficiaryFormCard,
  "new-baby":          buildNewBabyFormCard,
};

// Additional tool → card mappings
"create_grievance_case"  → buildGrievanceIntakeFormCard()
"submit_expense_report"  → buildExpenseReportFormCard()
```

### What Gets Rendered

A typical CEA response includes:

```
┌─────────────────────────────────────────────────────────────┐
│  **🧠 Orchestrator reasoning:**                              │
│  Category: Life Event — Marriage                             │
│  Risk: Medium (benefits + name change)                       │
│  Plan: Load schemas → assess risk → present forms            │
│                                                              │
│  **⚡ Tools executed:**                                      │
│  - 📄 Loading Form Schema *(change_types_csv: marriage,...)*│
│  - ⚠️ Assessing Risk & Compliance *(change: marriage)*      │
│  - 🗺️ Building Impact Map *(scope: benefits,payroll)*       │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  Congratulations! Here's what we need to update...           │
│                                                              │
│  ┌─── Adaptive Card: Marriage Form ──────────────────────┐  │
│  │ 💍 Marriage / Domestic Partnership                     │  │
│  │                                                        │  │
│  │ Partner's Legal Name: [____________]                   │  │
│  │ Marriage Date:        [____/____/____]                 │  │
│  │ Marriage Certificate: [Upload]                         │  │
│  │                                                        │  │
│  │             [ Submit Marriage Update ]                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─── Hero Card ─────────────────────────────────────────┐  │
│  │              [ Open HR Policy Web ]                     │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Adaptive Card Types

| Card | Trigger | Purpose |
|------|---------|---------|
| Name Change Form | `get_workday_form_schema(change_types_csv: "name-change")` | Collect legal name, reason, effective date, supporting docs |
| Address Change Form | `get_workday_form_schema(change_types_csv: "address-change")` | Collect new address fields |
| Bank Details Form | `get_workday_form_schema(change_types_csv: "bank-details")` | Routing number, account number (high-risk) |
| Emergency Contact Form | `get_workday_form_schema(change_types_csv: "emergency-contact")` | Contact name, relationship, phone |
| Marriage Form | `get_workday_form_schema(change_types_csv: "marriage")` | Partner name, date, certificate |
| Beneficiary Form | `get_workday_form_schema(change_types_csv: "beneficiary-update")` | Beneficiary details, allocation |
| New Baby Form | `get_workday_form_schema(change_types_csv: "new-baby")` | Child name, DOB, benefits enrollment |
| Grievance Intake | `create_grievance_case` or `structure_narrative` | Incident details, dates, witnesses |
| Expense Report | `submit_expense_report` | Line items, amounts, categories, receipts |
| Thinking Card | During processing | Animated "thinking" indicator |
| Tool Call Card | Each tool execution | Shows which backend system is being queried |
| Hero Card (Portal Link) | Every response | Button linking to full HR Policy Web portal |

---

## 6. Deployment Pipeline

### Infrastructure Provisioning (Bicep via M365 Agents Toolkit)

The `m365agents.yml` orchestrates provisioning:

```yaml
provision:
  - uses: teamsApp/create                    # Register app in Developer Portal
  - uses: arm/deploy                          # Deploy Azure infrastructure
  - uses: teamsApp/zipAppPackage             # Build app manifest package
  - uses: teamsApp/validateAppPackage        # Validate manifest schema
  - uses: teamsApp/update                    # Push to Developer Portal
  - uses: teamsApp/extendToM365             # Enable in M365 agent picker
```

### Azure Resources Created (Bicep)

```
┌─────────────────────────────────────────────────────────────┐
│                    Resource Group                             │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  User-Assigned Managed Identity                        │  │
│  │  (Microsoft.ManagedIdentity/userAssignedIdentities)    │  │
│  │                                                        │  │
│  │  → clientId (becomes BOT_ID)                          │  │
│  │  → tenantId                                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  App Service Plan                                      │  │
│  │  (Microsoft.Web/serverfarms)                           │  │
│  │                                                        │  │
│  │  → SKU: B1 (configurable)                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Azure App Service (Web App)                           │  │
│  │  (Microsoft.Web/sites)                                 │  │
│  │                                                        │  │
│  │  → Node.js 22 runtime                                 │  │
│  │  → HTTPS only                                         │  │
│  │  → Runs from package (WEBSITE_RUN_FROM_PACKAGE=1)     │  │
│  │  → Managed Identity attached                          │  │
│  │  → Exposes: https://{name}.azurewebsites.net          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Azure Bot Service Registration                        │  │
│  │  (Microsoft.BotService/botServices)                    │  │
│  │                                                        │  │
│  │  → kind: azurebot                                     │  │
│  │  → endpoint: https://{appDomain}/api/messages         │  │
│  │  → msaAppType: UserAssignedMSI                        │  │
│  │  → Channel: MsTeamsChannel                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Application Deployment

```yaml
deploy:
  - uses: cli/runNpmCommand          # npm install
  - uses: cli/runNpmCommand          # npm run build (TypeScript → JS)
  - uses: azureAppService/zipDeploy  # Zip deploy to App Service
```

### Container Alternative (Docker)

For Azure Container Apps deployment:

```dockerfile
FROM node:20-alpine AS build
COPY . .
RUN npm ci && tsc --build

FROM node:20-alpine
COPY --from=build /app/lib ./lib
EXPOSE 3978
CMD ["node", "lib/src/index.js"]
```

---

## 7. Authentication & Security Flow

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│  User   │         │  Teams /     │         │  Bot Service │         │  CEA App    │
│  (M365) │         │  M365 Chat   │         │  (Azure)     │         │  Service    │
└────┬────┘         └──────┬───────┘         └──────┬───────┘         └──────┬──────┘
     │                     │                        │                        │
     │  Sign in (Entra ID) │                        │                        │
     │────────────────────►│                        │                        │
     │                     │                        │                        │
     │  Send message       │                        │                        │
     │────────────────────►│                        │                        │
     │                     │  Activity + JWT token  │                        │
     │                     │───────────────────────►│                        │
     │                     │                        │                        │
     │                     │                        │  Forward Activity      │
     │                     │                        │  + JWT (audience=botId)│
     │                     │                        │───────────────────────►│
     │                     │                        │                        │
     │                     │                        │         authorizeJWT() │
     │                     │                        │         validates:     │
     │                     │                        │         - issuer       │
     │                     │                        │         - audience     │
     │                     │                        │         - signature    │
     │                     │                        │                        │
     │                     │                        │         CloudAdapter   │
     │                     │                        │         processes      │
     │                     │                        │◄───────────────────────│
     │                     │◄───────────────────────│         Response       │
     │◄────────────────────│                        │                        │
     │   Adaptive Cards    │                        │                        │
```

**Key security properties:**
- **No password/secret stored in the bot** — uses User-Assigned Managed Identity (MSI)
- **JWT validation** on every incoming request via `authorizeJWT(authConfig)`
- **HTTPS only** — enforced at App Service level
- **Bot-to-orchestrator** call uses internal Azure networking (Container Apps)

---

## 8. How the Agent Appears in M365

### Registration Path

1. **teamsApp/create** — Registers the app in Teams Developer Portal
2. **teamsApp/extendToM365** — Extends visibility to the M365 Chat agent picker
3. Manifest declares `copilotAgents.customEngineAgents[].type = "bot"` with bot scopes including `"copilot"`

### User Experience

```
┌───────────────────────────────────────────────────┐
│  M365 Chat / Teams                                 │
│                                                    │
│  Agent Picker:                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🤖 Microsoft Copilot                        │  │
│  │ 🟣 HR Concierge         ← Custom Engine Agent│  │
│  │ 📊 Sales Agent                              │  │
│  │ ...                                          │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  User selects "HR Concierge" →                     │
│  Enters personal chat with the CEA bot             │
│  All messages routed to /api/messages              │
│                                                    │
│  Available commands:                               │
│  • "How can you help me?"                         │
│  • "I need to change my legal name"              │
│  • "I just got married"                          │
│  • "I'm having a baby"                           │
│  • "File a grievance"                            │
│  • "Submit expense report"                       │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

## 9. End-to-End Request Flow (Example: "I just got married")

```
1. USER types "I just got married" in Teams → HR Concierge agent

2. TEAMS sends Activity to Azure Bot Service
   { type: "message", text: "I just got married", conversation: { id: "..." } }

3. BOT SERVICE forwards to App Service endpoint
   POST https://{domain}/api/messages (with JWT)

4. CEA BOT (index.ts):
   - authorizeJWT validates the token ✓
   - CloudAdapter deserializes Activity
   - AgentApplication routes to message handler

5. CEA BOT (agent.ts):
   - Extracts text: "I just got married"
   - Appends to conversation history
   - Sends typing indicator
   - Calls orchestrator:
     POST https://hr-concierge-api.*.azurecontainerapps.io/api/invoke
     Body: { message: "I just got married", conversation_id: "...", history: [...] }

6. ORCHESTRATOR (Microsoft Agent Framework):
   - Agent receives message + history
   - LLM classifies intent: "Life Event — Marriage"
   - LLM requests tools: get_workday_form_schema, assess_risk_and_compliance, build_impact_map
   - Framework executes tools in parallel
   - LLM synthesizes final answer with guidance
   - Returns:
     {
       "answer": "Congratulations! A marriage triggers several updates...",
       "reasoning": "Category: Life Event. Sub-type: Marriage. Risk: Medium...",
       "tool_calls": [
         { "name": "get_workday_form_schema", "arguments": { "change_types_csv": "marriage,name-change,beneficiary-update" }, "result": "..." },
         { "name": "assess_risk_and_compliance", "arguments": { "change": "marriage" }, "result": "..." },
         { "name": "build_impact_map", "arguments": { "scope": "benefits,payroll,identity" }, "result": "..." }
       ]
     }

7. CEA BOT renders response:
   - Builds reasoning text: "🧠 Orchestrator reasoning: ..."
   - Builds tool badges: "⚡ Tools executed: 📄 Loading Form Schema → ⚠️ Assessing Risk..."
   - Maps tool_calls to Adaptive Cards:
     • get_workday_form_schema("marriage") → buildMarriageFormCard()
     • get_workday_form_schema("name-change") → buildNameChangeFormCard()
     • get_workday_form_schema("beneficiary-update") → buildBeneficiaryFormCard()
   - Attaches Hero Card with "Open HR Policy Web" button
   - Sends single Activity with text + 4 card attachments

8. USER sees in Teams:
   - Reasoning trace (what the agent thought)
   - Tool execution badges (which systems were queried)
   - Marriage form (Adaptive Card with input fields)
   - Name change form (Adaptive Card)
   - Beneficiary update form (Adaptive Card)
   - Link to HR Portal for full details
```

---

## 10. Local Development & Testing

### Agents Playground (Local)

```yaml
# m365agents.playground.yml
deploy:
  - uses: devTool/install       # Install local test tool
  - uses: cli/runNpmCommand     # npm install
  - uses: file/createOrUpdateEnvironmentFile  # Generate .localConfigs.playground
```

Run: `npm run dev:teamsfx:playground` → Opens local Agents Playground for testing without Azure deployment.

### Local with Bot Framework Emulator

```yaml
# m365agents.local.yml
provision:
  - uses: aadApp/create         # Create Entra app registration
  - uses: botFramework/create   # Register bot with dev.botframework.com
  - uses: teamsApp/zipAppPackage
  - uses: teamsApp/update
```

Run: `npm run dev:teamsfx` → Local Express server at `localhost:3978`, tunneled via dev tunnel.

---

## 11. Summary — Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **CEA as thin relay** | Zero business logic in the bot = one orchestrator serves all surfaces (web, Teams, Copilot) |
| **Custom Engine Agent (not Declarative)** | Full control over AI engine, tool execution, and response formatting |
| **Adaptive Cards for forms** | Native Teams rich UI — input fields, dropdowns, date pickers, submit actions |
| **Microsoft Agent Framework backend** | Automatic tool-calling loop, parallel execution, skills system, AG-UI streaming |
| **User-Assigned Managed Identity** | No secrets to manage, passwordless auth between Bot Service and App Service |
| **`/api/invoke` sync endpoint** | Bot Framework needs complete response (no streaming) — separate from AG-UI SSE endpoint |
| **Conversation history in-memory** | Lightweight for demo; production would use Redis/Cosmos DB |
| **`teamsApp/extendToM365`** | Makes the bot visible in M365 Chat agent picker, not just Teams |
