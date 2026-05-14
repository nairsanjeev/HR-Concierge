# Azure Resources — HR Concierge Agentic RFI Demo

> Inventory of all cloud resources provisioned for the **AgenticRFIHRDemo** application.

---

## Summary

| # | Resource Type | Resource Name | Region | Purpose |
|---|---|---|---|---|
| 1 | Azure AI Services (Foundry) | `agenticaie2edemo` | — | LLM inference + Agent Framework project endpoint |
| 2 | Azure OpenAI Model Deployment | `gpt-5.4-nano` | (same as AI Services) | Chat completion model for the HR Concierge agent |
| 3 | Azure AI Search | `hr-foundry-iq-search` | — | HR policy document retrieval (Foundry IQ) |
| 4 | Azure AI Search Index | `hr-policy-knowledgebase` | (same as Search) | Vector/keyword index over HR policy documents |

> **Note:** Resources were provisioned manually via the Azure Portal — no IaC (Bicep/Terraform/`azure.yaml`) exists in this repo.

---

## Detailed Resource Information

### 1. Azure AI Services (Foundry Hub)

| Property | Value |
|---|---|
| **Endpoint** | `https://agenticaie2edemo.services.ai.azure.com` |
| **Used As** | `AZURE_AI_PROJECT_ENDPOINT` and `AZURE_OPENAI_ENDPOINT` |
| **Authentication** | API Key (`AZURE_OPENAI_API_KEY` in `.env`) |
| **API Version** | `2024-12-01-preview` |
| **Purpose** | Hosts the Azure OpenAI model deployment and serves as the Agent Framework project endpoint for tool orchestration |

### 2. Azure OpenAI — Model Deployment

| Property | Value |
|---|---|
| **Model** | `gpt-5.4-nano` |
| **Deployment Name** | `gpt-5.4-nano` (env var `AZURE_OPENAI_CHAT_COMPLETION_MODEL`) |
| **Parent Resource** | `agenticaie2edemo` AI Services |
| **Purpose** | Powers the single-agent agentic loop — handles intent classification, policy retrieval reasoning, grievance triage, narrative structuring, and direct responses |

### 3. Azure AI Search

| Property | Value |
|---|---|
| **Endpoint** | `https://hr-foundry-iq-search.search.windows.net` |
| **Authentication** | API Key (`AZURE_SEARCH_API_KEY` in `.env`) |
| **Purpose** | Provides RAG-based knowledge retrieval over HR policy documents (benefits, leave, payroll, personal data changes) |

### 4. Azure AI Search — Knowledge Base Index

| Property | Value |
|---|---|
| **Index Name** | `hr-policy-knowledgebase` |
| **Parent Resource** | `hr-foundry-iq-search` |
| **Content Source** | Documents in `sharepoint-content/` (Benefits-Insurance, HR-Policies, Leave-TimeOff, Payroll-Tax, Personal-Data-Changes) |
| **Purpose** | Grounding index used by the `search_hr_policies` tool to retrieve relevant policy passages for employee questions |

---

## External Services (Non-Azure)

| Service | Instance | Status | Purpose |
|---|---|---|---|
| **ServiceNow** | `copilota2a.service-now.com` | **Mocked** (`SERVICENOW_USE_MOCK=true`) | A2A protocol — knowledge search & incident creation |
| **SharePoint** | Not configured | **Not deployed** | Policy document grounding via Graph connectors (content loaded into AI Search instead) |

---

## Local Infrastructure (Development)

| Component | Port | Technology |
|---|---|---|
| Backend (Orchestration Service) | `8000` | Python FastAPI + Uvicorn |
| Frontend (Web App) | `5174` | React + Vite + TypeScript |

---

## Environment Configuration

All secrets and endpoints are stored in:

```
services/orchestration/.env
```

A sanitized template is available at the repo root:

```
.env.example
```

---

## Resource Group

The resource group name is **not recorded** in the codebase. To identify it:

1. Go to the [Azure Portal](https://portal.azure.com)
2. Search for `agenticaie2edemo` in the top search bar
3. The resource's **Overview** page will show the Resource Group

Alternatively via CLI:

```bash
az resource list --query "[?contains(name,'agenticaie2edemo')].{Name:name, ResourceGroup:resourceGroup, Type:type}" -o table
```

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        AZURE CLOUD                              │
│                                                                │
│  ┌──────────────────────────┐   ┌───────────────────────────┐ │
│  │  Azure AI Services       │   │  Azure AI Search          │ │
│  │  (agenticaie2edemo)      │   │  (hr-foundry-iq-search)   │ │
│  │                          │   │                           │ │
│  │  ┌────────────────────┐  │   │  ┌─────────────────────┐ │ │
│  │  │ gpt-5.4-nano       │  │   │  │ hr-policy-           │ │ │
│  │  │ (Chat Completions) │  │   │  │ knowledgebase        │ │ │
│  │  └────────────────────┘  │   │  │ (Search Index)       │ │ │
│  │                          │   │  └─────────────────────┘ │ │
│  └──────────┬───────────────┘   └────────────┬──────────────┘ │
│             │                                 │                │
└─────────────┼─────────────────────────────────┼────────────────┘
              │  HTTPS/API Key                  │  HTTPS/API Key
              │                                 │
┌─────────────┼─────────────────────────────────┼────────────────┐
│             ▼            LOCAL DEV             ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FastAPI Backend (port 8000)                            │   │
│  │  ─ Microsoft Agent Framework (single-agent loop)        │   │
│  │  ─ AG-UI SSE streaming                                  │   │
│  │  ─ 11 registered tools                                  │   │
│  └───────────────────────────┬─────────────────────────────┘   │
│                              │ SSE                              │
│  ┌───────────────────────────▼─────────────────────────────┐   │
│  │  React Frontend (port 5174)                             │   │
│  │  ─ Adaptive Generative UI                               │   │
│  │  ─ Chat + Orchestration Panel                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ServiceNow (MOCKED)                                    │   │
│  │  ─ A2A Knowledge Agent                                  │   │
│  │  ─ A2A Incident Agent                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## Cost Considerations

| Resource | SKU / Tier | Billing |
|---|---|---|
| Azure AI Services | Pay-as-you-go (token-based) | Per 1K tokens (input/output) |
| Azure AI Search | Basic or Standard | Monthly flat rate + per-query |

> To check current spend: **Azure Portal → Cost Management → Filter by resource group**
