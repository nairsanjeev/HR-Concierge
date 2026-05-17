import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, Bot, User, Sparkles, Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types/events';
import type { UIState } from '../../types/ui-state';
import WorkdayFormPanel from './WorkdayFormPanel';
import GrievanceIntakePanel from './GrievanceIntakePanel';
import ExpenseFormPanel from './ExpenseFormPanel';

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  onReset: () => void;
  currentAgent: string;
  toolCalls: { id: string; name: string; status: string }[];
  uiState: UIState;
}

export default function ChatPanel({ messages, isStreaming, onSend, onReset, currentAgent, toolCalls, uiState }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, toolCalls, uiState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput('');
  };

  // Show Gen UI form when screen_type is a form type
  const showGenUI = uiState.screen_type === 'data-collection' || uiState.screen_type === 'grievance-intake' || uiState.screen_type === 'expense-collection';

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
        <Bot className="w-4 h-4 text-brand-400" />
        <span className="text-sm font-medium">Agent Chat</span>
        {isStreaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 ml-auto text-xs text-brand-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{currentAgent || 'Processing'}…</span>
          </motion.div>
        )}
        {messages.length > 0 && !isStreaming && (
          <button
            onClick={onReset}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            title="Clear all messages"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-brand-400" />
              </div>
              <h3 className="text-lg font-bold mb-1">Ready to assist</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Describe your HR request or pick a prompt from the gallery.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, msgIdx) => (
            <div key={msg.id}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-md'
                      : msg.role === 'system'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-[var(--surface-2)] text-[var(--text-primary)] rounded-bl-md'
                  }`}
                >
                  {msg.agent && msg.role === 'assistant' && (
                    <div className="text-[10px] font-semibold text-brand-400 mb-1 uppercase tracking-wider">{msg.agent}</div>
                  )}
                  <div className="prose-chat">
                    <ReactMarkdown>{msg.content || (msg.isStreaming ? '…' : '')}</ReactMarkdown>
                  </div>
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-brand-400 animate-pulse-subtle ml-0.5 rounded-sm" />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-3)] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  </div>
                )}
              </motion.div>


            </div>
          ))}
        </AnimatePresence>

        {/* Gen UI form — always at the bottom, after all chat messages */}
        {showGenUI && <InlineGenUI uiState={uiState} onSend={onSend} isStreaming={isStreaming} />}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your HR request…"
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-30 disabled:hover:bg-brand-600 text-white transition-colors"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Inline Gen UI ──────────────────────────────────────────────────────── */

function InlineGenUI({ uiState, onSend, isStreaming }: { uiState: UIState; onSend: (text: string) => void; isStreaming: boolean }) {
  const isDataCollection = uiState.screen_type === 'data-collection';
  const isGrievanceIntake = uiState.screen_type === 'grievance-intake';
  const isExpenseCollection = uiState.screen_type === 'expense-collection';

  // Extract form-eligible intent IDs for WorkdayFormPanel
  const formIntentIds = isDataCollection
    ? uiState.detected_intents.map(i => i.id === 'beneficiary' ? 'beneficiary-update' : i.id)
    : [];

  // Extract grievance categories for pre-filling
  const grievanceCategories = isGrievanceIntake
    ? uiState.detected_intents.flatMap(i => i.sub_intents || [])
    : [];

  if (!isDataCollection && !isGrievanceIntake && !isExpenseCollection) return null;
  if (isDataCollection && formIntentIds.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-3"
    >
      {isDataCollection && (
        <WorkdayFormPanel intentIds={formIntentIds} onSubmit={onSend} isStreaming={isStreaming} />
      )}
      {isGrievanceIntake && (
        <GrievanceIntakePanel onSubmit={onSend} isStreaming={isStreaming} categories={grievanceCategories} />
      )}
      {isExpenseCollection && (
        <ExpenseFormPanel onSubmit={onSend} isStreaming={isStreaming} />
      )}
    </motion.div>
  );
}
