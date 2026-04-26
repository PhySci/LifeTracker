import { useState, useEffect } from "react";

const TASKS_DEFAULT = ["Спортзал", "LeetCode", "Чтение 45 мин", "Программирование"];
const MONTH_NAMES = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const DAY_NAMES = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}
function getDateFromDayOfYear(year, day) {
  const d = new Date(year, 0); d.setDate(day); return d;
}
function getDaysInYear(year) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

export default function ActivityTracker() {
  const today = new Date();
  const year = today.getFullYear();
  const todayDOY = getDayOfYear(today);
  const totalDays = getDaysInYear(year);
  const daysLeft = totalDays - todayDOY;
  const daysPassed = todayDOY - 1;

  const [tasks, setTasks] = useState(TASKS_DEFAULT);
  const [newTask, setNewTask] = useState("");
  const [activityLog, setActivityLog] = useState({});
  const [selectedDay, setSelectedDay] = useState(todayDOY);
  const [view, setView] = useState("grid");

  useEffect(() => {
    const demo = {};
    for (let i = 1; i < todayDOY; i++) {
      if (Math.random() > 0.28) {
        const done = [];
        TASKS_DEFAULT.forEach((_, idx) => { if (Math.random() > 0.35) done.push(idx); });
        if (done.length > 0) demo[i] = done;
      }
    }
    setActivityLog(demo);
  }, []);

  function getIntensity(doy) {
    if (tasks.length === 0) return 0;
    const done = (activityLog[doy] || []).length;
    if (done === 0) return 0;
    const r = done / tasks.length;
    if (r <= 0.25) return 1;
    if (r <= 0.5) return 2;
    if (r <= 0.75) return 3;
    return 4;
  }

  function toggleTask(taskIdx) {
    const current = activityLog[selectedDay] || [];
    const updated = current.includes(taskIdx)
      ? current.filter(i => i !== taskIdx)
      : [...current, taskIdx];
    setActivityLog(prev => ({ ...prev, [selectedDay]: updated }));
  }

  function addTask() {
    if (newTask.trim()) { setTasks(p => [...p, newTask.trim()]); setNewTask(""); }
  }
  function removeTask(idx) {
    setTasks(p => p.filter((_, i) => i !== idx));
    setActivityLog(prev => {
      const u = {};
      Object.entries(prev).forEach(([k, v]) => {
        u[k] = v.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
      });
      return u;
    });
  }

  const firstDayWeekday = (new Date(year, 0, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < firstDayWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthPositions = [];
  let prevMonth = -1;
  cells.forEach((doy, idx) => {
    if (!doy) return;
    const m = getDateFromDayOfYear(year, doy).getMonth();
    if (m !== prevMonth) { monthPositions.push({ weekIdx: Math.floor(idx / 7), month: m }); prevMonth = m; }
  });

  const activeDays = Object.values(activityLog).filter(v => v.length > 0).length;
  const completionRate = daysPassed > 0 ? Math.round((activeDays / daysPassed) * 100) : 0;
  const selectedDone = activityLog[selectedDay] || [];
  const isToday = selectedDay === todayDOY;
  const isPast = selectedDay < todayDOY;
  const isFuture = selectedDay > todayDOY;
  const selectedFormatted = getDateFromDayOfYear(year, selectedDay).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const intensityColors = ["#e8f0ed","#a8d5c2","#5bb89a","#2e9e7a","#1a6b52"];
  const todayColor = "#e07b39";

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#faf9f7", minHeight: "100vh", color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cell {
          width: 13px; height: 13px; border-radius: 2px; cursor: pointer;
          transition: transform 0.12s; flex-shrink: 0;
        }
        .cell:hover { transform: scale(1.5); z-index: 10; position: relative; }
        .cell-today { animation: glow 2s infinite; }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 5px #e07b3966; }
          50% { box-shadow: 0 0 12px #e07b39bb; }
        }
        .cell-selected-ring { outline: 2px solid #e07b39; outline-offset: 1.5px; border-radius: 3px; }
        .btn {
          background: white; border: 1px solid #e2ddd8; color: #3a3a3a;
          padding: 7px 16px; border-radius: 6px; cursor: pointer;
          font-family: inherit; font-size: 12px; font-weight: 500;
          transition: all 0.15s;
        }
        .btn:hover { background: #f5f3f0; }
        .btn-accent { background: #e07b39; border-color: #e07b39; color: white; }
        .btn-accent:hover { background: #c96d30; }
        .tab {
          padding: 7px 18px; border-radius: 6px; cursor: pointer; border: none;
          font-family: inherit; font-size: 12px; font-weight: 500;
          letter-spacing: 0.04em; text-transform: uppercase; transition: all 0.15s;
        }
        .tab-active { background: white; color: #1a1a1a; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .tab-inactive { background: transparent; color: #a09a93; }
        .tab-inactive:hover { color: #5a5550; }
        .task-row {
          display: flex; align-items: center; gap: 12px; padding: 11px 14px;
          border-radius: 8px; cursor: pointer; transition: all 0.12s;
          border: 1.5px solid #e8e3de; background: white;
        }
        .task-row:hover { border-color: #c8c3be; }
        .task-row.done { background: #f0faf6; border-color: #5bb89a; }
        .check {
          width: 20px; height: 20px; border-radius: 5px; border: 1.5px solid #d0cbc5;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: all 0.15s; background: white;
        }
        .task-row.done .check { background: #2e9e7a; border-color: #2e9e7a; }
        input:focus { outline: none; }
        .card { background: white; border: 1px solid #e8e3de; border-radius: 10px; padding: 16px; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "white", borderBottom: "1px solid #e8e3de", padding: "24px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#a09a93", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>
              {year} — осталось
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 64, fontWeight: 600, color: "#e07b39", lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
                {daysLeft}
              </span>
              <span style={{ fontSize: 20, color: "#c8a08a", fontWeight: 300 }}>дней</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "активных дней", value: activeDays, color: "#2e9e7a" },
              { label: "прошло", value: daysPassed, color: "#1a1a1a" },
              { label: "эффективность", value: `${completionRate}%`, color: completionRate > 60 ? "#2e9e7a" : completionRate > 30 ? "#e07b39" : "#d94f3d" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ textAlign: "center", minWidth: 90 }}>
                <div style={{ fontSize: 24, fontWeight: 600, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
                <div style={{ fontSize: 10, color: "#a09a93", fontWeight: 500, marginTop: 3, letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, height: 4, background: "#f0ece8", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${(daysPassed / totalDays) * 100}%`, background: "linear-gradient(90deg, #e07b39, #f0a060)", borderRadius: 2 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "#c0bbb5", fontFamily: "'DM Mono', monospace" }}>
          <span>1 янв</span>
          <span>день {todayDOY}</span>
          <span>31 дек</span>
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: "28px 36px", display: "flex", gap: 28, flexWrap: "wrap" }}>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "#f0ece8", borderRadius: 8, padding: 4, marginBottom: 24, width: "fit-content" }}>
            {[["grid","Год"],["day","День"],["tasks","Задачи"]].map(([v, label]) => (
              <button key={v} className={`tab ${view === v ? "tab-active" : "tab-inactive"}`} onClick={() => setView(v)}>{label}</button>
            ))}
          </div>

          {/* GRID */}
          {view === "grid" && (
            <div>
              <div style={{ display: "flex", paddingLeft: 24, marginBottom: 5 }}>
                {weeks.map((_, wIdx) => {
                  const mp = monthPositions.find(m => m.weekIdx === wIdx);
                  return (
                    <div key={wIdx} style={{ width: 15, flexShrink: 0 }}>
                      {mp ? <span style={{ fontSize: 9, color: "#b0aaa3", fontFamily: "'DM Mono', monospace" }}>{MONTH_NAMES[mp.month]}</span> : null}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 6 }}>
                  {DAY_NAMES.map((d, i) => (
                    <div key={d} style={{ height: 13, fontSize: 9, color: "#c0bbb5", display: "flex", alignItems: "center", fontFamily: "'DM Mono', monospace" }}>
                      {i % 2 === 1 ? d : ""}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {week.map((doy, dIdx) => {
                        if (!doy) return <div key={dIdx} style={{ width: 13, height: 13 }} />;
                        const isT = doy === todayDOY;
                        const isFut = doy > todayDOY;
                        const isSel = doy === selectedDay;
                        const intensity = isFut ? 0 : getIntensity(doy);
                        const bg = isT ? todayColor : isFut ? "#ede9e3" : intensityColors[intensity];
                        return (
                          <div
                            key={dIdx}
                            className={`cell${isT ? " cell-today" : ""}${isSel && !isT ? " cell-selected-ring" : ""}`}
                            style={{ background: bg }}
                            onClick={() => { setSelectedDay(doy); setView("day"); }}
                            title={getDateFromDayOfYear(year, doy).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16 }}>
                <span style={{ fontSize: 10, color: "#b0aaa3" }}>меньше</span>
                {intensityColors.map((c, i) => <div key={i} className="cell" style={{ background: c, width: 11, height: 11 }} />)}
                <span style={{ fontSize: 10, color: "#b0aaa3" }}>больше</span>
                <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 5 }}>
                  <div className="cell" style={{ background: todayColor, width: 11, height: 11 }} />
                  <span style={{ fontSize: 10, color: "#b0aaa3" }}>сегодня</span>
                </div>
              </div>
            </div>
          )}

          {/* DAY */}
          {view === "day" && (
            <div style={{ maxWidth: 420 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#a09a93", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                  {isToday ? "Сегодня" : isPast ? "Прошлое" : "Будущее"} · {selectedFormatted}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>
                  {isToday ? "Что сделал сегодня?" : isPast ? `Выполнено ${selectedDone.length} из ${tasks.length}` : "Этот день ещё впереди"}
                </div>
              </div>
              {isFuture ? (
                <div style={{ padding: 20, background: "#f8f5f2", borderRadius: 10, border: "1px solid #e8e3de", color: "#a09a93", fontSize: 14, lineHeight: 1.7 }}>
                  До этого дня ещё {selectedDay - todayDOY} дней.<br />Он пока пустой — но ты можешь сделать его зелёным.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tasks.map((task, idx) => {
                    const done = selectedDone.includes(idx);
                    return (
                      <div key={idx} className={`task-row ${done ? "done" : ""}`} onClick={() => toggleTask(idx)}>
                        <div className="check">
                          {done && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14, color: done ? "#1a6b52" : "#3a3a3a", fontWeight: done ? 500 : 400 }}>{task}</span>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && <div style={{ color: "#a09a93", fontSize: 14 }}>Нет задач — добавь в разделе «Задачи»</div>}
                  <div style={{ marginTop: 4, padding: "10px 14px", background: "#f8f5f2", borderRadius: 8, fontSize: 13, color: "#7a7470" }}>
                    {selectedDone.length === 0 && "— ни одной задачи не выполнено"}
                    {selectedDone.length > 0 && selectedDone.length < tasks.length && `${selectedDone.length} из ${tasks.length} выполнено`}
                    {tasks.length > 0 && selectedDone.length === tasks.length && "✦ Всё выполнено — отличный день!"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TASKS */}
          {view === "tasks" && (
            <div style={{ maxWidth: 420 }}>
              <div style={{ marginBottom: 16, fontSize: 13, color: "#8a8480", lineHeight: 1.6 }}>
                Каждая выполненная задача добавляет +1 к интенсивности дня.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {tasks.map((task, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "white", borderRadius: 8, border: "1px solid #e8e3de" }}>
                    <span style={{ fontSize: 14 }}>{task}</span>
                    <button className="btn" style={{ padding: "4px 10px", color: "#c0bbb5", fontSize: 12 }} onClick={() => removeTask(idx)}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask()}
                  placeholder="Новая задача..."
                  style={{ flex: 1, background: "white", border: "1px solid #e2ddd8", color: "#1a1a1a", padding: "9px 14px", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}
                />
                <button className="btn btn-accent" onClick={addTask}>+ Добавить</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ width: 196, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 10, fontWeight: 500, color: "#a09a93", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Сегодня</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{today.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
            <div style={{ fontSize: 12, color: "#a09a93", marginTop: 2 }}>День {todayDOY} из {totalDays}</div>
            <div style={{ marginTop: 10, fontSize: 14 }}>
              <span style={{ color: "#2e9e7a", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{(activityLog[todayDOY] || []).length}</span>
              <span style={{ color: "#a09a93" }}> / {tasks.length} задач</span>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 10, fontWeight: 500, color: "#a09a93", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Осталось</div>
            {[["дней", daysLeft], ["недель", Math.floor(daysLeft / 7)], ["выходных", Math.floor(daysLeft / 7) * 2]].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#8a8480" }}>{label}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#e07b39", fontFamily: "'DM Mono', monospace" }}>{val}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontSize: 10, fontWeight: 500, color: "#a09a93", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Прогноз</div>
            <div style={{ fontSize: 12, color: "#5a5550", lineHeight: 1.7 }}>
              При темпе {completionRate}%:<br />
              <span style={{ fontSize: 20, fontWeight: 600, color: "#2e9e7a", fontFamily: "'DM Mono', monospace" }}>
                ~{Math.round(daysLeft * completionRate / 100)}
              </span><br />
              <span style={{ color: "#a09a93" }}>активных дней до конца года</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
