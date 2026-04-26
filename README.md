# LifeTracker

LifeTracker is a local, personal-first app for tracking completed actions. Each
click on an activity creates a separate event, so the same activity can be logged
multiple times per day.

## Stack

- Backend: FastAPI, SQLAlchemy, SQLite.
- Frontend: React, TypeScript, Vite.
- Runtime: Docker Compose.

## Run With Docker Compose

```shell
docker compose up --build
```

After startup:

- Frontend: http://localhost:5173
- Backend health check: http://localhost:8000/health
- OpenAPI: http://localhost:8000/docs

SQLite is stored in the `lifetracker_lifetracker-data` Docker volume, so data
survives container restarts.

## Entity Model

```mermaid
erDiagram
    USERS ||--o{ CATEGORIES : owns
    USERS ||--o{ ACTIVITIES : owns
    USERS ||--o{ EVENTS : owns
    CATEGORIES ||--o{ ACTIVITIES : contains
    ACTIVITIES ||--o{ EVENTS : logs

    USERS {
        integer id PK
        string name
        string email UK
        string password
    }

    CATEGORIES {
        integer id PK
        integer user_id FK
        string name UK
    }

    ACTIVITIES {
        integer id PK
        integer user_id FK
        string name
        integer category_id FK
        float weight
    }

    EVENTS {
        integer id PK
        integer user_id FK
        integer activity_id FK
        date date
    }
```

## Tables

- `users`: stores local user spaces. Passwords are stored as salted PBKDF2
  hashes and are used for login.
- `categories`: stores reusable activity categories. `name` is unique per user.
- `activities`: stores actions the user can log. Each activity belongs to one
  user and one category through `category_id`, and contributes `weight` to the
  daily score.
- `events`: stores each completed action. Every `POST /events` creates a new
  row assigned to a user. If no date is provided, the backend uses the current
  local date.

User-scoped API requests use a Bearer access token returned by registration or
login. The frontend stores the token locally for the current browser session.

The daily score is the sum of `activity.weight` for all events on a calendar
date. The current streak is the number of consecutive days through today with a
daily score greater than zero.

## Manual MVP Check

1. Open http://localhost:5173.
2. Register a user or log in.
3. Create an activity with a name, category, and weight.
4. Click the created activity several times.
5. Check that `total_events`, `total_score`, and today's heatmap cell increase.

Check the API separately:

```shell
curl http://localhost:8000/health
TOKEN=$(curl -s -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo User","email":"demo@example.com","password":"password"}' \
  | python -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
curl http://localhost:8000/categories -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/activities -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/stats/summary -H "Authorization: Bearer $TOKEN"
```

## Local Development

Backend:

```shell
uv run python -m backend.app
```

Backend with reload:

```shell
RELOAD=true uv run python -m backend.app
```

Frontend:

```shell
cd frontend
npm install
npm run dev
```

The frontend API URL is controlled by `VITE_API_URL`; the default is
`http://localhost:8000`.
