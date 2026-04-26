# Контракт взаимодействия Backend и Frontend

## Общие правила

Backend предоставляет JSON API для React frontend.

Базовый URL задаётся через переменную окружения frontend:

```text
VITE_API_URL=http://localhost:8000
```

Все запросы и ответы используют `application/json`.

Дата передаётся как строка в формате:

```text
YYYY-MM-DD
```

В MVP нет авторизации, пользователей и ролей. Все данные считаются персональными данными одного локального пользователя.

## Сущности

### Activity

```json
{
  "id": 1,
  "name": "Workout",
  "category": "sport",
  "weight": 1
}
```

Поля:

- `id` — integer, создаётся backend.
- `name` — string, название активности.
- `category` — string, категория активности.
- `weight` — number, вклад активности в дневной score.

### Event

```json
{
  "id": 10,
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Поля:

- `id` — integer, создаётся backend.
- `activity_id` — integer, ссылка на активность.
- `date` — string, календарная дата события.

Каждый `POST /events` создаёт новое событие. Если пользователь несколько раз нажал на одну активность в один день, backend хранит несколько событий.

## Endpoints

## Activities

### GET /activities

Возвращает список активностей.

Ответ `200`:

```json
[
  {
    "id": 1,
    "name": "Workout",
    "category": "sport",
    "weight": 1
  },
  {
    "id": 2,
    "name": "English",
    "category": "language",
    "weight": 1
  }
]
```

### POST /activities

Создаёт активность.

Запрос:

```json
{
  "name": "Workout",
  "category": "sport",
  "weight": 1
}
```

Ответ `201`:

```json
{
  "id": 1,
  "name": "Workout",
  "category": "sport",
  "weight": 1
}
```

Валидация:

- `name` обязателен и не должен быть пустым.
- `category` обязателен и не должен быть пустым.
- `weight` должен быть больше `0`.

## Events

### POST /events

Создаёт факт выполнения активности.

Запрос:

```json
{
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Ответ `201`:

```json
{
  "id": 10,
  "activity_id": 1,
  "date": "2026-04-26"
}
```

Правила:

- `activity_id` должен ссылаться на существующую активность.
- `date` обязателен.
- Повторный запрос с тем же `activity_id` и `date` создаёт новое событие.

### GET /events?date=YYYY-MM-DD

Возвращает события за конкретную дату.

Пример:

```text
GET /events?date=2026-04-26
```

Ответ `200`:

```json
[
  {
    "id": 10,
    "activity_id": 1,
    "date": "2026-04-26"
  },
  {
    "id": 11,
    "activity_id": 1,
    "date": "2026-04-26"
  }
]
```

## Stats

### GET /stats/heatmap

Возвращает данные для heatmap.

Query-параметры:

- `year` — optional integer. Если не передан, backend использует текущий год.

Пример:

```text
GET /stats/heatmap?year=2026
```

Ответ `200`:

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

Правила:

- `days` содержит все дни выбранного года.
- `score` считается как сумма `weight` всех событий за дату.
- `event_count` показывает количество событий за дату.

### GET /stats/streak

Возвращает текущий streak.

Ответ `200`:

```json
{
  "current_streak": 5,
  "as_of_date": "2026-04-26"
}
```

Правила:

- Streak считается по последовательным дням с `score > 0`.
- Если на `as_of_date` нет активности, `current_streak` равен `0`.

### GET /stats/summary

Возвращает краткую статистику.

Query-параметры:

- `year` — optional integer. Если не передан, backend использует текущий год.

Ответ `200`:

```json
{
  "year": 2026,
  "active_days": 42,
  "total_events": 120,
  "total_score": 135,
  "current_streak": 5
}
```

Поля:

- `active_days` — количество дней в году, где `score > 0`.
- `total_events` — общее количество событий за год.
- `total_score` — сумма score за год.
- `current_streak` — текущий streak на сегодня.

## Ошибки

Для ошибок backend возвращает стандартный JSON.

Пример `422`:

```json
{
  "detail": [
    {
      "loc": ["body", "weight"],
      "msg": "Input should be greater than 0",
      "type": "greater_than"
    }
  ]
}
```

Пример `404`:

```json
{
  "detail": "Activity not found"
}
```

Ожидаемые статусы:

- `200` — успешное чтение.
- `201` — успешное создание.
- `404` — связанная сущность не найдена.
- `422` — ошибка валидации.
- `500` — непредвиденная ошибка backend.

## Ожидаемый frontend flow

При открытии главного экрана frontend выполняет:

1. `GET /activities`.
2. `GET /stats/summary`.
3. `GET /stats/heatmap`.

При создании активности:

1. `POST /activities`.
2. Обновить локальный список активностей или повторить `GET /activities`.

При клике по активности:

1. `POST /events` с `activity_id` и сегодняшней датой.
2. Повторить `GET /stats/summary`.
3. Повторить `GET /stats/heatmap`.

Для MVP можно не делать optimistic update. Надёжнее сначала дождаться ответа backend, затем обновить статистику.

## Совместимость

Контракт рассчитан на MVP. Если API будет меняться, изменения нужно сначала фиксировать в этом документе, а затем обновлять backend и frontend.
