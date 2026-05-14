# Demo Guide — HR Concierge Multi-Agent System

This guide walks through a live demo of the HR Concierge application, showcasing multi-agent orchestration, adaptive generative UI, and human-in-the-loop checkpoints.

---

## Pre-Demo Checklist

- [ ] Backend running: `uvicorn main:app --reload --port 8000`
- [ ] Frontend running: `npm run dev` (in `apps/web/`)
- [ ] Browser open to `http://localhost:5173`
- [ ] Dark mode enabled (recommended for presentations)
- [ ] Right panel open (shows orchestration events)

---

## Demo Flow 1: Life Event Concierge (5–7 minutes)

### Scene 1 — Landing Page (30 seconds)
1. Start on the **landing page** — point out:
   - The hero section describing the multi-agent system
   - The **4 capability cards** (Multi-Agent, AG-UI, Human-in-the-Loop, ServiceNow)
   - The **agent architecture grid** showing all 8 specialized agents
2. **Key message**: "This is a multi-agent system, not a single chatbot. Each agent has specialized skills."

### Scene 2 — Start Scenario (30 seconds)
1. Click the **"Life Event Concierge"** scenario card
2. Select the sample prompt: *"I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details."*
3. The workspace opens with three panels

### Scene 3 — Multi-Agent Orchestration (2–3 minutes)
Watch the orchestration unfold in real-time:

1. **Chat panel (left)**: Messages stream in with agent names shown
2. **Adaptive UI (center)**: Transforms through stages:
   - **Intake** → shimmer loading bars, agent activity indicators
   - **Triage** → detected intents with confidence scores and risk badges
   - **Action Plan** → impact map showing affected systems, auto-done vs review items
3. **Orchestration panel (right)**: Shows:
   - Workflow progress with substeps
   - Agent activity feed (thinking → working → completed)
   - Tool call indicators (classify_life_event, retrieve_policy_guidance, etc.)

**Talking points:**
- "Notice how the UI adapts as different agents take over — this is the AG-UI protocol in action"
- "The orchestrator is coordinating handoffs between specialized agents"
- "Each tool call represents an actual capability — policy lookup, risk assessment, system updates"

### Scene 4 — Human-in-the-Loop (1 minute)
1. When the **review screen** appears, point out:
   - Approval card with risk level badge
   - Rationale explaining why human review is needed
   - The change summary with editable fields
2. Click **"Approve"** to continue
3. **Key message**: "High-risk changes like banking details always require human approval — the system enforces this automatically"

### Scene 5 — Completion (1 minute)
1. The **completed screen** shows:
   - Success banner with summary
   - Completed actions with checkmarks
   - Pending follow-ups (e.g., submit marriage certificate)
   - Audit timeline
   - Export button for compliance
2. **Key message**: "Full audit trail for compliance — every agent action is logged"

---

## Demo Flow 2: Grievance Filter-First (3–5 minutes)

### Scene 1 — Reset & Start (30 seconds)
1. Click the **reset button** (↻) in the header
2. In the prompt gallery (right panel), select a grievance prompt:
   *"My manager has been excluding me from important meetings and I feel I'm being treated unfairly."*

### Scene 2 — Classification & Structuring (2 minutes)
1. Watch the **grievance-specific flow**:
   - **Grievance Intake** → agent activity as the system processes
   - **Grievance Triage** → classification with category, severity, confidence
   - **Case Draft** → structured narrative with:
     - Key facts extracted from the description
     - Missing information identified
     - Priority and routing recommendation
     - AI rationale for the classification

**Talking points:**
- "The grievance classifier is a specialized agent — it understands HR-specific categories"
- "Notice the missing information section — the system knows what to ask next"
- "The case draft is ready for HR review — structured, not just raw text"

### Scene 3 — Review & Filing (1 minute)
1. Show the case draft with all structured fields
2. Point out the routing recommendation
3. **Key message**: "The filter-first approach ensures every grievance is properly categorized and routed before entering the system"

---

## UX Highlights to Point Out

| Feature | Where to Show |
|---|---|
| **Dark/Light mode** | Toggle in header — full theme support |
| **Collapsible panels** | Click panel toggle — responsive layout |
| **Event visibility** | Toggle "Events" button to show/hide orchestration |
| **Animated transitions** | Watch center panel transform between stages |
| **Agent status indicators** | Colored dots showing active/thinking/completed |
| **Risk badges** | Color-coded risk levels throughout the UI |
| **Streaming text** | Watch text appear character-by-character in chat |
| **Tool call indicators** | Real-time display of which tools agents are using |

---

## Q&A Prep

**Q: Is this using real AI models?**
A: The demo runs in mock mode with pre-seeded responses for reliability. In production, it connects to Azure OpenAI GPT-4o through the Microsoft Agent Framework.

**Q: How does ServiceNow integration work?**
A: We use the Agent-to-Agent (A2A) protocol — our agents can search ServiceNow's knowledge base and create incidents through standard A2A message exchange.

**Q: Can this run inside Teams/Copilot?**
A: Yes — the `apps/m365-copilot/` folder contains a declarative agent manifest. Same backend, different surface.

**Q: How are handoffs between agents managed?**
A: Microsoft Agent Framework's HandoffBuilder defines which agents can hand off to which. The Orchestrator decides routing based on context.

**Q: What about data privacy for grievances?**
A: The system enforces role-based access. Grievance data is only visible to authorized HR personnel. All actions are audit-logged.
