import { useAuthStore } from '../stores/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.data?.accessToken;
    if (token) {
      useAuthStore.getState().setAccessToken(token);
    }
    return token;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });
    } else {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = body.error ?? {};
    throw new ApiError(
      res.status,
      error.code ?? 'UNKNOWN_ERROR',
      error.message ?? 'An error occurred',
      error.details,
      error.request_id,
    );
  }

  const json = await res.json();
  return json.data ?? json;
}

// ------------------------------------------------------------------ //
//  Paginated response helper                                          //
// ------------------------------------------------------------------ //

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Fetch a paginated list endpoint.
 *
 * The gateway returns `{ data: T[], pagination: {...} }`. Because the
 * base `api()` function unwraps `json.data ?? json`, paginated endpoints
 * need special handling to preserve both `data` and `pagination`.
 */
export async function apiPaginated<T>(
  path: string,
  options: ApiOptions = {},
): Promise<PaginatedResponse<T>> {
  const { skipAuth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });
    } else {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = body.error ?? {};
    throw new ApiError(
      res.status,
      error.code ?? 'UNKNOWN_ERROR',
      error.message ?? 'An error occurred',
      error.details,
      error.request_id,
    );
  }

  const json = await res.json();
  return {
    data: json.data ?? [],
    pagination: json.pagination ?? { page: 1, pageSize: 25, total: 0, totalPages: 1 },
  };
}

export { ApiError, API_BASE };
