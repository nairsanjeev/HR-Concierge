import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "completion-summary", version: "1.0.0" });

interface WorkflowItem {
  label?: string;
  status?: string;
  detail?: string;
}

interface WorkflowData {
  total?: number;
  auto_completed?: number;
  pending_approval?: number;
  documents_needed?: number;
  items?: WorkflowItem[];
}

interface ToolResultData {
  structuredContent?: WorkflowData;
}

function renderSummary(data: WorkflowData) {
  const content = document.getElementById("summary-content")!;
  const total = data.total ?? 0;
  const completed = data.auto_completed ?? 0;
  const pending = data.pending_approval ?? 0;
  const docs = data.documents_needed ?? 0;
  const items = data.items || [];

  let html = `<div class="stats">
    <div class="stat"><div class="stat-num">${total}</div><div class="stat-label">Total Actions</div></div>
    <div class="stat completed"><div class="stat-num">${completed}</div><div class="stat-label">Completed</div></div>
    <div class="stat pending"><div class="stat-num">${pending}</div><div class="stat-label">Pending</div></div>
    <div class="stat docs"><div class="stat-num">${docs}</div><div class="stat-label">Docs Needed</div></div>
  </div>`;

  if (items.length > 0) {
    html += `<div class="items-list">`;
    items.forEach((item) => {
      const icon = item.status === "completed" ? "✅" : item.status === "pending" ? "⏳" : "📄";
      html += `<div class="item"><span class="item-icon">${icon}</span><span class="item-label">${item.label || ""}</span><span class="item-status">${item.status || ""}</span></div>`;
    });
    html += `</div>`;
  }

  content.innerHTML = html;
  content.classList.remove("hidden");
}

app.ontoolresult = (result: ToolResultData) => {
  if (result.structuredContent) renderSummary(result.structuredContent);
};

app.ontoolinput = (input: ToolResultData) => {
  if (input.structuredContent) renderSummary(input.structuredContent);
};

document.getElementById("doneBtn")!.addEventListener("click", () => {
  app.requestTeardown();
});

app.connect().catch(() => {});
