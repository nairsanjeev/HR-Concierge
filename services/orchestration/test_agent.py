"""Quick test script for the agentic loop endpoint."""
import urllib.request
import json
import sys

def test_prompt(prompt: str):
    print(f"\n{'='*60}")
    print(f"PROMPT: {prompt}")
    print('='*60)

    payload = json.dumps({
        "messages": [{"role": "user", "content": prompt}],
        "threadId": "test-thread-1"
    }).encode()

    req = urllib.request.Request(
        "http://localhost:8000/api/agent",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req, timeout=90)
    body = resp.read().decode()

    tool_calls = []
    text_parts = []
    steps_started = []
    steps_finished = []

    for line in body.strip().split("\n"):
        line = line.strip()
        if not line.startswith("data:"):
            continue
        try:
            evt = json.loads(line[5:].strip())
        except Exception:
            continue

        t = evt.get("type", "")
        if t == "TOOL_CALL_START":
            name = evt.get("toolCallName", "?")
            tool_calls.append(name)
            print(f"  [TOOL] {name}")
        elif t == "TOOL_CALL_ARGS":
            args = evt.get("delta", "")
            print(f"    args: {args[:120]}")
        elif t == "TEXT_MESSAGE_CONTENT":
            delta = evt.get("delta", "")
            text_parts.append(delta)
        elif t == "STEP_STARTED":
            sn = evt.get("stepName", "?")
            steps_started.append(sn)
            print(f"  >> STEP_STARTED: {sn}")
        elif t == "STEP_FINISHED":
            sn = evt.get("stepName", "?")
            steps_finished.append(sn)
            print(f"  << STEP_FINISHED: {sn}")

    full_text = "".join(text_parts)
    print(f"\n  RESPONSE ({len(full_text)} chars): {full_text[:200]}...")
    print(f"\n  TOOLS CALLED: {tool_calls}")
    print(f"  STEPS STARTED: {steps_started}")
    print(f"  STEPS FINISHED: {steps_finished}")
    return tool_calls, steps_finished


if __name__ == "__main__":
    prompts = sys.argv[1:] if len(sys.argv) > 1 else [
        "What is the formal grievance filing procedure?"
    ]
    for p in prompts:
        test_prompt(p)
