FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv \
    && uv sync --frozen

COPY alembic.ini ./alembic.ini
COPY migrations ./migrations
COPY backend ./backend

EXPOSE 8000

CMD ["uv", "run", "python", "-m", "backend.app"]
