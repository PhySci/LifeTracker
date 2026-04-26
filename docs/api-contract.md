# Backend and Frontend API Contract

## General Rules

The backend exposes a JSON API for the React frontend. The frontend base URL is
configured with:

```text
VITE_API_URL=http://localhost:8000
```

All requests and responses use `application/json`. Dates are represented as
`YYYY-MM-DD` strings.

Every user-scoped endpoint uses the Bearer access token returned by registration
or login:

```text
Authorization: Bearer <access_token>
```

## Entities

### User

```json
{
  "id": 1,
  "name": "Demo User",
  "email": "demo@example.com"
}
```

The `password` field is accepted when creating a user but is not returned by the
API.

### Category

```json
{
  "id": 1,
  "user_id": 1,
  "name": "sport"
}
```

### Activity

```json
{
  "id": 1,
  "user_id": 1,
  "name": "Workout",
  "category_id": 1,
  "category": {
    "id": 1,
    "user_id": 1,
    "name": "sport"
  },
  "weight": 1
}
```

### Event

```json
{
  "id": 10,
  "user_id": 1,
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Every `POST /events` creates a new event. Multiple requests with the same
`activity_id` and date produce multiple rows.

## Users

### POST /auth/register

Creates a user and returns an access token.

Request:

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "password"
}
```

Response `201`:

```json
{
  "access_token": "<token>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Demo User",
    "email": "demo@example.com"
  }
}
```

### POST /auth/login

Authenticates a user and returns an access token.

Request:

```json
{
  "email": "demo@example.com",
  "password": "password"
}
```

Response `200`:

```json
{
  "access_token": "<token>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Demo User",
    "email": "demo@example.com"
  }
}
```

### GET /users

Returns all local users.

Response `200`:

```json
[
  {
    "id": 1,
    "name": "Demo User",
    "email": "demo@example.com"
  }
]
```

### POST /users

Creates a user.

Request:

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "password"
}
```

Response `201`:

```json
{
  "id": 1,
  "name": "Demo User",
  "email": "demo@example.com"
}
```

## Categories

### GET /categories

Returns categories owned by the authenticated user.

Response `200`:

```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "sport"
  }
]
```

### POST /categories

Creates a category owned by the authenticated user.

Request:

```json
{
  "name": "sport"
}
```

Response `201`:

```json
{
  "id": 1,
  "user_id": 1,
  "name": "sport"
}
```

Validation:

- `name` is required and cannot be empty.
- `name` must be unique per user.

## Activities

### GET /activities

Returns activities owned by the authenticated user with their categories.

Response `200`:

```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "Workout",
    "category_id": 1,
    "category": {
      "id": 1,
      "user_id": 1,
      "name": "sport"
    },
    "weight": 1
  }
]
```

### POST /activities

Creates an activity owned by the authenticated user.

Request:

```json
{
  "name": "Workout",
  "category_id": 1,
  "weight": 1
}
```

Response `201`:

```json
{
  "id": 1,
  "user_id": 1,
  "name": "Workout",
  "category_id": 1,
  "category": {
    "id": 1,
    "user_id": 1,
    "name": "sport"
  },
  "weight": 1
}
```

Validation:

- `name` is required and cannot be empty.
- `category_id` must reference a category owned by the same user.
- `weight` must be greater than `0`.

## Events

### POST /events

Creates a completed-action event owned by the authenticated user.

Request with an explicit date:

```json
{
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Request using today's date:

```json
{
  "activity_id": 1
}
```

Response `201`:

```json
{
  "id": 10,
  "user_id": 1,
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Rules:

- `activity_id` must reference an activity owned by the same user.
- `date` is optional. When omitted, the backend uses the current local date.
- Repeating the same `activity_id` and `date` creates another event.

### GET /events?date=YYYY-MM-DD

Returns events owned by the authenticated user for a specific date.

Response `200`:

```json
[
  {
    "id": 10,
    "user_id": 1,
    "activity_id": 1,
    "date": "2026-04-26"
  }
]
```

## Stats

### GET /stats/heatmap

Returns data for the authenticated user's yearly heatmap. The optional `year`
query parameter defaults to the current year.

Response `200`:

```json
{
  "year": 2026,
  "days": [
    {
      "date": "2026-01-01",
      "score": 0,
      "event_count": 0
    },
    {
      "date": "2026-04-26",
      "score": 3,
      "event_count": 3
    }
  ]
}
```

Rules:

- `days` contains every day in the selected year.
- `score` is the sum of activity weights for the date.
- `event_count` is the number of events for the date.

### GET /stats/streak

Returns the current streak for the authenticated user.

Response `200`:

```json
{
  "current_streak": 5,
  "as_of_date": "2026-04-26"
}
```

The streak counts consecutive days with `score > 0` through `as_of_date`. If
`as_of_date` has no activity, `current_streak` is `0`.

### GET /stats/summary

Returns aggregate stats for the authenticated user. The optional `year` query
parameter defaults to the current year.

Response `200`:

```json
{
  "year": 2026,
  "active_days": 42,
  "total_events": 120,
  "total_score": 135,
  "current_streak": 5
}
```

Fields:

- `active_days`: days in the year where `score > 0`.
- `total_events`: total events in the year.
- `total_score`: sum of daily scores in the year.
- `current_streak`: current streak through today.

## Errors

The backend returns FastAPI's standard JSON error format.

Expected statuses:

- `200`: successful read.
- `201`: successful creation.
- `401`: missing, invalid, or expired access token.
- `404`: user or referenced entity was not found.
- `409`: user email or category name already exists.
- `422`: validation error.
- `500`: unexpected backend error.

## Expected Frontend Flow

On dashboard load, the frontend restores the saved access token or asks the user
to register/log in, then requests user-scoped resources with `Authorization`:

1. `POST /auth/register` or `POST /auth/login`.
2. `GET /activities`.
3. `GET /categories`.
4. `GET /stats/summary`.
5. `GET /stats/heatmap`.

When creating an activity:

1. Create or reuse a user-owned category with `POST /categories` / `GET /categories`.
2. Create the activity with `POST /activities`.
3. Update local activity and category state.

When logging an activity:

1. `POST /events` with `activity_id` and `Authorization`.
2. Repeat `GET /stats/summary`.
3. Repeat `GET /stats/heatmap`.
