import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  Activity,
  Category,
  createActivity,
  createCategory,
  createEvent,
  fetchActivities,
  fetchCategories,
  fetchHeatmap,
  fetchSummary,
  HeatmapResponse,
  SummaryResponse,
} from "./api";
import { ActivityButtons } from "./components/ActivityButtons";
import { ActivityForm, ActivityFormInput } from "./components/ActivityForm";
import { StatsSummary } from "./components/StatsSummary";
import { YearHeatmap } from "./components/YearHeatmap";
import "./styles.css";

const currentYear = new Date().getFullYear();

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [markingActivityId, setMarkingActivityId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [nextActivities, nextCategories, nextSummary, nextHeatmap] =
      await Promise.all([
      fetchActivities(),
      fetchCategories(),
      fetchSummary(currentYear),
      fetchHeatmap(currentYear),
      ]);

    setActivities(nextActivities);
    setCategories(nextCategories);
    setSummary(nextSummary);
    setHeatmap(nextHeatmap);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadDashboard()
      .catch((unknownError: unknown) => {
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Could not load data.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [loadDashboard]);

  async function handleCreateActivity(input: ActivityFormInput) {
    setIsCreating(true);
    setError(null);
    setNotice(null);

    try {
      const existingCategory = categories.find(
        (category) =>
          category.name.toLowerCase() === input.categoryName.toLowerCase(),
      );
      const category =
        existingCategory ?? (await createCategory({ name: input.categoryName }));
      const activity = await createActivity({
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
      await createEvent({
        activity_id: activity.id,
      });
      const [nextSummary, nextHeatmap] = await Promise.all([
        fetchSummary(currentYear),
        fetchHeatmap(currentYear),
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
        <p>
          Create activities, log repeated actions with one click, and watch your
          yearly rhythm.
        </p>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

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
    </main>
  );
}

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
