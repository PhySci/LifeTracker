import { FormEvent, useState } from "react";

import { Activity } from "../api";

type ActivityFormProps = {
  isSubmitting: boolean;
  onCreate: (input: Omit<Activity, "id">) => Promise<void>;
};

export function ActivityForm({ isSubmitting, onCreate }: ActivityFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [weight, setWeight] = useState("1");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedWeight = Number(weight);
    if (!name.trim() || !category.trim() || parsedWeight <= 0) {
      return;
    }

    await onCreate({
      name: name.trim(),
      category: category.trim(),
      weight: parsedWeight,
    });

    setName("");
    setCategory("");
    setWeight("1");
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Новая привычка</p>
          <h2>Создать активность</h2>
        </div>
      </div>

      <form className="activity-form" onSubmit={handleSubmit}>
        <label>
          Название
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Workout"
            required
          />
        </label>

        <label>
          Категория
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="sport"
            required
          />
        </label>

        <label>
          Вес
          <input
            min="0.1"
            step="0.1"
            type="number"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            required
          />
        </label>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Создаю..." : "Добавить"}
        </button>
      </form>
    </section>
  );
}
