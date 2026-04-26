const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type Activity = {
  id: number;
  name: string;
  category_id: number;
  category: Category;
  weight: number;
};

export type ActivityCreate = {
  name: string;
  category_id: number;
  weight: number;
};

export type Category = {
  id: number;
  name: string;
};

export type CategoryCreate = {
  name: string;
};

export type EventCreate = {
  activity_id: number;
  date?: string;
};

export type HeatmapDay = {
  date: string;
  score: number;
  event_count: number;
};

export type HeatmapResponse = {
  year: number;
  days: HeatmapDay[];
};

export type SummaryResponse = {
  year: number;
  active_days: number;
  total_events: number;
  total_score: number;
  current_streak: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchActivities(): Promise<Activity[]> {
  return request<Activity[]>("/activities");
}

export function createActivity(input: ActivityCreate): Promise<Activity> {
  return request<Activity>("/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export function createCategory(input: CategoryCreate): Promise<Category> {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createEvent(input: EventCreate): Promise<void> {
  return request<void>("/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchHeatmap(year: number): Promise<HeatmapResponse> {
  return request<HeatmapResponse>(`/stats/heatmap?year=${year}`);
}

export function fetchSummary(year: number): Promise<SummaryResponse> {
  return request<SummaryResponse>(`/stats/summary?year=${year}`);
}
