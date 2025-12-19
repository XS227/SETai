"""Lightweight wrapper for GitHub integration."""

from typing import Any, Dict, List

from github import Github
from github.ContentFile import ContentFile
from github.Repository import Repository


class GitHubClient:
    """Thin convenience layer around PyGithub."""

    def __init__(self, token: str) -> None:
        self.github = Github(login_or_token=token)

    def list_repositories(self) -> List[Dict[str, Any]]:
        """List repositories available to the authenticated user."""
        repos = self.github.get_user().get_repos()
        return [
            {
                "full_name": repo.full_name,
                "default_branch": repo.default_branch,
                "private": repo.private,
            }
            for repo in repos
        ]

    def get_repo(self, full_name: str) -> Repository:
        """Return a repository instance."""
        return self.github.get_repo(full_name)

    def get_file_text(self, repo_full_name: str, path: str, ref: str) -> str:
        """Fetch file text from a repository at the given ref."""
        contents = self.get_repo(repo_full_name).get_contents(path, ref=ref)
        if isinstance(contents, list):
            raise ValueError(f"{path} resolved to a directory, expected a file")
        return self._decode_content(contents)

    def update_file(
        self,
        repo_full_name: str,
        path: str,
        branch: str,
        new_content: str,
        message: str,
    ) -> str:
        """Update a file and return the resulting commit SHA."""
        repo = self.get_repo(repo_full_name)
        contents = repo.get_contents(path, ref=branch)
        if isinstance(contents, list):
            raise ValueError(f"{path} resolved to a directory, expected a file")

        result = repo.update_file(
            path=path,
            message=message,
            content=new_content,
            sha=contents.sha,
            branch=branch,
        )
        return result["commit"].sha

    @staticmethod
    def _decode_content(contents: ContentFile) -> str:
        """Decode GitHub file contents to UTF-8 text, replacing errors."""
        return contents.decoded_content.decode("utf-8", errors="replace")
