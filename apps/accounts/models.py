from django.conf import settings
from django.db import models


class Account(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:  # pragma: no cover - simple representation
        return f"Account for {self.user}" if self.user_id else "Unassigned Account"
