import { Activity, ActivityTypes } from "@microsoft/agents-activity";
import { AgentApplication, MemoryStorage, TurnContext } from "@microsoft/agents-hosting";
import config from "./config";
import {
  buildNameChangeFormCard, buildAddressChangeFormCard, buildBankDetailsFormCard,
  buildEmergencyContactFormCard, buildMarriageFormCard, buildBeneficiaryFormCard,
  buildNewBabyFormCard, buildGrievanceIntakeFormCard, buildExpenseReportFormCard,
} from "./cards";

// Tool display labels for reasoning output
const TOOL_LABELS: Record<string, string> = {
  query_knowledge_base: "🔍 Searching Knowledge Base",
  retrieve_policy_guidance: "📋 Retrieving Policy Guidance",
  assess_risk_and_compliance: "⚠️ Assessing Risk & Compliance",
  build_impact_map: "🗺️ Building Impact Map",
  submit_high_risk_changes: "🔒 Submitting High-Risk Changes",
  execute_self_service_changes: "✅ Executing Self-Service Changes",
  generate_completion_summary: "📊 Generating Summary",
  structure_narrative: "📝 Structuring Narrative",
  create_grievance_case: "🛡️ Creating Grievance Case",
  update_workday_employee: "👤 Updating Workday Record",
  get_workday_form_schema: "📄 Loading Form Schema",
  submit_expense_report: "💰 Submitting Expense Report",
};

// Map Workday change types to form card builders
const workdayFormBuilders: Record<string, () => object> = {
  "name-change": buildNameChangeFormCard,
  "address-change": buildAddressChangeFormCard,
  "bank-details": buildBankDetailsFormCard,
  "emergency-contact": buildEmergencyContactFormCard,
  "marriage": buildMarriageFormCard,
  "beneficiary-update": buildBeneficiaryFormCard,
  "new-baby": buildNewBabyFormCard,
};

function collectFormCards(
  tc: { name: string; arguments: Record<string, unknown>; result: string },
  cards: object[]
) {
  if (tc.name === "get_workday_form_schema") {
    const csv = (tc.arguments.change_types_csv as string) || "";
    for (const ct of csv.split(",").map((s) => s.trim())) {
      const builder = workdayFormBuilders[ct];
      if (builder) cards.push(builder());
    }
  } else if (tc.name === "update_workday_employee") {
    const ct = tc.arguments.change_type as string;
    const builder = ct ? workdayFormBuilders[ct] : undefined;
    if (builder) cards.push(builder());
  } else if (tc.name === "create_grievance_case" || tc.name === "structure_narrative") {
    cards.push(buildGrievanceIntakeFormCard());
  } else if (tc.name === "submit_expense_report") {
    cards.push(buildExpenseReportFormCard());
  }
}

// Conversation history: conversationId -> messages[]
const historyMap = new Map<string, Array<{ role: string; content: string }>>();
const MAX_HISTORY = 20;

const storage = new MemoryStorage();
export const agentApp = new AgentApplication({ storage });

agentApp.onConversationUpdate("membersAdded", async (_context: TurnContext) => {
  // No greeting — responses show orchestrator reasoning
});

agentApp.onActivity(ActivityTypes.Message, async (context: TurnContext) => {
 try {
  const userMessage = context.activity.text;
  console.log(">>> MESSAGE RECEIVED:", userMessage);
  if (!userMessage) return;

  const conversationId = context.activity.conversation?.id || "default";

  // Maintain conversation history
  if (!historyMap.has(conversationId)) {
    historyMap.set(conversationId, []);
  }
  const history = historyMap.get(conversationId)!;
  history.push({ role: "user", content: userMessage });

  // Trim to last N messages
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  // Send typing indicator while waiting
  await context.sendActivity(Activity.fromObject({ type: "typing" }));

  // Call the orchestrator (same backend as React web app)
  const orchestratorUrl = `${config.orchestratorUrl}/api/invoke`;
  console.log(">>> Calling orchestrator:", orchestratorUrl);

  const response = await fetch(orchestratorUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userMessage,
      conversation_id: conversationId,
      history: history.slice(0, -1), // exclude current message (sent separately)
    }),
    signal: AbortSignal.timeout(90000), // 90s timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(">>> Orchestrator error:", response.status, errorText);
    await context.sendActivity(
      `⚠️ I encountered an issue processing your request (HTTP ${response.status}). Please try again.`
    );
    return;
  }

  const result = await response.json() as {
    answer: string;
    reasoning: string;
    tool_calls: Array<{ name: string; arguments: Record<string, unknown>; result: string }>;
  };

  console.log(">>> Orchestrator responded with", result.tool_calls.length, "tool calls");

  // Collect any form cards triggered by tool calls
  const formCards: object[] = [];
  for (const tc of result.tool_calls) {
    collectFormCards(tc, formCards);
  }

  // Build response text with visible reasoning chain
  let responseText = "";

  // Always show the orchestrator's reasoning/intent classification
  if (result.reasoning) {
    responseText += `**🧠 Orchestrator reasoning:**\n${result.reasoning}\n\n`;
  }

  // Show tool calls if any
  if (result.tool_calls.length > 0) {
    const toolLines = result.tool_calls.map((tc) => {
      const label = TOOL_LABELS[tc.name] || `🔧 ${tc.name}`;
      const args = Object.entries(tc.arguments)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(", ");
      return `- ${label} *(${args})*`;
    });
    responseText += `**⚡ Tools executed:**\n${toolLines.join("\n")}\n\n`;
  }

  responseText += `---\n\n${result.answer}`;
  responseText += `\n\n---\n\n📌 *For more details on your HR steps, policies, and self-service options, visit HR Policy Web.*`;

  // Hero card with button linking to the HR Policy Web portal
  const portalCard = {
    contentType: "application/vnd.microsoft.card.hero",
    content: {
      buttons: [
        {
          type: "openUrl",
          title: "Open HR Policy Web",
          value: "https://hr-concierge-web.whiteglacier-f04ad88c.eastus2.azurecontainerapps.io/portal",
        },
      ],
    },
  };

  // Send a single response: reasoning + answer text + form cards + portal link
  const activity = Activity.fromObject({
    type: ActivityTypes.Message,
    text: responseText,
    attachments: [
      ...formCards.map((card) => ({
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      })),
      portalCard,
    ],
  });
  await context.sendActivity(activity);

  // Save assistant response to history
  history.push({ role: "assistant", content: result.answer });

 } catch (err: any) {
    console.error("MESSAGE HANDLER ERROR:", err?.message || err, err?.stack);
    await context.sendActivity(`⚠️ Error: ${err?.message || "Unknown error"}`);
 }
});
