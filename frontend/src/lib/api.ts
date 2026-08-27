import type { Paginated } from "./types";

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api/v1";

const ACCESS_KEY = "ap.auth.access";
const REFRESH_KEY = "ap.auth.refresh";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
  /** DRF field errors as a `{ field: message }` map for inline form display. */
  get fieldMessages(): Record<string, string> {
    const p = this.payload;
    if (!p || typeof p !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      out[k] = Array.isArray(v) ? v.join(" ") : String(v);
    }
    return out;
  }

  /** The same errors flattened into readable lines. */
  get fieldLines(): string[] {
    const entries = Object.entries(this.fieldMessages);
    if (!entries.length) return [this.message];
    return entries.map(([k, text]) =>
      k === "detail" || k === "non_field_errors" ? text : `${k}: ${text}`,
    );
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  /** Set for FormData uploads so we do not force a JSON content type. */
  raw?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!tokens.refresh) return false;
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    })
      .then(async (res) => {
        if (!res.ok) {
          tokens.clear();
          return false;
        }
        const data = (await res.json()) as { access: string; refresh?: string };
        tokens.set(data.access, data.refresh);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        // allow a later 401 to trigger a fresh attempt
        setTimeout(() => (refreshInFlight = null), 0);
      });
  }
  return refreshInFlight;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, signal, raw = false } = opts;
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const run = async (): Promise<Response> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (!raw && body !== undefined)
      headers["Content-Type"] = "application/json";
    if (auth && tokens.access)
      headers.Authorization = `Bearer ${tokens.access}`;
    return fetch(url, {
      method,
      headers,
      signal,
      body:
        body === undefined
          ? undefined
          : raw
            ? (body as BodyInit)
            : JSON.stringify(body),
    });
  };

  let res = await run();
  if (res.status === 401 && auth && (await refreshAccessToken()))
    res = await run();

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { detail?: string })?.detail || `خطای ${res.status}`,
      data,
    );
  }
  return normalize(data) as T;
}

/** Build FormData from a plain object so callers can pass `{ file, kind }`. */
function toFormData(payload: FormData | Record<string, unknown>): FormData {
  if (payload instanceof FormData) return payload;
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (value instanceof Blob) form.append(key, value);
    else form.append(key, String(value));
  }
  return form;
}

/**
 * The API and the UI use slightly different names for a few nested objects
 * (`hero` vs `hero_image`, `neighbours` vs `prev`/`next`, ...). Aliasing them
 * once here keeps every page working with a single, stable shape.
 */
function normalize(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(normalize);
  if (!input || typeof input !== "object") return input;
  const o = input as Record<string, unknown>;

  // Artwork cover: the API sends the resolved image as `cover` (and `hero` for
  // older clients), while `hero_image` stays the raw media id the admin form
  // writes back. Never overwrite the id with the object.
  if (!o.cover && o.hero && typeof o.hero === "object") o.cover = o.hero;
  if (o.cover_detail) o.cover = o.cover_detail;
  if (o.image_detail) o.image = o.image_detail;
  if (o.portrait_detail) o.portrait = o.portrait_detail;
  if (o.sculpture && !o.sculpture_detail) o.sculpture_detail = o.sculpture;
  if (o.related && !o.related_artworks) o.related_artworks = o.related;

  if (o.neighbours && typeof o.neighbours === "object") {
    const n = o.neighbours as Record<string, unknown>;
    o.prev = n.previous ?? n.prev ?? null;
    o.next = n.next ?? null;
  }

  if (o.seo && typeof o.seo === "object") {
    const seo = o.seo as Record<string, unknown>;
    if (!o.seo_title) o.seo_title = seo.title;
    if (!o.seo_description) o.seo_description = seo.description;
    if (o.noindex === undefined) o.noindex = seo.noindex;
    if (!o.og_image_url) o.og_image_url = seo.ogImage;
  }

  if (o.category_key !== undefined && typeof o.category !== "object") {
    o.category = {
      id: typeof o.category === "number" ? o.category : 0,
      key: o.category_key,
      label: o.category_label ?? "",
    };
  }
  if (o.collection_slug && typeof o.collection !== "object") {
    o.collection = {
      id: typeof o.collection === "number" ? o.collection : 0,
      slug: o.collection_slug,
      title: o.collection_title ?? "",
    };
  }

  if (o.status !== undefined && o.is_published === undefined) {
    o.is_published = o.status === "published";
  }

  for (const value of Object.values(o)) normalize(value);
  return o;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function qs(params?: Record<string, unknown>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>(`${path}${qs(params)}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),

  /** Authenticated admin calls. */
  admin: {
    get: <T>(path: string, params?: Record<string, unknown>) =>
      request<T>(`${path}${qs(params)}`, { auth: true }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body, auth: true }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "PATCH", body, auth: true }),
    put: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "PUT", body, auth: true }),
    delete: <T>(path: string) =>
      request<T>(path, { method: "DELETE", auth: true }),
    /** Multipart upload. Accepts a ready FormData or a plain field map. */
    upload: <T>(path: string, payload: FormData | Record<string, unknown>) =>
      request<T>(path, {
        method: "POST",
        body: toFormData(payload),
        auth: true,
        raw: true,
      }),
  },
};

/** Follow DRF pagination until everything is collected (admin lists). */
export async function fetchAll<T>(
  path: string,
  params: Record<string, unknown> = {},
  auth = false,
): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = `${path}${qs({ ...params, page_size: 100 })}`;
  while (next) {
    const page: Paginated<T> = auth
      ? await api.admin.get<Paginated<T>>(next)
      : await api.get<Paginated<T>>(next);
    out.push(...page.results);
    next = page.next;
  }
  return out;
}
