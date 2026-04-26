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
      <section className="hero-card">
        <p className="eyebrow">Personal consistency tracker</p>
        <h1>LifeTracker</h1>
        {currentUser ? (
          <div className="session-row">
            <p className="user-chip">Space: {currentUser.email}</p>
            <button className="text-button" onClick={handleLogout} type="button">
              Log out
            </button>
          </div>
        ) : null}
        <p>
          Create activities, log repeated actions with one click, and watch your
          yearly rhythm.
        </p>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      {!currentUser || !authToken ? (
        <AuthForm isSubmitting={isAuthenticating} onSubmit={handleAuth} />
      ) : (
        <>
          <ActivityForm
            categories={categories}
            onCreate={handleCreateActivity}
            isSubmitting={isCreating}
          />

          <ActivityButtons
            activities={activities}
            disabled={isLoading}
            markingActivityId={markingActivityId}
            onMark={handleMarkActivity}
          />

          <StatsSummary isLoading={isLoading} summary={summary} />

          <YearHeatmap heatmap={heatmap} isLoading={isLoading} />
        </>
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
