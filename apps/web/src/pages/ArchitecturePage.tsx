import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const agents = [
  { name: 'Orchestrator Agent', role: 'Routes intent, coordinates handoffs between all agents', color: 'from-violet-500 to-purple-600' },
  { name: 'Intent Classifier', role: 'Detects life event types and affected HR fields from natural language', color: 'from-blue-500 to-cyan-600' },
  { name: 'Policy Advisor', role: 'Retrieves policy guidance via Foundry IQ (SharePoint) and ServiceNow A2A', color: 'from-cyan-500 to-teal-600' },
  { name: 'Risk Assessor', role: 'Evaluates compliance risk for each change (low/medium/high)', color: 'from-amber-500 to-orange-600' },
  { name: 'Action Executor', role: 'Executes approved changes across downstream HR systems', color: 'from-emerald-500 to-green-600' },
  { name: 'Summary Generator', role: 'Produces audit trail and completion summaries', color: 'from-pink-500 to-rose-600' },
  { name: 'Grievance Classifier', role: 'Categorizes workplace concerns by type, severity, and routing', color: 'from-red-500 to-rose-600' },
  { name: 'Narrative Structurer', role: 'Extracts facts, identifies gaps, creates structured case drafts', color: 'from-indigo-500 to-violet-600' },
];

const tools = [
  { name: 'query_knowledge_base', desc: 'Searches SharePoint HR policies via Foundry IQ Knowledgebase Retrieve API' },
  { name: 'retrieve_policy_guidance', desc: 'Queries ServiceNow knowledge base via A2A protocol' },
  { name: 'get_workday_form_schema', desc: 'Retrieves Workday form structure for data changes' },
  { name: 'assess_risk_and_compliance', desc: 'Evaluates risk level per change (low/medium/high/critical)' },
  { name: 'build_impact_map', desc: 'Maps affected downstream systems for detected intents' },
  { name: 'execute_self_service_changes', desc: 'Executes low-risk changes automatically' },
  { name: 'submit_high_risk_changes', desc: 'Routes high-risk changes for human approval' },
  { name: 'update_workday_employee', desc: 'Updates employee records in Workday system' },
  { name: 'generate_completion_summary', desc: 'Produces audit-ready completion report' },
  { name: 'structure_narrative', desc: 'Structures grievance into formal case draft' },
  { name: 'create_grievance_case', desc: 'Creates grievance case via ServiceNow A2A' },
  { name: 'submit_expense_report', desc: 'Validates and submits expense claims for reimbursement' },
];

const techStack = [
  { layer: 'Frontend', tech: 'React 18 + TypeScript + Vite', purpose: 'SPA with adaptive generative UI' },
  { layer: 'Styling', tech: 'TailwindCSS + Framer Motion', purpose: 'Dark/light design system + animations' },
  { layer: 'Streaming', tech: 'AG-UI Protocol (SSE)', purpose: 'Real-time event streaming to frontend' },
  { layer: 'Backend', tech: 'FastAPI + Python 3.11', purpose: 'API server with SSE endpoint' },
  { layer: 'Orchestration', tech: 'Microsoft Agent Framework', purpose: 'Multi-agent coordination + handoffs' },
  { layer: 'LLM', tech: 'Azure OpenAI GPT-4o', purpose: 'Agent reasoning and generation' },
  { layer: 'Knowledge (Policies)', tech: 'Foundry IQ Knowledgebase', purpose: 'RAG retrieval over SharePoint HR policy documents' },
  { layer: 'Knowledge (ServiceNow)', tech: 'ServiceNow A2A Protocol', purpose: 'KB articles + incident management via agent-to-agent' },
  { layer: 'M365 Surface', tech: 'Declarative Agent + MCP', purpose: 'M365 Copilot integration' },
  { layer: 'Teams Surface', tech: 'Custom Engine Agent (CEA)', purpose: 'Teams bot with Adaptive Cards' },
  { layer: 'Infrastructure', tech: 'Azure Container Apps', purpose: 'Serverless container hosting' },
  { layer: 'AI Platform', tech: 'Azure AI Foundry', purpose: 'Model management and project workspace' },
];

const surfaces = [
  {
    title: 'React Web App',
    subtitle: 'AG-UI Protocol',
    desc: 'Full-featured web experience with real-time streaming UI. Adaptive generative interface transforms based on workflow stage — intake, triage, action plan, review, completion.',
    protocol: 'POST /api/agent → SSE stream with AG-UI events',
    color: 'border-violet-500/30 bg-violet-500/5',
  },
  {
    title: 'M365 Copilot Agent',
    subtitle: 'Declarative Agent + MCP',
    desc: 'Appears in the M365 Copilot agent picker. MCP server exposes tools as actions, returns interactive HTML widgets inline in chat. Enterprise auth and compliance built-in.',
    protocol: 'M365 Copilot → MCP Plugin → hr-concierge-mcp server',
    color: 'border-blue-500/30 bg-blue-500/5',
  },
  {
    title: 'Teams CEA Bot',
    subtitle: 'Custom Engine Agent',
    desc: 'Thin relay bot in Teams. Forwards messages to orchestrator, renders responses with Adaptive Cards — forms, reasoning traces, and tool call indicators.',
    protocol: 'Bot Framework → POST /api/invoke → JSON → Adaptive Cards',
    color: 'border-emerald-500/30 bg-emerald-500/5',
  },
];

export default function ArchitecturePage() {
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
            <span className="font-semibold text-lg">Architecture</span>
          </div>
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-6 max-w-6xl mx-auto">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text">System Architecture</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto">
            An enterprise-grade multi-agent orchestration system built on the Microsoft AI platform — showcasing Agent Framework, AG-UI Protocol, MCP, and multi-surface delivery.
          </p>
        </motion.div>

        {/* High-Level Diagram */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-16">
          <h2 className="text-2xl font-bold mb-6">High-Level Flow</h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Visual Architecture Diagram */}
              <div className="flex flex-col gap-6">
                {/* Row 1: User Surfaces */}
                <div className="text-center">
                  <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">User Surfaces</div>
                  <div className="flex justify-center gap-4">
                    <div className="px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm font-medium">
                      <div className="text-violet-400 font-semibold">React Web App</div>
                      <div className="text-[10px] text-[var(--text-muted)]">AG-UI / SSE</div>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm font-medium">
                      <div className="text-blue-400 font-semibold">M365 Copilot</div>
                      <div className="text-[10px] text-[var(--text-muted)]">MCP Plugin</div>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium">
                      <div className="text-emerald-400 font-semibold">Teams CEA Bot</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Adaptive Cards</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-violet-500/50 to-brand-500/50"></div>
                </div>

                {/* Row 2: Backend */}
                <div className="text-center">
                  <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Orchestration Layer</div>
                  <div className="inline-block px-6 py-4 rounded-2xl bg-gradient-to-r from-brand-500/10 to-violet-500/10 border border-brand-500/20">
                    <div className="text-brand-400 font-bold text-base">Microsoft Agent Framework</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">FastAPI + Python 3.11 • HandoffBuilder Workflows</div>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] rounded bg-violet-500/20 text-violet-300">Orchestrator</span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-300">Classifier</span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-300">Policy Advisor</span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-300">Risk Assessor</span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300">Executor</span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-pink-500/20 text-pink-300">Summary Gen</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-brand-500/50 to-emerald-500/50"></div>
                </div>

                {/* Row 3: External Services */}
                <div className="text-center">
                  <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">External Services & Platform</div>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
                      <div className="text-amber-400 font-semibold">Azure OpenAI</div>
                      <div className="text-[10px] text-[var(--text-muted)]">GPT-4o</div>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
                      <div className="text-green-400 font-semibold">ServiceNow</div>
                      <div className="text-[10px] text-[var(--text-muted)]">A2A Protocol</div>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                      <div className="text-blue-400 font-semibold">Foundry IQ</div>
                      <div className="text-[10px] text-[var(--text-muted)]">SharePoint RAG</div>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm">
                      <div className="text-purple-400 font-semibold">Azure AI Foundry</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Project + Models</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Three Surfaces */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Three Delivery Surfaces — One Orchestrator</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">The same agent backend powers three distinct user experiences, demonstrating the platform's multi-surface capabilities.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {surfaces.map((s, i) => (
              <div key={i} className={`rounded-xl border p-5 ${s.color}`}>
                <h3 className="font-bold text-base mb-0.5">{s.title}</h3>
                <div className="text-xs text-brand-400 font-medium mb-3">{s.subtitle}</div>
                <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">{s.desc}</p>
                <code className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-0)] px-2 py-1 rounded block">{s.protocol}</code>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Agent Orchestration */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Agent Orchestration</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            The Microsoft Agent Framework uses a <strong>HandoffBuilder</strong> pattern — the Orchestrator routes to specialized agents based on intent, each with its own tools and system prompt.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
                className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand-500/30 transition-colors"
              >
                <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${agent.color} mb-3`} />
                <h4 className="font-semibold text-sm mb-1">{agent.name}</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{agent.role}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tool Functions */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Tool Functions (12 Tools)</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Each tool is a discrete capability — agents invoke tools based on workflow stage. The <code className="text-brand-400">query_knowledge_base</code> tool uses Foundry IQ's Knowledgebase Retrieve API for RAG over SharePoint HR policy documents. ServiceNow tools use the A2A protocol for knowledge search and incident management.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {tools.map((tool) => (
              <div key={tool.name} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                <div>
                  <code className="text-xs font-mono text-brand-400">{tool.name}</code>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* AG-UI Event Flow */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-16">
          <h2 className="text-2xl font-bold mb-2">AG-UI Protocol Event Flow</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">The frontend receives a real-time SSE stream of typed events, enabling adaptive UI without polling.</p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 overflow-x-auto">
            <div className="space-y-2 font-mono text-xs min-w-[500px]">
              {[
                { event: 'RUN_STARTED', desc: 'Workflow begins executing', color: 'text-violet-400' },
                { event: 'STEP_STARTED', desc: 'Agent handoff / new stage', color: 'text-blue-400' },
                { event: 'TOOL_CALL_START', desc: 'Tool invocation begins', color: 'text-cyan-400' },
                { event: 'TOOL_CALL_ARGS', desc: 'Tool arguments streamed', color: 'text-cyan-300' },
                { event: 'TOOL_CALL_END', desc: 'Tool execution complete', color: 'text-cyan-400' },
                { event: 'TEXT_MESSAGE_START', desc: 'Agent response begins', color: 'text-emerald-400' },
                { event: 'TEXT_MESSAGE_CONTENT', desc: 'Streamed text chunks', color: 'text-emerald-300' },
                { event: 'TEXT_MESSAGE_END', desc: 'Agent response complete', color: 'text-emerald-400' },
                { event: 'CUSTOM', desc: 'UI state change (triage, review, completed)', color: 'text-amber-400' },
                { event: 'RUN_FINISHED', desc: 'Workflow complete (may include interrupt)', color: 'text-pink-400' },
              ].map((evt) => (
                <div key={evt.event} className="flex items-center gap-4">
                  <span className={`w-48 ${evt.color} font-semibold`}>{evt.event}</span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="text-[var(--text-secondary)]">{evt.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Microsoft Platform */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Microsoft Platform Showcase</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">This demo showcases the breadth of the Microsoft AI and developer platform working together as an integrated solution.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Microsoft Agent Framework', items: ['Multi-agent HandoffBuilder orchestration', 'Tool registration and invocation', 'Stateful conversation management', 'AG-UI streaming protocol'] },
              { title: 'Azure AI & OpenAI', items: ['Azure OpenAI GPT-4o for reasoning', 'Azure AI Foundry project workspace', 'Foundry IQ Knowledgebase (RAG over SharePoint)', 'Token-level streaming'] },
              { title: 'Microsoft 365 Platform', items: ['Declarative Agent for M365 Copilot', 'MCP (Model Context Protocol) plugin', 'Custom Engine Agent for Teams', 'Bot Framework messaging'] },
              { title: 'Azure Infrastructure', items: ['Container Apps for serverless hosting', 'Azure Container Registry', 'Managed identity / Entra ID', 'Azure Monitor + App Insights'] },
            ].map((section) => (
              <div key={section.title} className="p-5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                <h3 className="font-bold text-sm mb-3 text-brand-400">{section.title}</h3>
                <ul className="space-y-1.5">
                  {section.items.map((item) => (
                    <li key={item} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Tech Stack */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <h2 className="text-2xl font-bold mb-6">Technology Stack</h2>
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface-2)]">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Layer</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Technology</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {techStack.map((row, i) => (
                  <tr key={row.layer} className={i % 2 === 0 ? 'bg-[var(--surface-1)]' : 'bg-[var(--surface-0)]'}>
                    <td className="px-4 py-2.5 font-medium text-xs">{row.layer}</td>
                    <td className="px-4 py-2.5 text-xs text-brand-400 font-mono">{row.tech}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
