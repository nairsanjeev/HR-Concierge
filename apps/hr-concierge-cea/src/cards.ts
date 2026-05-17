/**
 * Adaptive Card builders for the HR Concierge CEA.
 *
 * Cards:
 * - Thinking/reasoning indicator
 * - Tool call reasoning display (like Microsoft Researcher)
 * - Final answer
 * - Workday forms (name-change, address, bank, emergency-contact, marriage, beneficiary, preferred-name, new-baby)
 * - Grievance intake form
 * - Expense report form
 */

// ─── Thinking Card ──────────────────────────────────────────────────────────

export function buildThinkingCard(status: string) {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [
              {
                type: "Image",
                url: "https://img.icons8.com/fluency/48/loading-circle.png",
                size: "Small",
              },
            ],
            verticalContentAlignment: "Center",
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "TextBlock",
                text: "🧠 **Thinking...**",
                wrap: true,
                size: "Medium",
              },
              {
                type: "TextBlock",
                text: status,
                wrap: true,
                isSubtle: true,
                size: "Small",
              },
            ],
            verticalContentAlignment: "Center",
          },
        ],
      },
    ],
  };
}

// ─── Tool Call Card (Reasoning Display) ─────────────────────────────────────

export function buildToolCallCard(toolName: string, argsJson: string) {
  let argsDisplay: string;
  try {
    const parsed = JSON.parse(argsJson);
    argsDisplay = Object.entries(parsed)
      .map(([k, v]) => `• **${k}**: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");
  } catch {
    argsDisplay = argsJson.substring(0, 200);
  }

  const toolLabels: Record<string, string> = {
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

  const label = toolLabels[toolName] || `🔧 ${toolName}`;

  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "Container",
        style: "emphasis",
        bleed: true,
        items: [
          {
            type: "TextBlock",
            text: label,
            weight: "Bolder",
            size: "Medium",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: argsDisplay,
            wrap: true,
            size: "Small",
            isSubtle: true,
          },
        ],
      },
    ],
  };
}

// ─── Combined Response Card (reasoning + answer in one card) ────────────────

const toolLabels: Record<string, string> = {
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

export function buildCombinedResponseCard(
  toolCalls: Array<{ name: string; arguments: Record<string, unknown>; result: string }>,
  answer: string
) {
  const body: object[] = [];

  // Add tool reasoning summary (collapsed/subtle)
  if (toolCalls.length > 0) {
    const steps = toolCalls.map((tc) => {
      const label = toolLabels[tc.name] || `🔧 ${tc.name}`;
      return `${label}`;
    }).join("  →  ");

    body.push({
      type: "Container",
      style: "emphasis",
      items: [
        {
          type: "TextBlock",
          text: steps,
          wrap: true,
          size: "Small",
          isSubtle: true,
        },
      ],
    });
  }

  // Add the main answer
  body.push({
    type: "TextBlock",
    text: answer,
    wrap: true,
    size: "Default",
  });

  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body,
  };
}

// ─── Final Answer Card ──────────────────────────────────────────────────────

export function buildFinalAnswerCard(answer: string) {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: answer,
        wrap: true,
        size: "Default",
      },
    ],
  };
}

// ─── Workday Form Cards ─────────────────────────────────────────────────────

export function buildNameChangeFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "📝 Legal Name Change", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Please provide the following information to process your legal name change.", wrap: true, isSubtle: true },
      // Current Name
      { type: "TextBlock", text: "**Current Name**", spacing: "Medium" },
      { type: "Input.Text", id: "current_legal_first", label: "Current Legal First Name", isRequired: true },
      { type: "Input.Text", id: "current_legal_last", label: "Current Legal Last Name", isRequired: true },
      // New Name
      { type: "TextBlock", text: "**New Name**", spacing: "Medium" },
      { type: "Input.Text", id: "new_legal_first", label: "New Legal First Name", isRequired: true },
      { type: "Input.Text", id: "new_legal_last", label: "New Legal Last Name", isRequired: true },
      // Details
      {
        type: "Input.ChoiceSet",
        id: "reason",
        label: "Reason for Change",
        isRequired: true,
        choices: [
          { title: "Marriage", value: "marriage" },
          { title: "Court Order", value: "court_order" },
          { title: "Personal Preference", value: "personal" },
          { title: "Other", value: "other" },
        ],
      },
      { type: "Input.Date", id: "effective_date", label: "Effective Date", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "document_type",
        label: "Supporting Document Type",
        isRequired: true,
        choices: [
          { title: "Marriage Certificate", value: "marriage_cert" },
          { title: "Court Order", value: "court_order" },
          { title: "Government ID", value: "govt_id" },
        ],
      },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Name Change", data: { action: "submit_workday", form_type: "name-change" } },
    ],
  };
}

export function buildAddressChangeFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "🏠 Address Update", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Enter your new address details below.", wrap: true, isSubtle: true },
      { type: "Input.Text", id: "address_line1", label: "Street Address", isRequired: true },
      { type: "Input.Text", id: "address_line2", label: "Apt / Suite / Unit" },
      { type: "Input.Text", id: "city", label: "City", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "state",
        label: "State",
        isRequired: true,
        choices: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => ({ title: s, value: s })),
      },
      { type: "Input.Text", id: "zip_code", label: "ZIP Code", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "country",
        label: "Country",
        isRequired: true,
        choices: [
          { title: "United States", value: "US" },
          { title: "Canada", value: "CA" },
          { title: "United Kingdom", value: "UK" },
        ],
      },
      { type: "Input.Date", id: "effective_date", label: "Move Date", isRequired: true },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Address Change", data: { action: "submit_workday", form_type: "address-change" } },
    ],
  };
}

export function buildBankDetailsFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "🏦 Direct Deposit / Bank Details", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Update your bank account for payroll direct deposit.", wrap: true, isSubtle: true },
      { type: "Input.Text", id: "bank_name", label: "Bank Name", isRequired: true },
      { type: "Input.Text", id: "routing_number", label: "Routing Number", isRequired: true },
      { type: "Input.Text", id: "account_number", label: "Account Number", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "account_type",
        label: "Account Type",
        isRequired: true,
        choices: [
          { title: "Checking", value: "checking" },
          { title: "Savings", value: "savings" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "deposit_type",
        label: "Deposit Type",
        isRequired: true,
        choices: [
          { title: "Full Deposit", value: "full" },
          { title: "Partial Amount", value: "partial" },
          { title: "Remainder", value: "remainder" },
        ],
      },
      { type: "Input.Text", id: "deposit_amount", label: "Amount (if partial)" },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Bank Details", data: { action: "submit_workday", form_type: "bank-details" } },
    ],
  };
}

export function buildEmergencyContactFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "🚨 Emergency Contact", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Add or update your emergency contact information.", wrap: true, isSubtle: true },
      { type: "Input.Text", id: "contact_name", label: "Contact Full Name", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "relationship",
        label: "Relationship",
        isRequired: true,
        choices: [
          { title: "Spouse / Partner", value: "spouse" },
          { title: "Parent", value: "parent" },
          { title: "Sibling", value: "sibling" },
          { title: "Friend", value: "friend" },
          { title: "Other", value: "other" },
        ],
      },
      { type: "Input.Text", id: "phone", label: "Phone Number", isRequired: true },
      { type: "Input.Text", id: "email", label: "Email Address" },
      {
        type: "Input.ChoiceSet",
        id: "is_primary",
        label: "Primary Contact?",
        isRequired: true,
        choices: [
          { title: "Yes", value: "true" },
          { title: "No", value: "false" },
        ],
      },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Emergency Contact", data: { action: "submit_workday", form_type: "emergency-contact" } },
    ],
  };
}

export function buildMarriageFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "💍 Marriage Event", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Congratulations! Please provide details to update your records.", wrap: true, isSubtle: true },
      { type: "TextBlock", text: "**Spouse Information**", spacing: "Medium" },
      { type: "Input.Text", id: "spouse_first_name", label: "Spouse First Name", isRequired: true },
      { type: "Input.Text", id: "spouse_last_name", label: "Spouse Last Name", isRequired: true },
      { type: "Input.Date", id: "marriage_date", label: "Date of Marriage", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "name_changing",
        label: "Are you changing your last name?",
        isRequired: true,
        choices: [
          { title: "Yes", value: "yes" },
          { title: "No", value: "no" },
        ],
      },
      { type: "Input.Text", id: "new_last_name", label: "New Last Name (if changing)" },
      {
        type: "Input.ChoiceSet",
        id: "add_spouse_benefits",
        label: "Add spouse to benefits?",
        isRequired: true,
        choices: [
          { title: "Yes", value: "yes" },
          { title: "No", value: "no" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "update_tax_status",
        label: "Update tax filing status?",
        isRequired: true,
        choices: [
          { title: "Yes – Married Filing Jointly", value: "mfj" },
          { title: "Yes – Married Filing Separately", value: "mfs" },
          { title: "No change", value: "no" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "document_type",
        label: "Supporting Document",
        isRequired: true,
        choices: [
          { title: "Marriage Certificate", value: "marriage_cert" },
          { title: "Government ID", value: "govt_id" },
        ],
      },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Marriage Updates", data: { action: "submit_workday", form_type: "marriage" } },
    ],
  };
}

export function buildBeneficiaryFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "👥 Beneficiary Update", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Update your benefit plan beneficiary designations.", wrap: true, isSubtle: true },
      { type: "Input.Text", id: "beneficiary_name", label: "Beneficiary Full Name", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "beneficiary_relation",
        label: "Relationship",
        isRequired: true,
        choices: [
          { title: "Spouse", value: "spouse" },
          { title: "Child", value: "child" },
          { title: "Parent", value: "parent" },
          { title: "Other", value: "other" },
        ],
      },
      { type: "Input.Text", id: "beneficiary_pct", label: "Benefit Percentage (%)", isRequired: true, placeholder: "e.g., 100" },
      {
        type: "Input.ChoiceSet",
        id: "benefit_plan",
        label: "Benefit Plan",
        isRequired: true,
        choices: [
          { title: "Life Insurance", value: "life" },
          { title: "401(k)", value: "401k" },
          { title: "All Plans", value: "all" },
        ],
      },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Beneficiary Update", data: { action: "submit_workday", form_type: "beneficiary-update" } },
    ],
  };
}

export function buildNewBabyFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "👶 New Baby / Dependent", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Congratulations! Add your new dependent and update benefits.", wrap: true, isSubtle: true },
      { type: "TextBlock", text: "**Child Information**", spacing: "Medium" },
      { type: "Input.Text", id: "child_first_name", label: "Child's First Name", isRequired: true },
      { type: "Input.Text", id: "child_last_name", label: "Child's Last Name", isRequired: true },
      { type: "Input.Date", id: "date_of_birth", label: "Date of Birth", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "sex",
        label: "Sex",
        isRequired: true,
        choices: [
          { title: "Male", value: "male" },
          { title: "Female", value: "female" },
        ],
      },
      { type: "TextBlock", text: "**Benefits Enrollment**", spacing: "Medium" },
      {
        type: "Input.ChoiceSet",
        id: "add_to_health",
        label: "Add to health insurance?",
        isRequired: true,
        choices: [
          { title: "Yes – Medical only", value: "medical" },
          { title: "Yes – Medical + Dental + Vision", value: "full" },
          { title: "No", value: "no" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "health_plan",
        label: "Health Plan",
        isRequired: true,
        choices: [
          { title: "Employee + Child(ren)", value: "emp_child" },
          { title: "Family", value: "family" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "add_to_life_insurance",
        label: "Add as life insurance beneficiary?",
        isRequired: true,
        choices: [
          { title: "Yes", value: "yes" },
          { title: "No", value: "no" },
        ],
      },
      { type: "TextBlock", text: "**Tax & Parental Leave**", spacing: "Medium" },
      {
        type: "Input.ChoiceSet",
        id: "update_tax",
        label: "Update tax withholdings?",
        isRequired: true,
        choices: [
          { title: "Yes – Add dependent", value: "yes" },
          { title: "No change", value: "no" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "parental_leave",
        label: "Request parental leave?",
        isRequired: true,
        choices: [
          { title: "Yes – Paid Parental Leave", value: "paid" },
          { title: "Yes – FMLA", value: "fmla" },
          { title: "Yes – Both", value: "both" },
          { title: "No", value: "no" },
        ],
      },
      { type: "Input.Date", id: "leave_start", label: "Leave Start Date" },
      { type: "Input.Date", id: "leave_end", label: "Leave End Date (estimated)" },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit New Dependent", data: { action: "submit_workday", form_type: "new-baby" } },
    ],
  };
}

// ─── Grievance Intake Form Card ─────────────────────────────────────────────

export function buildGrievanceIntakeFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "🛡️ Grievance / Workplace Concern Intake", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Your information is treated confidentially. Please provide details below.", wrap: true, isSubtle: true },
      // Incident Details
      { type: "TextBlock", text: "**Incident Details**", spacing: "Large" },
      { type: "Input.Text", id: "description", label: "Describe what happened", isRequired: true, isMultiline: true, placeholder: "Provide as much detail as possible about the incident(s)..." },
      {
        type: "Input.ChoiceSet",
        id: "category",
        label: "Type of Concern",
        isRequired: true,
        choices: [
          { title: "Harassment", value: "harassment" },
          { title: "Discrimination", value: "discrimination" },
          { title: "Retaliation", value: "retaliation" },
          { title: "Bullying", value: "bullying" },
          { title: "Hostile Work Environment", value: "hostile" },
          { title: "Unfair Treatment", value: "unfair-treatment" },
          { title: "Other", value: "other" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "frequency",
        label: "Frequency",
        isRequired: true,
        choices: [
          { title: "One-time incident", value: "one-time" },
          { title: "Happened a few times", value: "few-times" },
          { title: "Ongoing / repeated pattern", value: "ongoing" },
        ],
      },
      // Timeline
      { type: "TextBlock", text: "**Timeline & Dates**", spacing: "Large" },
      { type: "Input.Date", id: "date_of_incident", label: "Date of Most Recent Incident", isRequired: true },
      { type: "Input.Date", id: "date_first", label: "Date of First Incident (if recurring)" },
      { type: "Input.Text", id: "location", label: "Location of Incident", placeholder: "e.g., Office floor 3, conference room, virtual meeting" },
      // People
      { type: "TextBlock", text: "**People Involved**", spacing: "Large" },
      { type: "Input.Text", id: "respondent", label: "Name(s) of Person(s) Involved", isRequired: true, placeholder: "Name and title/role if known" },
      {
        type: "Input.ChoiceSet",
        id: "respondent_relation",
        label: "Relationship to You",
        isRequired: true,
        choices: [
          { title: "Direct Manager", value: "manager" },
          { title: "Skip-Level Manager", value: "skip-level" },
          { title: "Peer / Coworker", value: "peer" },
          { title: "Direct Report", value: "report" },
          { title: "Other Department", value: "other-dept" },
          { title: "External Party", value: "external" },
        ],
      },
      { type: "Input.Text", id: "witnesses", label: "Witnesses (if any)", placeholder: "Names of anyone who observed these incidents" },
      // Prior Actions
      { type: "TextBlock", text: "**Prior Actions & Evidence**", spacing: "Large" },
      {
        type: "Input.ChoiceSet",
        id: "previously_reported",
        label: "Have you reported this before?",
        isRequired: true,
        choices: [
          { title: "No — this is my first report", value: "no" },
          { title: "Yes — to my manager", value: "yes-manager" },
          { title: "Yes — to HR", value: "yes-hr" },
          { title: "Yes — to a colleague", value: "yes-colleague" },
        ],
      },
      { type: "Input.Text", id: "prior_response", label: "What was the response (if reported)?", placeholder: "Describe any response or action taken previously" },
      {
        type: "Input.ChoiceSet",
        id: "evidence",
        label: "Supporting Evidence",
        isRequired: true,
        choices: [
          { title: "I have emails / messages", value: "emails" },
          { title: "I have written notes", value: "notes" },
          { title: "I have witness statements", value: "witness-statements" },
          { title: "Multiple forms of evidence", value: "multiple" },
          { title: "No documentation at this time", value: "none" },
        ],
      },
      // Desired Outcome
      { type: "TextBlock", text: "**Desired Outcome**", spacing: "Large" },
      {
        type: "Input.ChoiceSet",
        id: "desired_outcome",
        label: "What outcome would you like?",
        isRequired: true,
        choices: [
          { title: "Formal investigation", value: "investigation" },
          { title: "Mediation / facilitated conversation", value: "mediation" },
          { title: "Transfer or separation from respondent", value: "separation" },
          { title: "Acknowledgment and corrective action", value: "corrective" },
          { title: "I'm unsure — I need guidance", value: "unsure" },
        ],
      },
      {
        type: "Input.ChoiceSet",
        id: "urgency",
        label: "Do you feel safe in your current work environment?",
        isRequired: true,
        choices: [
          { title: "Yes — I feel safe", value: "safe" },
          { title: "Somewhat — I feel uncomfortable", value: "uncomfortable" },
          { title: "No — I feel unsafe", value: "unsafe" },
        ],
      },
      { type: "Input.Text", id: "additional_info", label: "Anything else you'd like to share?", isMultiline: true, placeholder: "Any additional context or concerns..." },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Grievance", data: { action: "submit_grievance" } },
    ],
  };
}

// ─── Expense Report Form Card ───────────────────────────────────────────────

export function buildExpenseReportFormCard() {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "💰 Expense Report", weight: "Bolder", size: "Large" },
      { type: "TextBlock", text: "Submit your expense items for reimbursement.", wrap: true, isSubtle: true },
      { type: "Input.Text", id: "trip_name", label: "Trip / Purpose", isRequired: true, placeholder: "e.g., Client meeting in Chicago" },
      { type: "Input.Date", id: "trip_start_date", label: "Start Date", isRequired: true },
      { type: "Input.Date", id: "trip_end_date", label: "End Date", isRequired: true },
      // Line items
      { type: "TextBlock", text: "**Expense Item 1**", spacing: "Large" },
      { type: "Input.Date", id: "item1_date", label: "Date", isRequired: true },
      {
        type: "Input.ChoiceSet",
        id: "item1_category",
        label: "Category",
        isRequired: true,
        choices: [
          { title: "Airfare", value: "airfare" },
          { title: "Hotel / Lodging", value: "hotel" },
          { title: "Ground Transportation", value: "transport" },
          { title: "Meals & Entertainment", value: "meals" },
          { title: "Conference / Registration", value: "conference" },
          { title: "Office Supplies", value: "supplies" },
          { title: "Other", value: "other" },
        ],
      },
      { type: "Input.Number", id: "item1_amount", label: "Amount ($)", isRequired: true, placeholder: "0.00" },
      { type: "Input.Text", id: "item1_description", label: "Description", placeholder: "Brief description of expense" },
      // Line item 2
      { type: "TextBlock", text: "**Expense Item 2** (optional)", spacing: "Large" },
      { type: "Input.Date", id: "item2_date", label: "Date" },
      {
        type: "Input.ChoiceSet",
        id: "item2_category",
        label: "Category",
        choices: [
          { title: "Airfare", value: "airfare" },
          { title: "Hotel / Lodging", value: "hotel" },
          { title: "Ground Transportation", value: "transport" },
          { title: "Meals & Entertainment", value: "meals" },
          { title: "Conference / Registration", value: "conference" },
          { title: "Office Supplies", value: "supplies" },
          { title: "Other", value: "other" },
        ],
      },
      { type: "Input.Number", id: "item2_amount", label: "Amount ($)", placeholder: "0.00" },
      { type: "Input.Text", id: "item2_description", label: "Description" },
      // Line item 3
      { type: "TextBlock", text: "**Expense Item 3** (optional)", spacing: "Large" },
      { type: "Input.Date", id: "item3_date", label: "Date" },
      {
        type: "Input.ChoiceSet",
        id: "item3_category",
        label: "Category",
        choices: [
          { title: "Airfare", value: "airfare" },
          { title: "Hotel / Lodging", value: "hotel" },
          { title: "Ground Transportation", value: "transport" },
          { title: "Meals & Entertainment", value: "meals" },
          { title: "Conference / Registration", value: "conference" },
          { title: "Office Supplies", value: "supplies" },
          { title: "Other", value: "other" },
        ],
      },
      { type: "Input.Number", id: "item3_amount", label: "Amount ($)", placeholder: "0.00" },
      { type: "Input.Text", id: "item3_description", label: "Description" },
    ],
    actions: [
      { type: "Action.Submit", title: "Submit Expense Report", data: { action: "submit_expense" } },
    ],
  };
}

// ─── Helper: Get form card by change type ───────────────────────────────────

export function getFormCardForType(changeType: string) {
  const cardMap: Record<string, () => object> = {
    "name-change": buildNameChangeFormCard,
    "address-change": buildAddressChangeFormCard,
    "bank-details": buildBankDetailsFormCard,
    "emergency-contact": buildEmergencyContactFormCard,
    "marriage": buildMarriageFormCard,
    "beneficiary-update": buildBeneficiaryFormCard,
    "preferred-name": () => ({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        { type: "TextBlock", text: "✨ Preferred Name", weight: "Bolder", size: "Large" },
        { type: "TextBlock", text: "Update how you'd like to be addressed in company systems.", wrap: true, isSubtle: true },
        { type: "Input.Text", id: "preferred_first", label: "Preferred First Name", isRequired: true },
        { type: "Input.Text", id: "preferred_last", label: "Preferred Last Name" },
        { type: "Input.Text", id: "display_name", label: "Display Name", placeholder: "How you would like to be addressed" },
      ],
      actions: [
        { type: "Action.Submit", title: "Update Preferred Name", data: { action: "submit_workday", form_type: "preferred-name" } },
      ],
    }),
    "new-baby": buildNewBabyFormCard,
  };

  const builder = cardMap[changeType];
  return builder ? builder() : null;
}
