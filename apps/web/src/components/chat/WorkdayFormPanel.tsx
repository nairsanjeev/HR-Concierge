/**
 * WorkdayFormPanel — Gen UI form that collects personal data changes
 * and submits them to the backend (simulated Workday API).
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, CheckCircle2, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, Building2, Upload, FileText, X,
} from 'lucide-react';
import type { FormField } from '../../types/ui-state';

/* ── Form field schemas per change type (mirrors backend WORKDAY_FORM_SCHEMAS) ── */

const FORM_SCHEMAS: Record<string, FormField[]> = {
  'name-change': [
    { id: 'current_legal_first', label: 'Current Legal First Name', type: 'text', required: true, group: 'Current Name' },
    { id: 'current_legal_last', label: 'Current Legal Last Name', type: 'text', required: true, group: 'Current Name' },
    { id: 'new_legal_first', label: 'New Legal First Name', type: 'text', required: true, group: 'New Name' },
    { id: 'new_legal_last', label: 'New Legal Last Name', type: 'text', required: true, group: 'New Name' },
    { id: 'reason', label: 'Reason for Change', type: 'select', required: true, options: [
      { label: 'Marriage', value: 'marriage' }, { label: 'Court Order', value: 'court_order' },
      { label: 'Personal Preference', value: 'personal' }, { label: 'Other', value: 'other' },
    ]},
    { id: 'effective_date', label: 'Effective Date', type: 'date', required: true },
    { id: 'document_type', label: 'Supporting Document', type: 'select', required: true, options: [
      { label: 'Marriage Certificate', value: 'marriage_cert' }, { label: 'Court Order', value: 'court_order' },
      { label: 'Government ID', value: 'govt_id' },
    ]},
  ],
  'address-change': [
    { id: 'address_line1', label: 'Street Address', type: 'text', required: true, group: 'New Address' },
    { id: 'address_line2', label: 'Apt / Suite / Unit', type: 'text', required: false, group: 'New Address' },
    { id: 'city', label: 'City', type: 'text', required: true, group: 'New Address' },
    { id: 'state', label: 'State', type: 'select', required: true, group: 'New Address', options:
      ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
       'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
       'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => ({ label: s, value: s })) },
    { id: 'zip_code', label: 'ZIP Code', type: 'text', required: true, group: 'New Address' },
    { id: 'country', label: 'Country', type: 'select', required: true, group: 'New Address', options: [
      { label: 'United States', value: 'US' }, { label: 'Canada', value: 'CA' }, { label: 'United Kingdom', value: 'UK' },
    ]},
    { id: 'effective_date', label: 'Move Date', type: 'date', required: true },
  ],
  'bank-details': [
    { id: 'bank_name', label: 'Bank Name', type: 'text', required: true, group: 'Bank Information' },
    { id: 'routing_number', label: 'Routing Number', type: 'text', required: true, group: 'Bank Information' },
    { id: 'account_number', label: 'Account Number', type: 'text', required: true, group: 'Bank Information' },
    { id: 'account_type', label: 'Account Type', type: 'select', required: true, group: 'Bank Information', options: [
      { label: 'Checking', value: 'checking' }, { label: 'Savings', value: 'savings' },
    ]},
    { id: 'deposit_type', label: 'Deposit Type', type: 'select', required: true, options: [
      { label: 'Full Deposit', value: 'full' }, { label: 'Partial Amount', value: 'partial' }, { label: 'Remainder', value: 'remainder' },
    ]},
    { id: 'deposit_amount', label: 'Amount (if partial)', type: 'text', required: false },
  ],
  'emergency-contact': [
    { id: 'contact_name', label: 'Contact Full Name', type: 'text', required: true, group: 'Emergency Contact' },
    { id: 'relationship', label: 'Relationship', type: 'select', required: true, group: 'Emergency Contact', options: [
      { label: 'Spouse / Partner', value: 'spouse' }, { label: 'Parent', value: 'parent' },
      { label: 'Sibling', value: 'sibling' }, { label: 'Friend', value: 'friend' }, { label: 'Other', value: 'other' },
    ]},
    { id: 'phone', label: 'Phone Number', type: 'text', required: true, group: 'Emergency Contact' },
    { id: 'email', label: 'Email Address', type: 'text', required: false, group: 'Emergency Contact' },
    { id: 'is_primary', label: 'Primary Contact?', type: 'select', required: true, options: [
      { label: 'Yes', value: 'true' }, { label: 'No', value: 'false' },
    ]},
  ],
  'marriage': [
    { id: 'spouse_first_name', label: 'Spouse First Name', type: 'text', required: true, group: 'Spouse Information' },
    { id: 'spouse_last_name', label: 'Spouse Last Name', type: 'text', required: true, group: 'Spouse Information' },
    { id: 'marriage_date', label: 'Date of Marriage', type: 'date', required: true },
    { id: 'name_changing', label: 'Are you changing your last name?', type: 'select', required: true, options: [
      { label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' },
    ]},
    { id: 'new_last_name', label: 'New Last Name (if changing)', type: 'text', required: false },
    { id: 'add_spouse_benefits', label: 'Add spouse to benefits?', type: 'select', required: true, options: [
      { label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' },
    ]},
    { id: 'update_tax_status', label: 'Update tax filing status?', type: 'select', required: true, options: [
      { label: 'Yes – Married Filing Jointly', value: 'mfj' }, { label: 'Yes – Married Filing Separately', value: 'mfs' },
      { label: 'No change', value: 'no' },
    ]},
    { id: 'document_type', label: 'Supporting Document', type: 'select', required: true, options: [
      { label: 'Marriage Certificate', value: 'marriage_cert' }, { label: 'Government ID', value: 'govt_id' },
    ]},
  ],
  'beneficiary-update': [
    { id: 'beneficiary_name', label: 'Beneficiary Full Name', type: 'text', required: true, group: 'Beneficiary' },
    { id: 'beneficiary_relation', label: 'Relationship', type: 'select', required: true, group: 'Beneficiary', options: [
      { label: 'Spouse', value: 'spouse' }, { label: 'Child', value: 'child' },
      { label: 'Parent', value: 'parent' }, { label: 'Other', value: 'other' },
    ]},
    { id: 'beneficiary_pct', label: 'Benefit Percentage', type: 'text', required: true, group: 'Beneficiary' },
    { id: 'benefit_plan', label: 'Benefit Plan', type: 'select', required: true, options: [
      { label: 'Life Insurance', value: 'life' }, { label: '401(k)', value: '401k' }, { label: 'All Plans', value: 'all' },
    ]},
  ],
  'preferred-name': [
    { id: 'preferred_first', label: 'Preferred First Name', type: 'text', required: true },
    { id: 'preferred_last', label: 'Preferred Last Name', type: 'text', required: false },
    { id: 'display_name', label: 'Display Name', type: 'text', required: false, placeholder: 'How you would like to be addressed' },
  ],
  'new-baby': [
    { id: 'child_first_name', label: "Child's First Name", type: 'text', required: true, group: 'Child Information' },
    { id: 'child_last_name', label: "Child's Last Name", type: 'text', required: true, group: 'Child Information' },
    { id: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true, group: 'Child Information' },
    { id: 'sex', label: 'Sex', type: 'select', required: true, group: 'Child Information', options: [
      { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' },
    ]},
    { id: 'add_to_health', label: 'Add to health insurance?', type: 'select', required: true, group: 'Benefits Enrollment', options: [
      { label: 'Yes – Medical', value: 'medical' }, { label: 'Yes – Medical + Dental + Vision', value: 'full' },
      { label: 'No', value: 'no' },
    ]},
    { id: 'health_plan', label: 'Health Plan', type: 'select', required: true, group: 'Benefits Enrollment', options: [
      { label: 'Employee + Child(ren)', value: 'emp_child' }, { label: 'Family', value: 'family' },
    ]},
    { id: 'add_to_life_insurance', label: 'Add child as life insurance beneficiary?', type: 'select', required: true, group: 'Benefits Enrollment', options: [
      { label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' },
    ]},
    { id: 'update_tax', label: 'Update tax withholdings?', type: 'select', required: true, group: 'Tax & Payroll', options: [
      { label: 'Yes – Add dependent', value: 'yes' }, { label: 'No change', value: 'no' },
    ]},
    { id: 'parental_leave', label: 'Request parental leave?', type: 'select', required: true, group: 'Parental Leave', options: [
      { label: 'Yes – Paid Parental Leave', value: 'paid' }, { label: 'Yes – FMLA', value: 'fmla' },
      { label: 'Yes – Both', value: 'both' }, { label: 'No', value: 'no' },
    ]},
    { id: 'leave_start', label: 'Leave Start Date', type: 'date', required: false, group: 'Parental Leave' },
    { id: 'leave_end', label: 'Leave End Date (estimated)', type: 'date', required: false, group: 'Parental Leave' },
  ],
};

/* ── Change type labels + icons ── */
const CHANGE_LABELS: Record<string, { label: string; color: string }> = {
  'name-change':       { label: 'Legal Name Change',       color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  'address-change':    { label: 'Address Update',          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  'bank-details':      { label: 'Direct Deposit / Bank',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  'emergency-contact': { label: 'Emergency Contact',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  'marriage':          { label: 'Marriage Event',           color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  'beneficiary-update':{ label: 'Beneficiary Update',      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  'preferred-name':    { label: 'Preferred Name',          color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  'new-baby':          { label: 'New Baby / Dependent',    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
};

/* ── Props ── */

interface WorkdayFormPanelProps {
  /** Intent IDs detected (e.g. ['marriage', 'address-change']) */
  intentIds: string[];
  /** Called after successful submission — sends structured text to chat */
  onSubmit: (text: string) => void;
  /** Is the stream busy? Disable submit while streaming */
  isStreaming: boolean;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function WorkdayFormPanel({ intentIds, onSubmit, isStreaming }: WorkdayFormPanelProps) {
  // Merge form fields for all detected intents
  const sections = useMemo(() => {
    const result: { intentId: string; label: string; color: string; fields: FormField[] }[] = [];
    for (const iid of intentIds) {
      const schema = FORM_SCHEMAS[iid];
      if (schema) {
        const meta = CHANGE_LABELS[iid] || { label: iid.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };
        result.push({ intentId: iid, label: meta.label, color: meta.color, fields: schema });
      }
    }
    return result;
  }, [intentIds]);

  // Form values keyed by `intentId::fieldId`
  const [values, setValues] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s, i) => [s.intentId, i === 0]))
  );
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});

  const setValue = useCallback((intentId: string, fieldId: string, val: string) => {
    setValues(prev => ({ ...prev, [`${intentId}::${fieldId}`]: val }));
  }, []);

  // Validation
  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    for (const sec of sections) {
      for (const f of sec.fields) {
        if (f.required && !values[`${sec.intentId}::${f.id}`]) {
          missing.push(`${sec.label}: ${f.label}`);
        }
      }
    }
    return missing;
  }, [sections, values]);

  const handleSubmit = useCallback(() => {
    if (missingRequired.length > 0 || isStreaming) return;
    setSubmitStatus('submitting');

    // Build a structured message per intent
    const parts: string[] = ['I have completed the Workday data collection forms. Here are the details:\n'];
    for (const sec of sections) {
      parts.push(`**${sec.label}**:`);
      for (const f of sec.fields) {
        const val = values[`${sec.intentId}::${f.id}`] || '(not provided)';
        parts.push(`- ${f.label}: ${val}`);
      }
      const files = uploadedFiles[sec.intentId];
      if (files && files.length > 0) {
        parts.push(`- Supporting Document(s) Uploaded: ${files.map(f => f.name).join(', ')}`);
      }
      parts.push('');
    }
    parts.push('Please submit these changes to Workday.');

    // Send as a user message so the agent picks it up
    onSubmit(parts.join('\n'));
    setSubmitStatus('success');
  }, [sections, values, missingRequired, isStreaming, onSubmit]);

  if (sections.length === 0) return null;

  const filledCount = sections.reduce((acc, sec) => acc + sec.fields.filter(f => values[`${sec.intentId}::${f.id}`]).length, 0);
  const totalCount = sections.reduce((acc, sec) => acc + sec.fields.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="ml-10 mt-3"
    >
      <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-[var(--border)] bg-gradient-to-r from-violet-500/5 to-blue-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Workday Update</span>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">{filledCount}/{totalCount} fields</span>
          </div>
          <div className="w-full h-1 rounded-full bg-[var(--surface-3)] overflow-hidden mt-1">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Form sections */}
        <div className="divide-y divide-[var(--border)]">
          {sections.map((sec) => (
            <div key={sec.intentId}>
              {/* Section header */}
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [sec.intentId]: !prev[sec.intentId] }))}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
              >
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${sec.color}`}>
                  {sec.label}
                </span>
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                  {sec.fields.filter(f => values[`${sec.intentId}::${f.id}`]).length}/{sec.fields.length}
                </span>
                {expanded[sec.intentId]
                  ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
                  : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
              </button>

              {/* Fields */}
              <AnimatePresence>
                {expanded[sec.intentId] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2.5">
                      {groupFields(sec.fields).map((group) => (
                        <div key={group.name}>
                          {group.name && (
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 mt-1">
                              {group.name}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {group.fields.map((field) => (
                              <FormInput
                                key={field.id}
                                field={field}
                                value={values[`${sec.intentId}::${field.id}`] || ''}
                                onChange={(val) => setValue(sec.intentId, field.id, val)}
                                disabled={submitStatus === 'success'}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Document Upload — show for sections that have a document_type field */}
                    {sec.fields.some(f => f.id === 'document_type') && (
                      <DocumentUpload
                        intentId={sec.intentId}
                        files={uploadedFiles[sec.intentId] || []}
                        onFilesChange={(files) => setUploadedFiles(prev => ({ ...prev, [sec.intentId]: files }))}
                        disabled={submitStatus === 'success'}
                      />
                    )}
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
              <span className="font-semibold">Submitted to Workday — processing via agent</span>
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
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
              >
                {submitStatus === 'submitting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Submit to Workday
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Form Input Component ── */

function FormInput({ field, value, onChange, disabled }: {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const isWide = field.type === 'text' && !field.group;
  const baseClass = 'w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--surface-2)] border border-[var(--border)] focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all disabled:opacity-50';

  return (
    <div className={isWide ? 'col-span-2' : 'col-span-1'}>
      <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {field.type === 'select' && field.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={baseClass}
        >
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'date' ? (
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={baseClass} />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          disabled={disabled}
          className={baseClass}
        />
      )}
    </div>
  );
}

/* ── Group fields by group name ── */

function groupFields(fields: FormField[]): { name: string; fields: FormField[] }[] {
  const groups = new Map<string, FormField[]>();
  for (const f of fields) {
    const key = f.group || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  return Array.from(groups.entries()).map(([name, fields]) => ({ name, fields }));
}

/* ── Document Upload Component ── */

function DocumentUpload({ intentId, files, onFilesChange, disabled }: {
  intentId: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled: boolean;
}) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    onFilesChange([...files, ...dropped]);
  }, [files, onFilesChange, disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    const selected = Array.from(e.target.files);
    onFilesChange([...files, ...selected]);
    e.target.value = '';
  }, [files, onFilesChange, disabled]);

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  return (
    <div className="px-3 pb-3">
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 mt-1">
        Supporting Documentation
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative border-2 border-dashed border-[var(--border)] hover:border-brand-500/50 rounded-lg p-4 text-center transition-colors"
      >
        <Upload className="w-5 h-5 mx-auto mb-1.5 text-[var(--text-muted)]" />
        <p className="text-[11px] text-[var(--text-secondary)]">
          Drag & drop document here, or{' '}
          <label className="text-brand-400 hover:text-brand-300 cursor-pointer font-semibold">
            browse files
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
          PDF, JPG, PNG, or Word — Marriage certificate, court order, or government ID
        </p>
      </div>

      {/* Uploaded file list */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((file, idx) => (
            <div
              key={`${intentId}-${idx}-${file.name}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"
            >
              <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="text-[11px] text-[var(--text-primary)] truncate flex-1">{file.name}</span>
              <span className="text-[9px] text-[var(--text-muted)] shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              {!disabled && (
                <button
                  onClick={() => removeFile(idx)}
                  className="p-0.5 rounded hover:bg-[var(--surface-3)] transition-colors"
                >
                  <X className="w-3 h-3 text-[var(--text-muted)] hover:text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
