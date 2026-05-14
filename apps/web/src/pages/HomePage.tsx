import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart, Shield, Sparkles, ArrowRight, Sun, Moon, Network,
  Bot, FileCheck, ChevronRight, Zap,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const scenarios = [
  {
    id: 'life-event',
    title: 'Life Event Concierge',
    description:
      'Handle personal data changes triggered by life events — marriage, relocation, name change, and more. Agentic orchestration classifies, validates, and executes changes across downstream systems.',
    icon: Heart,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    prompts: [
      'I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details.',
      'I changed my preferred name and need to update my passport and government ID information.',
      'Update my address, emergency contact, and payment election details.',
    ],
  },
  {
    id: 'grievance',
    title: 'Grievance Filter-First',
    description:
      'Confidential intake for workplace concerns — AI classifies, structures, and routes cases. Distinguishes formal grievances from team issues and recommends the right resolution path.',
    icon: Shield,
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    prompts: [
      "My manager has been excluding me from important meetings and I feel I'm being treated unfairly.",
      "I'm not sure if this is a grievance or just a team issue.",
      "I want to report an issue but I don't know the correct category.",
    ],
  },
];

const features = [
  { icon: Network, label: 'Agentic Tool Orchestration', desc: '11 specialized tools coordinated by a single intelligent agent' },
  { icon: Bot, label: 'AG-UI Protocol', desc: 'Real-time streaming with adaptive generative UI' },
  { icon: Shield, label: 'Human-in-the-Loop', desc: 'Approval gates for sensitive actions with audit trail' },
  { icon: FileCheck, label: 'ServiceNow A2A', desc: 'Knowledge retrieval and case mgmt via A2A protocol' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">HR Concierge</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
              DEMO
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate('/workspace')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
            >
              Launch Demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-secondary)] mb-6">
              <span className="status-dot active" /> Powered by Microsoft Agent Framework + AG-UI
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              <span className="gradient-text">Agentic HR</span>
              <br />
              <span className="text-[var(--text-primary)]">Intelligence Platform</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Enterprise-grade agentic orchestration for HR workflows — life event processing, grievance intake,
              and policy guidance. Adaptive generative UI with human-in-the-loop safety.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/workspace')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white font-semibold text-base transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
              >
                <Zap className="w-5 h-5" /> Start Demo
              </button>
              <a
                href="#scenarios"
                className="px-6 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] text-sm font-medium transition-colors"
              >
                View Scenarios
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
                className="p-5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand-500/30 transition-colors"
              >
                <f.icon className="w-5 h-5 text-brand-400 mb-3" />
                <h3 className="font-semibold text-sm mb-1">{f.label}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scenarios */}
      <section id="scenarios" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Demo Scenarios</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {scenarios.map((scenario, i) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * i, duration: 0.5 }}
                className="group rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand-500/30 transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className={`inline-flex p-3 rounded-xl ${scenario.bg} ${scenario.border} border mb-4`}>
                    <scenario.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{scenario.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">{scenario.description}</p>

                  <div className="space-y-2 mb-5">
                    {scenario.prompts.map((prompt, j) => (
                      <button
                        key={j}
                        onClick={() => navigate(`/workspace?prompt=${encodeURIComponent(prompt)}`)}
                        className="w-full text-left p-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-start gap-2 group/prompt"
                      >
                        <ChevronRight className="w-4 h-4 mt-0.5 text-[var(--text-muted)] group-hover/prompt:text-brand-400 transition-colors shrink-0" />
                        <span className="line-clamp-2">{prompt}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate(`/workspace?scenario=${scenario.id}`)}
                    className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${scenario.color} text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                  >
                    Launch Scenario <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Agent Architecture</h2>
          <p className="text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
            7 specialized agents coordinated through Microsoft Agent Framework handoff workflows, with AG-UI protocol for real-time adaptive UI streaming.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { name: 'Orchestrator', role: 'Coordinator', color: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
              { name: 'Intent Classifier', role: 'Analysis', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
              { name: 'Policy Advisor', role: 'Knowledge', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
              { name: 'Risk Assessor', role: 'Compliance', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
              { name: 'Action Executor', role: 'Execution', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
              { name: 'Summary Gen.', role: 'Reports', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400' },
              { name: 'Grievance Classifier', role: 'Intake', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
              { name: 'Narrative Structurer', role: 'Documentation', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
            ].map((agent) => (
              <div key={agent.name} className={`p-3 rounded-lg border ${agent.color} text-center`}>
                <div className="text-xs font-semibold">{agent.name}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{agent.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto text-center text-sm text-[var(--text-muted)]">
          HR Concierge Demo — Microsoft Agent Framework + AG-UI + ServiceNow A2A
        </div>
      </footer>
    </div>
  );
}
