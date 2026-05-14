# Copilot Studio + M365 Chat Deployment Guide

> End-to-end guide to connecting the HR Concierge MCP Server to Copilot Studio, creating an agentic app with additional agents, and deploying it to M365 Chat.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Connect HR Concierge MCP Server to Copilot Studio](#part-1-connect-hr-concierge-mcp-server-to-copilot-studio)
4. [Part 2: Create a Multi-Agent App in Copilot Studio](#part-2-create-a-multi-agent-app-in-copilot-studio)
5. [Part 3: Deploy to M365 Chat](#part-3-deploy-to-m365-chat)
6. [Part 4: Alternative — Declarative Agent via M365 Agents Toolkit](#part-4-alternative--declarative-agent-via-m365-agents-toolkit)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Microsoft 365 Chat (BizChat)                                       │
│  ─ User interface for employees                                     │
│  ─ Selects the published agent from the agent picker                │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Copilot Studio — Orchestration Layer                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │ HR Concierge   │  │ IT Help Desk   │  │ Facilities Agent   │    │
│  │ (MCP Server)   │  │ (MCP / Plugin) │  │ (Plugin / Topic)   │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────────┘    │
└──────────┼────────────────────┼───────────────────┼─────────────────┘
           │ MCP Protocol       │                   │
           ▼                    ▼                   ▼
┌──────────────────┐  ┌─────────────────┐  ┌────────────────────┐
│ HR MCP Server    │  │  IT Backend     │  │  Facilities API    │
│ (Azure Ctnr App) │  │                 │  │                    │
│ → FastAPI Backend│  │                 │  │                    │
└──────────────────┘  └─────────────────┘  └────────────────────┘
```

**Key Concept**: Copilot Studio acts as the **orchestration layer** that routes employee requests to the right agent. The HR Concierge MCP Server is one of potentially many agents registered in the Copilot Studio app.

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Microsoft 365 Copilot license** | E3/E5 + Copilot add-on, or M365 Copilot standalone |
| **Copilot Studio license** | Included with M365 Copilot or standalone Copilot Studio license |
| **Admin consent** | Global Admin or Teams Admin to approve the app for your tenant |
| **MCP Server deployed** | `https://<your-mcp-app>.azurecontainerapps.io` |
| **Backend API deployed** | `https://<your-api-app>.azurecontainerapps.io` |
| **Node.js 20+** | For local development with M365 Agents Toolkit |
| **VS Code** | With M365 Agents Toolkit extension installed |

---

## Part 1: Connect HR Concierge MCP Server to Copilot Studio

### Step 1.1: Open Copilot Studio

1. Navigate to **https://copilotstudio.microsoft.com**
2. Select your target environment (Production or Sandbox)
3. Click **"Create"** in the left nav → **"New agent"**

### Step 1.2: Create the HR Concierge Agent

1. **Name**: `HR Concierge`
2. **Description**: `AI-powered HR assistant that handles life events, personal data changes, and workplace grievances with human-in-the-loop approvals.`
3. **Instructions** (paste the following):

```
You are an expert HR Concierge agent. You help employees navigate complex HR processes including:
- Life events (marriage, address change, name change, banking updates)
- Personal data changes in Workday
- Workplace grievance filings

Workflow for life events / data changes:
1. Identify all changes needed from the employee's description
2. Use query_knowledge_base to find relevant policies
3. Use assess_risk_and_compliance to evaluate each change
4. For low-risk: use execute_self_service_changes
5. For high-risk (banking, legal name): use submit_high_risk_changes (requires approval)
6. Use generate_completion_summary to provide the employee a completion report

Workflow for grievances:
1. Use create_grievance_case to classify and structure the issue
2. Use structure_narrative to organize key facts
3. Present the case draft for HR review

Always be empathetic and professional. Cite HR policies when applicable.
When a tool returns UI resource metadata (_meta.ui.resourceUri), acknowledge the interactive form is being displayed.
```

4. Click **"Create"**

### Step 1.3: Add the MCP Server as an Action

1. In your new agent, go to **"Actions"** tab in the left panel
2. Click **"+ Add an action"**
3. Select **"MCP Server"** (under Connectors section)
4. Enter the MCP Server URL:
   ```
   https://<your-mcp-app>.azurecontainerapps.io/mcp
   ```
5. Click **"Connect"** — Copilot Studio will discover all 11 tools automatically:

   | Tool | Description |
   |---|---|
   | `query_knowledge_base` | Search HR policies and knowledge |
   | `retrieve_policy_guidance` | Get detailed policy guidance |
   | `assess_risk_and_compliance` | Evaluate risk of proposed changes |
   | `build_impact_map` | Map affected systems and dependencies |
   | `submit_high_risk_changes` | Route sensitive changes for approval |
   | `execute_self_service_changes` | Apply low-risk changes automatically |
   | `generate_completion_summary` | Create audit trail and summary |
   | `structure_narrative` | Organize facts for grievance cases |
   | `create_grievance_case` | File a new grievance case |
   | `update_workday_employee` | Update employee data in Workday |
   | `get_workday_form_schema` | Get form fields for a change type |

6. Click **"Add"** to confirm

### Step 1.4: Configure Authentication (Optional but Recommended)

For production use, configure OAuth2 authentication:

1. In the MCP action settings, click **"Authentication"**
2. Select **"OAuth 2.0"**
3. Configure:
   - **Authority**: `https://login.microsoftonline.com/{tenant-id}`
   - **Client ID**: Your app registration client ID
   - **Scope**: `api://{app-id}/.default`
4. This ensures only authenticated users in your tenant can invoke HR tools

> **Note**: The demo deployment currently uses no authentication. For production, add Entra ID authentication to the MCP server's Azure Container App (see [Azure Docs: Container Apps Authentication](https://learn.microsoft.com/azure/container-apps/authentication)).

### Step 1.5: Add Conversation Starters

In the **"Settings"** → **"Conversation starters"** section:

1. `I recently got married and need to update my legal name, tax withholdings, and add my spouse to benefits.`
2. `I moved to a new state and need to update my address, direct deposit, and emergency contact.`
3. `My manager has been excluding me from important meetings and I feel I'm being treated unfairly.`
4. `I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details.`

### Step 1.6: Test in Copilot Studio

1. Click **"Test"** in the top-right corner
2. Try: `I just got married and need to change my last name`
3. Verify:
   - The agent calls `query_knowledge_base` first
   - Then calls `assess_risk_and_compliance`
   - Responds with policy-grounded guidance
   - High-risk changes are flagged for approval

---

## Part 2: Create a Multi-Agent App in Copilot Studio

You can compose multiple agents into a single Copilot Studio app so employees have one unified assistant.

### Step 2.1: Design the Agent Topology

| Agent | Purpose | Source |
|---|---|---|
| **HR Concierge** | Life events, data changes, grievances | MCP Server (already configured) |
| **IT Help Desk** | Password resets, device issues, access requests | New MCP Server or API Plugin |
| **Facilities** | Room bookings, parking, building access | Topics or Power Automate flows |
| **Learning & Development** | Training enrollment, certifications | Connector/Plugin |

### Step 2.2: Create the Parent Orchestrator Agent

1. In Copilot Studio, click **"Create"** → **"New agent"**
2. **Name**: `Employee Concierge`
3. **Description**: `Unified employee assistant covering HR, IT, Facilities, and Learning`
4. **Instructions**:

```
You are the Employee Concierge — a unified assistant for all employee needs.
Route requests to the appropriate specialist agent:

- HR-related (life events, personal data, payroll, benefits, grievances) → Use HR Concierge tools
- IT-related (password, hardware, software, access, VPN) → Use IT Help Desk tools
- Facilities (rooms, parking, building) → Use Facilities tools
- Learning (training, courses, certifications) → Use Learning tools

If unclear which domain, ask the employee to clarify.
Always be empathetic and professional.
```

### Step 2.3: Add Multiple Actions

Add each agent as a separate action:

**HR Concierge (MCP Server):**
- Type: MCP Server
- URL: `https://<your-mcp-app>.azurecontainerapps.io/mcp`

**IT Help Desk (example — API Plugin):**
- Type: API Plugin (OpenAPI)
- Upload/reference an OpenAPI spec for your IT ticketing system

**Facilities (example — Power Automate):**
- Type: Power Automate flow
- Connect to flows like "Book Room", "Request Parking Permit"

**Learning (example — Connector):**
- Type: Connector
- Use a pre-built connector (e.g., LinkedIn Learning, SAP SuccessFactors)

### Step 2.4: Add Topics for Routing (Optional)

Topics provide deterministic routing for known patterns:

1. Go to **"Topics"** tab
2. Create topic: **"HR Routing"**
   - Trigger phrases: "marriage", "name change", "payroll", "grievance", "benefits", "PTO"
   - Action: Call HR Concierge MCP tools
3. Create topic: **"IT Routing"**
   - Trigger phrases: "password reset", "laptop", "VPN", "access request"
   - Action: Call IT Help Desk tools
4. Create topic: **"Fallback"**
   - Use generative AI with all actions available (let the model decide)

### Step 2.5: Configure Knowledge Sources

1. Go to **"Knowledge"** tab
2. Click **"+ Add knowledge"**
3. Options:
   - **SharePoint sites**: Add your HR policy docs, IT wiki, Facilities handbook
   - **Web URLs**: Public documentation pages
   - **Files**: Upload PDFs of employee handbooks
   - **Dataverse**: Connect to structured data

This grounds the orchestrator's responses in your actual organizational content.

---

## Part 3: Deploy to M365 Chat

### Step 3.1: Publish the Agent

1. In Copilot Studio, open your agent (HR Concierge or Employee Concierge)
2. Click **"Publish"** in the top-right
3. Select **"Publish to Microsoft 365 Copilot"**
4. Review the summary and click **"Publish"**

### Step 3.2: Admin Approval

An admin must approve the agent for your tenant:

1. Go to **Microsoft Teams Admin Center** (https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** → **Manage apps**
3. Find your published agent (search by name)
4. Click it → **"Allow"** or set availability:
   - **Everyone**: Available to all users in the org
   - **Specific users/groups**: Restrict to HR pilot group
   - **Blocked**: Not available

Alternatively, in **Microsoft 365 Admin Center**:
1. Go to **Settings** → **Integrated apps**
2. Find and approve the Copilot agent

### Step 3.3: Access in M365 Chat

Once approved, users can access it:

1. Open **Microsoft 365 Chat** (https://m365.cloud.microsoft/chat) or via Teams
2. Click the **agent picker** (right side of the chat input, or the `@` mention)
3. Select **"HR Concierge"** (or "Employee Concierge")
4. The conversation starters appear — click one or type a request
5. The agent uses the MCP Server tools and returns responses with interactive UI

### Step 3.4: Pin the Agent (Optional)

For easier access, admins can pin the agent:

1. In **Teams Admin Center** → **Setup policies**
2. Add the agent to the pinned apps list
3. Users will see it in their left rail or Copilot agent dropdown

---

## Part 4: Alternative — Declarative Agent via M365 Agents Toolkit

If you prefer code-first development (already set up in this repo):

### Step 4.1: Install M365 Agents Toolkit

1. Open VS Code
2. Install extension: **"Microsoft 365 Agents Toolkit"** (formerly Teams Toolkit)
3. Sign in with your M365 admin account

### Step 4.2: Use the Existing App Package

This repo already has a declarative agent configured:

```
apps/m365-copilot/appPackage/
├── manifest.json              # Teams app manifest (set your APP_ID)
├── declarativeAgent.json      # Agent definition + MCP action
├── apiPlugin.json             # REST API plugin (legacy)
├── openapi.yaml               # OpenAPI spec for REST endpoints
├── color.png                  # 192×192 app icon (replace)
└── outline.png                # 32×32 icon (replace)
```

The `declarativeAgent.json` already references the MCP Server:

```json
{
  "actions": [
    {
      "id": "hrMCPServer",
      "type": "McpServer",
      "url": "https://<your-mcp-app>.azurecontainerapps.io/mcp",
      "description": "HR Concierge MCP Server — provides HR tools with interactive UI widgets"
    }
  ]
}
```

### Step 4.3: Configure and Deploy

1. **Set your App ID**:
   - Go to https://dev.teams.microsoft.com → Apps → New App → copy the App ID
   - Replace `{{APP_ID}}` in `manifest.json`

2. **Add app icons**:
   - Place `color.png` (192×192) and `outline.png` (32×32) in `appPackage/`

3. **Package**:
   ```bash
   cd apps/m365-copilot/appPackage
   zip -r hr-concierge-agent.zip *
   ```

4. **Upload via Teams Developer Portal**:
   - Go to https://dev.teams.microsoft.com → Apps → Import app
   - Upload `hr-concierge-agent.zip`
   - Click **"Publish to org"**

5. **Admin approves** (same as Step 3.2 above)

### Step 4.4: Add More Agents to the Declarative Agent

To compose multiple agents in the declarative agent approach, add more actions:

```json
{
  "actions": [
    {
      "id": "hrMCPServer",
      "type": "McpServer",
      "url": "https://<your-mcp-app>.azurecontainerapps.io/mcp",
      "description": "HR tools with interactive UI widgets"
    },
    {
      "id": "itHelpDesk",
      "type": "McpServer",
      "url": "https://<your-it-mcp-app>.azurecontainerapps.io/mcp",
      "description": "IT Help Desk tools for password resets, access, devices"
    },
    {
      "id": "facilitiesAPI",
      "file": "facilitiesPlugin.json"
    }
  ]
}
```

M365 Copilot will orchestrate between all registered actions based on the user's intent and the agent's instructions.

---

## Testing & Validation

### Verify MCP Server Health

```bash
curl https://<your-mcp-app>.azurecontainerapps.io/health
# Expected: {"status":"healthy","server":"hr-concierge-mcp","version":"1.0.0"}
```

### Test Tool Invocation Directly

```bash
curl -X POST https://<your-api-app>.azurecontainerapps.io/api/tools/get_workday_form_schema \
  -H "Content-Type: application/json" \
  -d '{"change_types_csv": "address-change"}'
```

### Test in Copilot Studio (Before Publishing)

1. Use the **"Test"** panel in Copilot Studio
2. Try each conversation starter
3. Verify tool calls appear in the conversation trace
4. Check the **"Activity"** tab to see MCP tool invocations

### Test in M365 Chat (After Publishing)

1. Open M365 Chat → select the agent
2. Try: `I need to update my address after moving to California`
3. Expected flow:
   - Agent calls `get_workday_form_schema` → returns address fields
   - Agent presents the information or interactive form
   - Agent calls `assess_risk_and_compliance` → risk evaluation
   - Agent calls `execute_self_service_changes` (low-risk) or `submit_high_risk_changes` (high-risk)
   - Agent calls `generate_completion_summary` → final report

---

## Troubleshooting

### MCP Server Not Discovered

| Symptom | Resolution |
|---|---|
| "Unable to connect to MCP server" | Verify the URL is accessible from public internet (Container App ingress must be `external`) |
| Tools not showing after connect | Check the MCP server logs: `az containerapp logs show --name hr-concierge-mcp -g rg-hr-concierge-demo` |
| Timeout errors | Increase Container App min replicas to 1 to avoid cold starts |

### Authentication Errors

| Symptom | Resolution |
|---|---|
| 401 Unauthorized | If you added auth, verify the OAuth scope matches your app registration |
| CORS errors | MCP protocol uses StreamableHTTP, not browser-origin requests — CORS shouldn't apply |
| Token not accepted | Ensure the Copilot Studio environment is in the same tenant as the app registration |

### Agent Not Appearing in M365 Chat

| Symptom | Resolution |
|---|---|
| Agent missing from picker | Admin approval pending — check Teams Admin Center |
| Agent visible but errors on use | Check the MCP Server is running: `curl <server-url>/health` |
| "This agent is not available" | License issue — verify M365 Copilot license is assigned to user |
| Stale version showing | It can take up to 24 hours for updates to propagate. Force refresh with re-publish |

### Container App Issues

```bash
# Check MCP server logs
az containerapp logs show --name hr-concierge-mcp -g rg-hr-concierge-demo --follow

# Check backend API logs
az containerapp logs show --name hr-concierge-api -g rg-hr-concierge-demo --follow

# Verify internal DNS (MCP → Backend communication)
az containerapp exec --name hr-concierge-mcp -g rg-hr-concierge-demo --command "wget -qO- http://hr-concierge-api:8000/api/health"
```

---

## Summary of Deployment Options

| Approach | Best For | Effort | Flexibility |
|---|---|---|---|
| **Copilot Studio + MCP** | No-code/low-code teams, rapid prototyping | Low | High (visual editor, Topics, Knowledge) |
| **Declarative Agent (Toolkit)** | Developer teams, CI/CD, source control | Medium | Medium (JSON manifests, code-first) |
| **Both combined** | Production deployments with dev + admin collaboration | Medium | Highest |

**Recommended for this demo**: Use Copilot Studio (Part 1-3) for the fastest path to showing the HR Concierge in M365 Chat. Use the Declarative Agent approach (Part 4) when you need CI/CD, version control, and multi-environment promotion.
