import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Zap,
  Eye,
  FileUp,
} from 'lucide-react';
import type { UIState, ImpactNode, ActionStatus, RiskLevel } from '../../types/ui-state';

interface Props {
  uiState: UIState;
  isStreaming: boolean;
}

const statusMeta: Record<ActionStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  'pending': { icon: Clock, color: 'text-slate-400', label: 'Pending' },
  'in-progress': { icon: Zap, color: 'text-amber-400', label: 'In Progress' },
  'awaiting-approval': { icon: Eye, color: 'text-brand-400', label: 'Needs Review' },
  'completed': { icon: CheckCircle2, color: 'text-emerald-400', label: 'Done' },
  'blocked': { icon: ShieldAlert, color: 'text-red-400', label: 'Blocked' },
  'skipped': { icon: ChevronRight, color: 'text-slate-500', label: 'Skipped' },
};

const riskBorder: Record<RiskLevel, string> = {
  low: 'border-emerald-500/30',
  medium: 'border-amber-500/30',
  high: 'border-orange-500/30',
  critical: 'border-red-500/30',
};

export default function ActionPlanView({ uiState, isStreaming }: Props) {
  /* Group impact nodes by category */
  const grouped = uiState.impact_map.reduce<Record<string, ImpactNode[]>>((acc, node) => {
    (acc[node.category] ||= []).push(node);
    return acc;
  }, {});

  const autoItems = uiState.impact_map.filter((n) => n.status === 'completed' || n.risk === 'low');
  const reviewItems = uiState.impact_map.filter((n) => n.status === 'awaiting-approval');
  const docItems = uiState.impact_map.filter(
    (n) => n.status === 'blocked' || n.risk === 'high' || n.risk === 'critical',
  );

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <Chip icon={<Zap className="w-3.5 h-3.5" />} label="Auto-Done" count={autoItems.length} color="emerald" />
        <Chip icon={<Eye className="w-3.5 h-3.5" />} label="Review Required" count={reviewItems.length} color="brand" />
        <Chip icon={<FileUp className="w-3.5 h-3.5" />} label="Docs Needed" count={docItems.length} color="amber" />
      </div>

      {/* Impact map */}
      {Object.keys(grouped).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <h3 className="text-sm font-semibold mb-4">Impact Map</h3>
          <div className="space-y-5">
            {Object.entries(grouped).map(([category, nodes]) => (
              <div key={category}>
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-wide">
                  {category}
                </div>
                <div className="grid gap-2">
                  {nodes.map((node, i) => {
                    const meta = statusMeta[node.status];
                    const Icon = meta.icon;
                    return (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)] border ${riskBorder[node.risk]}`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 ${meta.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold">{node.label}</span>
                            <span className={`text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{node.description}</p>
                          {node.dependencies.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="text-[9px] text-[var(--text-muted)]">Depends on:</span>
                              {node.dependencies.map((dep) => (
                                <span
                                  key={dep}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-muted)]"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action cards */}
      {uiState.cards.length > 0 && (
        <div className="space-y-3">
          {uiState.cards.map((card, i) => {
            const isAction = card.type === 'action';
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className={`p-4 rounded-xl border ${
                  isAction
                    ? 'bg-brand-500/5 border-brand-500/20'
                    : 'bg-[var(--surface-1)] border-[var(--border)]'
                }`}
              >
                <div className="text-sm font-semibold mb-1">{card.title}</div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{card.description}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {uiState.warnings.length > 0 && (
        <div className="space-y-2">
          {uiState.warnings.map((w) => (
            <div
              key={w.id}
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{w.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------- helper chip component ------- */
function Chip({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    brand: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${colorClasses[color] ?? ''}`}>
      {icon}
      <span>{label}</span>
      <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
    </div>
  );
}
