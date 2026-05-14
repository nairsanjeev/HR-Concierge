/**
 * HR Concierge MCP Server
 *
 * Exposes 11 HR tools via the Model Context Protocol with MCP App UI
 * declarations so Copilot Chat renders interactive widgets inline.
 *
 * Architecture:
 *   Copilot Studio → MCP Server (this) → Backend API (FastAPI)
 *                                       → MCP App UI (iframe)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const PORT = parseInt(process.env.PORT || "3001", 10);

// ─── Helper: call the FastAPI backend ────────────────────────────────────────

async function callBackendTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const resp = await fetch(`${BACKEND_URL}/api/tools/${toolName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!resp.ok) {
    throw new Error(`Backend tool ${toolName} failed: ${resp.status} ${await resp.text()}`);
  }
  return await resp.text();
}

// ─── Helper: load a UI resource HTML file ────────────────────────────────────

function loadUIResource(name: string): string {
  const path = resolve(__dirname, "..", "ui-resources", `${name}.html`);
  return readFileSync(path, "utf-8");
}

// ─── Create MCP Server ───────────────────────────────────────────────────────

const server = new McpServer({
  name: "HR Concierge",
  version: "1.0.0",
});

// ─── UI Resources ────────────────────────────────────────────────────────────

server.resource(
  "workday-form",
  "ui://hr-concierge/workday-form",
  { mimeType: "text/html" },
  async () => ({
    contents: [{
      uri: "ui://hr-concierge/workday-form",
      mimeType: "text/html",
      text: loadUIResource("workday-form"),
    }],
  })
);

server.resource(
  "grievance-intake",
  "ui://hr-concierge/grievance-intake",
  { mimeType: "text/html" },
  async () => ({
    contents: [{
      uri: "ui://hr-concierge/grievance-intake",
      mimeType: "text/html",
      text: loadUIResource("grievance-intake"),
    }],
  })
);

server.resource(
  "completion-summary",
  "ui://hr-concierge/completion-summary",
  { mimeType: "text/html" },
  async () => ({
    contents: [{
      uri: "ui://hr-concierge/completion-summary",
      mimeType: "text/html",
      text: loadUIResource("completion-summary"),
    }],
  })
);

server.resource(
  "orchestration-panel",
  "ui://hr-concierge/orchestration-panel",
  { mimeType: "text/html" },
  async () => ({
    contents: [{
      uri: "ui://hr-concierge/orchestration-panel",
      mimeType: "text/html",
      text: loadUIResource("orchestration-panel"),
    }],
  })
);

// ─── MCP Tools ───────────────────────────────────────────────────────────────

// 1. Knowledge Base Query
server.tool(
  "query_knowledge_base",
  "Search the HR policy knowledge base (SharePoint via Foundry IQ) for answers about policies, benefits, leave, PTO, 401(k), health insurance, code of conduct, etc.",
  { query: z.string().describe("Employee's question in natural language") },
  async ({ query }) => {
    const result = await callBackendTool("query_knowledge_base", { query });
    return { content: [{ type: "text", text: result }] };
  }
);

// 2. Policy Guidance
server.tool(
  "retrieve_policy_guidance",
  "Look up relevant HR policy articles from ServiceNow knowledge base.",
  { topics: z.string().describe("Comma-separated keywords, e.g. 'name change, marriage'") },
  async ({ topics }) => {
    const result = await callBackendTool("retrieve_policy_guidance", { topics });
    return { content: [{ type: "text", text: result }] };
  }
);

// 3. Risk Assessment
server.tool(
  "assess_risk_and_compliance",
  "Evaluate risk levels for each detected intent and determine approval requirements. Returns risk assessment with blocked paths and rationale.",
  { intents_json: z.string().describe("JSON array of intents with risk_level, id, etc.") },
  async ({ intents_json }) => {
    const result = await callBackendTool("assess_risk_and_compliance", { intents_json });
    return { content: [{ type: "text", text: result }] };
  }
);

// 4. Impact Map
server.tool(
  "build_impact_map",
  "Generate a dependency/impact map showing which downstream systems are affected by the changes.",
  { intents_json: z.string().describe("JSON array of intents with downstream_systems") },
  async ({ intents_json }) => {
    const result = await callBackendTool("build_impact_map", { intents_json });
    return { content: [{ type: "text", text: result }] };
  }
);

// 5. Submit High-Risk Changes (with UI)
server.tool(
  "submit_high_risk_changes",
  "Submit high-risk personal data changes for processing. Requires human approval. Displays an approval form.",
  {
    changes_summary: z.string().describe("Summary of the high-risk changes to submit"),
  },
  async ({ changes_summary }) => {
    const result = await callBackendTool("submit_high_risk_changes", { changes_summary });
    return {
      content: [{ type: "text", text: result }],
      _meta: {
        ui: {
          resourceUri: "ui://hr-concierge/completion-summary",
        },
      },
    };
  }
);

// 6. Execute Self-Service Changes
server.tool(
  "execute_self_service_changes",
  "Execute low-risk self-service changes immediately (address, emergency contact, preferred name).",
  { changes_json: z.string().describe("JSON array of changes to execute") },
  async ({ changes_json }) => {
    const result = await callBackendTool("execute_self_service_changes", { changes_json });
    return { content: [{ type: "text", text: result }] };
  }
);

// 7. Completion Summary (with UI)
server.tool(
  "generate_completion_summary",
  "Generate an executive summary of all actions taken and pending items. Renders a visual summary card.",
  { workflow_data: z.string().describe("JSON object with total, auto_completed, pending_approval, documents_needed") },
  async ({ workflow_data }) => {
    const result = await callBackendTool("generate_completion_summary", { workflow_data });
    return {
      content: [{ type: "text", text: result }],
      _meta: {
        ui: {
          resourceUri: "ui://hr-concierge/completion-summary",
        },
      },
    };
  }
);

// 8. Get Workday Form Schema (with UI)
server.tool(
  "get_workday_form_schema",
  "Return the Workday form schema for collecting employee data. Renders an interactive form for the employee to fill out.",
  { change_types_csv: z.string().describe("Comma-separated change type IDs, e.g. 'name-change,address-change'") },
  async ({ change_types_csv }) => {
    const result = await callBackendTool("get_workday_form_schema", { change_types_csv });
    return {
      content: [{ type: "text", text: result }],
      _meta: {
        ui: {
          resourceUri: "ui://hr-concierge/workday-form",
        },
      },
    };
  }
);

// 9. Update Workday Employee (with UI)
server.tool(
  "update_workday_employee",
  "Submit a personal data change to Workday HCM. Displays a form for the employee to confirm data before submission.",
  {
    employee_id: z.string().describe("Workday employee ID, e.g. 'EMP-001234'"),
    change_type: z.string().describe("One of: name-change, address-change, bank-details, emergency-contact, marriage, beneficiary-update, preferred-name"),
    field_data_json: z.string().describe("JSON object with the field values to update"),
  },
  async ({ employee_id, change_type, field_data_json }) => {
    const result = await callBackendTool("update_workday_employee", { employee_id, change_type, field_data_json });
    return {
      content: [{ type: "text", text: result }],
      _meta: {
        ui: {
          resourceUri: "ui://hr-concierge/workday-form",
        },
      },
    };
  }
);

// 10. Structure Narrative (Grievance)
server.tool(
  "structure_narrative",
  "Convert an unstructured employee narrative into a structured intake summary. Extracts key facts, dates, persons, and identifies missing information.",
  {
    raw_narrative: z.string().describe("The employee's unstructured description of their concern"),
    classification_json: z.string().describe("JSON with categories and severity from initial classification"),
  },
  async ({ raw_narrative, classification_json }) => {
    const result = await callBackendTool("structure_narrative", { raw_narrative, classification_json });
    return { content: [{ type: "text", text: result }] };
  }
);

// 11. Create Grievance Case (with UI)
server.tool(
  "create_grievance_case",
  "Create a formal grievance case in the system. Requires employee confirmation. Renders a grievance intake form for details.",
  { case_details: z.string().describe("JSON object with grievance details including severity, category, narrative") },
  async ({ case_details }) => {
    const result = await callBackendTool("create_grievance_case", { case_details });
    return {
      content: [{ type: "text", text: result }],
      _meta: {
        ui: {
          resourceUri: "ui://hr-concierge/grievance-intake",
        },
      },
    };
  }
);

// ─── HTTP Transport ──────────────────────────────────────────────────────────

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", server: "hr-concierge-mcp", version: "1.0.0" });
});

// MCP Streamable HTTP endpoint
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

// Also serve the MCP endpoint for GET (SSE session init)
app.get("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.listen(PORT, () => {
  console.log(`✓ HR Concierge MCP Server running on http://localhost:${PORT}`);
  console.log(`  Backend: ${BACKEND_URL}`);
  console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
});
