"""Test all prompt gallery prompts for correct scenario classification + proper events."""
import requests
import json
import time

# All prompts from the prompt gallery
PROMPTS = [
    # Life Events
    ("I got married and need to update my name, benefits, and emergency contact.", "life-event", ["marriage", "name-change", "emergency-contact"]),
    ("I moved to a new state — update my address and tax info.", "life-event", ["address-change"]),
    ("Update my bank details for direct deposit.", "life-event", ["bank-details"]),
    ("I need to change my preferred name and pronouns.", "life-event", ["preferred-name"]),
    ("Update my passport information and government ID.", "life-event", ["id-update"]),
    # Workplace Concerns
    ("My manager excludes me from meetings and I feel treated unfairly.", "grievance", []),
    ("I'm experiencing what I believe is age discrimination.", "grievance", []),
    ("I want to report workplace harassment.", "grievance", []),
    ("I'm not sure if my issue is a formal grievance or a team conflict.", "grievance", []),
    # Quick Actions
    ("Update my emergency contact information.", "life-event", ["emergency-contact"]),
    ("Change my preferred name.", "life-event", ["preferred-name"]),
    ("What documents do I need for a legal name change?", "life-event", ["name-change"]),
    ("I just had a baby and need to add them to my health insurance, update my tax withholdings, and request parental leave.", "life-event", ["new-baby"]),
]


def test_prompt(prompt, expected_scenario, expected_intents):
    """Send a prompt and check classification + events."""
    try:
        resp = requests.post(
            "http://localhost:8000/api/agent",
            json={"messages": [{"role": "user", "content": prompt}]},
            stream=True,
            timeout=60,
        )

        scenario = None
        steps_seen = []
        has_text_msg = False
        ui_state_types = []
        has_intent_data = False
        text_content = ""

        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data = json.loads(line[6:])
            evt_type = data.get("type", "")

            if evt_type == "STEP_STARTED":
                step = data.get("stepName", "")
                steps_seen.append(step)
                if step == "workday_form_retrieval":
                    scenario = "life-event"
                elif step == "grievance_filing":
                    scenario = "grievance"
                elif step == "orchestrator" and scenario is None:
                    scenario = "general"

            elif evt_type == "TEXT_MESSAGE_START":
                has_text_msg = True

            elif evt_type == "TEXT_MESSAGE_CONTENT":
                text_content += data.get("delta", "")

            elif evt_type == "CUSTOM" and data.get("name") == "ui_state":
                val = data.get("value", {})
                st = val.get("screen_type", "")
                if st:
                    ui_state_types.append(st)
                # Check for intent IDs in the ui_state
                intents = val.get("detected_intents", [])
                if intents:
                    has_intent_data = True

            elif evt_type in ("RUN_FINISHED", "RUN_ERROR"):
                pass

        resp.close()

        # Determine issues
        issues = []
        if scenario != expected_scenario:
            issues.append(f"scenario={scenario} (expected {expected_scenario})")
        if not has_text_msg:
            issues.append("NO TEXT MESSAGE rendered")
        if not text_content.strip():
            issues.append("EMPTY text content")

        # Check for data-collection or grievance-intake screen
        if expected_scenario == "life-event" and expected_intents:
            # Should have data-collection or triage or action-plan UI
            form_types = [t for t in ui_state_types if t in ("data-collection", "triage", "action-plan", "review", "completed")]
            if not form_types:
                # Check if intents are detected in text (synthesized client-side)
                # The backend emits triage/action-plan/review/completed UI states
                has_relevant_ui = any(t in ui_state_types for t in ("triage", "action-plan", "review", "completed"))
                if not has_relevant_ui and not ui_state_types:
                    issues.append("NO ui_state events emitted")

        if expected_scenario == "grievance":
            grv_types = [t for t in ui_state_types if t in ("grievance-intake", "grievance-completed")]
            if not grv_types:
                issues.append("NO grievance ui_state")

        return {
            "scenario": scenario,
            "steps": steps_seen,
            "has_text": has_text_msg,
            "text_len": len(text_content),
            "ui_states": ui_state_types,
            "issues": issues,
        }
    except Exception as e:
        return {"scenario": None, "steps": [], "has_text": False, "text_len": 0, "ui_states": [], "issues": [f"ERROR: {e}"]}


def main():
    print(f"Testing {len(PROMPTS)} prompt gallery prompts...\n")
    print(f"{'#':<3} {'PROMPT':<80} {'EXPECTED':<12} {'GOT':<12} {'TEXT':<6} {'UI STATES':<40} {'RESULT'}")
    print("=" * 170)

    passed = 0
    failed = 0
    results = []

    for i, (prompt, expected_scenario, expected_intents) in enumerate(PROMPTS, 1):
        result = test_prompt(prompt, expected_scenario, expected_intents)
        ok = len(result["issues"]) == 0
        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        else:
            failed += 1

        short = prompt[:77] + "..." if len(prompt) > 77 else prompt
        ui_str = ", ".join(result["ui_states"][:4]) if result["ui_states"] else "(none)"
        text_ok = f"{result['text_len']:>4}c" if result["has_text"] else "NONE"
        print(f"{i:<3} {short:<80} {expected_scenario:<12} {result['scenario'] or 'NONE':<12} {text_ok:<6} {ui_str:<40} {status}")
        if result["issues"]:
            for issue in result["issues"]:
                print(f"    >>> {issue}")

        results.append((prompt, expected_scenario, result))
        time.sleep(1)

    print(f"\n{'=' * 170}")
    print(f"Results: {passed} passed, {failed} failed out of {len(PROMPTS)} prompts")

    if failed > 0:
        print("\n--- FAILURES ---")
        for prompt, expected, result in results:
            if result["issues"]:
                print(f"\nPrompt: {prompt[:90]}")
                print(f"  Expected: {expected}")
                print(f"  Got scenario: {result['scenario']}")
                print(f"  Steps: {result['steps']}")
                print(f"  UI states: {result['ui_states']}")
                print(f"  Issues: {result['issues']}")


if __name__ == "__main__":
    main()
