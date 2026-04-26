# Backend and Frontend API Contract

## General Rules

The backend exposes a JSON API for the React frontend. The frontend base URL is
configured with:

```text
VITE_API_URL=http://localhost:8000
```

All requests and responses use `application/json`. Dates are represented as
`YYYY-MM-DD` strings. The MVP has no authentication, users, or roles; all data
belongs to one local user.

## Entities

### Category

```json
{
  "id": 1,
  "name": "sport"
}
```

### Activity

```json
{
  "id": 1,
  "name": "Workout",
  "category_id": 1,
  "category": {
    "id": 1,
    "name": "sport"
  },
  "weight": 1
}
```

### Event

```json
{
  "id": 10,
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Every `POST /events` creates a new event. Multiple requests with the same
`activity_id` and date produce multiple rows.

## Categories

### GET /categories

Returns all categories.

Response `200`:

```json
[
  {
    "id": 1,
    "name": "sport"
  }
]
```

### POST /categories

Creates a category.

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
  "name": "sport"
}
```

Validation:

- `name` is required and cannot be empty.
- `name` must be unique.

## Activities

### GET /activities

Returns all activities with their categories.

Response `200`:

```json
[
  {
    "id": 1,
    "name": "Workout",
    "category_id": 1,
    "category": {
      "id": 1,
      "name": "sport"
    },
    "weight": 1
  }
]
```

### POST /activities

Creates an activity.

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
  "name": "Workout",
  "category_id": 1,
  "category": {
    "id": 1,
    "name": "sport"
  },
  "weight": 1
}
```

Validation:

- `name` is required and cannot be empty.
- `category_id` must reference an existing category.
- `weight` must be greater than `0`.

## Events

### POST /events

Creates a completed-action event.

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
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Rules:

- `activity_id` must reference an existing activity.
- `date` is optional. When omitted, the backend uses the current local date.
- Repeating the same `activity_id` and `date` creates another event.

### GET /events?date=YYYY-MM-DD

Returns events for a specific date.

Response `200`:

```json
[
  {
    "id": 10,
    "activity_id": 1,
    "date": "2026-04-26"
  }
]
```

## Stats

### GET /stats/heatmap

Returns data for the yearly heatmap. The optional `year` query parameter
defaults to the current year.

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

Returns the current streak.

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

Returns aggregate stats. The optional `year` query parameter defaults to the
current year.

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
- `404`: referenced entity was not found.
- `409`: category name already exists.
- `422`: validation error.
- `500`: unexpected backend error.

## Expected Frontend Flow

On dashboard load, the frontend requests:

1. `GET /activities`.
2. `GET /categories`.
3. `GET /stats/summary`.
4. `GET /stats/heatmap`.

When creating an activity:

1. Create or reuse a category with `POST /categories` / `GET /categories`.
2. Create the activity with `POST /activities`.
3. Update local activity and category state.

When logging an activity:

1. `POST /events` with `activity_id`.
2. Repeat `GET /stats/summary`.
3. Repeat `GET /stats/heatmap`.
