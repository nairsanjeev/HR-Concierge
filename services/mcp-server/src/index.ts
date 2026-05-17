/**
 * HR Concierge MCP Server v4.0 — MCP Apps with Interactive UI Widgets
 *
 * Uses @modelcontextprotocol/ext-apps to register tools with interactive HTML widgets.
 * M365 Copilot renders these widgets in sandboxed iframes using the widget-renderer.
 *
 * Architecture:
 *   M365 Copilot (Sydney) -> MCP Server (this) -> Backend API (FastAPI)
 *   Widget HTML <- widget-renderer.usercontent.microsoft.com (sandboxed iframe)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import express from "express";
import crypto from "crypto";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const PORT = parseInt(process.env.PORT || "3001", 10);
const TOOL_TIMEOUT_MS = 30_000;

// Widget HTML files — read at startup
const WIDGETS_DIR = path.resolve(__dirname, "../widgets");
const widgetHtml = {
  workdayForm: fs.readFileSync(path.join(WIDGETS_DIR, "workday-form.html"), "utf-8"),
  grievanceIntake: fs.readFileSync(path.join(WIDGETS_DIR, "grievance-intake.html"), "utf-8"),
  expenseReport: fs.readFileSync(path.join(WIDGETS_DIR, "expense-report.html"), "utf-8"),
  completionSummary: fs.readFileSync(path.join(WIDGETS_DIR, "completion-summary.html"), "utf-8"),
};

// Widget resource URIs
const WIDGET_URIS = {
  workdayForm: "ui://hr-concierge/workday-form.html",
  grievanceIntake: "ui://hr-concierge/grievance-intake.html",
  expenseReport: "ui://hr-concierge/expense-report.html",
  completionSummary: "ui://hr-concierge/completion-summary.html",
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

// --- Debug Log Infrastructure ---

interface LogEntry {
  ts: string;
  dir: "in" | "out";
  method: string;
  detail: string;
  sessionId?: string;
}

const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(50);
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 500;

function emitLog(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();
  logEmitter.emit("log", entry);
}

// Debug HTML
const debugHtml = fs.readFileSync(path.join(WIDGETS_DIR, "debug.html"), "utf-8");

// --- Helper: call the FastAPI backend ---

async function callBackendTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
  try {
    const resp = await fetch(`${BACKEND_URL}/api/tools/${toolName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Backend returned ${resp.status}: ${body}`);
    }
    return await resp.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("aborted")) {
      throw new Error(`Backend tool ${toolName} timed out after ${TOOL_TIMEOUT_MS}ms`);
    }
    throw new Error(`Backend tool ${toolName} failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

// --- Helper: safe backend call ---

async function safeTool(toolName: string, args: Record<string, unknown>): Promise<{ text: string; isError?: boolean }> {
  try {
    const result = await callBackendTool(toolName, args);
    return { text: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Tool ${toolName} error:`, message);
    return { text: `Error: ${message}`, isError: true };
  }
}

// --- MCP Server Factory ---

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "HR Concierge",
    version: "4.0.0",
  });

  // ========== WIDGET RESOURCES ==========
  // Register HTML widget resources that tools reference via _meta.ui.resourceUri

  registerAppResource(
    server,
    "Workday Change Form",
    WIDGET_URIS.workdayForm,
    { mimeType: RESOURCE_MIME_TYPE, description: "Interactive form for Workday personal data changes" },
    async () => ({
      contents: [{ uri: WIDGET_URIS.workdayForm, mimeType: RESOURCE_MIME_TYPE, text: widgetHtml.workdayForm }],
    })
  );

  registerAppResource(
    server,
    "Grievance Intake Form",
    WIDGET_URIS.grievanceIntake,
    { mimeType: RESOURCE_MIME_TYPE, description: "Confidential grievance intake form" },
    async () => ({
      contents: [{ uri: WIDGET_URIS.grievanceIntake, mimeType: RESOURCE_MIME_TYPE, text: widgetHtml.grievanceIntake }],
    })
  );

  registerAppResource(
    server,
    "Expense Report Form",
    WIDGET_URIS.expenseReport,
    { mimeType: RESOURCE_MIME_TYPE, description: "Expense report submission form" },
    async () => ({
      contents: [{ uri: WIDGET_URIS.expenseReport, mimeType: RESOURCE_MIME_TYPE, text: widgetHtml.expenseReport }],
    })
  );

  registerAppResource(
    server,
    "Completion Summary",
    WIDGET_URIS.completionSummary,
    { mimeType: RESOURCE_MIME_TYPE, description: "Workflow completion dashboard with KPIs" },
    async () => ({
      contents: [{ uri: WIDGET_URIS.completionSummary, mimeType: RESOURCE_MIME_TYPE, text: widgetHtml.completionSummary }],
    })
  );

  // ========== WIDGET TOOLS (render interactive UI) ==========

  registerAppTool(
    server,
    "get_workday_form",
    {
      title: "Workday Change Form",
      description: "Show an interactive form for Workday personal data changes (name, marriage, beneficiary, emergency contact, address). Use when an employee needs to update personal information.",
      inputSchema: {
        change_types: z.string().describe("Comma-separated change type IDs: name-change, marriage, beneficiary-update, emergency-contact, address-change"),
      },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: WIDGET_URIS.workdayForm, visibility: ["model"] } },
    },
    async ({ change_types }: { change_types: string }) => {
      console.log(`[TOOL] get_workday_form: ${change_types}`);
      const types = change_types.split(",").map((s: string) => s.trim());
      return {
        content: [{ type: "text" as const, text: `Displaying Workday change form for: ${types.join(", ")}` }],
        structuredContent: { change_types: types },
      };
    }
  );

  // Backward-compat alias: old agent versions call "get_workday_form_schema" with "change_types_csv"
  registerAppTool(
    server,
    "get_workday_form_schema",
    {
      title: "Workday Change Form (Legacy)",
      description: "Legacy alias — redirects to get_workday_form.",
      inputSchema: {
        change_types_csv: z.string().describe("Comma-separated change type IDs"),
      },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: WIDGET_URIS.workdayForm, visibility: ["model"] } },
    },
    async ({ change_types_csv }: { change_types_csv: string }) => {
      console.log(`[TOOL] get_workday_form_schema (legacy alias): ${change_types_csv}`);
      const types = change_types_csv.split(",").map((s: string) => s.trim());
      return {
        content: [{ type: "text" as const, text: `Displaying Workday change form for: ${types.join(", ")}` }],
        structuredContent: { change_types: types },
      };
    }
  );

  server.registerTool(
    "update_workday_employee",
    {
      title: "Submit Workday Update",
      description: "Submit a personal data change to Workday HCM. Called from the Workday form widget after employee fills in their details.",
      inputSchema: {
        employee_id: z.string().describe("Workday employee ID, e.g. 'EMP-001234'"),
        change_type: z.string().describe("One of: name-change, address-change, emergency-contact, marriage, beneficiary-update"),
        field_data_json: z.string().describe("JSON object with the field values to update"),
      },
    },
    async ({ employee_id, change_type, field_data_json }: { employee_id: string; change_type: string; field_data_json: string }) => {
      console.log(`[TOOL] update_workday_employee: ${employee_id} ${change_type}`);
      let fieldData: Record<string, unknown> = {};
      try { fieldData = JSON.parse(field_data_json); } catch { /* use empty */ }

      const fieldSummary = Object.entries(fieldData)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      return {
        content: [{ type: "text" as const, text: `Workday update submitted for ${employee_id}: ${change_type}. Fields: ${fieldSummary}. Status: Processing.` }],
        structuredContent: {
          status: "submitted",
          employee_id,
          change_type,
          fields: fieldData,
          confirmation: `Changes submitted for ${employee_id}. Confirmation email within 24 hours.`,
        } as unknown as Record<string, unknown>,
      };
    }
  );

  registerAppTool(
    server,
    "get_grievance_form",
    {
      title: "Grievance Intake Form",
      description: "Show an interactive confidential grievance intake form. Use when an employee wants to file a workplace concern, complaint, or report an issue.",
      inputSchema: {
        prefill_category: z.string().optional().describe("Optional category to pre-select: Harassment, Discrimination, Retaliation, Safety Concern, Policy Violation, Workplace Conflict, Other"),
      },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: WIDGET_URIS.grievanceIntake, visibility: ["model"] } },
    },
    async ({ prefill_category }: { prefill_category?: string }) => {
      console.log(`[TOOL] get_grievance_form: category=${prefill_category || "none"}`);
      return {
        content: [{ type: "text" as const, text: `Displaying confidential grievance intake form${prefill_category ? ` (category: ${prefill_category})` : ""}.` }],
        structuredContent: { prefill_category: prefill_category || null },
      };
    }
  );

  server.registerTool(
    "create_grievance_case",
    {
      title: "Submit Grievance",
      description: "Submit a formal workplace grievance case. Called from the grievance form widget after employee completes the intake form.",
      inputSchema: {
        category: z.string().describe("Grievance category"),
        severity: z.string().describe("Severity: Low, Medium, High, Critical"),
        narrative: z.string().describe("Description of concern"),
        incident_date: z.string().optional().describe("Date of incident (YYYY-MM-DD)"),
        location: z.string().optional().describe("Where it occurred"),
        persons_involved: z.string().optional().describe("Names of persons involved"),
        witnesses: z.string().optional().describe("Witness names"),
        desired_outcome: z.string().optional().describe("Desired resolution"),
      },
    },
    async (args: { category: string; severity: string; narrative: string; incident_date?: string; location?: string; persons_involved?: string; witnesses?: string; desired_outcome?: string }) => {
      console.log(`[TOOL] create_grievance_case: ${args.category} / ${args.severity}`);
      const caseRef = `GRV-${Date.now().toString(36).toUpperCase()}`;
      return {
        content: [{ type: "text" as const, text: `Grievance case ${caseRef} created. Category: ${args.category}, Severity: ${args.severity}. An HR case manager will contact you within 2 business days.` }],
        structuredContent: {
          status: "created",
          case_reference: caseRef,
          category: args.category,
          severity: args.severity,
          confirmation: "Your case has been assigned. All communications are strictly confidential.",
        } as unknown as Record<string, unknown>,
      };
    }
  );

  registerAppTool(
    server,
    "get_expense_form",
    {
      title: "Expense Report Form",
      description: "Show an interactive expense report form. Use when an employee needs to submit expenses, reimbursement requests, or log business travel costs.",
      inputSchema: {
        trip_name: z.string().optional().describe("Optional trip or project name to pre-fill"),
      },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: WIDGET_URIS.expenseReport, visibility: ["model"] } },
    },
    async ({ trip_name }: { trip_name?: string }) => {
      console.log(`[TOOL] get_expense_form: trip=${trip_name || "none"}`);
      return {
        content: [{ type: "text" as const, text: `Displaying expense report form${trip_name ? ` for: ${trip_name}` : ""}.` }],
        structuredContent: { trip_name: trip_name || null },
      };
    }
  );

  server.registerTool(
    "submit_expense_report",
    {
      title: "Submit Expense Report",
      description: "Submit expense line items for manager approval. Called from the expense form widget.",
      inputSchema: {
        trip_name: z.string().optional().describe("Trip or project name"),
        items_json: z.string().describe("JSON array of expense items with date, category, amount, description"),
      },
    },
    async ({ trip_name, items_json }: { trip_name?: string; items_json: string }) => {
      console.log(`[TOOL] submit_expense_report: trip=${trip_name || "none"}`);
      let items: Array<{ category?: string; amount?: string | number; description?: string }> = [];
      try { items = JSON.parse(items_json); } catch { /* empty */ }
      const total = items.reduce((sum, i) => sum + (parseFloat(String(i.amount)) || 0), 0);
      return {
        content: [{ type: "text" as const, text: `Expense report submitted${trip_name ? ` (${trip_name})` : ""}. ${items.length} items, total: $${total.toFixed(2)}. Awaiting manager approval.` }],
        structuredContent: {
          status: "submitted",
          trip_name: trip_name || null,
          item_count: items.length,
          total: total.toFixed(2),
          confirmation: "Submitted for manager approval. You will be notified when approved.",
        } as unknown as Record<string, unknown>,
      };
    }
  );

  registerAppTool(
    server,
    "show_completion_summary",
    {
      title: "Workflow Summary",
      description: "Show a dashboard summarizing all workflow actions taken, completed items, and pending items.",
      inputSchema: {
        workflow_data_json: z.string().describe("JSON with total, auto_completed, pending_approval, documents_needed, and items array"),
      },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: WIDGET_URIS.completionSummary, visibility: ["model"] } },
    },
    async ({ workflow_data_json }: { workflow_data_json: string }) => {
      console.log(`[TOOL] show_completion_summary`);
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(workflow_data_json); } catch { /* empty */ }
      return {
        content: [{ type: "text" as const, text: `Workflow summary: ${data.total || 0} total, ${data.auto_completed || 0} completed, ${data.pending_approval || 0} pending.` }],
        structuredContent: data,
      };
    }
  );

  // ========== PLAIN TOOLS (no UI widget) ==========

  server.tool(
    "query_knowledge_base",
    "Search the HR policy knowledge base (SharePoint via Foundry IQ) for answers about policies, benefits, leave, PTO, 401(k), health insurance, code of conduct, etc.",
    { query: z.string().describe("Employee's question in natural language") },
    async ({ query }) => {
      const { text, isError } = await safeTool("query_knowledge_base", { query });
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.tool(
    "retrieve_policy_guidance",
    "Look up relevant HR policy articles from ServiceNow knowledge base.",
    { topics: z.string().describe("Comma-separated keywords, e.g. 'name change, marriage'") },
    async ({ topics }) => {
      const { text, isError } = await safeTool("retrieve_policy_guidance", { topics });
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.tool(
    "assess_risk_and_compliance",
    "Evaluate risk levels for each detected intent and determine approval requirements.",
    { intents_json: z.string().describe("JSON array of intents with risk_level, id, etc.") },
    async ({ intents_json }) => {
      const { text, isError } = await safeTool("assess_risk_and_compliance", { intents_json });
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.tool(
    "build_impact_map",
    "Generate a dependency/impact map showing which downstream systems are affected.",
    { intents_json: z.string().describe("JSON array of intents with downstream_systems") },
    async ({ intents_json }) => {
      const { text, isError } = await safeTool("build_impact_map", { intents_json });
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.tool(
    "execute_self_service_changes",
    "Execute low-risk self-service changes immediately (address, emergency contact, preferred name).",
    { changes_json: z.string().describe("JSON array of changes to execute") },
    async ({ changes_json }) => {
      const { text, isError } = await safeTool("execute_self_service_changes", { changes_json });
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.tool(
    "structure_narrative",
    "Convert an unstructured employee narrative into a structured intake summary.",
    {
      raw_narrative: z.string().describe("The employee's unstructured description of their concern"),
      classification_json: z.string().describe("JSON with categories and severity from initial classification"),
    },
    async ({ raw_narrative, classification_json }) => {
      const { text, isError } = await safeTool("structure_narrative", { raw_narrative, classification_json });
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.tool(
    "submit_high_risk_changes",
    "Submit high-risk personal data changes for manager approval.",
    { changes_summary: z.string().describe("Summary of changes. Include 'CONFIRMED' and justification to submit.") },
    async ({ changes_summary }) => {
      console.log(`[TOOL] submit_high_risk_changes`);
      const isConfirmed = changes_summary.toUpperCase().includes("CONFIRMED");
      if (isConfirmed) {
        return {
          content: [{ type: "text", text: `HIGH-RISK CHANGES SUBMITTED FOR APPROVAL\n\n${changes_summary}\n\nStatus: Routed to manager. Processing: Standard (5 business days).` }],
        };
      }
      return {
        content: [{ type: "text", text: `HIGH-RISK CHANGES - APPROVAL REQUIRED\n\nChanges: ${changes_summary}\n\nPlease confirm submission, provide justification, and select urgency (Standard/Expedited/Urgent).` }],
      };
    }
  );

  return server;
}

// --- CORS for widget renderer ---

const ALLOWED_ORIGINS = [
  /\.widget-renderer\.usercontent\.microsoft\.com$/,
  /\.widgetcopilot\.net$/,
  /\.microsoft\.com$/,
  /\.cloud\.microsoft$/,
  /\.office\.com$/,
  /\.teams\.microsoft\.com$/,
  /localhost/,
];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || origin === "null") return true; // sandboxed iframes send null origin
  return ALLOWED_ORIGINS.some((pattern) => pattern.test(origin));
}

// --- HTTP Transport ---

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  next();
});
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", server: "hr-concierge-mcp", version: "4.0.0", widgets: Object.keys(WIDGET_URIS) });
});

const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

function logRequest(method: string, sessionId: string | undefined, body: any) {
  const ts = new Date().toISOString();
  if (Array.isArray(body)) {
    body.forEach((msg: any) => logSingleMessage(ts, method, sessionId, msg));
  } else {
    logSingleMessage(ts, method, sessionId, body);
  }
}

function logSingleMessage(ts: string, httpMethod: string, sessionId: string | undefined, msg: any) {
  const rpcMethod = msg?.method || `response-to-${msg?.id}`;
  const id = msg?.id ?? "notification";
  const params = msg?.params ? JSON.stringify(msg.params).substring(0, 500) : "none";
  console.log(`[${ts}] ${httpMethod} session=${sessionId || "NEW"} | rpc=${rpcMethod} id=${id} params=${params}`);
  emitLog({ ts, dir: "in", method: rpcMethod, detail: params, sessionId });
}

app.post("/mcp", async (req, res) => {
  const reqStart = Date.now();
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  logRequest("POST", sessionId, req.body);

  const originalWrite = res.write.bind(res);
  res.write = function(chunk: any, ...args: any[]) {
    if (typeof chunk === 'string' && chunk.startsWith('data:')) {
      const dataStr = chunk.replace(/^data:\s*/, '').replace(/\n\n$/, '');
      try {
        const parsed = JSON.parse(dataStr);
        const resultPreview = parsed.result ? JSON.stringify(parsed.result).substring(0, 300) : (parsed.method || "no-result");
        console.log(`[RESPONSE] id=${parsed.id || "notify"} latency=${Date.now()-reqStart}ms result=${resultPreview}`);
        emitLog({ ts: new Date().toISOString(), dir: "out", method: parsed.method || `response-${parsed.id}`, detail: resultPreview, sessionId });
      } catch { /* non-JSON SSE */ }
    }
    return originalWrite(chunk, ...args);
  } as any;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res, req.body);
  } else if (!sessionId) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };
    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
    if (transport.sessionId) {
      sessions.set(transport.sessionId, { transport, server: mcpServer });
    }
  } else {
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Invalid session" }, id: null });
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  console.log(`[${new Date().toISOString()}] GET /mcp session=${sessionId || "NONE"}`);
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
  } else {
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "No valid session" }, id: null });
  }
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
    sessions.delete(sessionId);
  } else {
    res.status(404).json({ jsonrpc: "2.0", error: { code: -32000, message: "Session not found" }, id: null });
  }
});

// --- Debug Auth ---

const DEBUG_USER = process.env.DEBUG_USER || "Sanjeev Nair";
const DEBUG_PASS = process.env.DEBUG_PASS || "demo123";
// HMAC secret: stable across replicas (derived from credentials or env var)
const DEBUG_SECRET = process.env.DEBUG_SECRET || crypto.createHash("sha256").update(`${DEBUG_USER}:${DEBUG_PASS}:hr-concierge-debug`).digest("hex");

function generateDebugToken(): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac("sha256", DEBUG_SECRET).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

function verifyDebugToken(token: string): boolean {
  const dotIdx = token.indexOf(".");
  if (dotIdx < 1) return false;
  const ts = token.substring(0, dotIdx);
  const sig = token.substring(dotIdx + 1);
  // Reject tokens older than 24 hours
  if (Date.now() - parseInt(ts, 10) > 86400000) return false;
  const expected = crypto.createHmac("sha256", DEBUG_SECRET).update(ts).digest("hex");
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"));
}

function debugAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req as any).cookies?.debug_token || req.headers["x-debug-token"] as string;
  if (token && verifyDebugToken(token)) return next();
  if (req.path === "/login") return next();
  if (req.path === "/" || req.path === "") {
    res.setHeader("Content-Type", "text/html");
    res.send(debugLoginHtml);
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

const debugLoginHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Debug Inspector — Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',sans-serif;background:#1e1e1e;color:#ccc;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#252526;border:1px solid #3e3e3e;border-radius:12px;padding:40px;width:360px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
h1{font-size:18px;color:#0078d4;margin-bottom:4px}
.subtitle{font-size:12px;color:#9d9d9d;margin-bottom:24px}
label{display:block;font-size:12px;color:#9d9d9d;margin-bottom:4px;margin-top:14px}
input{width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid #3e3e3e;border-radius:6px;color:#ccc;font-size:14px;font-family:inherit}
input:focus{outline:none;border-color:#0078d4}
button{width:100%;margin-top:20px;padding:12px;background:#0078d4;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer}
button:hover{background:#005a9e}
.error{color:#f14c4c;font-size:12px;margin-top:12px;display:none}
</style></head><body>
<div class="card">
<h1>🔍 MCP Debug Inspector</h1>
<p class="subtitle">HR Concierge — Authenticated Access</p>
<form id="f">
<label>Username</label><input id="u" type="text" placeholder="Enter username" autocomplete="username">
<label>Password</label><input id="p" type="password" placeholder="Enter password" autocomplete="current-password">
<button type="submit">Sign In</button>
<div class="error" id="err">Invalid credentials</div>
</form>
</div>
<script>
document.getElementById('f').onsubmit=async(e)=>{
  e.preventDefault();
  const u=document.getElementById('u').value,p=document.getElementById('p').value;
  const r=await fetch('/debug/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:u,pass:p})});
  if(r.ok){const d=await r.json();document.cookie='debug_token='+d.token+';path=/debug;SameSite=Strict';location.reload();}
  else{document.getElementById('err').style.display='block';}
};
</script></body></html>`;

// Cookie parser (minimal)
app.use("/debug", (req, _res, next) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach(c => { const [k, v] = c.trim().split("="); if (k) cookies[k] = v || ""; });
  (req as any).cookies = cookies;
  next();
});

app.post("/debug/login", (req, res) => {
  const { user, pass } = req.body || {};
  if (user === DEBUG_USER && pass === DEBUG_PASS) {
    const token = generateDebugToken();
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.use("/debug", debugAuth);

// --- Debug Endpoints ---

app.get("/debug", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(debugHtml);
});

app.get("/debug/logs", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send recent log buffer
  for (const entry of logBuffer) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  const handler = (entry: LogEntry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  };
  logEmitter.on("log", handler);
  req.on("close", () => logEmitter.off("log", handler));
});

app.get("/debug/sessions", (_req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id]) => ({ id }));
  res.json(sessionList);
});

app.listen(PORT, () => {
  console.log(`HR Concierge MCP Server v4.0 running on http://localhost:${PORT}`);
  console.log(`  Backend: ${BACKEND_URL}`);
  console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`  Debug inspector: http://localhost:${PORT}/debug`);
  console.log(`  Mode: MCP Apps with interactive UI widgets`);
  console.log(`  Widgets: ${Object.keys(WIDGET_URIS).join(", ")}`);
});
