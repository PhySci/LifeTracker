from datetime import date

from sqlalchemy import Date, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)

    categories: Mapped[list["Category"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    activities: Mapped[list["Activity"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    events: Mapped[list["Event"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_categories_user_name"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)

    user: Mapped[User] = relationship(back_populates="categories")
    activities: Mapped[list["Activity"]] = relationship(back_populates="category")


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id"),
        nullable=False,
        index=True,
    )
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1)

    user: Mapped[User] = relationship(back_populates="activities")
    category: Mapped[Category] = relationship(back_populates="activities")
    events: Mapped[list["Event"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    user: Mapped[User] = relationship(back_populates="events")
    activity: Mapped[Activity] = relationship(back_populates="events")
