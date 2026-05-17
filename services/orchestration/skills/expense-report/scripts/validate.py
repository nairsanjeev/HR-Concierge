"""Expense report validation script.

Called by the agent via run_skill_script to validate an expense report
against company policy before submission.

Accepts a JSON string with a list of line items and returns validation results.
"""

import json
import sys
from datetime import datetime, timedelta

# ── Policy limits ────────────────────────────────────────────────────────────

CATEGORY_LIMITS = {
    "meals": {"individual": 75, "group": 50, "client": 150},
    "travel": {"rideshare": 75, "rental": 80, "mileage_rate": 0.67, "parking": 40},
    "lodging": {"domestic": 200, "high_cost": 350, "international": 400},
    "office-supplies": {"per_item": 50},
    "training": {"conference": 2500, "course": 1500, "books": 300},
    "client-entertainment": {"per_person": 150},
}

HIGH_COST_CITIES = {"NYC", "SF", "DC", "BOS", "LA", "SFO", "JFK", "LAX"}

RECEIPT_THRESHOLD = 25.0
SUBMISSION_DEADLINE_DAYS = 30
LATE_DEADLINE_DAYS = 60

APPROVAL_THRESHOLDS = [
    (500, "auto-approved"),
    (2000, "manager"),
    (10000, "vp"),
    (float("inf"), "cfo"),
]


def validate_expense_report(report_json: str) -> str:
    """Validate an expense report and return results as JSON."""
    report = json.loads(report_json)
    line_items = report.get("line_items", [])
    results = []
    total = 0.0
    flagged = 0
    missing_receipts = 0
    today = datetime.now()

    seen = set()

    for i, item in enumerate(line_items, 1):
        issues = []
        status = "valid"
        amount = float(item.get("amount", 0))
        category = item.get("category", "other").lower()
        description = item.get("description", "")
        has_receipt = item.get("receipt", False)
        date_str = item.get("date", "")
        subcategory = item.get("subcategory", "individual").lower()

        total += amount

        # Receipt check
        if amount >= RECEIPT_THRESHOLD and not has_receipt:
            issues.append(f"Receipt required for expenses >= ${RECEIPT_THRESHOLD}")
            missing_receipts += 1
            status = "warning"

        # Category-specific validation
        if category == "meals":
            limit = CATEGORY_LIMITS["meals"].get(subcategory, 75)
            if amount > limit:
                issues.append(
                    f"Amount ${amount:.2f} exceeds {subcategory} meal limit of ${limit}"
                )
                status = "violation"

        elif category == "lodging":
            city = item.get("city", "").upper()
            if city in HIGH_COST_CITIES:
                limit = CATEGORY_LIMITS["lodging"]["high_cost"]
            elif item.get("international", False):
                limit = CATEGORY_LIMITS["lodging"]["international"]
            else:
                limit = CATEGORY_LIMITS["lodging"]["domestic"]
            if amount > limit:
                issues.append(
                    f"Nightly rate ${amount:.2f} exceeds lodging limit of ${limit}"
                )
                status = "violation"

        elif category == "travel":
            transport = item.get("transport_type", "other").lower()
            if transport == "rideshare" and amount > CATEGORY_LIMITS["travel"]["rideshare"]:
                issues.append(f"Rideshare ${amount:.2f} exceeds ${CATEGORY_LIMITS['travel']['rideshare']} limit")
                status = "violation"

        elif category == "client-entertainment":
            if amount > 500 and not item.get("pre_approved", False):
                issues.append("Client entertainment over $500 requires pre-approval")
                status = "warning"

        elif category == "office-supplies":
            if amount > CATEGORY_LIMITS["office-supplies"]["per_item"]:
                issues.append(f"Office supply ${amount:.2f} exceeds per-item limit of $50")
                status = "warning"

        # Date validation
        if date_str:
            try:
                expense_date = datetime.strptime(date_str, "%Y-%m-%d")
                days_old = (today - expense_date).days
                if days_old > LATE_DEADLINE_DAYS:
                    issues.append(
                        f"Expense is {days_old} days old — exceeds 60-day limit, VP approval required"
                    )
                    status = "violation"
                elif days_old > SUBMISSION_DEADLINE_DAYS:
                    issues.append(
                        f"Expense is {days_old} days old — past 30-day deadline, submit ASAP"
                    )
                    if status == "valid":
                        status = "warning"
            except ValueError:
                issues.append("Invalid date format — use YYYY-MM-DD")
                status = "warning"

        # Duplicate check
        key = (date_str, category, f"{amount:.2f}")
        if key in seen:
            issues.append("Possible duplicate — same date, category, and amount as another item")
            if status == "valid":
                status = "warning"
        seen.add(key)

        if status != "valid":
            flagged += 1

        results.append({
            "line": i,
            "date": date_str,
            "category": category,
            "amount": amount,
            "status": status,
            "issues": issues,
        })

    # Determine approval level
    approval = "auto-approved"
    for threshold, level in APPROVAL_THRESHOLDS:
        if total <= threshold:
            approval = level
            break

    return json.dumps({
        "validation_results": results,
        "summary": {
            "total": round(total, 2),
            "line_items": len(line_items),
            "valid": len(line_items) - flagged,
            "flagged": flagged,
            "missing_receipts": missing_receipts,
            "approval_level": approval,
            "submittable": all(r["status"] != "violation" for r in results),
        },
    })


if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_json = sys.argv[1]
    else:
        input_json = sys.stdin.read()
    print(validate_expense_report(input_json))
