FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=off \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock /app/

RUN pip install --upgrade pip && \
    pip install "poetry>=1.7" && \
    poetry install --no-root --no-dev --no-interaction --no-ansi

COPY . /app/

EXPOSE 8000

CMD ["poetry", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
