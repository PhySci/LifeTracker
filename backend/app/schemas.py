from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ActivityCreate(BaseModel):
    name: NonEmptyString
    category: NonEmptyString
    weight: float = Field(default=1, gt=0)


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    weight: float


class EventCreate(BaseModel):
    activity_id: int
    date: date


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_id: int
    date: date


class HeatmapDay(BaseModel):
    date: date
    score: float
    event_count: int


class HeatmapResponse(BaseModel):
    year: int
    days: list[HeatmapDay]


class StreakResponse(BaseModel):
    current_streak: int
    as_of_date: date


class SummaryResponse(BaseModel):
    year: int
    active_days: int
    total_events: int
    total_score: float
    current_streak: int
