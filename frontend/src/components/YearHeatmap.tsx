import { HeatmapDay, HeatmapResponse } from "../api";

type YearHeatmapProps = {
  heatmap: HeatmapResponse | null;
  isLoading: boolean;
  onSelectDate: (date: string) => void;
  selectedDate: string;
};

const monthNames = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];
const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

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

function formatTooltipDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isToday(date: string): boolean {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return date === `${year}-${month}-${day}`;
}

export function YearHeatmap({
  heatmap,
  isLoading,
  onSelectDate,
  selectedDate,
}: YearHeatmapProps) {
  const days = heatmap?.days ?? [];
  const maxScore = days.reduce((max, day) => Math.max(max, day.score), 0);
  const firstDay = days[0] ? new Date(`${days[0].date}T00:00:00`) : null;
  const firstDayOffset = firstDay ? (firstDay.getDay() + 6) % 7 : 0;
  const cells: Array<HeatmapDay | null> = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...days,
  ];
  const weeks: Array<Array<HeatmapDay | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  const monthPositions: Array<{ month: number; weekIndex: number }> = [];
  let previousMonth = -1;
  cells.forEach((day, index) => {
    if (!day) {
      return;
    }

    const month = new Date(`${day.date}T00:00:00`).getMonth();
    if (month !== previousMonth) {
      monthPositions.push({ month, weekIndex: Math.floor(index / 7) });
      previousMonth = month;
    }
  });

  return (
    <section className="panel heatmap-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow mono">Годовая карта</p>
        </div>
        {isLoading ? <span className="pill">Загрузка</span> : null}
      </div>

      {days.length === 0 ? (
        <p className="empty-state">Heatmap появится после загрузки данных.</p>
      ) : (
        <>
          <div className="heatmap-months mono" aria-hidden="true">
            {weeks.map((_, weekIndex) => {
              const monthPosition = monthPositions.find(
                (position) => position.weekIndex === weekIndex,
              );

              return (
                <span key={weekIndex}>
                  {monthPosition ? monthNames[monthPosition.month] : ""}
                </span>
              );
            })}
          </div>

          <div className="heatmap-body">
            <div className="heatmap-days mono" aria-hidden="true">
              {dayNames.map((dayName, index) => (
                <span key={dayName}>{index % 2 === 1 ? dayName : ""}</span>
              ))}
            </div>

            <div className="heatmap-scroll" aria-label="Годовая heatmap">
              <div className="heatmap-grid">
                {weeks.map((week, weekIndex) => (
                  <div className="heatmap-week" key={weekIndex}>
                    {week.map((day, dayIndex) =>
                      day ? (
                        <button
                          aria-label={formatDayTitle(day)}
                          className={[
                            "heatmap-cell",
                            isToday(day.date) ? "today" : "",
                            selectedDate === day.date ? "selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          data-level={getIntensity(day, maxScore)}
                          data-tooltip={formatTooltipDate(day.date)}
                          key={day.date}
                          onClick={() => onSelectDate(day.date)}
                          title={formatDayTitle(day)}
                          type="button"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="heatmap-cell placeholder"
                          key={`empty-${weekIndex}-${dayIndex}`}
                        />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="heatmap-legend">
            <span>меньше</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span className="heatmap-cell" data-level={level} key={level} />
            ))}
            <span>больше</span>
            <span className="heatmap-cell today" data-level={0} />
            <span>сегодня</span>
          </div>
        </>
      )}
    </section>
  );
}
