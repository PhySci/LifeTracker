# LifeTracker

Локальное personal-first приложение для трекинга факта выполнения активностей. Один клик по активности создаёт отдельное событие, поэтому одну активность можно отметить несколько раз в день.

## Стек

- Backend: FastAPI, SQLAlchemy, SQLite.
- Frontend: React, TypeScript, Vite.
- Запуск: Docker Compose.

## Запуск Через Docker Compose

```shell
docker compose up --build
```

После старта:

- frontend: http://localhost:5173
- backend healthcheck: http://localhost:8000/health
- OpenAPI: http://localhost:8000/docs

SQLite хранится в Docker volume `lifetracker_lifetracker-data`, поэтому данные переживают перезапуск контейнеров.

## Ручная Проверка MVP

1. Откройте http://localhost:5173.
2. Создайте активность через форму `Название / Категория / Вес`.
3. Нажмите на созданную активность несколько раз.
4. Проверьте, что растут `total_events`, `total_score` и ячейка сегодняшнего дня в heatmap.

Проверить API отдельно:

```shell
curl http://localhost:8000/health
curl http://localhost:8000/activities
curl http://localhost:8000/stats/summary
```

## Локальная Разработка

Backend:

```shell
uv run uvicorn backend.app.main:app --reload
```

Frontend:

```shell
cd frontend
npm install
npm run dev
```

Для frontend API URL задаётся переменной `VITE_API_URL`, по умолчанию используется `http://localhost:8000`.
