from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def connect_repo(request):
    return render(request, "projects/connect_repo.html", {})


@login_required
def command(request):
    return render(request, "projects/command.html", {})


@login_required
def proposal(request):
    return render(request, "projects/proposal.html", {})


@login_required
def history(request):
    return render(request, "projects/history.html", {})
