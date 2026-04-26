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
          <h2>Activities</h2>
        </div>
        <span className="pill">{activities.length}</span>
      </div>

      {activities.length === 0 ? (
        <p className="empty-state">
          No activities yet. Create the first one, then press it each time the
          action is done.
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
                <span>{isMarking ? "Logging..." : activity.name}</span>
                <small>
                  {activity.category.name} · +{activity.weight}
                </small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
