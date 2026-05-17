# HR Conciergedev — Test Prompts

Use these prompts to test all capabilities of the HR Conciergedev Custom Engine Agent in M365 Chat.

---

## 1. Life Events & Personal Data Changes

### Legal Name Change (High Risk)
```
I need to change my legal name
```
```
I recently changed my legal name from Sarah Johnson to Sarah Mitchell after my divorce. Please help me update it.
```
```
My name is now legally different — how do I update it in Workday?
```

### Marriage
```
I just got married
```
```
I got married last weekend and need to update my last name, add my spouse to benefits, and change my emergency contact.
```
```
I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details.
```

### New Baby / Dependent
```
I'm having a baby
```
```
I just had a baby and need to add them to my health insurance, update my tax withholdings, and request parental leave.
```
```
My wife just had twins — what do I need to update?
```

### Address Change (Low Risk)
```
Update my address
```
```
I moved to a new state — update my address and tax info.
```
```
I moved from California to Texas last month. I need to update my home address and state tax withholding.
```

### Bank Details / Direct Deposit (High Risk)
```
Update my bank details
```
```
Update my bank details for direct deposit.
```
```
I switched banks and need to change my direct deposit ACH routing and account numbers.
```

### Emergency Contact (Low Risk)
```
I need to update my emergency contact information.
```
```
Change my emergency contact to my wife Maria, phone 555-123-4567.
```

### Beneficiary Update (High Risk)
```
I need to update my life insurance beneficiary.
```
```
After my divorce, I want to remove my ex-spouse as beneficiary and add my sister instead.
```

### Multi-Change Requests
```
I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details.
```
```
I'm going through a divorce. I need to change my last name back, update my beneficiary, remove my ex from my health plan, and change my emergency contact.
```
```
Life event: I adopted a child. I need to add a dependent, update my benefits, change my tax withholding, and update my emergency contact.
```

---

## 2. Grievances & Workplace Concerns

### General Grievance
```
File a grievance
```
```
I want to file a workplace grievance.
```

### Unfair Treatment
```
My manager excludes me from meetings and I feel treated unfairly.
```
```
I've been consistently passed over for promotions despite exceeding my targets. I believe there's bias involved.
```

### Harassment
```
I want to report workplace harassment.
```
```
A coworker has been making inappropriate comments about my appearance. I want to file a formal complaint.
```

### Hostile Work Environment
```
My team lead creates a toxic environment by yelling at people in meetings. Multiple colleagues have witnessed this.
```

### Retaliation
```
After I reported a safety concern last month, my manager cut my hours and moved me to a less desirable shift. I believe this is retaliation.
```

### Discrimination
```
I believe I was denied a reasonable accommodation for my disability. I submitted the request three months ago and haven't heard back.
```

### Urgent Safety Concern
```
I feel unsafe at work. A colleague made threatening remarks yesterday and I don't want to be alone with them.
```

---

## 3. Expense Reports

### Basic Expense
```
Submit expense report
```
```
I need to submit an expense report for my trip to Chicago.
```

### Multiple Items
```
Help me expense a client dinner ($120) and an Uber ($35).
```
```
I need to submit expenses: flight to NYC ($450), hotel 2 nights ($380), meals ($95), and ground transport ($60).
```

### Conference/Training
```
I attended a 3-day conference in San Francisco. Total expenses were: registration $800, flights $550, hotel $600, meals $150, and taxi $45.
```

### Simple Receipt
```
I need to expense a $45 team lunch from yesterday.
```

---

## 4. HR Policy Questions

### PTO / Leave
```
What is our PTO policy?
```
```
How many PTO days do I get per year?
```
```
How do I request FMLA?
```
```
What's the policy on carrying over unused PTO to next year?
```
```
Can I cash out my unused vacation days?
```

### Benefits
```
What does our 401(k) match policy look like?
```
```
When is open enrollment?
```
```
What health insurance options are available?
```
```
Do we offer HSA or FSA accounts?
```
```
What's our parental leave policy?
```

### Payroll & Tax
```
When do I get paid? What are the pay periods?
```
```
How do I update my W-4 tax withholding?
```
```
What are our payroll deduction options?
```

### General Policies
```
What is the company dress code policy?
```
```
What's the remote work / work from home policy?
```
```
What's the process for requesting a transfer to another department?
```
```
What is the code of conduct?
```
```
What is the policy on outside employment or moonlighting?
```

---

## 5. Complex Multi-Step Scenarios

### Scenario: Relocation
```
I'm relocating from New York to Austin, Texas for personal reasons. I need to update my address, change my state tax withholding, and find out if my benefits change.
```

### Scenario: Life Event w/ Multiple System Changes
```
I recently got married and we're expecting a baby in 3 months. I need to: change my last name, add my spouse to health insurance, start looking at adding a dependent soon, and update my tax withholdings from single to married filing jointly.
```

### Scenario: Separation/Divorce
```
I'm going through a separation. I need to change my emergency contact, update my beneficiary designations, and understand my options for keeping my current health plan.
```

### Scenario: Death in Family
```
My father passed away. I need to take bereavement leave, update my beneficiary information since he was listed, and understand if there are any EAP resources available.
```

### Scenario: Return from Leave
```
I'm returning from maternity leave next week. What do I need to do to ensure my benefits are active and my direct deposit goes to my new bank account?
```

---

## 6. Edge Cases & Error Handling

### Vague/Ambiguous Requests
```
I need help with something personal.
```
```
Things are changing in my life and I need to update some stuff.
```
```
Can you help me?
```

### Out of Scope
```
What's the weather today?
```
```
Can you book me a flight to Chicago?
```
```
Write me a Python script.
```

### Follow-ups
```
What's the status of my last request?
```
```
Can you show me what we discussed earlier?
```

---

## 7. Conversation Starters (Pre-configured)

These are the built-in conversation starters visible in the M365 Chat UI:

| Starter | Expected Behavior |
|---------|-------------------|
| "How can you help me?" | Overview of capabilities |
| "I need to change my legal name" | Triggers Workday form (name-change) |
| "I just got married" | Triggers Workday form (marriage, name-change, beneficiary) |
| "I'm having a baby" | Triggers Workday form (beneficiary, dependent) |
| "Update my address" | Triggers Workday form (address-change) |
| "Update my bank details" | Triggers Workday form (bank-details) — high risk |
| "File a grievance" | Triggers grievance intake form |
| "Submit expense report" | Triggers expense form |
| "What is our PTO policy?" | Knowledge base query |
| "How do I request FMLA?" | Knowledge base query |

---

## Expected Tool Invocations

| Prompt Category | Expected Tools Called |
|----------------|---------------------|
| Name/Address/Emergency Contact changes | `get_workday_form_schema` → `assess_risk_and_compliance` → `execute_self_service_changes` or `submit_high_risk_changes` → `generate_completion_summary` |
| Bank details / Beneficiary changes | `get_workday_form_schema` → `assess_risk_and_compliance` → `submit_high_risk_changes` → `generate_completion_summary` |
| Grievances | `structure_narrative` → `create_grievance_case` |
| Expense reports | `submit_expense_report` |
| Policy questions | `query_knowledge_base` and/or `retrieve_policy_guidance` |
| Complex multi-change | `get_workday_form_schema` → `assess_risk_and_compliance` → `build_impact_map` → combination of `execute_self_service_changes` + `submit_high_risk_changes` → `generate_completion_summary` |

---

## Testing Checklist

- [ ] Bot responds within 15 seconds (no timeout)
- [ ] Adaptive Cards render correctly in M365 Chat
- [ ] Thinking/progress indicators appear
- [ ] Tool call cards show which tool is being invoked
- [ ] Final answer card displays properly
- [ ] High-risk changes show proper risk warnings
- [ ] Low-risk changes execute immediately
- [ ] Grievance form renders with confidentiality notice
- [ ] Expense form renders with line item fields
- [ ] Knowledge base returns relevant policy snippets
- [ ] Multi-turn conversations maintain context
- [ ] Error responses are user-friendly (not raw error dumps)
