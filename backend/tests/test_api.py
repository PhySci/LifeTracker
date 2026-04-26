from collections.abc import Generator
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.db import Base, get_db
from backend.app.main import app


@pytest.fixture()
def client(tmp_path) -> Generator[TestClient, None, None]:
    database_url = f"sqlite:///{tmp_path / 'test.db'}"
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def create_activity(
    client: TestClient,
    name: str = "Workout",
    category: str = "sport",
    weight: float = 1,
) -> dict:
    response = client.post(
        "/activities",
        json={"name": name, "category": category, "weight": weight},
    )
    assert response.status_code == 201
    return response.json()


def create_event(client: TestClient, activity_id: int, event_date: date) -> dict:
    response = client.post(
        "/events",
        json={"activity_id": activity_id, "date": event_date.isoformat()},
    )
    assert response.status_code == 201
    return response.json()


def test_multiple_events_same_activity_same_day_are_stored(client: TestClient) -> None:
    activity = create_activity(client, weight=2)
    event_date = date(2026, 4, 26)

    first_event = create_event(client, activity["id"], event_date)
    second_event = create_event(client, activity["id"], event_date)

    assert first_event["id"] != second_event["id"]
    response = client.get("/events", params={"date": event_date.isoformat()})

    assert response.status_code == 200
    assert response.json() == [
        {"id": first_event["id"], "activity_id": activity["id"], "date": "2026-04-26"},
        {
            "id": second_event["id"],
            "activity_id": activity["id"],
            "date": "2026-04-26",
        },
    ]


def test_heatmap_contains_whole_year_and_weighted_day_scores(
    client: TestClient,
) -> None:
    workout = create_activity(client, name="Workout", category="sport", weight=2)
    reading = create_activity(client, name="Reading", category="learning", weight=0.5)
    event_date = date(2026, 4, 26)

    create_event(client, workout["id"], event_date)
    create_event(client, workout["id"], event_date)
    create_event(client, reading["id"], event_date)

    response = client.get("/stats/heatmap", params={"year": 2026})

    assert response.status_code == 200
    payload = response.json()
    active_day = next(day for day in payload["days"] if day["date"] == "2026-04-26")

    assert payload["year"] == 2026
    assert len(payload["days"]) == 365
    assert payload["days"][0] == {
        "date": "2026-01-01",
        "score": 0,
        "event_count": 0,
    }
    assert active_day == {"date": "2026-04-26", "score": 4.5, "event_count": 3}


def test_current_streak_counts_consecutive_days_through_today(
    client: TestClient,
) -> None:
    activity = create_activity(client)
    today = date.today()

    create_event(client, activity["id"], today)
    create_event(client, activity["id"], today - timedelta(days=1))
    create_event(client, activity["id"], today - timedelta(days=2))
    create_event(client, activity["id"], today - timedelta(days=4))

    response = client.get("/stats/streak")

    assert response.status_code == 200
    assert response.json() == {
        "current_streak": 3,
        "as_of_date": today.isoformat(),
    }


def test_current_streak_is_zero_when_today_has_no_activity(
    client: TestClient,
) -> None:
    activity = create_activity(client)
    yesterday = date.today() - timedelta(days=1)
    create_event(client, activity["id"], yesterday)

    response = client.get("/stats/streak")

    assert response.status_code == 200
    assert response.json()["current_streak"] == 0


def test_summary_aggregates_year_stats_and_current_streak(
    client: TestClient,
) -> None:
    workout = create_activity(client, name="Workout", category="sport", weight=2)
    reading = create_activity(client, name="Reading", category="learning", weight=0.5)
    today = date.today()

    create_event(client, workout["id"], today)
    create_event(client, workout["id"], today)
    create_event(client, reading["id"], today)
    create_event(client, reading["id"], today - timedelta(days=1))

    response = client.get("/stats/summary", params={"year": today.year})

    assert response.status_code == 200
    assert response.json() == {
        "year": today.year,
        "active_days": 2,
        "total_events": 4,
        "total_score": 5.0,
        "current_streak": 2,
    }
