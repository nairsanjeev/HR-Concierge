import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Shield, Clock, DollarSign, FileText, UserCog,
  Sun, Moon, Sparkles, MessageCircle, ChevronRight,
  AlertTriangle, Baby, Briefcase, Home, CreditCard,
  Scale, BookOpen, Umbrella, Stethoscope,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const benefitsCards = [
  {
    icon: Stethoscope,
    title: 'Health Insurance',
    description: 'PPO & HDHP plans with HSA options. Coverage for you, spouse, and dependents.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    prompt: 'What health insurance plans are available and what do they cover?',
  },
  {
    icon: Heart,
    title: 'Dental & Vision',
    description: 'Comprehensive dental (ortho included) and vision plans with annual exams.',
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    prompt: 'Tell me about our dental and vision benefits',
  },
  {
    icon: DollarSign,
    title: '401(k) Retirement',
    description: '6% employer match, immediate vesting. Roth and traditional options available.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    prompt: 'How does our 401k plan work? What is the employer match?',
  },
  {
    icon: Umbrella,
    title: 'Life & Disability',
    description: '2x salary basic life insurance. Short-term and long-term disability coverage.',
    color: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    prompt: 'What life insurance and disability coverage do I have?',
  },
];

const leaveCards = [
  {
    icon: Baby,
    title: 'Parental Leave',
    description: '16 weeks paid for birth parents, 8 weeks for non-birth parents.',
    prompt: "I'm having a baby. What parental leave am I entitled to?",
  },
  {
    icon: Clock,
    title: 'PTO & Bereavement',
    description: '20 days PTO, 5 days bereavement. Rollover up to 5 days.',
    prompt: 'What is our PTO policy? How many days do I get and can I roll them over?',
  },
  {
    icon: Scale,
    title: 'FMLA',
    description: 'Up to 12 weeks unpaid, job-protected leave for qualifying events.',
    prompt: 'How do I request FMLA leave? What qualifies?',
  },
];

const policyCards = [
  {
    icon: AlertTriangle,
    title: 'Workplace Harassment',
    description: 'Zero-tolerance policy. Know your rights, reporting channels, and protections against retaliation.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    prompt: 'What is our workplace harassment policy? How do I report harassment?',
  },
  {
    icon: Shield,
    title: 'Anti-Discrimination (EEO)',
    description: 'Equal opportunity employer. Protected classes, accommodation requests, and complaint procedures.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    prompt: 'What does our anti-discrimination policy cover?',
  },
  {
    icon: BookOpen,
    title: 'Code of Conduct',
    description: 'Professional standards, conflicts of interest, confidentiality, and ethical expectations.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    prompt: 'What are the key points of our code of conduct?',
  },
  {
    icon: Shield,
    title: 'Retaliation Protection',
    description: 'Whistleblower protections. No adverse action for good-faith reporting of violations.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    prompt: 'What protections exist against retaliation for reporting issues?',
  },
  {
    icon: FileText,
    title: 'Grievance Process',
    description: 'Formal grievance procedures, timelines, investigation steps, and resolution paths.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    prompt: 'How do I file a formal grievance? What is the process?',
  },
  {
    icon: Briefcase,
    title: 'Employee Relations',
    description: 'Conflict resolution, mediation, performance concerns, and management escalation.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    prompt: 'What employee relations resources are available to me?',
  },
];

const quickActions = [
  { icon: UserCog, label: 'Change my name', prompt: 'I need to change my legal name' },
  { icon: Home, label: 'Update address', prompt: 'I need to update my home address' },
  { icon: Heart, label: 'Got married', prompt: 'I just got married and need to update my records' },
  { icon: Baby, label: 'New baby', prompt: "I'm having a baby and need to update my benefits" },
  { icon: CreditCard, label: 'Update bank info', prompt: 'I need to update my direct deposit bank details' },
  { icon: Briefcase, label: 'Submit expense', prompt: 'I need to submit an expense report' },
  { icon: AlertTriangle, label: 'File grievance', prompt: 'I need to file a formal grievance' },
  { icon: Clock, label: 'Request leave', prompt: 'How do I request time off or FMLA?' },
];

export default function HRPortalPage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  // Initialize Teams SDK when running inside Teams
  useEffect(() => {
    const teams = (window as any).microsoftTeams;
    if (teams) {
      teams.app.initialize().catch(() => {});
    }
  }, []);

  const askConcierge = (prompt: string) => {
    navigate(`/workspace?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Contoso HR</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Employee Portal
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
              <MessageCircle className="w-4 h-4" /> Ask HR Concierge
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-0)]">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4">
              Welcome to <span className="gradient-text">Human Resources</span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 leading-relaxed">
              Your one-stop destination for benefits, policies, and employee services.
              Need help? Our AI-powered HR Concierge is available 24/7.
            </p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto"
          >
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => askConcierge(action.prompt)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:border-brand-500/40 hover:bg-[var(--surface-3)] text-sm transition-all"
              >
                <action.icon className="w-3.5 h-3.5 text-brand-400" />
                <span>{action.label}</span>
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Benefits & Insurance</h2>
              <p className="text-sm text-[var(--text-secondary)]">Your comprehensive benefits package</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefitsCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.4 }}
                className="group relative rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand-500/30 transition-all overflow-hidden cursor-pointer"
                onClick={() => askConcierge(card.prompt)}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.color}`} />
                <div className="p-5 pt-6">
                  <div className={`inline-flex p-2.5 rounded-lg ${card.bg} ${card.border} border mb-3`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{card.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{card.description}</p>
                  <span className="text-xs text-brand-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ask Concierge <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leave Section */}
      <section className="py-16 px-6 bg-[var(--surface-1)]/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Leave & Time Off</h2>
              <p className="text-sm text-[var(--text-secondary)]">Paid leave, FMLA, and time-off policies</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {leaveCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.4 }}
                className="group rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand-500/30 p-5 transition-all cursor-pointer"
                onClick={() => askConcierge(card.prompt)}
              >
                <card.icon className="w-5 h-5 text-blue-400 mb-3" />
                <h3 className="font-semibold mb-1.5">{card.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{card.description}</p>
                <span className="text-xs text-brand-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ChevronRight className="w-3 h-3" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Workplace Policies</h2>
              <p className="text-sm text-[var(--text-secondary)]">Know your rights and responsibilities</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policyCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.4 }}
                className="group rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand-500/30 p-5 transition-all cursor-pointer"
                onClick={() => askConcierge(card.prompt)}
              >
                <div className={`inline-flex p-2 rounded-lg ${card.bg} ${card.border} border mb-3`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <h3 className="font-semibold mb-1.5">{card.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{card.description}</p>
                <span className="text-xs text-brand-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View policy <ChevronRight className="w-3 h-3" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <MessageCircle className="w-10 h-10 text-brand-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Need help with something else?</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Our AI-powered HR Concierge can help with policy questions, personal data changes,
              grievance filing, expense reports, and more.
            </p>
            <button
              onClick={() => navigate('/workspace')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white font-semibold transition-all shadow-lg shadow-brand-500/20"
            >
              <MessageCircle className="w-5 h-5" /> Chat with HR Concierge
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
        <p>Contoso Corporation &copy; 2026 &mdash; Human Resources Department</p>
        <p className="mt-1">Powered by Microsoft Agent Framework | Foundry IQ | Azure OpenAI</p>
      </footer>
    </div>
  );
}
