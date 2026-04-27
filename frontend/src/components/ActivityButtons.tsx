import { useMemo, useState } from "react";

import { Activity } from "../api";

type ActivityButtonsProps = {
  activities: Activity[];
  disabled: boolean;
  markingActivityId: number | null;
  onMark: (activity: Activity) => Promise<void>;
  title?: string;
};

export function ActivityButtons({
  activities,
  disabled,
  markingActivityId,
  onMark,
  title = "Activities",
}: ActivityButtonsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const categories = useMemo(() => {
    const categoryById = new Map<number, Activity["category"]>();
    activities.forEach((activity) => {
      categoryById.set(activity.category.id, activity.category);
    });

    return Array.from(categoryById.values()).sort((first, second) =>
      first.name.localeCompare(second.name, "en"),
    );
  }, [activities]);
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const selectedActivities = selectedCategory
    ? activities.filter((activity) => activity.category.id === selectedCategory.id)
    : [];

  return (
    <section className="panel quick-log-panel">
      <button
        aria-expanded={isExpanded}
        className="quick-log-toggle"
        onClick={() => setIsExpanded((currentIsExpanded) => !currentIsExpanded)}
        type="button"
      >
        <div>
          <h2>{selectedCategory ? selectedCategory.name : title}</h2>
        </div>
        <span className="quick-log-toggle-meta">
          <span className="pill">{activities.length}</span>
          <span className="quick-log-chevron" aria-hidden="true">
            {isExpanded ? "↑" : "↓"}
          </span>
        </span>
      </button>

      {!isExpanded ? null : activities.length === 0 ? (
        <p className="empty-state">
          No activities yet. Create your first one, then tap it each time the
          action is done.
        </p>
      ) : !selectedCategory ? (
        <div className="category-grid">
          {categories.map((category) => {
            const activityCount = activities.filter(
              (activity) => activity.category.id === category.id,
            ).length;

            return (
              <button
                className="category-button"
                disabled={disabled || markingActivityId !== null}
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                <span>{category.name}</span>
                <small>{activityCount} activities</small>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <button
            className="text-button back-button"
            onClick={() => setSelectedCategoryId(null)}
            type="button"
          >
            ← Back to Categories
          </button>

          <div className="activity-grid">
            {selectedActivities.map((activity) => {
              const isMarking = markingActivityId === activity.id;

              return (
                <button
                  className="activity-button"
                  disabled={disabled || markingActivityId !== null}
                  key={activity.id}
                  onClick={() => void onMark(activity)}
                  type="button"
                >
                  <span>{isMarking ? "Logging..." : activity.name}</span>
                  <small>+{activity.weight}</small>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
