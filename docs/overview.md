# Technical Brief: Consistency Tracker

## 1. Problem

Build a personal app for tracking completed actions across areas such as sport,
learning, and language practice. Progress is visualized with a yearly heatmap.

This is not a task manager. The system records only the fact that an action was
completed.

## 2. Core Scenarios

- Create a user space.
- Log in to that user space.
- Create a category in that user space.
- Create an activity in a category.
- Log an activity with one click.
- View a yearly heatmap.
- View streak and active-day statistics.

## 3. Entities

### User

- `id`
- `name`
- `email`
- `password`

### Category

- `id`
- `user_id`
- `name`

### Activity

- `id`
- `user_id`
- `name`
- `category_id`
- `weight`

### Event

- `id`
- `user_id`
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
- `POST /auth/register`
- `POST /auth/login`

## 7. Database

- `users(id, name, email, password)`
- `categories(id, user_id, name)`
- `activities(id, user_id, name, category_id, weight)`
- `events(id, user_id, activity_id, date)`

## 8. Frontend

- Category-aware activity creation form.
- Activity buttons for one-click logging.
- Yearly heatmap.
- Summary cards for streak, active days, events, and score.

## 9. Constraints

- User-scoped endpoints require a Bearer access token.
- No machine learning.

## 10. Acceptance Criteria

- Users can be created.
- Users can register and log in.
- Categories can be created per user.
- Activities can be created and linked to user-owned categories.
- Events can be logged in a user-owned space.
- Users do not see categories, activities, or events owned by other users.
- Repeated clicks create repeated events.
- Heatmap works.
- Streak is calculated correctly.
- Summary stats are displayed.
