import { motion } from 'framer-motion';
import type { UIState } from '../../types/ui-state';
import IntakeView from './IntakeView';
import TriageView from './TriageView';
import ActionPlanView from './ActionPlanView';
import ReviewView from './ReviewView';
import CompletedView from './CompletedView';

interface Props {
  uiState: UIState;
  isStreaming: boolean;
}

export default function AdaptiveRenderer({ uiState, isStreaming }: Props) {
  const renderView = () => {
    switch (uiState.screen_type) {
      case 'intake':
      case 'grievance-intake':
        return <IntakeView uiState={uiState} isStreaming={isStreaming} />;
      case 'triage':
      case 'grievance-triage':
        return <TriageView uiState={uiState} isStreaming={isStreaming} />;
      case 'action-plan':
        return <ActionPlanView uiState={uiState} isStreaming={isStreaming} />;
      case 'review':
      case 'case-draft':
        return <ReviewView uiState={uiState} isStreaming={isStreaming} />;
      case 'completed':
        return <CompletedView uiState={uiState} isStreaming={isStreaming} />;
      default:
        return <IntakeView uiState={uiState} isStreaming={isStreaming} />;
    }
  };

  return (
    <div className="h-full p-6">
      <motion.div
        key={uiState.screen_type}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl mx-auto"
      >
        {/* Screen header */}
        {uiState.title && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <ScreenBadge type={uiState.screen_type} />
              <h1 className="text-2xl font-bold">{uiState.title}</h1>
            </div>
            {uiState.subtitle && (
              <p className="text-sm text-[var(--text-secondary)] ml-[calc(1.75rem+0.75rem)]">{uiState.subtitle}</p>
            )}
          </div>
        )}

        {/* Progress bar */}
        {uiState.progress.total_steps > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">{uiState.progress.label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                Step {uiState.progress.current_step} of {uiState.progress.total_steps}
              </span>
            </div>
            <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uiState.progress.percentage}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            {/* Substeps */}
            {uiState.progress.substeps.length > 0 && (
              <div className="flex gap-1 mt-3">
                {uiState.progress.substeps.map((step) => (
                  <div key={step.id} className="flex-1">
                    <div className={`h-1 rounded-full transition-colors duration-300 ${
                      step.status === 'completed' ? 'bg-emerald-500' :
                      step.status === 'in-progress' ? 'bg-brand-500 animate-pulse-subtle' :
                      step.status === 'skipped' ? 'bg-[var(--surface-3)]' :
                      'bg-[var(--surface-3)]'
                    }`} />
                    <div className="mt-1.5 text-[10px] text-[var(--text-muted)] truncate">{step.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Adaptive content */}
        {renderView()}
      </motion.div>
    </div>
  );
}

function ScreenBadge({ type }: { type: string }) {
  const configs: Record<string, { label: string; color: string }> = {
    intake: { label: 'INTAKE', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    triage: { label: 'TRIAGE', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    'action-plan': { label: 'ACTION PLAN', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    review: { label: 'REVIEW', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    completed: { label: 'COMPLETE', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    'grievance-intake': { label: 'INTAKE', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    'grievance-triage': { label: 'ASSESSMENT', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    'case-draft': { label: 'CASE DRAFT', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  };
  const cfg = configs[type] || configs.intake;
  return (
    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
