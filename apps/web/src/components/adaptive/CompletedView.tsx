import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  ShieldCheck,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import type { UIState, ActionStatus } from '../../types/ui-state';

interface Props {
  uiState: UIState;
  isStreaming: boolean;
}

const statusIcon: Record<ActionStatus, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400' },
  pending: { icon: Clock, color: 'text-slate-400' },
  'in-progress': { icon: Clock, color: 'text-amber-400' },
  'awaiting-approval': { icon: ShieldCheck, color: 'text-brand-400' },
  blocked: { icon: Clock, color: 'text-red-400' },
  skipped: { icon: Clock, color: 'text-slate-500' },
};

export default function CompletedView({ uiState, isStreaming }: Props) {
  const completedActions = uiState.timeline.filter((t) => t.status === 'completed');
  const pendingActions = uiState.timeline.filter((t) => t.status !== 'completed');

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-brand-500/10 border border-emerald-500/20"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-base">Process Complete</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              All steps have been processed by the agent team
            </p>
          </div>
        </div>
        {uiState.summary_text && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">{uiState.summary_text}</p>
        )}
      </motion.div>

      {/* Completed actions */}
      {completedActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Completed Actions</span>
            <span className="ml-auto text-[10px] text-emerald-400 font-bold">{completedActions.length}</span>
          </div>
          <div className="space-y-2">
            {completedActions.map((entry, i) => (
              <TimelineRow key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Pending/follow-up actions */}
      {pendingActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">Pending Follow-Ups</span>
            <span className="ml-auto text-[10px] text-amber-400 font-bold">{pendingActions.length}</span>
          </div>
          <div className="space-y-2">
            {pendingActions.map((entry, i) => (
              <TimelineRow key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Cards */}
      {uiState.cards.length > 0 && (
        <div className="space-y-3">
          {uiState.cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className={`p-4 rounded-xl border ${
                card.type === 'success'
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : card.type === 'warning'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-[var(--surface-1)] border-[var(--border)]'
              }`}
            >
              <div className="text-sm font-semibold mb-1">{card.title}</div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* References */}
      {uiState.references.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold">References</span>
          </div>
          <div className="space-y-1.5">
            {uiState.references.map((ref) => (
              <a
                key={ref.id}
                href={ref.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)] group transition-colors"
              >
                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  {ref.title}
                </span>
                <ArrowUpRight className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Demo CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
      >
        <div className="text-xs text-[var(--text-muted)]">
          Audit trail & compliance report available for download
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold hover:bg-[var(--surface-2)] transition-colors">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </motion.div>
    </div>
  );
}

/* Timeline row sub-component */
function TimelineRow({ entry, index }: { entry: { id: string; timestamp: string; agent: string; action: string; detail?: string; status: ActionStatus }; index: number }) {
  const meta = statusIcon[entry.status] ?? statusIcon.pending;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{entry.action}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{entry.agent}</span>
        </div>
        {entry.detail && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{entry.detail}</p>
        )}
      </div>
      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{entry.timestamp}</span>
    </motion.div>
  );
}
