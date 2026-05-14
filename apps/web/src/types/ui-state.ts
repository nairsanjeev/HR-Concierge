/** UI State types — mirrors the Python Pydantic models. */

export type ScreenType =
  | 'intake'
  | 'triage'
  | 'action-plan'
  | 'review'
  | 'completed'
  | 'data-collection'
  | 'grievance-intake'
  | 'grievance-triage'
  | 'case-draft';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ActionStatus = 'pending' | 'in-progress' | 'awaiting-approval' | 'completed' | 'blocked' | 'skipped';

export interface UICard {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'action' | 'summary';
  icon?: string;
  metadata: Record<string, any>;
  actions?: UIAction[];
  collapsed?: boolean;
}

export interface UIAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'confirm' | 'approve' | 'reject';
  variant: 'default' | 'primary' | 'danger' | 'success' | 'ghost';
  disabled?: boolean;
  requires_confirmation?: boolean;
  metadata?: Record<string, any>;
}

export interface UIWarning {
  id: string;
  message: string;
  severity: RiskLevel;
  dismissible: boolean;
}

export interface UIApproval {
  id: string;
  title: string;
  description: string;
  risk_level: RiskLevel;
  rationale: string;
  details?: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  detail?: string;
  status: ActionStatus;
  icon?: string;
}

export interface Reference {
  id: string;
  title: string;
  source: string;
  url?: string;
  snippet?: string;
  relevance?: number;
}

export interface SubStep {
  id: string;
  label: string;
  status: ActionStatus;
  agent: string;
}

export interface ProgressState {
  current_step: number;
  total_steps: number;
  label: string;
  percentage: number;
  substeps: SubStep[];
}

export interface AgentActivity {
  agent_name: string;
  agent_role: string;
  status: 'thinking' | 'working' | 'completed' | 'waiting' | 'error';
  message: string;
  timestamp?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: string;
  value?: any;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  group?: string;
  editable?: boolean;
}

export interface ImpactNode {
  id: string;
  label: string;
  category: string;
  status: ActionStatus;
  risk: RiskLevel;
  dependencies: string[];
  description: string;
}

export interface DetectedIntent {
  id: string;
  label: string;
  category: string;
  confidence: number;
  sub_intents: string[];
  risk_level: RiskLevel;
  auto_completable: boolean;
}

export interface CaseDraft {
  id: string;
  category: string;
  priority: string;
  summary: string;
  description: string;
  facts: string[];
  missing_info: string[];
  routing: string;
  rationale: string;
}

export interface UIState {
  screen_type: ScreenType;
  title: string;
  subtitle: string;
  cards: UICard[];
  actions: UIAction[];
  warnings: UIWarning[];
  approvals: UIApproval[];
  timeline: TimelineEntry[];
  references: Reference[];
  progress: ProgressState;
  agent_activity: AgentActivity[];
  form_fields: FormField[];
  impact_map: ImpactNode[];
  detected_intents: DetectedIntent[];
  case_draft?: CaseDraft;
  summary_text: string;
  explanation_text: string;
  scenario: string;
  conversation_id: string;
  routing_decisions: { decision: string; reason: string; timestamp: string }[];
}

export const EMPTY_UI_STATE: UIState = {
  screen_type: 'intake',
  title: '',
  subtitle: '',
  cards: [],
  actions: [],
  warnings: [],
  approvals: [],
  timeline: [],
  references: [],
  progress: { current_step: 0, total_steps: 0, label: '', percentage: 0, substeps: [] },
  agent_activity: [],
  form_fields: [],
  impact_map: [],
  detected_intents: [],
  summary_text: '',
  explanation_text: '',
  scenario: '',
  conversation_id: '',
  routing_decisions: [],
};
