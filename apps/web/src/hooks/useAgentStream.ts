/** Hook for streaming AG-UI events from the backend via SSE. */

import { useState, useCallback, useRef } from 'react';
import type { AGUIEvent, ChatMessage } from '../types/events';
import type { UIState, AgentActivity, DetectedIntent, ImpactNode } from '../types/ui-state';
import { EMPTY_UI_STATE } from '../types/ui-state';

const API_BASE = '/api';

interface UseAgentStreamReturn {
  messages: ChatMessage[];
  uiState: UIState;
  isStreaming: boolean;
  currentAgent: string;
  currentStep: string;
  toolCalls: { id: string; name: string; status: string }[];
  mode: 'demo' | 'live';
  toggleMode: () => void;
  sendMessage: (text: string) => Promise<void>;
  resetConversation: () => void;
}

export function useAgentStream(): UseAgentStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uiState, setUiState] = useState<UIState>(EMPTY_UI_STATE);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [toolCalls, setToolCalls] = useState<{ id: string; name: string; status: string }[]>([]);
  const [mode, setMode] = useState<'demo' | 'live'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('hr-concierge-mode') as 'demo' | 'live') || 'demo';
    }
    return 'demo';
  });
  const threadIdRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'demo' ? 'live' : 'demo';
      localStorage.setItem('hr-concierge-mode', next);
      return next;
    });
  }, []);

  const resetConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setUiState(EMPTY_UI_STATE);
    setIsStreaming(false);
    setCurrentAgent('');
    setCurrentStep('');
    setToolCalls([]);
    threadIdRef.current = '';
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setToolCalls([]);
    // Clear previous Gen UI (forms) so stale screens don't persist across turns
    setUiState(EMPTY_UI_STATE);

    // Build messages array for the API
    const apiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ];

    // Abort previous stream if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let currentMsgId = '';
    let currentContent = '';
    let activeStep = '';
    let pendingMsgStart = false; // defer message creation until content arrives
    const activities: AgentActivity[] = [];
    const completedSteps: string[] = [];
    const completedTexts: string[] = [];
    const routingDecisions: { decision: string; reason: string; timestamp: string }[] = [];

    // Map tool names → step names so Gen UI triggers from tool calls
    const TOOL_TO_STEP: Record<string, string> = {
      query_knowledge_base: 'knowledge_retrieval',
      retrieve_policy_guidance: 'knowledge_retrieval',
      get_workday_form_schema: 'workday_form_retrieval',
      update_workday_employee: 'workday_data_submission',
      assess_risk_and_compliance: 'risk_assessment',
      build_impact_map: 'impact_analysis',
      submit_high_risk_changes: 'change_execution',
      execute_self_service_changes: 'change_execution',
      generate_completion_summary: 'completion_summary',
      structure_narrative: 'grievance_intake',
      create_grievance_case: 'grievance_filing',
    };

    try {
      const resp = await fetch(`${API_BASE}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          messages: apiMessages,
          threadId: threadIdRef.current || undefined,
          mode,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;

          let event: AGUIEvent;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          switch (event.type) {
            case 'RUN_STARTED':
              if (event.threadId) threadIdRef.current = event.threadId;
              break;

            case 'STEP_STARTED':
              activeStep = event.stepName || '';
              setCurrentStep(activeStep);
              setCurrentAgent(formatAgentName(activeStep));
              activities.push({
                agent_name: formatAgentName(event.stepName || ''),
                agent_role: event.stepName || '',
                status: 'working',
                message: `${formatAgentName(event.stepName || '')} is working…`,
              });
              setUiState((prev) => ({ ...prev, agent_activity: [...activities] }));
              break;

            case 'STEP_FINISHED': {
              const stepName = event.stepName || '';
              completedSteps.push(stepName);
              if (activities.length > 0) {
                const last = activities[activities.length - 1];
                if (last.agent_role === stepName) last.status = 'completed';
              }
              setUiState((prev) => ({ ...prev, agent_activity: [...activities] }));

              // Synthesize Gen UI state from completed agent steps + text
              // Once data-collection or grievance-intake (form) is active, keep it
              // locked — only a new user message / form submission starts a fresh flow.
              const synthState = synthesizeUIState(text, completedTexts, completedSteps);
              if (synthState) {
                setUiState((prev) => {
                  // Never overwrite an active form
                  if (prev.screen_type === 'data-collection' || prev.screen_type === 'grievance-intake') {
                    return { ...prev, agent_activity: [...activities] };
                  }
                  return { ...prev, ...synthState, agent_activity: [...activities] };
                });
              }
              break;
            }

            case 'TEXT_MESSAGE_START': {
              currentMsgId = event.messageId || `msg-${Date.now()}`;
              currentContent = '';
              // Defer message creation until actual content arrives
              // to prevent blank bubbles from tool-only responses.
              pendingMsgStart = true;
              break;
            }

            case 'TEXT_MESSAGE_CONTENT':
              if (event.delta) {
                currentContent += event.delta;
                // Create the message on first content delta (avoids blank bubble)
                if (pendingMsgStart) {
                  pendingMsgStart = false;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: currentMsgId,
                      role: 'assistant',
                      content: currentContent,
                      timestamp: new Date().toISOString(),
                      agent: undefined,
                      isStreaming: true,
                    },
                  ]);
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === currentMsgId ? { ...m, content: currentContent } : m
                    )
                  );
                }
              }
              break;

            case 'TEXT_MESSAGE_END':
              // If we never got content, discard the pending message start
              if (pendingMsgStart) {
                pendingMsgStart = false;
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentMsgId ? { ...m, isStreaming: false } : m
                  )
                );
              }
              completedTexts.push(currentContent);
              currentMsgId = '';
              break;

            case 'TOOL_CALL_START': {
              const toolName = event.toolCallName || '';
              setToolCalls((prev) => [
                ...prev,
                { id: event.toolCallId || '', name: toolName, status: 'running' },
              ]);
              // Add tool-level activity entry for the orchestration panel
              const toolStep = formatAgentName(toolName.replace(/_/g, '_'));
              activities.push({
                agent_name: toolStep,
                agent_role: toolName,
                status: 'working',
                message: `Calling ${toolName}…`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              });
              setUiState((prev) => ({ ...prev, agent_activity: [...activities] }));
              break;
            }

            case 'TOOL_CALL_END': {
              setToolCalls((prev) =>
                prev.map((tc) =>
                  tc.id === event.toolCallId ? { ...tc, status: 'completed' } : tc
                )
              );
              // Update the tool activity to completed
              let completedToolName = '';
              for (let idx = activities.length - 1; idx >= 0; idx--) {
                if (activities[idx].status === 'working' && activities[idx].agent_role !== 'hr_concierge') {
                  activities[idx].status = 'completed';
                  activities[idx].message = `${activities[idx].agent_role} completed`;
                  completedToolName = activities[idx].agent_role;
                  break;
                }
              }
              // Map the completed tool to a step name so Gen UI is triggered
              if (completedToolName) {
                const stepName = TOOL_TO_STEP[completedToolName];
                if (stepName) {
                  completedSteps.push(stepName);
                  // Synthesize Gen UI state from the updated steps
                  const synthState = synthesizeUIState(text, completedTexts, completedSteps);
                  if (synthState) {
                    setUiState((prev) => {
                      if (prev.screen_type === 'data-collection' || prev.screen_type === 'grievance-intake') {
                        return { ...prev, agent_activity: [...activities] };
                      }
                      return { ...prev, ...synthState, agent_activity: [...activities] };
                    });
                  } else {
                    setUiState((prev) => ({ ...prev, agent_activity: [...activities] }));
                  }
                } else {
                  setUiState((prev) => ({ ...prev, agent_activity: [...activities] }));
                }
              } else {
                setUiState((prev) => ({ ...prev, agent_activity: [...activities] }));
              }
              break;
            }

            case 'CUSTOM':
              if (event.name === 'ui_state' && event.value) {
                setUiState((prev) => {
                  // Never overwrite an active form (data-collection or grievance-intake)
                  // UNLESS the backend explicitly sends 'completed' (e.g. trivial pushback)
                  if (prev.screen_type === 'data-collection' || prev.screen_type === 'grievance-intake') {
                    // Keep form locked — only a new user message / reset clears it
                    return { ...prev, agent_activity: activities.length > 0 ? [...activities] : prev.agent_activity };
                  }
                  return {
                    ...prev,
                    ...event.value,
                    agent_activity: activities.length > 0
                      ? [...activities]
                      : event.value.agent_activity || prev.agent_activity,
                  };
                });
              } else if (event.name === 'routing_decision' && event.value) {
                const rd = event.value as { decision: string; reason: string };
                routingDecisions.push({ ...rd, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
                // Add routing decision as an activity entry
                activities.push({
                  agent_name: 'Routing Decision',
                  agent_role: 'routing',
                  status: 'completed',
                  message: rd.reason,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                });
                setUiState((prev) => ({ ...prev, agent_activity: [...activities], routing_decisions: routingDecisions }));
              } else if (event.name === 'status' && event.value) {
                const agentName = event.value.agent || '';
                setCurrentAgent(formatAgentName(agentName));
                if (event.value.message) {
                  const idx = activities.findIndex((a) => a.agent_role === agentName);
                  if (idx >= 0) {
                    activities[idx].message = event.value.message;
                  }
                }
              }
              break;

            case 'RUN_FINISHED':
              break;

            case 'RUN_ERROR':
              setMessages((prev) => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  role: 'system',
                  content: `Error: ${event.value?.message || 'Unknown error'}`,
                  timestamp: new Date().toISOString(),
                },
              ]);
              break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Stream error:', e);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [messages, currentAgent]);

  return { messages, uiState, isStreaming, currentAgent, currentStep, toolCalls, mode, toggleMode, sendMessage, resetConversation };
}

function formatAgentName(stepName: string): string {
  const names: Record<string, string> = {
    orchestrator: 'Orchestrator',
    hr_concierge: 'HR Concierge',
    knowledge_retrieval: 'Knowledge Retrieval',
    workday_form_retrieval: 'Workday Form Retrieval',
    workday_data_submission: 'Workday Data Submission',
    risk_assessment: 'Risk Assessment',
    impact_analysis: 'Impact Analysis',
    change_execution: 'Change Execution',
    completion_summary: 'Completion Summary',
    grievance_intake: 'Grievance Intake',
    grievance_filing: 'Grievance Filing',
  };
  return names[stepName] || stepName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Synthesize Gen UI state from completed orchestration steps and text output.
 * Uses step names emitted by the agentic loop (e.g., workday_form_retrieval,
 * risk_assessment) to determine which Gen UI view to show.
 */
function synthesizeUIState(
  userMsg: string,
  completedTexts: string[],
  completedSteps: string[],
): Partial<UIState> | null {
  const allText = completedTexts.join('\n');

  // Use completed orchestration step names as signals
  const hasWorkdayForm = completedSteps.some(s => s.includes('workday') && s.includes('form'));
  const hasRiskAssessment = completedSteps.some(s => s.includes('risk') || s.includes('impact'));
  const hasChangeExecution = completedSteps.some(s => s.includes('change') && s.includes('execution'));
  const hasWorkdaySubmission = completedSteps.some(s => s.includes('workday') && s.includes('submission'));
  const hasSummary = completedSteps.some(s => s.includes('summary') || s.includes('completion'));
  const hasGrievanceFiling = completedSteps.some(s => s.includes('grievance') && s.includes('filing'));
  const hasGrievanceIntake = completedSteps.some(s => s.includes('grievance') && s.includes('intake'));

  // Expense-report skill detection
  const hasExpenseSkill = completedSteps.some(s => s.includes('expense') || s.includes('load_skill'));

  // Fallback: detect from text content when step names are numeric/unknown
  // Normalize smart quotes/apostrophes to ASCII for reliable matching
  const lower = allText.toLowerCase().replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  const textHasIntents = lower.includes('identified') && (lower.includes('intent') || lower.includes('change') || lower.includes('update'));
  const textHasRisk = lower.includes('risk') && (lower.includes('assessment') || lower.includes('level') || lower.includes('compliance'));
  const textHasComplete = lower.includes('completed') && (lower.includes('change') || lower.includes('update') || lower.includes('processed'));
  const textHasExpense = lower.includes('expense report') || lower.includes('expense submission')
    || (lower.includes('expense') && (lower.includes('submit') || lower.includes('reimburse') || lower.includes('receipt')));
  // Only treat as grievance if the LLM actually called grievance tools (step-based),
  // NOT from text content alone — the word "grievance" appears in rejection text too
  const textHasGrievance = false; // Disabled: text-based grievance detection caused false positives on rejections
  // Detect when the LLM has rejected/triaged the concern as trivial
  const textHasGrievanceRejection = lower.includes('does not qualify') || lower.includes('doesn\'t qualify')
    || lower.includes('doesn\'t typically qualify') || lower.includes('does not typically qualify')
    || lower.includes('does not meet the threshold') || lower.includes('doesn\'t meet the threshold')
    || lower.includes('not a grievance') || lower.includes('not a valid') || lower.includes('not a formal grievance')
    || lower.includes('rather than a formal grievance') || lower.includes('workplace concern')
    || lower.includes('not constitute a grievance') || lower.includes('not considered a grievance')
    || lower.includes('not warrant a formal') || lower.includes('doesn\'t warrant a formal')
    || lower.includes('not rise to the level') || lower.includes('doesn\'t rise to the level')
    || lower.includes('not an hr grievance') || lower.includes('not a formal hr grievance');

  const isWorkdayPhase = hasWorkdayForm || textHasIntents;
  const isRiskPhase = hasRiskAssessment || textHasRisk;
  const isGrievancePhase = (hasGrievanceFiling || hasGrievanceIntake || textHasGrievance) && !textHasGrievanceRejection;

  // IDs that have a Workday form
  const FORM_ELIGIBLE = new Set([
    'name-change', 'address-change', 'bank-details',
    'emergency-contact', 'marriage', 'beneficiary-update',
    'beneficiary', 'preferred-name', 'new-baby',
  ]);

  // Check if any detected intents are form-eligible
  const intentsForForm = extractIntentsFromText(allText, userMsg);
  const formIntentIds = intentsForForm
    .map(i => i.id === 'beneficiary' ? 'beneficiary-update' : i.id)
    .filter(id => FORM_ELIGIBLE.has(id));
  const hasFormIntents = formIntentIds.length > 0;

  // Show the Workday data-collection form as soon as intents are detected
  // and the workflow hasn't reached the final summary yet.
  const isDataCollectionPhase = hasFormIntents && !hasSummary && !isGrievancePhase && (isWorkdayPhase || isRiskPhase || hasChangeExecution || hasWorkdaySubmission);

  // --- Expense Report → show expense collection form ---
  const isExpensePhase = (hasExpenseSkill || textHasExpense) && !hasSummary && !textHasComplete;
  if (isExpensePhase) {
    return {
      screen_type: 'expense-collection',
      title: 'Expense Report',
      subtitle: 'Enter your expenses below',
      detected_intents: [{
        id: 'expense-report',
        label: 'Expense Report Submission',
        category: 'expense',
        confidence: 0.9,
        sub_intents: [],
        risk_level: 'low',
        auto_completable: false,
      }],
    };
  }

  if (isDataCollectionPhase) {
    return {
      screen_type: 'data-collection',
      title: 'Workday Data Collection',
      subtitle: `${formIntentIds.length} form(s) to complete`,
      detected_intents: intentsForForm,
      form_fields: formIntentIds.map(id => ({ id, label: id, type: 'form-section', group: id })),
    };
  }

  // --- Grievance → show intake form (check first — more specific) ---
  if (isGrievancePhase) {
    return {
      screen_type: 'grievance-intake',
      title: 'Grievance Intake',
      subtitle: 'Please provide details below',
      detected_intents: [{
        id: 'grievance',
        label: 'Formal Grievance',
        category: 'employee-relations',
        confidence: 0.85,
        sub_intents: extractGrievanceCategories(allText),
        risk_level: 'high',
        auto_completable: false,
      }],
      warnings: extractWarnings(allText),
    };
  }

  // --- Execution / Completion (only when no form intents need collecting) ---
  const isExecutePhase = hasSummary || (hasChangeExecution && textHasComplete);
  if (isExecutePhase) {
    const intents = extractIntentsFromText(allText, userMsg);
    const timeline = intents.map((i, idx) => ({
      id: `tl-${idx}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agent: i.auto_completable ? 'Action Executor' : 'HR Operations',
      action: i.label,
      status: (i.auto_completable ? 'completed' : 'awaiting-approval') as any,
    }));
    return {
      screen_type: 'completed',
      title: 'Request Complete',
      subtitle: 'All actions processed',
      detected_intents: intents,
      timeline,
    };
  }

  // --- Risk Assessment / Action Plan ---
  if (isRiskPhase) {
    const intents = extractIntentsFromText(allText, userMsg);
    const impactNodes = extractImpactFromText(allText, intents);
    return {
      screen_type: 'action-plan',
      title: 'Action Plan',
      subtitle: 'Risk assessment complete',
      detected_intents: intents,
      impact_map: impactNodes,
      warnings: extractWarnings(allText),
    };
  }

  // --- Life Event: extract intents after intent classifier completes ---
  if (isWorkdayPhase) {
    const intents = extractIntentsFromText(allText, userMsg);
    if (intents.length > 0) {
      return {
        screen_type: 'triage',
        title: 'Request Triage',
        subtitle: `${intents.length} change(s) detected`,
        detected_intents: intents,
      };
    }
  }

  return null;
}

function extractIntentsFromText(text: string, userMsg: string): DetectedIntent[] {
  const intents: DetectedIntent[] = [];
  const msgLower = (text + ' ' + userMsg).toLowerCase();

  const intentDefs: Array<{
    id: string; label: string; keywords: string[];
    risk: 'low' | 'medium' | 'high'; auto: boolean; category: string;
  }> = [
    { id: 'marriage', label: 'Marriage Update', keywords: ['married', 'marriage', 'spouse', 'wedding'], risk: 'medium', auto: false, category: 'Life Event' },
    { id: 'name-change', label: 'Legal Name Change', keywords: ['name change', 'legal name', 'last name', 'surname'], risk: 'high', auto: false, category: 'Identity' },
    { id: 'address-change', label: 'Address Change', keywords: ['address', 'moved', 'new address', 'relocation', 'relocat'], risk: 'low', auto: true, category: 'Personal Data' },
    { id: 'emergency-contact', label: 'Emergency Contact Update', keywords: ['emergency contact'], risk: 'low', auto: true, category: 'Personal Data' },
    { id: 'bank-details', label: 'Bank / Direct Deposit', keywords: ['bank', 'direct deposit', 'payment', 'account number'], risk: 'high', auto: false, category: 'Payroll' },
    { id: 'beneficiary', label: 'Beneficiary Update', keywords: ['beneficiar'], risk: 'medium', auto: false, category: 'Benefits' },
    { id: 'tax-withholding', label: 'Tax Withholding Update', keywords: ['tax withholding', 'w-4', 'filing status'], risk: 'medium', auto: false, category: 'Payroll' },
    { id: 'benefits-enrollment', label: 'Benefits Enrollment', keywords: ['health insurance', 'benefits', 'enroll', 'add.*spouse', 'add.*dependent', 'add.*baby', 'dental', 'vision'], risk: 'medium', auto: false, category: 'Benefits' },
    { id: 'preferred-name', label: 'Preferred Name', keywords: ['preferred name', 'display name'], risk: 'low', auto: true, category: 'Identity' },
    { id: 'leave-request', label: 'Leave Request', keywords: ['parental leave', 'maternity leave', 'paternity leave', 'fmla', 'medical leave', 'bereavement'], risk: 'low', auto: false, category: 'Leave' },
    { id: 'new-baby', label: 'New Dependent', keywords: ['baby', 'child', 'newborn', 'adoption', 'dependent'], risk: 'medium', auto: false, category: 'Life Event' },
  ];

  for (const def of intentDefs) {
    if (def.keywords.some((kw) => msgLower.includes(kw))) {
      intents.push({
        id: def.id,
        label: def.label,
        category: def.category,
        confidence: 0.88 + Math.random() * 0.1,
        sub_intents: [],
        risk_level: def.risk,
        auto_completable: def.auto,
      });
    }
  }

  return intents;
}

function extractImpactFromText(_text: string, intents: DetectedIntent[]): ImpactNode[] {
  const systemMap: Record<string, { label: string; category: string }> = {
    Payroll: { label: 'Payroll & Tax System', category: 'payroll' },
    Benefits: { label: 'Benefits Platform', category: 'benefits' },
    Identity: { label: 'Corporate Identity (AD/Email)', category: 'identity' },
    'Personal Data': { label: 'HR Records', category: 'hr-records' },
    'Life Event': { label: 'Life Event Processing', category: 'life-events' },
    Leave: { label: 'Leave Management', category: 'leave' },
  };

  const seen = new Set<string>();
  const nodes: ImpactNode[] = [];
  for (const intent of intents) {
    const sys = systemMap[intent.category] || { label: intent.category, category: intent.category.toLowerCase() };
    if (!seen.has(sys.category)) {
      seen.add(sys.category);
      nodes.push({
        id: sys.category,
        label: sys.label,
        category: sys.category,
        status: intent.auto_completable ? 'completed' : 'awaiting-approval',
        risk: intent.risk_level,
        dependencies: [],
        description: `Updates triggered by ${intent.label}`,
      });
    }
  }
  return nodes;
}

function extractWarnings(text: string): Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical'; dismissible: boolean }> {
  const warnings: Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical'; dismissible: boolean }> = [];
  const lower = text.toLowerCase();
  if (lower.includes('document') || lower.includes('certificate') || lower.includes('verification')) {
    warnings.push({ id: 'w-doc', message: 'Supporting documentation required for high-risk changes.', severity: 'medium', dismissible: true });
  }
  if (lower.includes('approval') || lower.includes('review')) {
    warnings.push({ id: 'w-approval', message: 'Some changes require HR Operations Manager approval.', severity: 'medium', dismissible: true });
  }
  return warnings;
}

function extractGrievanceCategories(text: string): string[] {
  const cats: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('discriminat')) cats.push('Discrimination');
  if (lower.includes('harass')) cats.push('Harassment');
  if (lower.includes('retaliat')) cats.push('Retaliation');
  if (lower.includes('bully')) cats.push('Bullying');
  if (lower.includes('hostile')) cats.push('Hostile Environment');
  if (lower.includes('unfair') || lower.includes('exclud')) cats.push('Unfair Treatment');
  if (lower.includes('pay') && lower.includes('equity')) cats.push('Pay Equity');
  if (cats.length === 0) cats.push('Workplace Concern');
  return cats;
}
