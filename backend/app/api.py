from datetime import date, timedelta
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from backend.app import auth, models, schemas
from backend.app.db import get_db


router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]
logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


def _year_bounds(year: int) -> tuple[date, date]:
    return date(year, 1, 1), date(year + 1, 1, 1)


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> models.User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = auth.read_token_subject(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


CurrentUser = Annotated[models.User, Depends(get_current_user)]


def _daily_scores(
    db: Session,
    user_id: int,
    start: date,
    end: date,
) -> dict[date, tuple[float, int]]:
    rows = db.execute(
        select(
            models.Event.date,
            func.coalesce(func.sum(models.Activity.weight), 0),
            func.count(models.Event.id),
        )
        .join(models.Activity)
        .where(
            models.Event.user_id == user_id,
            models.Event.date >= start,
            models.Event.date < end,
        )
        .group_by(models.Event.date)
    ).all()

    return {
        event_date: (float(score or 0), int(event_count))
        for event_date, score, event_count in rows
    }


def _score_for_date(db: Session, user_id: int, target_date: date) -> float:
    score = db.execute(
        select(func.coalesce(func.sum(models.Activity.weight), 0))
        .select_from(models.Event)
        .join(models.Activity)
        .where(models.Event.user_id == user_id, models.Event.date == target_date)
    ).scalar_one()
    return float(score or 0)


def calculate_current_streak(
    db: Session,
    user_id: int,
    as_of_date: date | None = None,
) -> int:
    current_date = as_of_date or date.today()
    streak = 0

    while _score_for_date(db, user_id, current_date) > 0:
        streak += 1
        current_date -= timedelta(days=1)

    return streak


@router.get("/users", response_model=list[schemas.UserRead])
def list_users(db: DbSession) -> list[models.User]:
    return list(db.scalars(select(models.User).order_by(models.User.id)).all())


@router.post(
    "/users",
    response_model=schemas.UserRead,
    status_code=status.HTTP_201_CREATED,
)
def create_user(user_in: schemas.UserCreate, db: DbSession) -> models.User:
    user = models.User(
        name=user_in.name,
        email=user_in.email,
        password=auth.hash_password(user_in.password),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        ) from None

    db.refresh(user)
    logger.info("User created", extra={"user_id": user.id})
    return user


@router.post(
    "/auth/register",
    response_model=schemas.AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(user_in: schemas.UserCreate, db: DbSession) -> schemas.AuthResponse:
    user = create_user(user_in, db)
    return schemas.AuthResponse(
        access_token=auth.create_access_token(user.id),
        user=user,
    )


@router.post("/auth/login", response_model=schemas.AuthResponse)
def login(login_in: schemas.UserLogin, db: DbSession) -> schemas.AuthResponse:
    user = db.scalar(select(models.User).where(models.User.email == login_in.email))
    if user is None or not auth.verify_password(login_in.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if auth.password_needs_rehash(user.password):
        user.password = auth.hash_password(login_in.password)
        db.commit()
        db.refresh(user)

    logger.info("User logged in", extra={"user_id": user.id})
    return schemas.AuthResponse(
        access_token=auth.create_access_token(user.id),
        user=user,
    )


@router.get("/categories", response_model=list[schemas.CategoryRead])
def list_categories(db: DbSession, current_user: CurrentUser) -> list[models.Category]:
    return list(
        db.scalars(
            select(models.Category)
            .where(models.Category.user_id == current_user.id)
            .order_by(models.Category.name)
        ).all()
    )


@router.post(
    "/categories",
    response_model=schemas.CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category_in: schemas.CategoryCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> models.Category:
    category = models.Category(user_id=current_user.id, **category_in.model_dump())
    db.add(category)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        ) from None

    db.refresh(category)
    logger.info(
        "Category created",
        extra={"category_id": category.id, "user_id": current_user.id},
    )
    return category


@router.get("/activities", response_model=list[schemas.ActivityRead])
def list_activities(db: DbSession, current_user: CurrentUser) -> list[models.Activity]:
    return list(
        db.scalars(
            select(models.Activity)
            .options(selectinload(models.Activity.category))
            .where(models.Activity.user_id == current_user.id)
            .order_by(models.Activity.id)
        ).all()
    )


@router.post(
    "/activities",
    response_model=schemas.ActivityRead,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    activity_in: schemas.ActivityCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> models.Activity:
    category = db.scalar(
        select(models.Category).where(
            models.Category.id == activity_in.category_id,
            models.Category.user_id == current_user.id,
        )
    )
    if category is None:
        logger.warning(
            "Activity creation failed because category was not found",
            extra={"category_id": activity_in.category_id, "user_id": current_user.id},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    activity = models.Activity(user_id=current_user.id, **activity_in.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    logger.info(
        "Activity created",
        extra={"activity_id": activity.id, "user_id": current_user.id},
    )
    return activity


@router.post(
    "/events",
    response_model=schemas.EventRead,
    status_code=status.HTTP_201_CREATED,
)
def create_event(
    event_in: schemas.EventCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> models.Event:
    activity = db.scalar(
        select(models.Activity).where(
            models.Activity.id == event_in.activity_id,
            models.Activity.user_id == current_user.id,
        )
    )
    if activity is None:
        logger.warning(
            "Event creation failed because activity was not found",
            extra={"activity_id": event_in.activity_id, "user_id": current_user.id},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    event = models.Event(
        user_id=current_user.id,
        activity_id=event_in.activity_id,
        date=event_in.date or date.today(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    logger.info(
        "Event created",
        extra={
            "event_id": event.id,
            "activity_id": activity.id,
            "user_id": current_user.id,
        },
    )
    return event


@router.get("/events", response_model=list[schemas.EventRead])
def list_events(
    db: DbSession,
    current_user: CurrentUser,
    event_date: Annotated[date, Query(alias="date")],
) -> list[models.Event]:
    return list(
        db.scalars(
            select(models.Event)
            .where(
                models.Event.user_id == current_user.id,
                models.Event.date == event_date,
            )
            .order_by(models.Event.id)
        ).all()
    )


@router.get("/stats/heatmap", response_model=schemas.HeatmapResponse)
def get_heatmap(
    db: DbSession,
    current_user: CurrentUser,
    year: int | None = None,
) -> schemas.HeatmapResponse:
    selected_year = year or date.today().year
    start, end = _year_bounds(selected_year)
    scores = _daily_scores(db, current_user.id, start, end)

    days: list[schemas.HeatmapDay] = []
    current_date = start
    while current_date < end:
        score, event_count = scores.get(current_date, (0, 0))
        days.append(
            schemas.HeatmapDay(
                date=current_date,
                score=score,
                event_count=event_count,
            )
        )
        current_date += timedelta(days=1)

    return schemas.HeatmapResponse(year=selected_year, days=days)


@router.get("/stats/streak", response_model=schemas.StreakResponse)
def get_streak(db: DbSession, current_user: CurrentUser) -> schemas.StreakResponse:
    today = date.today()
    return schemas.StreakResponse(
        current_streak=calculate_current_streak(db, current_user.id, today),
        as_of_date=today,
    )


@router.get("/stats/summary", response_model=schemas.SummaryResponse)
def get_summary(
    db: DbSession,
    current_user: CurrentUser,
    year: int | None = None,
) -> schemas.SummaryResponse:
    selected_year = year or date.today().year
    start, end = _year_bounds(selected_year)
    scores = _daily_scores(db, current_user.id, start, end)

    return schemas.SummaryResponse(
        year=selected_year,
        active_days=sum(1 for score, _ in scores.values() if score > 0),
        total_events=sum(event_count for _, event_count in scores.values()),
        total_score=sum(score for score, _ in scores.values()),
        current_streak=calculate_current_streak(db, current_user.id, date.today()),
    )
