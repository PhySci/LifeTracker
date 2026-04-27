from collections.abc import Generator
from datetime import date, timedelta

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
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


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_user(
    client: TestClient,
    name: str = "Demo User",
    email: str = "demo@example.com",
    password: str = "password",
) -> dict:
    response = client.post(
        "/users",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()


def register_user(
    client: TestClient,
    name: str = "Demo User",
    email: str = "demo@example.com",
    password: str = "password",
) -> dict:
    response = client.post(
        "/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()


def login_user(
    client: TestClient,
    email: str = "demo@example.com",
    password: str = "password",
) -> dict:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()


def create_category(client: TestClient, token: str, name: str = "sport") -> dict:
    response = client.post(
        "/categories",
        json={"name": name},
        headers=auth_headers(token),
    )
    assert response.status_code == 201
    return response.json()


def create_activity(
    client: TestClient,
    token: str,
    name: str = "Workout",
    category_id: int | None = None,
    weight: float = 1,
) -> dict:
    if category_id is None:
        category_id = create_category(client, token)["id"]

    response = client.post(
        "/activities",
        json={"name": name, "category_id": category_id, "weight": weight},
        headers=auth_headers(token),
    )
    assert response.status_code == 201
    return response.json()


def create_event(
    client: TestClient,
    token: str,
    activity_id: int,
    event_date: date,
) -> dict:
    response = client.post(
        "/events",
        json={"activity_id": activity_id, "date": event_date.isoformat()},
        headers=auth_headers(token),
    )
    assert response.status_code == 201
    return response.json()


def test_user_creation_returns_public_user_fields(client: TestClient) -> None:
    user = create_user(client)

    assert user == {"id": user["id"], "name": "Demo User", "email": "demo@example.com"}


def test_register_returns_token_and_public_user(client: TestClient) -> None:
    session = register_user(client)

    assert session["token_type"] == "bearer"
    assert session["access_token"]
    assert session["user"] == {
        "id": session["user"]["id"],
        "name": "Demo User",
        "email": "demo@example.com",
    }


def test_registration_can_be_disabled(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ALLOW_REGISTRATION", "false")

    response = client.post(
        "/auth/register",
        json={"name": "Demo User", "email": "demo@example.com", "password": "password"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Registration is disabled"


def test_public_user_endpoints_are_disabled_in_production(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")

    list_response = client.get("/users")
    create_response = client.post(
        "/users",
        json={"name": "Demo User", "email": "demo@example.com", "password": "password"},
    )

    assert list_response.status_code == 404
    assert create_response.status_code == 404


def test_login_returns_token_for_valid_credentials(client: TestClient) -> None:
    create_user(client)

    session = login_user(client)

    assert session["token_type"] == "bearer"
    assert session["access_token"]
    assert session["user"]["email"] == "demo@example.com"


def test_login_rejects_invalid_credentials(client: TestClient) -> None:
    create_user(client)

    response = client.post(
        "/auth/login",
        json={"email": "demo@example.com", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_protected_endpoints_require_authentication(client: TestClient) -> None:
    response = client.get("/categories")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_activity_creation_uses_user_owned_category(client: TestClient) -> None:
    session = register_user(client)
    user = session["user"]
    token = session["access_token"]
    category = create_category(client, token, name="sport")

    activity = create_activity(client, token, category_id=category["id"], weight=2)

    assert activity == {
        "id": activity["id"],
        "user_id": user["id"],
        "name": "Workout",
        "category_id": category["id"],
        "category": category,
        "weight": 2.0,
    }


def test_user_cannot_create_activity_with_another_users_category(
    client: TestClient,
) -> None:
    owner = register_user(client, email="owner@example.com")
    other_user = register_user(client, email="other@example.com")
    category = create_category(client, owner["access_token"], name="sport")

    response = client.post(
        "/activities",
        json={"name": "Workout", "category_id": category["id"], "weight": 1},
        headers=auth_headers(other_user["access_token"]),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"


def test_multiple_events_same_activity_same_day_are_stored(client: TestClient) -> None:
    session = register_user(client)
    user = session["user"]
    token = session["access_token"]
    activity = create_activity(client, token, weight=2)
    event_date = date(2026, 4, 26)

    first_event = create_event(client, token, activity["id"], event_date)
    second_event = create_event(client, token, activity["id"], event_date)

    assert first_event["id"] != second_event["id"]
    response = client.get(
        "/events",
        params={"date": event_date.isoformat()},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": first_event["id"],
            "user_id": user["id"],
            "activity_id": activity["id"],
            "date": "2026-04-26",
        },
        {
            "id": second_event["id"],
            "user_id": user["id"],
            "activity_id": activity["id"],
            "date": "2026-04-26",
        },
    ]


def test_user_scoped_lists_do_not_include_other_users_data(
    client: TestClient,
) -> None:
    first_session = register_user(client, email="first@example.com")
    second_session = register_user(client, email="second@example.com")
    first_user = first_session["user"]
    first_token = first_session["access_token"]
    second_token = second_session["access_token"]
    first_activity = create_activity(client, first_token, name="Workout")
    second_activity = create_activity(client, second_token, name="Reading")
    event_date = date(2026, 4, 26)
    create_event(client, first_token, first_activity["id"], event_date)
    create_event(client, second_token, second_activity["id"], event_date)

    categories_response = client.get(
        "/categories",
        headers=auth_headers(first_token),
    )
    activities_response = client.get(
        "/activities",
        headers=auth_headers(first_token),
    )
    events_response = client.get(
        "/events",
        params={"date": event_date.isoformat()},
        headers=auth_headers(first_token),
    )

    assert categories_response.status_code == 200
    assert activities_response.status_code == 200
    assert events_response.status_code == 200
    assert [category["user_id"] for category in categories_response.json()] == [
        first_user["id"]
    ]
    assert [activity["name"] for activity in activities_response.json()] == ["Workout"]
    assert [event["user_id"] for event in events_response.json()] == [first_user["id"]]


def test_heatmap_contains_whole_year_and_weighted_day_scores(
    client: TestClient,
) -> None:
    session = register_user(client)
    token = session["access_token"]
    workout = create_activity(client, token, name="Workout", weight=2)
    learning = create_category(client, token, name="learning")
    reading = create_activity(
        client,
        token,
        name="Reading",
        category_id=learning["id"],
        weight=0.5,
    )
    event_date = date(2026, 4, 26)

    create_event(client, token, workout["id"], event_date)
    create_event(client, token, workout["id"], event_date)
    create_event(client, token, reading["id"], event_date)

    response = client.get(
        "/stats/heatmap",
        params={"year": 2026},
        headers=auth_headers(token),
    )

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
    session = register_user(client)
    token = session["access_token"]
    activity = create_activity(client, token)
    today = date.today()

    create_event(client, token, activity["id"], today)
    create_event(client, token, activity["id"], today - timedelta(days=1))
    create_event(client, token, activity["id"], today - timedelta(days=2))
    create_event(client, token, activity["id"], today - timedelta(days=4))

    response = client.get("/stats/streak", headers=auth_headers(token))

    assert response.status_code == 200
    assert response.json() == {
        "current_streak": 3,
        "as_of_date": today.isoformat(),
    }


def test_current_streak_is_zero_when_today_has_no_activity(
    client: TestClient,
) -> None:
    session = register_user(client)
    token = session["access_token"]
    activity = create_activity(client, token)
    yesterday = date.today() - timedelta(days=1)
    create_event(client, token, activity["id"], yesterday)

    response = client.get("/stats/streak", headers=auth_headers(token))

    assert response.status_code == 200
    assert response.json()["current_streak"] == 0


def test_summary_aggregates_year_stats_and_current_streak(
    client: TestClient,
) -> None:
    session = register_user(client)
    token = session["access_token"]
    workout = create_activity(client, token, name="Workout", weight=2)
    learning = create_category(client, token, name="learning")
    reading = create_activity(
        client,
        token,
        name="Reading",
        category_id=learning["id"],
        weight=0.5,
    )
    today = date.today()

    create_event(client, token, workout["id"], today)
    create_event(client, token, workout["id"], today)
    create_event(client, token, reading["id"], today)
    create_event(client, token, reading["id"], today - timedelta(days=1))

    response = client.get(
        "/stats/summary",
        params={"year": today.year},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json() == {
        "year": today.year,
        "active_days": 2,
        "total_events": 4,
        "total_score": 5.0,
        "current_streak": 2,
    }


def test_event_date_defaults_to_today(client: TestClient) -> None:
    session = register_user(client)
    user = session["user"]
    token = session["access_token"]
    activity = create_activity(client, token)

    response = client.post(
        "/events",
        json={"activity_id": activity["id"]},
        headers=auth_headers(token),
    )

    assert response.status_code == 201
    assert response.json()["user_id"] == user["id"]
    assert response.json()["date"] == date.today().isoformat()


def test_alembic_migration_adds_user_scoping_columns_to_legacy_schema(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'legacy.db'}"
    legacy_engine = create_engine(database_url, connect_args={"check_same_thread": False})

    with legacy_engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE categories (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(80) NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE activities (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    category_id INTEGER NOT NULL,
                    weight FLOAT NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE events (
                    id INTEGER PRIMARY KEY,
                    activity_id INTEGER NOT NULL,
                    date DATE NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO users (id, name, email, password)
                VALUES (1, 'Demo User', 'demo@example.com', 'password')
                """
            )
        )
        connection.execute(
            text("INSERT INTO categories (id, user_id, name) VALUES (10, 1, 'sport')")
        )
        connection.execute(
            text(
                """
                INSERT INTO activities (id, name, category_id, weight)
                VALUES (20, 'Workout', 10, 2)
                """
            )
        )
        connection.execute(
            text("INSERT INTO events (id, activity_id, date) VALUES (30, 20, '2026-04-26')")
        )

    alembic_config = Config("alembic.ini")
    alembic_config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(alembic_config, "head")

    with legacy_engine.connect() as connection:
        activity_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(activities)"))
        }
        event_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(events)"))
        }
        activity_user_id = connection.execute(
            text("SELECT user_id FROM activities WHERE id = 20")
        ).scalar_one()
        event_user_id = connection.execute(
            text("SELECT user_id FROM events WHERE id = 30")
        ).scalar_one()
        current_revision = connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()

    assert "user_id" in activity_columns
    assert "user_id" in event_columns
    assert activity_user_id == 1
    assert event_user_id == 1
    assert current_revision == "20260426_0001"


def test_alembic_migration_creates_schema_for_empty_database(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'fresh.db'}"
    fresh_engine = create_engine(database_url, connect_args={"check_same_thread": False})
    alembic_config = Config("alembic.ini")
    alembic_config.set_main_option("sqlalchemy.url", database_url)

    command.upgrade(alembic_config, "head")

    with fresh_engine.connect() as connection:
        tables = {
            row[0]
            for row in connection.execute(
                text("SELECT name FROM sqlite_master WHERE type = 'table'")
            )
        }
        activity_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(activities)"))
        }
        event_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(events)"))
        }

    assert {"users", "categories", "activities", "events", "alembic_version"} <= tables
    assert "user_id" in activity_columns
    assert "user_id" in event_columns


def test_alembic_migration_recovers_pre_category_legacy_schema(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'pre_category.db'}"
    legacy_engine = create_engine(database_url, connect_args={"check_same_thread": False})

    with legacy_engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE categories (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(80) NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE activities (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    weight FLOAT NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE events (
                    id INTEGER PRIMARY KEY,
                    activity_id INTEGER NOT NULL,
                    date DATE NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO users (id, name, email, password)
                VALUES (1, 'Demo User', 'demo@example.com', 'password')
                """
            )
        )
        connection.execute(
            text("INSERT INTO categories (id, user_id, name) VALUES (10, 1, 'sport')")
        )
        connection.execute(
            text("INSERT INTO activities (id, name, weight) VALUES (20, 'Workout', 2)")
        )
        connection.execute(
            text("INSERT INTO events (id, activity_id, date) VALUES (30, 20, '2026-04-26')")
        )

    alembic_config = Config("alembic.ini")
    alembic_config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(alembic_config, "head")

    with legacy_engine.connect() as connection:
        activity = connection.execute(
            text("SELECT user_id, category_id FROM activities WHERE id = 20")
        ).one()
        event_user_id = connection.execute(
            text("SELECT user_id FROM events WHERE id = 30")
        ).scalar_one()

    assert activity.user_id == 1
    assert activity.category_id == 10
    assert event_user_id == 1
