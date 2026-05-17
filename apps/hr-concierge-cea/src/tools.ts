/**
 * Tool execution logic for HR Concierge CEA.
 *
 * NOTE: All tool execution is now handled by the shared orchestrator
 * (services/orchestration). The CEA bot is a thin relay — it sends user
 * messages to the orchestrator's /api/invoke endpoint and renders the
 * results as Adaptive Cards.
 *
 * This file is retained for reference but is no longer imported by agent.ts.
 * The 12 tools (query_knowledge_base, retrieve_policy_guidance, etc.) are
 * defined and executed in services/orchestration/agents/tools.py.
 */
