import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import type { UIState } from '../../types/ui-state';

interface Props {
  uiState: UIState;
  isStreaming: boolean;
}

export default function IntakeView({ uiState, isStreaming }: Props) {
  return (
    <div className="space-y-6">
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Analyzing your request</h3>
              <p className="text-xs text-[var(--text-muted)]">Our multi-agent team is processing…</p>
            </div>
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin ml-auto" />
          </div>

          {/* Shimmer loading bars */}
          <div className="space-y-3">
            {[80, 60, 90, 45].map((w, i) => (
              <div key={i} className="h-3 rounded-full shimmer" style={{ width: `${w}%` }} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Agent activity during intake */}
      {uiState.agent_activity.length > 0 && (
        <div className="space-y-2">
          {uiState.agent_activity.map((activity, i) => (
            <motion.div
              key={`${activity.agent_name}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
            >
              <span className={`status-dot ${activity.status === 'working' ? 'working' : activity.status === 'completed' ? 'active' : 'idle'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{activity.agent_name}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">{activity.message}</div>
              </div>
              <span className={`text-[10px] font-semibold ${activity.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {activity.status === 'completed' ? 'Done' : 'Active'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
