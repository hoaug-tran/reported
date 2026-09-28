import { CACHE_CONFIG, ERROR_FALLBACKS } from "../constants/index";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ApiFetchOptions extends RequestInit {
  skipCache?: boolean;
}

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const inFlightRequests = new Map<string, Promise<any>>();
const responseCache = new Map<string, CacheEntry>();

export const clearApiCache = (pattern?: string) => {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key);
    }
  }
};

const getCacheTtl = (url: string): number => {
  if (url.includes("/github-pulls")) {
    return CACHE_CONFIG.ttlZeroMs;
  }
  if (
    url.includes("/github/repositories") ||
    url.includes("/members") ||
    url.includes("/projects") ||
    url.includes("/saved-views")
  ) {
    return CACHE_CONFIG.ttlFastMs;
  }
  return 3_000;
};

export const apiFetch = async <T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> => {
  const method = (options.method || "GET").toUpperCase();
  const url = endpoint.startsWith("/api") ? endpoint : `/api/v1${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const activeWsId = localStorage.getItem("reported_active_workspace_id");
  if (activeWsId && !headers.has("x-workspace-id")) {
    headers.set("x-workspace-id", activeWsId);
  }

  if (method !== "GET") {
    clearApiCache();
  }

  const cacheKey = `${method}:${activeWsId || "none"}:${url}`;

  if (method === "GET" && !options.skipCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errObj = data.error || {};
        let message = errObj.message || response.statusText;
        if (
          !message ||
          message === "An error occurred" ||
          message === "Internal server error" ||
          message === "An unexpected error occurred"
        ) {
          if (response.status === 401) {
            message = ERROR_FALLBACKS.unauthorized;
          } else if (response.status === 403) {
            message = ERROR_FALLBACKS.forbidden;
          } else if (response.status === 404) {
            message = ERROR_FALLBACKS.notFound;
          } else if (response.status === 409) {
            message = ERROR_FALLBACKS.conflict;
          } else {
            message = ERROR_FALLBACKS.internal;
          }
        }
        throw new ApiError(
          errObj.code || "UNKNOWN_ERROR",
          message,
          response.status,
          errObj.details,
        );
      }

      if (method === "GET" && !options.skipCache) {
        responseCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + getCacheTtl(url),
        });
      }

      return data as T;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (method === "GET" && !options.skipCache) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}
