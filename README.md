# SETai

MVP initiative to let users describe a website change in natural language, review a proposed diff, explicitly approve, and see the change deployed live to their site.

## Project structure

This repository is pre-configured as a Django project with separate apps for accounts, projects, and shared core templates/middleware.

```
SETai/
  README.md
  .gitignore
  .env.example
  docker-compose.yml
  Dockerfile
  pyproject.toml
  manage.py
  setai/
    __init__.py
    settings.py
    urls.py
    wsgi.py
    asgi.py
  apps/
    accounts/
      __init__.py
      admin.py
      apps.py
      models.py
      urls.py
      views.py
      templates/
        accounts/
          dashboard.html
    projects/
      __init__.py
      admin.py
      apps.py
      models.py
      services/
        github_client.py
        diff_engine.py
        deploy.py
        ai_proposal.py
      api/
        serializers.py
        views.py
        urls.py
      templates/
        projects/
          connect_repo.html
          command.html
          proposal.html
          history.html
      migrations/
        __init__.py
    core/
      __init__.py
      middleware.py
      templates/
        base.html
        partials/
          navbar.html
  locale/
    en/LC_MESSAGES/django.po
    no/LC_MESSAGES/django.po
  static/
    app.css
```

## Getting started

1. Copy environment defaults:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies with Poetry:
   ```bash
   poetry install
   ```
3. Run the development server:
   ```bash
   poetry run python manage.py runserver
   ```

## Documentation

- [MVP implementation plan](docs/mvp-implementation-plan.md)
