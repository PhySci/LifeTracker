.PHONY: run build rebuild stop down migrate dev

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

dev:
	LOCAL_IP=$$(ipconfig getifaddr en0); \
	echo "Frontend: http://$$LOCAL_IP:5173"; \
	echo "Backend:  http://$$LOCAL_IP:8000"; \
	HOST=0.0.0.0 uv run python -m backend.app & \
	BACKEND_PID=$$!; \
	trap 'kill $$BACKEND_PID' INT TERM EXIT; \
	cd frontend && VITE_API_URL=http://$$LOCAL_IP:8000 npm run dev -- --host 0.0.0.0
