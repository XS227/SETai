"""Lightweight wrapper for GitHub integration."""

from typing import Any, Dict, List


class GitHubClient:
    def __init__(self, token: str) -> None:
        self.token = token

    def list_repositories(self) -> List[Dict[str, Any]]:
        """Return a placeholder list of repositories."""
        return []

    def create_webhook(self, repo: str, payload_url: str) -> Dict[str, Any]:
        """Create a webhook for the given repository (stub)."""
        return {"repo": repo, "payload_url": payload_url, "status": "pending"}
