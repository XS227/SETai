from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext as _

from apps.projects.models import ChangeRequest, GithubConnection, ProposedFileChange, WebsiteProject
from apps.projects.services.ai_proposal import simple_rule_based_parser
from apps.projects.services.deploy import trigger_deploy
from apps.projects.services.diff_engine import propose_content_json_update
from apps.projects.services.github_client import GithubService

CONTENT_FILE_PATH = "site_content.json"


@login_required
def new_project(request):
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        repo_full_name = request.POST.get("repo_full_name", "").strip()
        default_branch = request.POST.get("default_branch", "main").strip()
        deploy_webhook_url = request.POST.get("deploy_webhook_url", "").strip()

        WebsiteProject.objects.create(
            user=request.user,
            name=name or repo_full_name,
            repo_full_name=repo_full_name,
            default_branch=default_branch,
            deploy_webhook_url=deploy_webhook_url,
        )
        return redirect("/dashboard/")

    return render(request, "projects/connect_repo.html")


@login_required
def command_view(request, project_id: int):
    project = get_object_or_404(WebsiteProject, id=project_id, user=request.user)

    if request.method == "POST":
        command = request.POST.get("command", "").strip()
        if not command:
            return render(
                request,
                "projects/command.html",
                {"project": project, "error": _("Please enter a command.")},
            )

        gh_conn = get_object_or_404(GithubConnection, user=request.user)
        gh = GithubService(gh_conn.access_token)
        repo = gh.get_repo(project.repo_full_name)

        before = gh.get_file_text(repo, CONTENT_FILE_PATH, project.default_branch)
        ai = simple_rule_based_parser(command)

        before_text, after_text = propose_content_json_update(before, ai.target_key, ai.new_value)

        cr = ChangeRequest.objects.create(project=project, user=request.user, command=command)
        ProposedFileChange.objects.create(
            change_request=cr,
            path=CONTENT_FILE_PATH,
            before_text=before_text,
            after_text=after_text,
        )
        return redirect(f"/projects/proposal/{cr.id}/")

    return render(request, "projects/command.html", {"project": project})


@login_required
def proposal_view(request, change_request_id: int):
    cr = get_object_or_404(ChangeRequest, id=change_request_id, user=request.user)
    fc = cr.file_changes.first()
    return render(request, "projects/proposal.html", {"cr": cr, "fc": fc})


@login_required
def publish_view(request, change_request_id: int):
    cr = get_object_or_404(ChangeRequest, id=change_request_id, user=request.user)
    project = cr.project
    fc = cr.file_changes.first()

    if request.method != "POST":
        return redirect(f"/projects/proposal/{cr.id}/")

    gh_conn = get_object_or_404(GithubConnection, user=request.user)
    gh = GithubService(gh_conn.access_token)
    repo = gh.get_repo(project.repo_full_name)

    try:
        sha = gh.update_file(
            repo=repo,
            path=fc.path,
            branch=project.default_branch,
            new_content=fc.after_text,
            message=f"SETai: {cr.command[:72]}",
        )
        trigger_deploy(project.deploy_webhook_url)
        cr.status = ChangeRequest.Status.PUBLISHED
        cr.save(update_fields=["status"])
        return render(request, "projects/published.html", {"cr": cr, "sha": sha})
    except Exception as e:  # noqa: BLE001
        cr.status = ChangeRequest.Status.FAILED
        cr.error_message = str(e)
        cr.save(update_fields=["status", "error_message"])
        return render(request, "projects/published.html", {"cr": cr, "error": str(e)})


@login_required
def history_view(request, project_id: int):
    project = get_object_or_404(WebsiteProject, id=project_id, user=request.user)
    changes = ChangeRequest.objects.filter(project=project, user=request.user).order_by("-created_at")[:50]
    return render(request, "projects/history.html", {"project": project, "changes": changes})
