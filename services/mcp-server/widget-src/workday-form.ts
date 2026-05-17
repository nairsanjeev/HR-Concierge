import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "workday-form", version: "1.0.0" });

interface ToolResultData {
  structuredContent?: { change_types?: string[] };
}

function renderForm(changeTypes: string[]) {
  const subtitle = document.getElementById("subtitle")!;
  subtitle.textContent = changeTypes.length
    ? `Please fill in the fields below for: ${changeTypes.join(", ")}`
    : "Fill in the applicable sections below.";

  if (changeTypes.length === 0) {
    document.querySelectorAll<HTMLElement>(".section").forEach((s) => s.classList.remove("hidden"));
  } else {
    changeTypes.forEach((type) => {
      const section = document.getElementById(type + "-section");
      if (section) section.classList.remove("hidden");
    });
    // If no section matched, show all
    if (!document.querySelector(".section:not(.hidden)")) {
      document.querySelectorAll<HTMLElement>(".section").forEach((s) => s.classList.remove("hidden"));
    }
  }
}

app.ontoolresult = (result: ToolResultData) => {
  const data = result.structuredContent;
  const types = data?.change_types || [];
  renderForm(types);
};

app.ontoolinput = (input: ToolResultData) => {
  const data = input.structuredContent;
  const types = data?.change_types || [];
  renderForm(types);
};

// Form submission
const form = document.getElementById("form") as HTMLFormElement;
const statusEl = document.getElementById("status")!;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const fieldData: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (val) fieldData[key] = val as string;
  }
  if (Object.keys(fieldData).length === 0) {
    statusEl.className = "status error";
    statusEl.textContent = "Please fill in at least one field.";
    return;
  }
  statusEl.className = "status success";
  statusEl.textContent = "⏳ Submitting changes to Workday...";
  try {
    await app.callServerTool("update_workday_employee", {
      employee_id: "EMP-CURRENT",
      change_type: "multi-change",
      field_data_json: JSON.stringify(fieldData),
    });
    statusEl.textContent = "✅ Changes submitted successfully! You will receive a confirmation email within 24 hours.";
  } catch (err: any) {
    statusEl.className = "status error";
    statusEl.textContent = "❌ Submission failed: " + (err.message || "Unknown error");
  }
});

document.getElementById("cancelBtn")!.addEventListener("click", () => {
  app.requestTeardown();
});

// Connect to host (non-blocking — form is visible by default)
app.connect().catch(() => {});
