/**
 * GrievanceIntakePanel — Gen UI structured intake form for workplace
 * grievances (harassment, discrimination, retaliation, etc.).
 * Collects incident details, dates, witnesses, evidence, and desired outcomes.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, CheckCircle2, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, ShieldAlert,
} from 'lucide-react';
import type { FormField } from '../../types/ui-state';

/* ── Intake form schema ── */

const INTAKE_SECTIONS: {
  id: string;
  label: string;
  color: string;
  fields: FormField[];
}[] = [
  {
    id: 'incident',
    label: 'Incident Details',
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    fields: [
      { id: 'description', label: 'Describe what happened', type: 'textarea', required: true, placeholder: 'Provide as much detail as possible about the incident(s)…' },
      { id: 'category', label: 'Type of Concern', type: 'select', required: true, options: [
        { label: 'Harassment', value: 'harassment' },
        { label: 'Discrimination', value: 'discrimination' },
        { label: 'Retaliation', value: 'retaliation' },
        { label: 'Bullying', value: 'bullying' },
        { label: 'Hostile Work Environment', value: 'hostile' },
        { label: 'Unfair Treatment', value: 'unfair-treatment' },
        { label: 'Other', value: 'other' },
      ]},
      { id: 'frequency', label: 'Frequency', type: 'select', required: true, options: [
        { label: 'One-time incident', value: 'one-time' },
        { label: 'Happened a few times', value: 'few-times' },
        { label: 'Ongoing / repeated pattern', value: 'ongoing' },
      ]},
    ],
  },
  {
    id: 'dates',
    label: 'Timeline & Dates',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    fields: [
      { id: 'date_of_incident', label: 'Date of Most Recent Incident', type: 'date', required: true },
      { id: 'date_first', label: 'Date of First Incident (if recurring)', type: 'date', required: false },
      { id: 'location', label: 'Location of Incident', type: 'text', required: false, placeholder: 'e.g., Office floor 3, conference room, virtual meeting' },
    ],
  },
  {
    id: 'people',
    label: 'People Involved',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    fields: [
      { id: 'respondent', label: 'Name(s) of Person(s) Involved', type: 'text', required: true, placeholder: 'Name and title/role if known' },
      { id: 'respondent_relation', label: 'Relationship to You', type: 'select', required: true, options: [
        { label: 'Direct Manager', value: 'manager' },
        { label: 'Skip-Level Manager', value: 'skip-level' },
        { label: 'Peer / Coworker', value: 'peer' },
        { label: 'Direct Report', value: 'report' },
        { label: 'Other Department', value: 'other-dept' },
        { label: 'External Party', value: 'external' },
      ]},
      { id: 'witnesses', label: 'Witnesses (if any)', type: 'text', required: false, placeholder: 'Names of anyone who observed these incidents' },
    ],
  },
  {
    id: 'prior-action',
    label: 'Prior Actions & Evidence',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    fields: [
      { id: 'previously_reported', label: 'Have you reported this before?', type: 'select', required: true, options: [
        { label: 'No — this is my first report', value: 'no' },
        { label: 'Yes — to my manager', value: 'yes-manager' },
        { label: 'Yes — to HR', value: 'yes-hr' },
        { label: 'Yes — to a colleague', value: 'yes-colleague' },
      ]},
      { id: 'prior_response', label: 'What was the response (if reported)?', type: 'text', required: false, placeholder: 'Describe any response or action taken previously' },
      { id: 'evidence', label: 'Supporting Evidence', type: 'select', required: true, options: [
        { label: 'I have emails / messages', value: 'emails' },
        { label: 'I have written notes', value: 'notes' },
        { label: 'I have witness statements', value: 'witness-statements' },
        { label: 'Multiple forms of evidence', value: 'multiple' },
        { label: 'No documentation at this time', value: 'none' },
      ]},
    ],
  },
  {
    id: 'resolution',
    label: 'Desired Outcome',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    fields: [
      { id: 'desired_outcome', label: 'What outcome would you like?', type: 'select', required: true, options: [
        { label: 'Formal investigation', value: 'investigation' },
        { label: 'Mediation / facilitated conversation', value: 'mediation' },
        { label: 'Transfer or separation from respondent', value: 'separation' },
        { label: 'Acknowledgment and corrective action', value: 'corrective' },
        { label: 'I\'m unsure — I need guidance', value: 'unsure' },
      ]},
      { id: 'urgency', label: 'Do you feel safe in your current work environment?', type: 'select', required: true, options: [
        { label: 'Yes — I feel safe', value: 'safe' },
        { label: 'Somewhat — I feel uncomfortable', value: 'uncomfortable' },
        { label: 'No — I feel unsafe', value: 'unsafe' },
      ]},
      { id: 'additional_info', label: 'Anything else you\'d like to share?', type: 'textarea', required: false, placeholder: 'Any additional context or concerns…' },
    ],
  },
];

/* ── Props ── */

interface GrievanceIntakePanelProps {
  onSubmit: (text: string) => void;
  isStreaming: boolean;
  categories?: string[];
}

type SubmitStatus = 'idle' | 'submitting' | 'success';

export default function GrievanceIntakePanel({ onSubmit, isStreaming, categories }: GrievanceIntakePanelProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Pre-fill category if detected
    const init: Record<string, string> = {};
    if (categories && categories.length > 0) {
      const cat = categories[0].toLowerCase();
      const match = INTAKE_SECTIONS[0].fields
        .find(f => f.id === 'category')?.options
        ?.find(o => cat.includes(o.value) || o.value.includes(cat));
      if (match) init['incident::category'] = match.value;
    }
    return init;
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ incident: true });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');

  const setValue = useCallback((sectionId: string, fieldId: string, val: string) => {
    setValues(prev => ({ ...prev, [`${sectionId}::${fieldId}`]: val }));
  }, []);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    for (const sec of INTAKE_SECTIONS) {
      for (const f of sec.fields) {
        if (f.required && !values[`${sec.id}::${f.id}`]) {
          missing.push(`${sec.label}: ${f.label}`);
        }
      }
    }
    return missing;
  }, [values]);

  const handleSubmit = useCallback(() => {
    if (missingRequired.length > 0 || isStreaming) return;
    setSubmitStatus('submitting');

    const parts: string[] = ['I have completed the Grievance Intake Form. Here are the details:\n'];
    for (const sec of INTAKE_SECTIONS) {
      parts.push(`**${sec.label}**:`);
      for (const f of sec.fields) {
        const raw = values[`${sec.id}::${f.id}`] || '(not provided)';
        // Resolve select labels
        const display = f.options?.find(o => o.value === raw)?.label || raw;
        parts.push(`- ${f.label}: ${display}`);
      }
      parts.push('');
    }
    parts.push('Please proceed with filing a formal grievance case based on the above details.');

    onSubmit(parts.join('\n'));
    setSubmitStatus('success');
  }, [values, missingRequired, isStreaming, onSubmit]);

  const filledCount = INTAKE_SECTIONS.reduce(
    (acc, sec) => acc + sec.fields.filter(f => values[`${sec.id}::${f.id}`]).length, 0
  );
  const totalCount = INTAKE_SECTIONS.reduce((acc, sec) => acc + sec.fields.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="ml-10 mt-3"
    >
      <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-[var(--border)] bg-gradient-to-r from-red-500/5 to-amber-500/5">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Grievance Intake Form</span>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">{filledCount}/{totalCount} fields</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            All information is confidential and protected under company policy.
          </p>
          <div className="w-full h-1 rounded-full bg-[var(--surface-3)] overflow-hidden mt-1.5">
            <motion.div
              className="h-full bg-red-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="divide-y divide-[var(--border)]">
          {INTAKE_SECTIONS.map((sec) => (
            <div key={sec.id}>
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
              >
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${sec.color}`}>
                  {sec.label}
                </span>
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                  {sec.fields.filter(f => values[`${sec.id}::${f.id}`]).length}/{sec.fields.length}
                </span>
                {expanded[sec.id]
                  ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
                  : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
              </button>

              <AnimatePresence>
                {expanded[sec.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2.5">
                      {sec.fields.map((field) => (
                        <IntakeInput
                          key={field.id}
                          field={field}
                          value={values[`${sec.id}::${field.id}`] || ''}
                          onChange={(val) => setValue(sec.id, field.id, val)}
                          disabled={submitStatus === 'success'}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-0)]">
          {submitStatus === 'success' ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Grievance intake submitted — case will be created</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {missingRequired.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400 flex-1 min-w-0 truncate">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{missingRequired.length} required field(s) remaining</span>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={missingRequired.length > 0 || isStreaming || submitStatus === 'submitting'}
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
              >
                {submitStatus === 'submitting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Submit Grievance Intake
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Form Input Component ── */

function IntakeInput({ field, value, onChange, disabled }: {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const baseClass = 'w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--surface-2)] border border-[var(--border)] focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 outline-none transition-all disabled:opacity-50';

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
          {field.label}
          {field.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={3}
          className={`${baseClass} resize-y min-h-[60px]`}
        />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <div>
        <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
          {field.label}
          {field.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={baseClass}
        >
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className={baseClass}
      />
    </div>
  );
}
