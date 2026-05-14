# HR Concierge — Multi-Agent Demo

> **Enterprise-grade multi-agent HR assistant** built on **Microsoft Agent Framework** with **AG-UI protocol**, **ServiceNow A2A** integration, and **M365 Copilot** surface — designed for executive demos.

![Architecture](docs/architecture/architecture-diagram.svg)

---

## ✨ What This Demonstrates

| Capability | Implementation |
|---|---|
| **Multi-Agent Orchestration** | 8 specialized agents with handoff-based workflow via Microsoft Agent Framework |
| **AG-UI Protocol** | Real-time SSE streaming with adaptive generative UI |
| **Human-in-the-Loop** | Approval checkpoints for high-risk changes (banking, legal name) |
| **ServiceNow A2A** | Live integration for knowledge search & incident management |
| **SharePoint / Foundry IQ** | Policy document grounding via Graph connectors |
| **M365 Copilot** | Declarative agent manifest for in-Copilot experience |
| **Adaptive Generative UI** | Stage-aware UI that transforms based on workflow progress |

---

## 🎯 Two Flagship Use Cases

### 1. Personal Data Change / Life Event Concierge
An employee reports a life event (marriage, move, new baby) and the system:
- Classifies all affected data fields
- Retrieves relevant HR policies
- Assesses risk & compliance requirements
- Auto-executes low-risk changes
- Routes high-risk changes through human approval
- Generates an audit trail and completion summary

### 2. Grievance Filter-First
An employee describes a workplace issue and the system:
- Classifies the grievance type and severity
- Structures the narrative with key facts
- Identifies missing information
- Creates a case draft for HR review
- Routes to the appropriate department

---

## 🏗 Architecture

```
┌─────────────────────────────┐  ┌────────────────────┐  ┌──────────────────────┐
│  React Web App (Vite)       │  │  Copilot Chat /    │  │  M365 Copilot Agent  │
│  ─ Adaptive Generative UI   │  │  Copilot Studio    │  │  ─ Declarative Agent │
│  ─ AG-UI SSE Streaming      │  │  ─ Orchestration   │  │  ─ API Plugin        │
│  ─ Chat + Orchestration     │  │  ─ Tool Selection  │  │  ─ Graph Connectors  │
│         Panel               │  │  ─ MCP App UI      │  │                      │
└─────────┬───────────────────┘  └────────┬───────────┘  └──────────┬───────────┘
          │                               │                          │
          │ SSE (AG-UI Protocol)          │ MCP Protocol             │ REST
          ▼                               ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────────┐  │
│  │  FastAPI Backend        │  │  MCP Server (Node.js/TypeScript)             │  │
│  │  ─ AG-UI endpoint      │  │  ─ 11 HR tools (MCP tool declarations)       │  │
│  │  ─ Tool REST API       │◄─┤  ─ 4 UI resources (interactive HTML)         │  │
│  │  ─ Agent Framework     │  │  ─ StreamableHTTP transport                  │  │
│  └─────────────────────────┘  └──────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  Microsoft Agent Framework Workflow                                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐              │    │
│  │  │Orchestr. │→│ Intent   │→│ Policy       │→│  Risk    │              │    │
│  │  │  Agent   │ │Classifier│ │  Advisor     │ │Assessor  │              │    │
│  │  └──────────┘ └──────────┘ └──────────────┘ └──────────┘              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐ ┌──────────────────┐     │    │
│  │  │ Action   │→│  Summary │ │  Grievance    │ │  Narrative       │     │    │
│  │  │Executor  │ │Generator │ │  Classifier   │ │  Structurer      │     │    │
│  │  └──────────┘ └──────────┘ └───────────────┘ └──────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────────────────┐                          │
│  │ ServiceNow A2A  │  │ SharePoint / Foundry IQ     │                          │
│  │ ─ Knowledge     │  │ ─ Policy Document Grounding │                          │
│  │ ─ Incidents     │  │ ─ Graph Connector           │                          │
│  └─────────────────┘  └─────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Team

| # | Agent | Role |
|---|---|---|
| 1 | **Orchestrator** | Routes requests, coordinates handoffs |
| 2 | **Intent Classifier** | Detects life event types, affected fields |
| 3 | **Policy Advisor** | Retrieves & interprets HR policies |
| 4 | **Risk Assessor** | Evaluates compliance risk per change |
| 5 | **Action Executor** | Applies changes (self-service or approval) |
| 6 | **Summary Generator** | Creates audit trail & completion report |
| 7 | **Grievance Classifier** | Categorizes grievance type & severity |
| 8 | **Narrative Structurer** | Structures facts, identifies gaps, drafts case |

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- Azure OpenAI or OpenAI API key (optional — runs in mock mode without)
- ServiceNow instance (optional — mock data available)

### 1. Backend

```bash
cd services/orchestration
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Copy and configure environment
cp ../../.env.example .env
# Edit .env with your credentials (or leave defaults for mock mode)

uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open **http://localhost:5173** → the web app proxies `/api` to `localhost:8000`.

### 3. MCP Server (Copilot Chat Integration)

```bash
cd services/mcp-server
npm install
npm run build
npm start
```

The MCP server runs on **http://localhost:3001** and exposes all 11 HR tools as MCP tools with 4 interactive UI resources for Copilot Chat.

**Connecting to Copilot Studio / M365 Copilot:**
1. In VS Code, use M365 Agents Toolkit → "Add an Action" → "Start with an MCP Server"
2. Provide MCP Server URL: `https://hr-concierge-mcp.whiteglacier-f04ad88c.eastus2.azurecontainerapps.io/mcp`
3. Copilot Studio orchestrates tool selection; the MCP Server returns interactive UI resources inline

### 4. M365 Copilot (Optional)

See [apps/m365-copilot/README.md](apps/m365-copilot/README.md) for setup instructions.

---

## 🎬 Demo Script

See [docs/demo-script/demo-guide.md](docs/demo-script/demo-guide.md) for a detailed walkthrough.

**Quick demo flow:**

1. Open the web app → impressive landing page with agent architecture visualization
2. Click "Life Event Concierge" → choose the marriage/name change prompt
3. Watch the multi-agent orchestration in real-time:
   - Chat panel shows streaming responses with agent handoffs
   - Center panel transforms through stages (Intake → Triage → Action Plan → Review → Completed)
   - Right panel shows live orchestration events, tool calls, and audit timeline
4. When the approval card appears, click "Approve" to simulate human-in-the-loop
5. Switch to "Grievance" scenario to show the filter-first flow
6. Toggle dark/light mode, collapse panels to show responsive UX

---

## 📁 Project Structure

```
AgenticRFIHRDemo/
├── apps/
│   ├── web/                        # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── adaptive/       # Stage-aware adaptive UI views
│   │   │   │   ├── chat/           # Chat panel with markdown
│   │   │   │   └── panels/         # Orchestration & prompt panels
│   │   │   ├── hooks/              # useAgentStream, useTheme
│   │   │   ├── pages/              # HomePage, WorkspacePage
│   │   │   └── types/              # TypeScript interfaces
│   │   └── package.json
│   └── m365-copilot/               # M365 Copilot declarative agent
│       └── appPackage/
├── services/
│   ├── orchestration/              # FastAPI + Agent Framework backend
│   │   ├── agents/                 # Agent definitions & tools
│   │   ├── integrations/           # ServiceNow A2A, SharePoint
│   │   ├── models/                 # Pydantic models (UI state, domain)
│   │   └── main.py                 # FastAPI app with AG-UI endpoint
│   └── mcp-server/                 # MCP Server for Copilot Chat
│       ├── src/index.ts            # MCP tool + resource declarations
│       ├── ui-resources/           # MCP App UI HTML pages
│       ├── Dockerfile
│       └── package.json
├── docs/
│   ├── architecture/
│   └── demo-script/
├── .env.example
└── README.md
```

---

## 🔧 Configuration

All configuration is via environment variables. See [.env.example](.env.example) for the full list.

| Variable | Required | Description |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | For live mode | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_API_KEY` | For live mode | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | For live mode | Model deployment name |
| `SERVICENOW_INSTANCE` | For ServiceNow | ServiceNow instance URL |
| `SERVICENOW_CLIENT_ID` | For ServiceNow | OAuth client ID |
| `SERVICENOW_CLIENT_SECRET` | For ServiceNow | OAuth client secret |

Without these, the app runs in **mock mode** with comprehensive seeded responses.

---

## 🛡 Key Technical Features

- **AG-UI Protocol**: Server-Sent Events streaming with typed events (RUN_STARTED, STEP_STARTED, TEXT_MESSAGE_*, TOOL_CALL_*, CUSTOM, RUN_FINISHED)
- **MCP Server**: Exposes all HR tools via Model Context Protocol for Copilot Chat / Copilot Studio integration with interactive UI resources
- **Adaptive Generative UI**: Five distinct screen types that transform based on workflow stage
- **Impact Map**: Visual dependency graph showing which systems are affected by each change
- **Approval Cards**: Human-in-the-loop with risk-rated approval workflows
- **Audit Timeline**: Complete event log for compliance tracking
- **Dark/Light Theme**: Full theme support with smooth transitions
- **Mock Mode**: Complete demo functionality without external dependencies

---

## ☁️ Azure Deployment

All three services are deployed as Azure Container Apps in resource group `rg-hr-concierge-demo` (East US 2):

| Service | URL | Image |
|---|---|---|
| Backend API | `https://hr-concierge-api.whiteglacier-f04ad88c.eastus2.azurecontainerapps.io` | `hrconciergeacr048757.azurecr.io/hr-concierge-api:v3` |
| Web Frontend | `https://hr-concierge-web.whiteglacier-f04ad88c.eastus2.azurecontainerapps.io` | `hrconciergeacr048757.azurecr.io/hr-concierge-web:v3` |
| MCP Server | `https://hr-concierge-mcp.whiteglacier-f04ad88c.eastus2.azurecontainerapps.io` | `hrconciergeacr048757.azurecr.io/hr-concierge-mcp:v1` |

**Login credentials:** Sanjeev Nair / demo123

---

## License

This project is provided as a demo application. See your organization's licensing terms.
