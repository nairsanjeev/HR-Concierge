"""AG-UI event models for streaming to the frontend."""

from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class AGUIEvent(BaseModel):
    """An AG-UI protocol event sent via SSE."""
    type: str
    threadId: str = ""
    runId: str = ""
    messageId: str = ""
    role: str = ""
    delta: str = ""
    stepName: str = ""
    name: str = ""
    value: Any = None
    interrupts: list[dict[str, Any]] | None = None
    toolCallId: str = ""
    toolCallName: str = ""
    args: str = ""

    def to_sse(self) -> str:
        """Serialize to SSE data line."""
        import json
        payload = {k: v for k, v in self.model_dump().items() if v is not None and v != "" and v != []}
        payload["type"] = self.type
        return f"data: {json.dumps(payload)}\n\n"
