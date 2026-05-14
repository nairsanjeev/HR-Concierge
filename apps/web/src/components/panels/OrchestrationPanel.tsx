import { motion } from 'framer-motion';
import { Activity, Bot, Wrench, CheckCircle2, Clock, Zap, Route, ShieldCheck, ShieldX, Brain, ArrowRight } from 'lucide-react';
import type { UIState, AgentActivity } from '../../types/ui-state';

interface Props {
  uiState: UIState;
  agentActivity: AgentActivity[];
  toolCalls: { id?: string; name: string; args?: string; status: string }[];
  isStreaming: boolean;
}

export default function OrchestrationPanel({ uiState, agentActivity, toolCalls, isStreaming }: Props) {
  const routingDecisions = uiState.routing_decisions || [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-semibold">Orchestration</span>
          {isStreaming && <span className="ml-auto status-dot working" />}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto">

        {/* Routing Decisions — shows how the LLM classified and routed the request */}
        {routingDecisions.length > 0 && (
          <Section title="Routing Decision">
            <div className="space-y-2">
              {routingDecisions.map((rd, i) => {
                const isRejection = rd.decision === 'grievance_rejected';
                const isGrievance = rd.decision === 'grievance_accepted';
                const isKnowledge = rd.decision === 'knowledge_retrieval';
                const isLifeEvent = rd.decision === 'life_event';
                return (
                  <motion.div
                    key={`rd-${i}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border ${
                      isRejection ? 'bg-amber-500/5 border-amber-500/20' :
                      isGrievance ? 'bg-red-500/5 border-red-500/20' :
                      isKnowledge ? 'bg-blue-500/5 border-blue-500/20' :
                      isLifeEvent ? 'bg-violet-500/5 border-violet-500/20' :
                      'bg-[var(--surface-2)] border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {isRejection ? (
                        <ShieldX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : isGrievance ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : (
                        <Brain className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${
                        isRejection ? 'text-amber-400' :
                        isGrievance ? 'text-red-400' :
                        isKnowledge ? 'text-blue-400' :
                        isLifeEvent ? 'text-violet-400' :
                        'text-brand-400'
                      }`}>
                        {rd.decision.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] ml-auto">{rd.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{rd.reason}</p>
                    {(rd as any).route && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Route className="w-3 h-3 text-[var(--text-muted)]" />
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{(rd as any).route}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Workflow progress */}
        {uiState.progress.total_steps > 0 && (
          <Section title="Workflow Progress">
            <div className="space-y-1.5">
              {uiState.progress.substeps.map((step) => {
                const done = step.status === 'completed';
                const active = step.status === 'in-progress';
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                      active ? 'bg-brand-500/10 border border-brand-500/20' : ''
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : active ? (
                      <Zap className="w-3.5 h-3.5 text-brand-400 shrink-0 animate-pulse" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    )}
                    <span className={`${done ? 'text-emerald-400' : active ? 'text-brand-400 font-semibold' : 'text-[var(--text-muted)]'}`}>
                      {step.label}
                    </span>
                    <span className="ml-auto text-[10px] text-[var(--text-muted)]">{step.agent}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Agent activity */}
        {agentActivity.length > 0 && (
          <Section title="Agent Activity">
            <div className="space-y-2">
              {agentActivity.map((a, i) => {
                const isRouting = a.agent_role === 'routing';
                return (
                <motion.div
                  key={`${a.agent_name}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                    isRouting ? 'bg-amber-500/5 border border-amber-500/10' : 'hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {isRouting ? (
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                  ) : (
                  <Bot className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    a.status === 'completed' ? 'text-emerald-400' :
                    a.status === 'working' ? 'text-amber-400' :
                    a.status === 'error' ? 'text-red-400' : 'text-[var(--text-muted)]'
                  }`} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold">{a.agent_name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                        isRouting ? 'bg-amber-500/10 text-amber-400' :
                        a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        a.status === 'working' ? 'bg-amber-500/10 text-amber-400' :
                        a.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                      }`}>
                        {isRouting ? 'routed' : a.status}
                      </span>
                      {a.timestamp && (
                        <span className="text-[9px] text-[var(--text-muted)] ml-auto">{a.timestamp}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{a.message}</p>
                  </div>
                </motion.div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Tool calls */}
        {toolCalls.length > 0 && (
          <Section title="Tool Calls">
            <div className="space-y-1.5">
              {toolCalls.map((tc, i) => (
                <motion.div
                  key={`tc-${i}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"
                >
                  <Wrench className={`w-3 h-3 shrink-0 ${tc.status === 'completed' || tc.status === 'complete' ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-[10px] font-mono font-semibold truncate">{tc.name}</span>
                  {tc.status !== 'completed' && tc.status !== 'complete' && <span className="ml-auto text-[9px] text-amber-400 animate-pulse">running\u2026</span>}
                  {(tc.status === 'completed' || tc.status === 'complete') && <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-400" />}
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        {/* No tools called message — for direct responses */}
        {!isStreaming && toolCalls.length === 0 && agentActivity.length > 0 && routingDecisions.length > 0 && (
          <Section title="Tool Calls">
            <div className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ShieldX className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-[10px] text-[var(--text-muted)]">No tools invoked — LLM responded directly</span>
              </div>
            </div>
          </Section>
        )}

        {/* Timeline */}
        {uiState.timeline.length > 0 && (
          <Section title="Audit Timeline">
            <div className="space-y-1">
              {uiState.timeline.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 p-1.5 text-[10px]">
                  <span className="text-[var(--text-muted)] shrink-0 w-12">{entry.timestamp}</span>
                  <span className="font-semibold shrink-0 w-16 truncate">{entry.agent}</span>
                  <span className="text-[var(--text-secondary)] truncate">{entry.action}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Empty state */}
        {agentActivity.length === 0 && toolCalls.length === 0 && uiState.progress.total_steps === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
            <Activity className="w-8 h-8 mb-3" />
            <span className="text-xs">Agent activity will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{title}</div>
      {children}
    </div>
  );
}
