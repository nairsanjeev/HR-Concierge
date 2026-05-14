import { motion } from 'framer-motion';
import { Brain, ShieldCheck, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import type { UIState } from '../../types/ui-state';

interface Props {
  uiState: UIState;
  isStreaming: boolean;
}

const riskColorMap = {
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function TriageView({ uiState, isStreaming }: Props) {
  const isGrievance = uiState.screen_type === 'grievance-triage';

  return (
    <div className="space-y-6">
      {/* Detected Intents */}
      {uiState.detected_intents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold">
              {isGrievance ? 'Classification Results' : 'Detected Intents'}
            </span>
          </div>

          <div className="space-y-3">
            {uiState.detected_intents.map((intent, i) => (
              <motion.div
                key={intent.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${riskColorMap[intent.risk_level]}`}>
                      <ShieldCheck className="w-3 h-3" />
                      {intent.risk_level}
                    </span>
                    <span className="text-sm font-semibold">{intent.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${intent.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{Math.round(intent.confidence * 100)}%</span>
                  </div>
                </div>

                <div className="text-xs text-[var(--text-secondary)] mb-2">{intent.category}</div>

                {intent.sub_intents.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {intent.sub_intents.map((si) => (
                      <span
                        key={si}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--surface-3)] text-[var(--text-muted)]"
                      >
                        {si}
                      </span>
                    ))}
                  </div>
                )}

                {intent.auto_completable && (
                  <div className="flex items-center gap-1 mt-2 text-emerald-400 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-completable
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Warnings */}
      {uiState.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {uiState.warnings.map((warning) => (
            <div
              key={warning.id}
              className={`flex items-start gap-3 p-4 rounded-xl border ${riskColorMap[warning.severity]}`}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{warning.message}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Info Cards */}
      {uiState.cards.length > 0 && (
        <div className="space-y-3">
          {uiState.cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold">{card.title}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Explanation text */}
      {uiState.explanation_text && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/10 text-xs text-[var(--text-secondary)] leading-relaxed"
        >
          {uiState.explanation_text}
        </motion.div>
      )}

      {/* References */}
      {uiState.references.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <div className="text-xs font-semibold mb-3">Policy References</div>
          <div className="space-y-2">
            {uiState.references.map((ref) => (
              <div key={ref.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)]">
                <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{ref.title}</div>
                  {ref.snippet && (
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{ref.snippet}</p>
                  )}
                  <span className="text-[10px] text-brand-400">{ref.source}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
