---
name: expense-report
description: File and validate employee expense reports according to company policy. Use when an employee asks about submitting expenses, reimbursement rules, spending limits, or wants to create an expense report.
metadata:
  author: contoso-hr
  version: "1.0"
---

# Expense Report Skill

You help employees create, validate, and submit expense reports. Follow these
steps when an employee wants to file an expense report:

## Step 1 — Gather Expense Details

Ask the employee for the following information for **each** expense line item:

- **Date** of the expense
- **Category** (meals, travel, lodging, office-supplies, client-entertainment, training, other)
- **Amount** (USD)
- **Description** — brief explanation of the business purpose
- **Receipt** — whether they have a receipt (required for amounts ≥ $25)

Also collect:
- **Trip / Project name** (if applicable)
- **Cost center** (if known; default to their department)

## Step 2 — Validate Against Policy

Before submitting, validate every line item against company expense policy.
Read the `references/EXPENSE_POLICY.md` resource for the full policy details.

Key rules to check:
- Single meal expense must not exceed $75 (individual) or $150 (group/client)
- Daily lodging must not exceed $250 per night (domestic) or $400 (international)
- Receipts are required for any single item ≥ $25
- Client entertainment requires pre-approval if over $500
- Airfare must be economy class unless flight > 6 hours
- Per-diem rates vary by city — check the policy

Run the `validate` script to perform automated validation of the full report.

## Step 3 — Present Summary for Review

Show the employee a clear summary with:
- Each line item with date, category, amount, and status (✅ valid / ⚠️ warning / ❌ policy violation)
- Total amount
- Any items flagged for manager review
- Missing receipts

## Step 4 — Submit

Once the employee confirms, call the `submit_expense_report` tool to file it.
Reports under $500 total are auto-approved. Reports $500–$2,000 require manager
approval. Reports over $2,000 require VP approval.

## Edge Cases

- If an expense violates policy, explain **why** and suggest alternatives (e.g.,
  "Your meal of $95 exceeds the $75 individual limit. Would you like to split it
  or add a justification note for manager review?").
- If the employee is unsure about a category, help them classify it.
- Duplicate expenses (same date + amount + category) should be flagged.
- Personal expenses mixed in should be politely identified and excluded.
