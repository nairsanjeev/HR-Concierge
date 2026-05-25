import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Moon, Sparkles, Play, CheckCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const lifeEventScenes = [
  {
    title: 'Landing Page',
    duration: '30 seconds',
    steps: [
      'Start on the landing page — highlight the hero section describing the multi-agent system',
      'Point out the 4 capability cards (Multi-Agent, AG-UI, Human-in-the-Loop, ServiceNow)',
      'Show the agent architecture grid with all 8 specialized agents',
    ],
    keyMessage: 'This is a multi-agent system, not a single chatbot. Each agent has specialized skills.',
  },
  {
    title: 'Start Scenario',
    duration: '30 seconds',
    steps: [
      'Click the "Life Event Concierge" scenario card',
      'Select the sample prompt: "I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details."',
      'The workspace opens with three panels',
    ],
    keyMessage: 'A single natural-language message triggers a complex multi-system workflow.',
  },
  {
    title: 'Multi-Agent Orchestration',
    duration: '2–3 minutes',
    steps: [
      'Chat panel (left): Messages stream in with agent names shown',
      'Adaptive UI (center): Transforms through stages — Intake → Triage → Action Plan',
      'Orchestration panel (right): Shows workflow progress, agent activity, and tool calls',
    ],
    keyMessage: 'The UI adapts as different agents take over — this is AG-UI in action. The orchestrator coordinates handoffs between specialized agents.',
  },
  {
    title: 'Human-in-the-Loop',
    duration: '1 minute',
    steps: [
      'When the review screen appears, point out the approval card with risk level badge',
      'Show the rationale explaining why human review is needed',
      'Click "Approve" to continue',
    ],
    keyMessage: 'High-risk changes like banking details always require human approval — the system enforces this automatically.',
  },
  {
    title: 'Completion',
    duration: '1 minute',
    steps: [
      'Success banner with summary of all completed actions',
      'Pending follow-ups (e.g., submit marriage certificate)',
      'Full audit timeline and export button for compliance',
    ],
    keyMessage: 'Full audit trail for compliance — every agent action is logged.',
  },
];

const grievanceScenes = [
  {
    title: 'Reset & Start',
    duration: '30 seconds',
    steps: [
      'Click the reset button (↻) in the header',
      'Select a grievance prompt: "My manager has been excluding me from important meetings and I feel I\'m being treated unfairly."',
    ],
    keyMessage: 'Different scenario type activates the grievance pipeline — separate specialized agents.',
  },
  {
    title: 'Classification & Structuring',
    duration: '2 minutes',
    steps: [
      'Grievance Intake → agent activity processing',
      'Grievance Triage → classification with category, severity, confidence',
      'Case Draft → structured narrative with key facts, missing info, priority, routing',
    ],
    keyMessage: 'The grievance classifier understands HR-specific categories. The system knows what to ask next.',
  },
  {
    title: 'Review & Filing',
    duration: '1 minute',
    steps: [
      'Show the case draft with all structured fields',
      'Point out the routing recommendation',
      'Highlight that the case is ready for HR review',
    ],
    keyMessage: 'Filter-first approach ensures every grievance is properly categorized and routed before entering the system.',
  },
];

const uxHighlights = [
  { feature: 'Dark/Light mode', where: 'Toggle in header — full theme support' },
  { feature: 'Collapsible panels', where: 'Click panel toggle — responsive layout' },
  { feature: 'Event visibility', where: 'Toggle "Events" button to show/hide orchestration' },
  { feature: 'Animated transitions', where: 'Watch center panel transform between stages' },
  { feature: 'Agent status indicators', where: 'Colored dots showing active/thinking/completed' },
  { feature: 'Risk badges', where: 'Color-coded risk levels throughout the UI' },
  { feature: 'Streaming text', where: 'Watch text appear character-by-character in chat' },
  { feature: 'Tool call indicators', where: 'Real-time display of which tools agents are using' },
];

const qaItems = [
  { q: 'Is this using real AI models?', a: 'The demo runs in mock mode with pre-seeded responses for reliability. In production, it connects to Azure OpenAI GPT-4o through the Microsoft Agent Framework.' },
  { q: 'How does ServiceNow integration work?', a: 'We use the Agent-to-Agent (A2A) protocol — our agents can search ServiceNow\'s knowledge base and create incidents through standard A2A message exchange.' },
  { q: 'Can this run inside Teams/Copilot?', a: 'Yes — the same backend powers a Declarative Agent for M365 Copilot (via MCP) and a Custom Engine Agent (CEA) for direct Teams bot interaction.' },
  { q: 'How are handoffs between agents managed?', a: 'Microsoft Agent Framework\'s HandoffBuilder defines which agents can hand off to which. The Orchestrator decides routing based on context.' },
  { q: 'What about data privacy for grievances?', a: 'The system enforces role-based access. Grievance data is only visible to authorized HR personnel. All actions are audit-logged.' },
];

export default function DemoScriptPage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Demo Script</span>
          </div>
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text">Demo Script</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Step-by-step guide for presenting the HR Concierge multi-agent system — covering orchestration, adaptive UI, and human-in-the-loop checkpoints.
          </p>
        </motion.div>

        {/* Pre-Demo Checklist */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" /> Pre-Demo Checklist
          </h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <ul className="space-y-2">
              {[
                'Backend running (orchestration service connected)',
                'Frontend loaded in browser',
                'Dark mode enabled (recommended for presentations)',
                'Right panel open (shows orchestration events)',
                'Login with demo credentials',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="w-4 h-4 rounded border border-[var(--border)] bg-[var(--surface-2)] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Demo Flow 1 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Play className="w-5 h-5 text-violet-400" /> Demo Flow 1: Life Event Concierge
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Duration: 5–7 minutes</p>
          <div className="space-y-4">
            {lifeEventScenes.map((scene, i) => (
              <div key={scene.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
                <div className="px-5 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    <span className="text-brand-400 mr-2">Scene {i + 1}</span>
                    {scene.title}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">{scene.duration}</span>
                </div>
                <div className="p-5">
                  <ol className="space-y-2 mb-4">
                    {scene.steps.map((step, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-violet-300 font-medium">{scene.keyMessage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Demo Flow 2 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" /> Demo Flow 2: Grievance Filter-First
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Duration: 3–5 minutes</p>
          <div className="space-y-4">
            {grievanceScenes.map((scene, i) => (
              <div key={scene.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
                <div className="px-5 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    <span className="text-blue-400 mr-2">Scene {i + 1}</span>
                    {scene.title}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">{scene.duration}</span>
                </div>
                <div className="p-5">
                  <ol className="space-y-2 mb-4">
                    {scene.steps.map((step, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-300 font-medium">{scene.keyMessage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* UX Highlights */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4">UX Highlights to Point Out</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {uxHighlights.map((h) => (
              <div key={h.feature} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <div>
                  <span className="text-xs font-semibold">{h.feature}</span>
                  <p className="text-[11px] text-[var(--text-muted)]">{h.where}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Q&A Prep */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Q&A Prep
          </h2>
          <div className="space-y-3">
            {qaItems.map((item) => (
              <div key={item.q} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <h4 className="font-semibold text-sm mb-2 text-[var(--text-primary)]">Q: {item.q}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">A: {item.a}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
