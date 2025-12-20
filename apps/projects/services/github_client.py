from github import Github
from github.Repository import Repository


class GithubService:
    def __init__(self, token: str):
        self.gh = Github(token)

    def get_repo(self, full_name: str) -> Repository:
        return self.gh.get_repo(full_name)

    def get_file_text(self, repo: Repository, path: str, ref: str) -> str:
        contents = repo.get_contents(path, ref=ref)
        return contents.decoded_content.decode("utf-8", errors="replace")

    def update_file(self, repo: Repository, path: str, branch: str, new_content: str, message: str) -> str:
        contents = repo.get_contents(path, ref=branch)
        res = repo.update_file(path=path, message=message, content=new_content, sha=contents.sha, branch=branch)
        return res["commit"].sha
