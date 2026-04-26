"""Create LifeTracker schema.

Revision ID: 20260426_0001
Revises: 
Create Date: 2026-04-26 17:55:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260426_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password", sa.String(length=255), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )
        op.create_index("ix_users_id", "users", ["id"], unique=False)
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    _ensure_default_user_for_legacy_data()

    tables = set(sa.inspect(bind).get_table_names())
    if "categories" not in tables:
        op.create_table(
            "categories",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=80), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
        )
        op.create_index("ix_categories_id", "categories", ["id"], unique=False)
        op.create_index("ix_categories_user_id", "categories", ["user_id"], unique=False)
    else:
        _add_column_if_missing("categories", "user_id", sa.Column("user_id", sa.Integer()))
        op.execute(
            """
            UPDATE categories
            SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
            WHERE user_id IS NULL
            """
        )
        _create_index_if_missing("ix_categories_user_id", "categories", ["user_id"])

    tables = set(sa.inspect(bind).get_table_names())
    if "activities" not in tables:
        op.create_table(
            "activities",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("category_id", sa.Integer(), nullable=False),
            sa.Column("weight", sa.Float(), nullable=False),
            sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_activities_id", "activities", ["id"], unique=False)
        op.create_index("ix_activities_user_id", "activities", ["user_id"], unique=False)
        op.create_index(
            "ix_activities_category_id",
            "activities",
            ["category_id"],
            unique=False,
        )
    else:
        _add_column_if_missing("activities", "user_id", sa.Column("user_id", sa.Integer()))
        _add_column_if_missing(
            "activities",
            "category_id",
            sa.Column("category_id", sa.Integer()),
        )
        activity_columns = _column_names("activities")
        if "category_id" in activity_columns:
            _ensure_default_categories()
            op.execute(
                """
                UPDATE activities
                SET category_id = (
                    SELECT categories.id
                    FROM categories
                    WHERE categories.user_id = COALESCE(
                        activities.user_id,
                        (SELECT id FROM users ORDER BY id LIMIT 1)
                    )
                    ORDER BY categories.id
                    LIMIT 1
                )
                WHERE category_id IS NULL
                """
            )
        op.execute(
            """
            UPDATE activities
            SET user_id = (
                SELECT categories.user_id
                FROM categories
                WHERE categories.id = activities.category_id
            )
            WHERE user_id IS NULL
            """
        )
        op.execute(
            """
            UPDATE activities
            SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
            WHERE user_id IS NULL
            """
        )
        _create_index_if_missing("ix_activities_user_id", "activities", ["user_id"])
        _create_index_if_missing("ix_activities_category_id", "activities", ["category_id"])

    tables = set(sa.inspect(bind).get_table_names())
    if "events" not in tables:
        op.create_table(
            "events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("activity_id", sa.Integer(), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.ForeignKeyConstraint(["activity_id"], ["activities.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_events_id", "events", ["id"], unique=False)
        op.create_index("ix_events_user_id", "events", ["user_id"], unique=False)
        op.create_index("ix_events_activity_id", "events", ["activity_id"], unique=False)
        op.create_index("ix_events_date", "events", ["date"], unique=False)
    else:
        _add_column_if_missing("events", "user_id", sa.Column("user_id", sa.Integer()))
        op.execute(
            """
            UPDATE events
            SET user_id = (
                SELECT activities.user_id
                FROM activities
                WHERE activities.id = events.activity_id
            )
            WHERE user_id IS NULL
            """
        )
        _create_index_if_missing("ix_events_user_id", "events", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "events" in tables:
        op.drop_table("events")
    if "activities" in tables:
        op.drop_table("activities")
    if "categories" in tables:
        op.drop_table("categories")
    if "users" in tables:
        op.drop_table("users")


def _add_column_if_missing(
    table_name: str,
    column_name: str,
    column: sa.Column,
) -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns(table_name)}
    if column_name not in columns:
        op.add_column(table_name, column)


def _column_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {column["name"] for column in sa.inspect(bind).get_columns(table_name)}


def _ensure_default_user_for_legacy_data() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "users" not in tables:
        return

    user_count = bind.execute(sa.text("SELECT COUNT(*) FROM users")).scalar_one()
    if user_count > 0:
        return

    has_legacy_data = False
    for table_name in ("categories", "activities", "events"):
        if table_name in tables:
            row_count = bind.execute(
                sa.text(f"SELECT COUNT(*) FROM {table_name}")
            ).scalar_one()
            has_legacy_data = has_legacy_data or row_count > 0

    if has_legacy_data:
        op.execute(
            """
            INSERT INTO users (name, email, password)
            VALUES ('Demo User', 'demo@lifetracker.local', 'legacy-password')
            """
        )


def _ensure_default_categories() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if not {"users", "categories"}.issubset(tables):
        return

    op.execute(
        """
        INSERT INTO categories (user_id, name)
        SELECT users.id, 'general'
        FROM users
        WHERE NOT EXISTS (
            SELECT 1
            FROM categories
            WHERE categories.user_id = users.id
              AND categories.name = 'general'
        )
        """
    )


def _create_index_if_missing(
    index_name: str,
    table_name: str,
    columns: list[str],
) -> None:
    bind = op.get_bind()
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes(table_name)}
    if index_name not in indexes:
        op.create_index(index_name, table_name, columns, unique=False)
