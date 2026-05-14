/** AG-UI event types received from the backend SSE stream. */

export interface AGUIEvent {
  type: AGUIEventType;
  threadId?: string;
  runId?: string;
  messageId?: string;
  role?: string;
  delta?: string;
  stepName?: string;
  name?: string;
  value?: any;
  interrupts?: Array<{ id: string; value: any }>;
  toolCallId?: string;
  toolCallName?: string;
  args?: string;
}

export type AGUIEventType =
  | 'RUN_STARTED'
  | 'RUN_FINISHED'
  | 'RUN_ERROR'
  | 'STEP_STARTED'
  | 'STEP_FINISHED'
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_END'
  | 'CUSTOM'
  | 'STATE_SNAPSHOT'
  | 'STATE_DELTA';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agent?: string;
  isStreaming?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  sample_prompts: string[];
}

export interface PromptCategory {
  name: string;
  icon: string;
  prompts: { text: string; scenario: string }[];
}
