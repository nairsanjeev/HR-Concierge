import { motion } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  List,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import type { UIState, UIApproval, RiskLevel } from '../../types/ui-state';

interface Props {
  uiState: UIState;
  isStreaming: boolean;
}

const riskStyle: Record<RiskLevel, { border: string; bg: string; text: string }> = {
  low: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
  medium: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400' },
  high: { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400' },
  critical: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400' },
};

export default function ReviewView({ uiState, isStreaming }: Props) {
  const isCaseDraft = uiState.screen_type === 'case-draft';

  return (
    <div className="space-y-6">
      {/* Approval cards (life-event review) */}
      {uiState.approvals.length > 0 && (
        <div className="space-y-4">
          {uiState.approvals.map((approval, i) => (
            <ApprovalCard key={approval.id} approval={approval} index={i} />
          ))}
        </div>
      )}

      {/* Grievance Case Draft */}
      {isCaseDraft && uiState.case_draft && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold">Case Draft</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase">
              {uiState.case_draft.priority}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <Field label="Category" value={uiState.case_draft.category} />
            <Field label="Routing" value={uiState.case_draft.routing} />
            <Field label="Summary" value={uiState.case_draft.summary} />
            <Field label="Description" value={uiState.case_draft.description} multiline />

            {uiState.case_draft.facts.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1.5 tracking-wide">
                  Key Facts
                </div>
                <ul className="space-y-1">
                  {uiState.case_draft.facts.map((fact, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uiState.case_draft.missing_info.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-amber-400 mb-1.5 tracking-wide">
                  Missing Information
                </div>
                <ul className="space-y-1">
                  {uiState.case_draft.missing_info.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-amber-300">
                      <HelpCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uiState.case_draft.rationale && (
              <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">AI Rationale</div>
                <p className="text-[var(--text-secondary)] leading-relaxed">{uiState.case_draft.rationale}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Editable form fields */}
      {uiState.form_fields.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <List className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold">Change Summary</span>
          </div>
          <div className="space-y-3">
            {uiState.form_fields.map((field) => (
              <div key={field.id} className="flex items-start gap-3">
                <div className="w-28 text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1.5 tracking-wide shrink-0">
                  {field.label}
                </div>
                <div className="flex-1 text-xs text-[var(--text-primary)] bg-[var(--surface-2)] rounded-lg px-3 py-2 border border-[var(--border)]">
                  {field.value ?? field.placeholder ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Summary text */}
      {uiState.summary_text && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed"
        >
          {uiState.summary_text}
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
              transition={{ delay: 0.15 + i * 0.05 }}
              className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
            >
              <div className="text-sm font-semibold mb-1">{card.title}</div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Approval Card Sub-component ---- */
function ApprovalCard({ approval, index }: { approval: UIApproval; index: number }) {
  const style = riskStyle[approval.risk_level];
  const isPending = approval.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-5 rounded-2xl ${style.bg} border ${style.border}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${style.text}`} />
          <span className="text-sm font-bold">{approval.title}</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
            isPending
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : approval.status === 'approved'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          {approval.status}
        </span>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{approval.description}</p>

      <div className="p-3 rounded-lg bg-[var(--surface-1)]/50 border border-[var(--border)] mb-4">
        <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">Rationale</div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{approval.rationale}</p>
      </div>

      {isPending && (
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors">
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
          <ArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
          <AlertTriangle className={`w-4 h-4 ${style.text}`} />
          <span className={`text-[10px] font-bold uppercase ${style.text}`}>{approval.risk_level} risk</span>
        </div>
      )}
    </motion.div>
  );
}

/* ---- Field display ---- */
function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1 tracking-wide">{label}</div>
      <div className={`text-[var(--text-secondary)] leading-relaxed ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {value}
      </div>
    </div>
  );
}
