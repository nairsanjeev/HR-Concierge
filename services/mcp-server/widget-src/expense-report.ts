import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "expense-report", version: "1.0.0" });

interface ToolResultData {
  structuredContent?: { trip_name?: string | null };
}

function renderForm(tripName?: string | null) {
  const subtitle = document.getElementById("subtitle")!;
  if (tripName) {
    subtitle.textContent = `Expense report for: ${tripName}`;
    const input = document.querySelector<HTMLInputElement>('[name="trip_name"]');
    if (input) input.value = tripName;
  }
}

app.ontoolresult = (result: ToolResultData) => {
  renderForm(result.structuredContent?.trip_name);
};

app.ontoolinput = (input: ToolResultData) => {
  renderForm(input.structuredContent?.trip_name);
};

// Expense items
let items: { date: string; category: string; amount: string; description: string }[] = [];

function renderItems() {
  const list = document.getElementById("items-list")!;
  if (items.length === 0) {
    list.innerHTML = '<div style="color:#616161;font-size:13px;padding:8px">No items added yet. Use the form above to add expenses.</div>';
    return;
  }
  let total = 0;
  list.innerHTML = items
    .map((item, i) => {
      const amt = parseFloat(item.amount) || 0;
      total += amt;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#f9f9f9;border-radius:4px;margin-bottom:4px;border:1px solid #e0e0e0"><span>${item.date} — ${item.category}: ${item.description}</span><span style="display:flex;align-items:center;gap:8px"><strong>$${amt.toFixed(2)}</strong><button type="button" data-remove="${i}" style="background:none;border:none;color:#c50f1f;cursor:pointer;font-size:16px">×</button></span></div>`;
    })
    .join("");
  list.innerHTML += `<div style="text-align:right;padding:8px;font-weight:600">Total: $${total.toFixed(2)}</div>`;
  list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      items.splice(parseInt(btn.getAttribute("data-remove")!), 1);
      renderItems();
    });
  });
}

document.getElementById("addItemBtn")!.addEventListener("click", () => {
  const date = (document.querySelector<HTMLInputElement>('[name="item_date"]')!).value;
  const category = (document.querySelector<HTMLSelectElement>('[name="item_category"]')!).value;
  const amount = (document.querySelector<HTMLInputElement>('[name="item_amount"]')!).value;
  const description = (document.querySelector<HTMLInputElement>('[name="item_description"]')!).value;
  if (!date || !amount || !description) return;
  items.push({ date, category, amount, description });
  renderItems();
  // Clear inputs
  (document.querySelector<HTMLInputElement>('[name="item_date"]')!).value = "";
  (document.querySelector<HTMLInputElement>('[name="item_amount"]')!).value = "";
  (document.querySelector<HTMLInputElement>('[name="item_description"]')!).value = "";
});

const form = document.getElementById("form") as HTMLFormElement;
const statusEl = document.getElementById("status")!;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (items.length === 0) {
    statusEl.className = "status error";
    statusEl.textContent = "Please add at least one expense item.";
    return;
  }
  const tripName = (document.querySelector<HTMLInputElement>('[name="trip_name"]')!).value;
  statusEl.className = "status success";
  statusEl.textContent = "⏳ Submitting expense report...";
  try {
    const result = await app.callServerTool("submit_expense_report", {
      trip_name: tripName || undefined,
      items_json: JSON.stringify(items),
    });
    const text = result?.content?.[0]?.text || "Expense report submitted.";
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
renderItems();
