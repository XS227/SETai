from django.dispatch import receiver
from allauth.socialaccount.signals import social_account_added, social_account_updated
from apps.projects.models import GithubConnection


@receiver([social_account_added, social_account_updated])
def store_github_token(request, sociallogin, **kwargs):
    if sociallogin.account.provider != "github":
        return

    token = sociallogin.token.token
    login = sociallogin.account.extra_data.get("login", "")

    GithubConnection.objects.update_or_create(
        user=sociallogin.user,
        defaults={"access_token": token, "github_login": login},
    )
