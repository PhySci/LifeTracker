import { HeatmapDay, HeatmapResponse } from "../api";

type YearHeatmapProps = {
  heatmap: HeatmapResponse | null;
  isLoading: boolean;
};

function getIntensity(day: HeatmapDay, maxScore: number): number {
  if (day.score <= 0 || maxScore <= 0) {
    return 0;
  }

  const ratio = day.score / maxScore;
  if (ratio >= 0.75) {
    return 4;
  }
  if (ratio >= 0.5) {
    return 3;
  }
  if (ratio >= 0.25) {
    return 2;
  }

  return 1;
}

function formatDayTitle(day: HeatmapDay): string {
  return `${day.date}: score ${day.score}, events ${day.event_count}`;
}

export function YearHeatmap({ heatmap, isLoading }: YearHeatmapProps) {
  const days = heatmap?.days ?? [];
  const maxScore = days.reduce((max, day) => Math.max(max, day.score), 0);

  return (
    <section className="panel heatmap-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Year heatmap</p>
          <h2>{heatmap?.year ?? new Date().getFullYear()}</h2>
        </div>
        {isLoading ? <span className="pill">Загрузка</span> : null}
      </div>

      {days.length === 0 ? (
        <p className="empty-state">Heatmap появится после загрузки данных.</p>
      ) : (
        <>
          <div className="heatmap-scroll" aria-label="Годовая heatmap">
            <div className="heatmap-grid">
              {days.map((day) => (
                <span
                  aria-label={formatDayTitle(day)}
                  className="heatmap-cell"
                  data-level={getIntensity(day, maxScore)}
                  key={day.date}
                  title={formatDayTitle(day)}
                />
              ))}
            </div>
          </div>

          <div className="heatmap-legend">
            <span>Меньше</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span className="heatmap-cell" data-level={level} key={level} />
            ))}
            <span>Больше</span>
          </div>
        </>
      )}
    </section>
  );
}
