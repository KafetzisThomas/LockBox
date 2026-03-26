FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /code

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

COPY ./app /code/app

ENV PATH="/code/.venv/bin:$PATH"

CMD ["fastapi", "run", "app/main.py", "--port", "80"]
