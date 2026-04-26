import { Activity } from "../api";

type ActivityButtonsProps = {
  activities: Activity[];
  disabled: boolean;
  markingActivityId: number | null;
  onMark: (activity: Activity) => Promise<void>;
};

export function ActivityButtons({
  activities,
  disabled,
  markingActivityId,
  onMark,
}: ActivityButtonsProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">One-click logging</p>
          <h2>Активности</h2>
        </div>
        <span className="pill">{activities.length}</span>
      </div>

      {activities.length === 0 ? (
        <p className="empty-state">
          Пока нет активностей. Создайте первую, затем нажимайте на неё каждый
          раз, когда действие выполнено.
        </p>
      ) : (
        <div className="activity-grid">
          {activities.map((activity) => {
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
                <small>
                  {activity.category} · +{activity.weight}
                </small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
