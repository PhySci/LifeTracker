from __future__ import annotations

from datetime import date as DateType
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class UserCreate(BaseModel):
    name: NonEmptyString
    email: NonEmptyString
    password: NonEmptyString


class UserLogin(BaseModel):
    email: NonEmptyString
    password: NonEmptyString


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class CategoryCreate(BaseModel):
    name: NonEmptyString


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str


class ActivityCreate(BaseModel):
    name: NonEmptyString
    category_id: int
    weight: float = Field(default=1, gt=0)


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    category_id: int
    category: CategoryRead
    weight: float


class EventCreate(BaseModel):
    activity_id: int
    date: DateType | None = None


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    activity_id: int
    date: DateType


class HeatmapDay(BaseModel):
    date: DateType
    score: float
    event_count: int


class HeatmapResponse(BaseModel):
    year: int
    days: list[HeatmapDay]


class StreakResponse(BaseModel):
    current_streak: int
    as_of_date: DateType


class SummaryResponse(BaseModel):
    year: int
    active_days: int
    total_events: int
    total_score: float
    current_streak: int
