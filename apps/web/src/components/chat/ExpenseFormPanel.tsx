/**
 * ExpenseFormPanel — Gen UI form that collects expense line items
 * and submits them to the agent for validation & processing.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, CheckCircle2, AlertTriangle, Loader2,
  Plus, Trash2, Receipt, DollarSign,
} from 'lucide-react';

/* ── Category options ── */
const CATEGORIES = [
  { label: 'Meals', value: 'meals' },
  { label: 'Travel', value: 'travel' },
  { label: 'Lodging', value: 'lodging' },
  { label: 'Office Supplies', value: 'office-supplies' },
  { label: 'Client Entertainment', value: 'client-entertainment' },
  { label: 'Training', value: 'training' },
  { label: 'Other', value: 'other' },
];

const SUBCATEGORIES: Record<string, { label: string; value: string }[]> = {
  meals: [
    { label: 'Individual', value: 'individual' },
    { label: 'Group / Team', value: 'group' },
    { label: 'Client', value: 'client' },
  ],
  travel: [
    { label: 'Rideshare (Uber/Lyft)', value: 'rideshare' },
    { label: 'Rental Car', value: 'rental' },
    { label: 'Airfare', value: 'airfare' },
    { label: 'Mileage', value: 'mileage' },
    { label: 'Parking', value: 'parking' },
  ],
};

interface LineItem {
  id: string;
  date: string;
  category: string;
  subcategory: string;
  amount: string;
  description: string;
  hasReceipt: boolean;
  city: string;
}

function emptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    category: '',
    subcategory: '',
    amount: '',
    description: '',
    hasReceipt: false,
    city: '',
  };
}

/* ── Props ── */
interface ExpenseFormPanelProps {
  onSubmit: (text: string) => void;
  isStreaming: boolean;
}

type SubmitStatus = 'idle' | 'submitting' | 'success';

export default function ExpenseFormPanel({ onSubmit, isStreaming }: ExpenseFormPanelProps) {
  const [items, setItems] = useState<LineItem[]>([emptyLineItem()]);
  const [tripName, setTripName] = useState('');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');

  const updateItem = useCallback((id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      // Reset subcategory when category changes
      if (field === 'category') updated.subcategory = '';
      return updated;
    }));
  }, []);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, emptyLineItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  }, []);

  const total = useMemo(() =>
    items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0),
    [items]
  );

  const filledCount = useMemo(() =>
    items.filter(i => i.category && i.amount && i.description).length,
    [items]
  );

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    items.forEach((item, idx) => {
      if (!item.category) missing.push(`Item ${idx + 1}: Category`);
      if (!item.amount) missing.push(`Item ${idx + 1}: Amount`);
      if (!item.description) missing.push(`Item ${idx + 1}: Description`);
    });
    return missing;
  }, [items]);

  const handleSubmit = useCallback(() => {
    if (missingRequired.length > 0 || isStreaming) return;
    setSubmitStatus('submitting');

    const parts: string[] = [`I'd like to submit an expense report${tripName ? ` for "${tripName}"` : ''}. Here are my expenses:\n`];
    items.forEach((item, idx) => {
      parts.push(`**Item ${idx + 1}:**`);
      parts.push(`- Date: ${item.date}`);
      parts.push(`- Category: ${item.category}${item.subcategory ? ` (${item.subcategory})` : ''}`);
      parts.push(`- Amount: $${parseFloat(item.amount).toFixed(2)}`);
      parts.push(`- Description: ${item.description}`);
      parts.push(`- Receipt: ${item.hasReceipt ? 'Yes' : 'No'}`);
      if (item.city) parts.push(`- City: ${item.city}`);
      parts.push('');
    });
    parts.push(`**Total: $${total.toFixed(2)}**`);
    parts.push('\nPlease validate these expenses against company policy and submit the report.');

    onSubmit(parts.join('\n'));
    setSubmitStatus('success');
  }, [items, tripName, total, missingRequired, isStreaming, onSubmit]);

  const disabled = submitStatus === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="ml-10 mt-3"
    >
      <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-[var(--border)] bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Expense Report</span>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">{filledCount}/{items.length} items complete</span>
          </div>
          <div className="w-full h-1 rounded-full bg-[var(--surface-3)] overflow-hidden mt-1">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${items.length > 0 ? (filledCount / items.length) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Trip Name */}
        <div className="px-3 pt-3 pb-1">
          <input
            type="text"
            value={tripName}
            onChange={e => setTripName(e.target.value)}
            placeholder="Trip / Project name (optional)"
            disabled={disabled}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-0)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
          />
        </div>

        {/* Line Items */}
        <div className="px-3 py-2 space-y-2">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Item {idx + 1}
                  </span>
                  {items.length > 1 && !disabled && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-0.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  {/* Date */}
                  <div>
                    <label className="text-[9px] font-semibold text-[var(--text-muted)] uppercase mb-0.5 block">Date *</label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={e => updateItem(item.id, 'date', e.target.value)}
                      disabled={disabled}
                      className="w-full px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[9px] font-semibold text-[var(--text-muted)] uppercase mb-0.5 block">Category *</label>
                    <select
                      value={item.category}
                      onChange={e => updateItem(item.id, 'category', e.target.value)}
                      disabled={disabled}
                      className="w-full px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                    >
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[9px] font-semibold text-[var(--text-muted)] uppercase mb-0.5 block">Amount ($) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={e => updateItem(item.id, 'amount', e.target.value)}
                        placeholder="0.00"
                        disabled={disabled}
                        className="w-full pl-5 pr-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  {/* Subcategory (conditional) */}
                  {SUBCATEGORIES[item.category] && (
                    <div>
                      <label className="text-[9px] font-semibold text-[var(--text-muted)] uppercase mb-0.5 block">Type</label>
                      <select
                        value={item.subcategory}
                        onChange={e => updateItem(item.id, 'subcategory', e.target.value)}
                        disabled={disabled}
                        className="w-full px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                      >
                        <option value="">Select…</option>
                        {SUBCATEGORIES[item.category].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* City (for lodging) */}
                  {item.category === 'lodging' && (
                    <div>
                      <label className="text-[9px] font-semibold text-[var(--text-muted)] uppercase mb-0.5 block">City</label>
                      <input
                        type="text"
                        value={item.city}
                        onChange={e => updateItem(item.id, 'city', e.target.value)}
                        placeholder="e.g. NYC, SF, Chicago"
                        disabled={disabled}
                        className="w-full px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-2">
                  <label className="text-[9px] font-semibold text-[var(--text-muted)] uppercase mb-0.5 block">Description *</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Business purpose…"
                    disabled={disabled}
                    className="w-full px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                  />
                </div>

                {/* Receipt toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.hasReceipt}
                    onChange={e => updateItem(item.id, 'hasReceipt', e.target.checked)}
                    disabled={disabled}
                    className="rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500/50"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">I have a receipt</span>
                  {!item.hasReceipt && parseFloat(item.amount) >= 25 && (
                    <span className="text-[9px] text-amber-400 ml-1">⚠ Required for ≥$25</span>
                  )}
                </label>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add item button */}
          {!disabled && (
            <button
              onClick={addItem}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-[var(--border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 text-[11px] text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add expense item
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-0)]">
          {submitStatus === 'success' ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Submitted — agent is validating your expenses</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs flex-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-[var(--text-primary)]">${total.toFixed(2)}</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  • {items.length} item{items.length > 1 ? 's' : ''}
                  {total < 500 ? ' • Auto-approved' : total <= 2000 ? ' • Manager approval' : ' • VP approval'}
                </span>
              </div>
              {missingRequired.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{missingRequired.length} required</span>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={missingRequired.length > 0 || isStreaming || submitStatus === 'submitting'}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
              >
                {submitStatus === 'submitting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Submit Expenses
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
