export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/api') ? endpoint : `/api/v1${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const activeWsId = localStorage.getItem('reported_active_workspace_id');
  if (activeWsId && !headers.has('x-workspace-id')) {
    headers.set('x-workspace-id', activeWsId);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errObj = data.error || {};
    throw new ApiError(
      errObj.code || 'UNKNOWN_ERROR',
      errObj.message || response.statusText || 'An error occurred',
      response.status,
      errObj.details
    );
  }

  return data as T;
}

