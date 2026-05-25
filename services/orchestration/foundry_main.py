"""HR Concierge — Foundry Hosted Agent Entrypoint.

Wraps the existing HR Concierge Agent with the Foundry ResponsesHostServer
for deployment as a hosted agent in Microsoft Foundry.
"""

import os
import logging

from dotenv import load_dotenv

load_dotenv(override=False)

from pathlib import Path

from agent_framework import Agent, SkillsProvider
from agent_framework.foundry import FoundryChatClient
from agent_framework_foundry_hosting import ResponsesHostServer
from azure.identity import DefaultAzureCredential

from agents import HR_CONCIERGE_PROMPT, TOOLS

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("hr_concierge_foundry")


# ── Skills Provider (file-based expense-report skill) ────────────────────────

def _expense_script_runner(skill, script, args=None):
    """Run a skill script in-process (safe for demo — single known script)."""
    import importlib.util

    script_path = os.path.join(skill.path, script.path)
    spec = importlib.util.spec_from_file_location(script.name, script_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    input_json = (args or {}).get("report_json", "{}")
    return mod.validate_expense_report(input_json)


skills_provider = SkillsProvider.from_paths(
    Path(__file__).parent / "skills",
    script_runner=_expense_script_runner,
)


# ── Foundry Chat Client (uses managed identity in production) ────────────────

def main():
    logger.info("Starting HR Concierge Foundry Hosted Agent...")

    client = FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        credential=DefaultAzureCredential(),
    )

    # ── HR Concierge Agent ───────────────────────────────────────────────────
    hr_concierge = Agent(
        client=client,
        instructions=HR_CONCIERGE_PROMPT,
        name="HR Concierge",
        description="Warm, professional AI assistant that helps employees with HR requests",
        tools=TOOLS,
        context_providers=[skills_provider],
        default_options={"temperature": 0.3, "store": False},
    )

    # ── Start the Responses protocol server on port 8088 ─────────────────────
    server = ResponsesHostServer(hr_concierge)
    server.run()


if __name__ == "__main__":
    main()
