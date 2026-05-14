# M365 Copilot — HR Concierge Declarative Agent

This folder contains the **Microsoft 365 Copilot** declarative agent manifest for the HR Concierge. It lets employees interact with the same agentic orchestration backend directly inside Microsoft 365 Copilot.

## Structure

```
appPackage/
├── manifest.json           # Teams/M365 app manifest
├── declarativeAgent.json   # Copilot agent definition (instructions, starters, capabilities)
├── apiPlugin.json          # API plugin binding to the orchestration backend
├── openapi.yaml            # OpenAPI spec for the backend endpoints
├── color.png               # App icon (192×192) — replace with your logo
└── outline.png             # Outline icon (32×32) — replace with your logo
```

## Prerequisites

| Requirement | Details |
|---|---|
| M365 Copilot license | Required for the host tenant |
| Teams Developer Portal access | To upload the app package |
| Backend running | The FastAPI orchestration service must be accessible from the Copilot runtime |

## Setup

1. **Replace placeholder icons** — add `color.png` (192×192) and `outline.png` (32×32) to `appPackage/`.

2. **Set your App ID** — replace `{{APP_ID}}` in `manifest.json` with a GUID from the Teams Developer Portal.

3. **Update server URL** — in `openapi.yaml`, update the production `servers` entry to point to your deployed backend.

4. **Package and upload**:
   ```bash
   cd appPackage
   # Zip all files
   # Upload via Teams Developer Portal → Apps → Import app
   ```

5. **Test in M365 Copilot** — open Microsoft 365 Copilot, select the "HR Concierge Agent" from the agent picker, and try one of the conversation starters.

## How It Works

The declarative agent connects M365 Copilot to the same FastAPI backend used by the standalone web app. Copilot sends user messages to the `/api/scenarios` and orchestration endpoints defined in `openapi.yaml`. The backend processes them through the agentic tool pipeline and returns structured responses.

**Key difference from standalone app**: The M365 Copilot surface uses the standard Copilot UX (cards, citations, adaptive cards) rather than the custom AG-UI adaptive renderer. The agent's instructions in `declarativeAgent.json` guide Copilot to present results appropriately.

## Graph Connectors

The declarative agent includes a `GraphConnectors` capability referencing a `contosoPolicies` connection. To use this:

1. Set up a Microsoft Graph connector that ingests your HR policy documents
2. Use the connection ID `contosoPolicies` (or update `declarativeAgent.json` to match your connector)
3. Copilot will be able to ground responses in your actual HR policies
