import { FormEvent, useState } from "react";

import { Category } from "../api";

export type ActivityFormInput = {
  name: string;
  categoryName: string;
  weight: number;
};

type ActivityFormProps = {
  categories: Category[];
  isSubmitting: boolean;
  onCreate: (input: ActivityFormInput) => Promise<void>;
};

export function ActivityForm({
  categories,
  isSubmitting,
  onCreate,
}: ActivityFormProps) {
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
      categoryName: category.trim(),
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
          <p className="eyebrow">New habit</p>
          <h2>Create activity</h2>
        </div>
      </div>

      <form className="activity-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Workout"
            required
          />
        </label>

        <label>
          Category
          <input
            list="category-options"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="sport"
            required
          />
          <datalist id="category-options">
            {categories.map((categoryOption) => (
              <option key={categoryOption.id} value={categoryOption.name} />
            ))}
          </datalist>
        </label>

        <label>
          Weight
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
          {isSubmitting ? "Creating..." : "Add"}
        </button>
      </form>
    </section>
  );
}
