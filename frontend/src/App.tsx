import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  Activity,
  createActivity,
  createEvent,
  fetchActivities,
  fetchHeatmap,
  fetchSummary,
  HeatmapResponse,
  SummaryResponse,
} from "./api";
import { ActivityButtons } from "./components/ActivityButtons";
import { ActivityForm } from "./components/ActivityForm";
import { StatsSummary } from "./components/StatsSummary";
import { YearHeatmap } from "./components/YearHeatmap";
import "./styles.css";

const currentYear = new Date().getFullYear();

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [markingActivityId, setMarkingActivityId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [nextActivities, nextSummary, nextHeatmap] = await Promise.all([
      fetchActivities(),
      fetchSummary(currentYear),
      fetchHeatmap(currentYear),
    ]);

    setActivities(nextActivities);
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
            : "Не удалось загрузить данные.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [loadDashboard]);

  async function handleCreateActivity(input: Omit<Activity, "id">) {
    setIsCreating(true);
    setError(null);
    setNotice(null);

    try {
      const activity = await createActivity(input);
      setActivities((currentActivities) => [...currentActivities, activity]);
      setNotice(`Активность "${activity.name}" создана.`);
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Не удалось создать активность.",
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
        date: formatLocalDate(new Date()),
      });
      const [nextSummary, nextHeatmap] = await Promise.all([
        fetchSummary(currentYear),
        fetchHeatmap(currentYear),
      ]);

      setSummary(nextSummary);
      setHeatmap(nextHeatmap);
      setNotice(`Отмечено: ${activity.name}.`);
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Не удалось отметить активность.",
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
          Создавайте активности, отмечайте повторные выполнения одним нажатием и
          следите за годовым ритмом.
        </p>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      <ActivityForm onCreate={handleCreateActivity} isSubmitting={isCreating} />

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
