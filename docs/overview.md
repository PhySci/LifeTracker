# Technical Brief: Consistency Tracker

## 1. Problem

Build a personal app for tracking completed actions across areas such as sport,
learning, and language practice. Progress is visualized with a yearly heatmap.

This is not a task manager. The system records only the fact that an action was
completed.

## 2. Core Scenarios

- Create a category.
- Create an activity in a category.
- Log an activity with one click.
- View a yearly heatmap.
- View streak and active-day statistics.

## 3. Entities

### Category

- `id`
- `name`

### Activity

- `id`
- `name`
- `category_id`
- `weight`

### Event

- `id`
- `activity_id`
- `date` (`YYYY-MM-DD`)

## 4. Business Logic

### Day Score

```text
day_score = sum(activity.weight for each event on the date)
```

### Streak

The current streak is the number of consecutive days through today where
`day_score > 0`. If today has no activity, the streak is `0`.

## 5. Architecture

```text
React frontend -> FastAPI backend -> SQLite database
```

## 6. API

- `GET /categories`
- `POST /categories`
- `GET /activities`
- `POST /activities`
- `POST /events`
- `GET /events?date=YYYY-MM-DD`
- `GET /stats/heatmap`
- `GET /stats/streak`
- `GET /stats/summary`

## 7. Database

- `categories(id, name)`
- `activities(id, name, category_id, weight)`
- `events(id, activity_id, date)`

## 8. Frontend

- Category-aware activity creation form.
- Activity buttons for one-click logging.
- Yearly heatmap.
- Summary cards for streak, active days, events, and score.

## 9. Constraints

- No authentication.
- No multi-user support.
- No machine learning.

## 10. Acceptance Criteria

- Categories can be created.
- Activities can be created and linked to categories.
- Events can be logged.
- Repeated clicks create repeated events.
- Heatmap works.
- Streak is calculated correctly.
- Summary stats are displayed.
