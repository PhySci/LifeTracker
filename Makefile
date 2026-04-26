.PHONY: run build rebuild stop down migrate

build:
	docker compose build

rebuild:
	docker compose build --no-cache

run:
	docker compose up --build

stop:
	docker compose stop

down:
	docker compose down

migrate:
	uv run alembic upgrade head
