import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "grievance-intake", version: "1.0.0" });

interface ToolResultData {
  structuredContent?: { prefill_category?: string | null };
}

function renderForm(category?: string | null) {
  if (category) {
    const sel = document.querySelector<HTMLSelectElement>('[name="category"]');
    if (sel) {
      for (const opt of Array.from(sel.options)) {
        if (opt.value.toLowerCase() === category.toLowerCase()) {
          sel.value = opt.value;
          break;
        }
      }
    }
  }
}

app.ontoolresult = (result: ToolResultData) => {
  renderForm(result.structuredContent?.prefill_category);
};

app.ontoolinput = (input: ToolResultData) => {
  renderForm(input.structuredContent?.prefill_category);
};

const form = document.getElementById("form") as HTMLFormElement;
const statusEl = document.getElementById("status")!;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const data: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (val) data[key] = val as string;
  }
  if (!data.category || !data.severity || !data.narrative) {
    statusEl.className = "status error";
    statusEl.textContent = "Please fill in Category, Severity, and Description.";
    return;
  }
  statusEl.className = "status success";
  statusEl.textContent = "⏳ Filing grievance case...";
  try {
    const result = await app.callServerTool("create_grievance_case", data);
    const text = result?.content?.[0]?.text || "Case filed successfully.";
    statusEl.textContent = "✅ " + text;
  } catch (err: any) {
    statusEl.className = "status error";
    statusEl.textContent = "❌ " + (err.message || "Submission failed");
  }
});

document.getElementById("cancelBtn")!.addEventListener("click", () => {
  app.requestTeardown();
});

app.connect().catch(() => {});
