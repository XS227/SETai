"""Deployment orchestrator stub."""

from typing import Any, Dict

import httpx


def deploy_changes(project_id: int, diff_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Placeholder deployment function."""
    return {"project_id": project_id, "status": "queued", "diff": diff_payload}


def trigger_deploy(webhook_url: str) -> None:
    if not webhook_url:
        return
    # Basic POST trigger. Add auth headers later.
    with httpx.Client(timeout=10.0) as client:
        client.post(webhook_url, json={"source": "setai"})
