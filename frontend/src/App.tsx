import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {

  ApiError,
  Activity,
  ActivityEvent,
  Category,
  User,
  createActivity,
  createCategory,
  createEvent,
  fetchActivities,
  fetchCategories,
  fetchEvents,
  fetchHeatmap,
  fetchSummary,
  HeatmapResponse,
  loginUser,
  registerUser,
  SummaryResponse,
} from "./api";
import { ActivityButtons } from "./components/ActivityButtons";
import { AuthForm, AuthFormInput } from "./components/AuthForm";
import { ActivityForm, ActivityFormInput } from "./components/ActivityForm";
import { YearHeatmap } from "./components/YearHeatmap";
import "./pwa";
import "./styles.css";

const currentYear = new Date().getFullYear();
const authTokenStorageKey = "lifetracker.authToken";
const userStorageKey = "lifetracker.user";
type DashboardTab = "year" | "activities";

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function getDaysInYear(year: number): number {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readStoredUser(): User | null {
  const storedUser = localStorage.getItem(userStorageKey);
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem(userStorageKey);
    return null;
  }
}

function App() {
  const today = new Date();
  const todayDayOfYear = getDayOfYear(today);
  const totalDays = getDaysInYear(currentYear);
  const daysPassed = todayDayOfYear - 1;
  const daysLeft = totalDays - todayDayOfYear;
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem(authTokenStorageKey),
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() => readStoredUser());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState<ActivityEvent[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(authToken));
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [markingActivityId, setMarkingActivityId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("year");
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(today));
  const currentDate = today.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentWeekday = today.toLocaleDateString("ru-RU", {
    weekday: "long",
  });
  const currentDateLabel = `${currentDate}, ${
    currentWeekday.charAt(0).toUpperCase() + currentWeekday.slice(1)
  }`;
  const selectedDayStats = heatmap?.days.find((day) => day.date === selectedDate);
  const selectedDateActivityCounts = selectedDateEvents.reduce(
    (counts, event) => {
      counts.set(event.activity_id, (counts.get(event.activity_id) ?? 0) + 1);
      return counts;
    },
    new Map<number, number>(),
  );
  const selectedDateLoggedActivities = Array.from(
    selectedDateActivityCounts.entries(),
  )
    .map(([activityId, count]) => ({
      activity: activities.find((activity) => activity.id === activityId),
      count,
    }))
    .filter(
      (entry): entry is { activity: Activity; count: number } =>
        entry.activity !== undefined,
    );
  const yearProgress = (daysPassed / totalDays) * 100;

  const loadDashboard = useCallback(async (token: string) => {
    const [nextActivities, nextCategories, nextSummary, nextHeatmap] =
      await Promise.all([
        fetchActivities(token),
        fetchCategories(token),
        fetchSummary(token, currentYear),
        fetchHeatmap(token, currentYear),
      ]);

    setActivities(nextActivities);
    setCategories(nextCategories);
    setSummary(nextSummary);
    setHeatmap(nextHeatmap);
  }, []);

  function clearSession(message?: string) {
    localStorage.removeItem(authTokenStorageKey);
    localStorage.removeItem(userStorageKey);
    setAuthToken(null);
    setCurrentUser(null);
    setActivities([]);
    setCategories([]);
    setSelectedDateEvents([]);
    setSummary(null);
    setHeatmap(null);
    setMarkingActivityId(null);
    setNotice(null);
    setError(message ?? null);
  }

  function handleRequestError(unknownError: unknown, fallbackMessage: string) {
    if (unknownError instanceof ApiError && unknownError.status === 401) {
      clearSession("Your session is no longer valid. Please sign in again.");
      return;
    }

    setError(
      unknownError instanceof Error ? unknownError.message : fallbackMessage,
    );
  }

  useEffect(() => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadDashboard(authToken)
      .catch((unknownError: unknown) => {
        handleRequestError(unknownError, "Could not load data.");
      })
      .finally(() => setIsLoading(false));
  }, [authToken, loadDashboard]);

  useEffect(() => {
    if (!authToken || !currentUser) {
      setSelectedDateEvents([]);
      return;
    }

    fetchEvents(authToken, selectedDate)
      .then(setSelectedDateEvents)
      .catch((unknownError: unknown) => {
        handleRequestError(unknownError, "Could not load events for the selected day.");
      });
  }, [authToken, currentUser, selectedDate]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  async function handleAuth(input: AuthFormInput) {
    setIsAuthenticating(true);
    setError(null);
    setNotice(null);

    try {
      const session =
        input.mode === "login"
          ? await loginUser({ email: input.email, password: input.password })
          : await registerUser({
              name: input.name,
              email: input.email,
              password: input.password,
            });

      localStorage.setItem(authTokenStorageKey, session.access_token);
      localStorage.setItem(userStorageKey, JSON.stringify(session.user));
      setAuthToken(session.access_token);
      setCurrentUser(session.user);
      await loadDashboard(session.access_token);
      setNotice(`Signed in as ${session.user.email}.`);
    } catch (unknownError) {
      handleRequestError(unknownError, "Could not authenticate.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    clearSession();
  }

  async function handleCreateActivity(input: ActivityFormInput) {
    setIsCreating(true);
    setError(null);
    setNotice(null);

    try {
      if (!currentUser) {
        throw new Error("User is not ready yet.");
      }
      if (!authToken) {
        throw new Error("Authentication is required.");
      }

      const existingCategory = categories.find(
        (category) =>
          category.name.toLowerCase() === input.categoryName.toLowerCase(),
      );
      const category =
        existingCategory ??
        (await createCategory(authToken, { name: input.categoryName }));
      const activity = await createActivity(authToken, {
        name: input.name,
        category_id: category.id,
        weight: input.weight,
      });

      if (!existingCategory) {
        setCategories((currentCategories) => [...currentCategories, category]);
      }
      setActivities((currentActivities) => [...currentActivities, activity]);
      setNotice(`Activity "${activity.name}" was created.`);
    } catch (unknownError) {
      handleRequestError(unknownError, "Could not create the activity.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleSelectHeatmapDate(date: string) {
    setSelectedDate(date);
  }

  async function handleMarkActivity(activity: Activity, date = selectedDate) {
    setMarkingActivityId(activity.id);
    setError(null);
    setNotice(null);

    try {
      if (!currentUser) {
        throw new Error("User is not ready yet.");
      }
      if (!authToken) {
        throw new Error("Authentication is required.");
      }

      await createEvent(authToken, {
        activity_id: activity.id,
        date,
      });
      const [nextSummary, nextHeatmap] = await Promise.all([
        fetchSummary(authToken, currentYear),
        fetchHeatmap(authToken, currentYear),
      ]);

      setSummary(nextSummary);
      setHeatmap(nextHeatmap);
      if (date === selectedDate) {
        setSelectedDateEvents(await fetchEvents(authToken, selectedDate));
      }
      setNotice(`Отмечено: ${activity.name} · ${formatDisplayDate(date)}.`);
    } catch (unknownError) {
      handleRequestError(unknownError, "Could not log the activity.");
    } finally {
      setMarkingActivityId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="year-header">
        <div className="year-header-content">
          <p className="eyebrow mono">{currentDateLabel}</p>

          <div className="year-progress" aria-label="Прогресс года">
            <span style={{ width: `${yearProgress}%` }} />
          </div>

          <div className="header-cards">
            <article className="mini-card metric-card-wide">
              <strong>{daysPassed}</strong>
              <span>дней прошло</span>
            </article>
            <article className="mini-card metric-card-wide">
              <strong className="accent">{daysLeft}</strong>
              <span>дней осталось</span>
            </article>
          </div>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {!currentUser || !authToken ? (
        <section className="auth-layout">
          <div>
            <p className="eyebrow mono">LifeTracker</p>
            <h1>Твой личный трекер консистентности</h1>
            <p>
              Войди, чтобы создавать активности, отмечать повторные выполнения и
              видеть годовую heatmap в стиле календаря.
            </p>
          </div>
          <AuthForm isSubmitting={isAuthenticating} onSubmit={handleAuth} />
        </section>
      ) : (
        <div className="dashboard-layout">
          <section className="workspace">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "year" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("year")}
                type="button"
              >
                Год
              </button>
              <button
                className={`tab ${activeTab === "activities" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("activities")}
                type="button"
              >
                Активности
              </button>
            </div>

            {activeTab === "year" ? (
              <div className="year-view">
                <YearHeatmap
                  heatmap={heatmap}
                  isLoading={isLoading}
                  onSelectDate={handleSelectHeatmapDate}
                  selectedDate={selectedDate}
                />

                <section className="panel selected-day-summary">
                  <div className="selected-day-header">
                    <div>
                      <p className="eyebrow mono">Выбранный день</p>
                      <h2>{formatDisplayDate(selectedDate)}</h2>
                    </div>
                    <div className="day-metrics">
                      <span>score {selectedDayStats?.score ?? 0}</span>
                      <span>событий {selectedDayStats?.event_count ?? 0}</span>
                    </div>
                  </div>

                  {selectedDateLoggedActivities.length === 0 ? (
                    <p className="empty-state">
                      На этот день пока ничего не записано.
                    </p>
                  ) : (
                    <div className="logged-activity-list">
                      {selectedDateLoggedActivities.map(({ activity, count }) => (
                        <article className="logged-activity" key={activity.id}>
                          <div>
                            <strong>{activity.name}</strong>
                            <span>{activity.category.name}</span>
                          </div>
                          <span className="logged-count">×{count}</span>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                {notice ? <div className="alert alert-success">{notice}</div> : null}

                <ActivityButtons
                  activities={activities}
                  disabled={isLoading}
                  markingActivityId={markingActivityId}
                  onMark={(activity) =>
                    handleMarkActivity(activity, formatLocalDate(new Date()))
                  }
                  title="Быстрая запись"
                />
              </div>
            ) : null}

            {activeTab === "activities" ? (
              <div className="work-grid">
                <ActivityForm
                  categories={categories}
                  onCreate={handleCreateActivity}
                  isSubmitting={isCreating}
                />
              </div>
            ) : null}
          </section>

          <aside className="side-column">
            <div className="card session-card">
              <p className="eyebrow mono">Space</p>
              <strong>{currentUser.email}</strong>
              <button className="text-button" onClick={handleLogout} type="button">
                Выйти
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
