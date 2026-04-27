const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type User = {
  id: number;
  name: string;
  email: string;
};

export type UserCreate = {
  name: string;
  email: string;
  password: string;
};

export type UserLogin = {
  email: string;
  password: string;
};

export type AuthSession = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type Activity = {
  id: number;
  user_id: number;
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
  user_id: number;
  name: string;
};

export type CategoryCreate = {
  name: string;
};

export type EventCreate = {
  activity_id: number;
  date?: string;
};

export type ActivityEvent = {
  id: number;
  user_id: number;
  activity_id: number;
  date: string;
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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getErrorMessage(text: string, fallback: string): string {
  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    return text;
  }

  return text;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      getErrorMessage(text, `API request failed with ${response.status}`),
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function fetchUsers(): Promise<User[]> {
  return request<User[]>("/users");
}

export function createUser(input: UserCreate): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function registerUser(input: UserCreate): Promise<AuthSession> {
  return request<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: UserLogin): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchActivities(token: string): Promise<Activity[]> {
  return request<Activity[]>("/activities", undefined, token);
}

export function createActivity(
  token: string,
  input: ActivityCreate,
): Promise<Activity> {
  return request<Activity>("/activities", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export function fetchCategories(token: string): Promise<Category[]> {
  return request<Category[]>("/categories", undefined, token);
}

export function createCategory(
  token: string,
  input: CategoryCreate,
): Promise<Category> {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export function createEvent(token: string, input: EventCreate): Promise<void> {
  return request<void>("/events", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export function fetchEvents(token: string, date: string): Promise<ActivityEvent[]> {
  return request<ActivityEvent[]>(
    `/events?date=${encodeURIComponent(date)}`,
    undefined,
    token,
  );
}

export function fetchHeatmap(
  token: string,
  year: number,
): Promise<HeatmapResponse> {
  return request<HeatmapResponse>(`/stats/heatmap?year=${year}`, undefined, token);
}

export function fetchSummary(token: string, year: number): Promise<SummaryResponse> {
  return request<SummaryResponse>(`/stats/summary?year=${year}`, undefined, token);
}
