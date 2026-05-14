import { useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sun, Moon, RotateCcw, Sparkles, PanelRightOpen, PanelRightClose,
  Activity, Lightbulb,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAgentStream } from '../hooks/useAgentStream';
import { useState } from 'react';
import ChatPanel from '../components/chat/ChatPanel';
import OrchestrationPanel from '../components/panels/OrchestrationPanel';
import PromptGallery from '../components/panels/PromptGallery';

type RightTab = 'orchestration' | 'prompts';

export default function WorkspacePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const stream = useAgentStream();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>('prompts');

  // Auto-send prompt from URL
  useEffect(() => {
    const prompt = params.get('prompt');
    if (prompt && stream.messages.length === 0) {
      stream.sendMessage(prompt);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch to orchestration tab when streaming starts
  useEffect(() => {
    if (stream.isStreaming) setRightTab('orchestration');
  }, [stream.isStreaming]);

  const handlePromptSelect = useCallback(
    (text: string) => {
      stream.sendMessage(text);
    },
    [stream]
  );

  return (
    <div className="h-screen flex flex-col bg-[var(--surface-0)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)] glass shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">HR Concierge</span>
          </div>
          {stream.currentAgent && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20"
            >
              <span className={`status-dot ${stream.isStreaming ? 'working' : 'active'}`} />
              <span className="text-xs font-medium text-brand-400">{stream.currentAgent}</span>
            </motion.div>
          )}
          <button
            onClick={stream.toggleMode}
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              stream.mode === 'demo'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
            title={`Click to switch to ${stream.mode === 'demo' ? 'live' : 'demo'} mode`}
          >
            {stream.mode === 'demo' ? 'Demo Mode' : 'Live Mode'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
          <button onClick={toggle} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={stream.resetConversation} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors" title="New conversation">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main workspace area — two columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat panel with inline Gen UI */}
        <div className="flex-1 flex flex-col border-r border-[var(--border)] min-w-0">
          <ChatPanel
            messages={stream.messages}
            isStreaming={stream.isStreaming}
            onSend={stream.sendMessage}
            onReset={stream.resetConversation}
            currentAgent={stream.currentAgent}
            toolCalls={stream.toolCalls}
            uiState={stream.uiState}
          />
        </div>

        {/* Right: Tabbed panel — Orchestration / Prompt Gallery */}
        <AnimatePresence>
          {rightPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-l border-[var(--border)] flex flex-col overflow-hidden"
            >
              {/* Tab bar */}
              <div className="flex border-b border-[var(--border)] shrink-0">
                <button
                  onClick={() => setRightTab('orchestration')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    rightTab === 'orchestration'
                      ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Orchestration
                </button>
                <button
                  onClick={() => setRightTab('prompts')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    rightTab === 'prompts'
                      ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-500/5'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)]'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Prompt Gallery
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">
                {rightTab === 'orchestration' ? (
                  <OrchestrationPanel
                    uiState={stream.uiState}
                    agentActivity={stream.uiState.agent_activity}
                    toolCalls={stream.toolCalls}
                    isStreaming={stream.isStreaming}
                  />
                ) : (
                  <PromptGallery onSelect={handlePromptSelect} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
