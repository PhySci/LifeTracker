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
  title = "Активности",
}: ActivityButtonsProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const categories = useMemo(() => {
    const categoryById = new Map<number, Activity["category"]>();
    activities.forEach((activity) => {
      categoryById.set(activity.category.id, activity.category);
    });

    return Array.from(categoryById.values()).sort((first, second) =>
      first.name.localeCompare(second.name, "ru"),
    );
  }, [activities]);
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const selectedActivities = selectedCategory
    ? activities.filter((activity) => activity.category.id === selectedCategory.id)
    : [];

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow mono">Быстрая запись</p>
          <h2>{selectedCategory ? selectedCategory.name : title}</h2>
        </div>
        <span className="pill">{activities.length}</span>
      </div>

      {activities.length === 0 ? (
        <p className="empty-state">
          Пока нет активностей. Создайте первую, затем нажимайте на неё каждый
          раз, когда действие выполнено.
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
                <small>{activityCount} активн.</small>
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
            ← К категориям
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
                  <span>{isMarking ? "Отмечаю..." : activity.name}</span>
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
