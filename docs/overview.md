# Техническое задание: трекер консистентности действий

## 1. Постановка задачи

Разработать персональное приложение для трекинга факта выполнения
действий по направлениям (спорт, обучение, язык) с визуализацией
прогресса в виде heatmap.

Это не task manager. Система фиксирует только факт выполнения действия.

## 2. Основные сценарии

-   Добавление активности (1 клик)
-   Просмотр heatmap за год
-   Просмотр статистики (streak, активные дни)

## 3. Сущности

### Activity

-   id
-   name
-   category
-   weight

### Event

-   id
-   activity_id
-   date (YYYY-MM-DD)

## 4. Бизнес-логика

### Day score

sum(weight)

### Streak

последовательные дни с активностью \> 0

## 5. Архитектура

Frontend (React) → Backend (FastAPI) → DB (SQLite)

## 6. API

GET /activities\
POST /activities

POST /events\
GET /events?date=

GET /stats/heatmap\
GET /stats/streak\
GET /stats/summary

## 7. База данных

activities(id, name, category, weight)\
events(id, activity_id, date)

## 8. Frontend

-   heatmap (365 дней)
-   кнопки активностей
-   mobile-first

## 9. Ограничения

-   без auth
-   без мультиюзерности
-   без ML

## 10. Критерии готовности

-   можно добавлять события
-   работает heatmap
-   считается streak
