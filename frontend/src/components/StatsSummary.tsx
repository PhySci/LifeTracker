import { SummaryResponse } from "../api";

type StatsSummaryProps = {
  isLoading: boolean;
  summary: SummaryResponse | null;
};

const emptySummary: SummaryResponse = {
  year: new Date().getFullYear(),
  active_days: 0,
  total_events: 0,
  total_score: 0,
  current_streak: 0,
};

export function StatsSummary({ isLoading, summary }: StatsSummaryProps) {
  const data = summary ?? emptySummary;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{data.year}</p>
          <h2>Summary</h2>
        </div>
        {isLoading ? <span className="pill">Загрузка</span> : null}
      </div>

      <div className="stats-grid">
        <article>
          <strong>{data.current_streak}</strong>
          <span>streak дней</span>
        </article>
        <article>
          <strong>{data.active_days}</strong>
          <span>активных дней</span>
        </article>
        <article>
          <strong>{data.total_events}</strong>
          <span>событий</span>
        </article>
        <article>
          <strong>{data.total_score}</strong>
          <span>score</span>
        </article>
      </div>
    </section>
  );
}
