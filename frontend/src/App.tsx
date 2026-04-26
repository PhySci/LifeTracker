import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  Activity,
  Category,
  User,
  createActivity,
  createCategory,
  createEvent,
  fetchActivities,
  fetchCategories,
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
import { StatsSummary } from "./components/StatsSummary";
import { YearHeatmap } from "./components/YearHeatmap";
import "./styles.css";

const currentYear = new Date().getFullYear();
const authTokenStorageKey = "lifetracker.authToken";
const userStorageKey = "lifetracker.user";

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function getDaysInYear(year: number): number {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
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
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(authToken));
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [markingActivityId, setMarkingActivityId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const completionRate =
    daysPassed > 0 && summary
      ? Math.round((summary.active_days / daysPassed) * 100)
      : 0;
  const todayFormatted = today.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
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

  useEffect(() => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadDashboard(authToken)
      .catch((unknownError: unknown) => {
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Could not load data.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [authToken, loadDashboard]);

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
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Could not authenticate.",
      );
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(authTokenStorageKey);
    localStorage.removeItem(userStorageKey);
    setAuthToken(null);
    setCurrentUser(null);
    setActivities([]);
    setCategories([]);
    setSummary(null);
    setHeatmap(null);
    setNotice(null);
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
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Could not create the activity.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleMarkActivity(activity: Activity) {
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
      });
      const [nextSummary, nextHeatmap] = await Promise.all([
        fetchSummary(authToken, currentYear),
        fetchHeatmap(authToken, currentYear),
      ]);

      setSummary(nextSummary);
      setHeatmap(nextHeatmap);
      setNotice(`Logged: ${activity.name}.`);
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Could not log the activity.",
      );
    } finally {
      setMarkingActivityId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="year-header">
        <div className="year-header-top">
          <div>
            <p className="eyebrow mono">{currentYear} — осталось</p>
            <div className="days-left">
              <span>{daysLeft}</span>
              <small>дней</small>
            </div>
          </div>

          <div className="header-stats">
            <article className="mini-card">
              <strong>{summary?.active_days ?? 0}</strong>
              <span>активных дней</span>
            </article>
            <article className="mini-card">
              <strong>{daysPassed}</strong>
              <span>прошло</span>
            </article>
            <article className="mini-card">
              <strong className={completionRate >= 60 ? "good" : "accent"}>
                {completionRate}%
              </strong>
              <span>эффективность</span>
            </article>
          </div>
        </div>

        <div className="year-progress" aria-label="Прогресс года">
          <span style={{ width: `${yearProgress}%` }} />
        </div>
        <div className="year-progress-labels mono">
          <span>1 янв</span>
          <span>день {todayDayOfYear}</span>
          <span>31 дек</span>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

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
              <button className="tab tab-active" type="button">
                Год
              </button>
              <button className="tab" type="button">
                День
              </button>
              <button className="tab" type="button">
                Активности
              </button>
            </div>

            <YearHeatmap heatmap={heatmap} isLoading={isLoading} />

            <div className="work-grid">
              <ActivityButtons
                activities={activities}
                disabled={isLoading}
                markingActivityId={markingActivityId}
                onMark={handleMarkActivity}
              />

              <ActivityForm
                categories={categories}
                onCreate={handleCreateActivity}
                isSubmitting={isCreating}
              />
            </div>

            <StatsSummary isLoading={isLoading} summary={summary} />
          </section>

          <aside className="side-column">
            <div className="card">
              <p className="eyebrow mono">Сегодня</p>
              <h3>{todayFormatted}</h3>
              <p>День {todayDayOfYear} из {totalDays}</p>
              <div className="today-score">
                <strong>{summary?.current_streak ?? 0}</strong>
                <span>streak дней</span>
              </div>
            </div>

            <div className="card compact-list">
              <p className="eyebrow mono">Осталось</p>
              <div>
                <span>дней</span>
                <strong>{daysLeft}</strong>
              </div>
              <div>
                <span>недель</span>
                <strong>{Math.floor(daysLeft / 7)}</strong>
              </div>
              <div>
                <span>выходных</span>
                <strong>{Math.floor(daysLeft / 7) * 2}</strong>
              </div>
            </div>

            <div className="card">
              <p className="eyebrow mono">Прогноз</p>
              <p className="forecast-copy">
                При темпе {completionRate}%:
                <strong>~{Math.round((daysLeft * completionRate) / 100)}</strong>
                активных дней до конца года
              </p>
            </div>

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
