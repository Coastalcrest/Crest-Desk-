/**
 * Generic HTTP client for calling internal microservices.
 *
 * Used by the gateway to communicate with:
 * - Compliance service (Python/FastAPI on port 8000)
 * - Billing service (Node/Express on port 4001)
 * - AI services (Python/FastAPI on ports 8001-8005)
 * - Media encoder (Rust/Actix on port 8010)
 *
 * Each service client is configured with:
 * - Base URL from environment variable
 * - Configurable timeout
 * - Automatic JSON parsing
 * - Structured error handling
 * - Health check support
 */

import { AppError } from '../middleware/error-handler';

interface ServiceClientOptions {
  baseUrl: string;
  timeout?: number;
  serviceName: string;
}

interface ServiceRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ServiceResponse<T = unknown> {
  data: T;
  status: number;
}

export class ServiceClient {
  private baseUrl: string;
  private timeout: number;
  private serviceName: string;

  constructor(options: ServiceClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeout = options.timeout ?? 10_000;
    this.serviceName = options.serviceName;
  }

  /**
   * Make an HTTP request to the microservice.
   */
  async request<T = unknown>(options: ServiceRequestOptions): Promise<ServiceResponse<T>> {
    const { method = 'GET', path, body, query, headers = {}, timeout } = options;

    // Build URL with query params
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout ?? this.timeout);

    try {
      const fetchHeaders: Record<string, string> = {
        'Accept': 'application/json',
        ...headers,
      };

      if (body !== undefined) {
        fetchHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetch(url.toString(), {
        method,
        headers: fetchHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new AppError(
          response.status >= 500 ? 502 : response.status,
          'SERVICE_ERROR',
          `${this.serviceName}: ${errorBody.detail ?? errorBody.message ?? response.statusText}`,
        );
      }

      const data = await response.json() as T;
      return { data, status: response.status };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof AppError) throw err;

      if (err instanceof Error && err.name === 'AbortError') {
        throw new AppError(
          504,
          'SERVICE_TIMEOUT',
          `${this.serviceName} did not respond within ${timeout ?? this.timeout}ms`,
        );
      }

      throw new AppError(
        503,
        'SERVICE_UNAVAILABLE',
        `${this.serviceName} is not available: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  /** Convenience: GET request */
  async get<T = unknown>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const result = await this.request<T>({ method: 'GET', path, query });
    return result.data;
  }

  /** Convenience: POST request */
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const result = await this.request<T>({ method: 'POST', path, body });
    return result.data;
  }

  /** Convenience: PUT request */
  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const result = await this.request<T>({ method: 'PUT', path, body });
    return result.data;
  }

  /** Convenience: PATCH request */
  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const result = await this.request<T>({ method: 'PATCH', path, body });
    return result.data;
  }

  /** Convenience: DELETE request */
  async delete<T = unknown>(path: string): Promise<T> {
    const result = await this.request<T>({ method: 'DELETE', path });
    return result.data;
  }

  /** Check if the service is healthy. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.request({ path: '/health', timeout: 3_000 });
      return true;
    } catch {
      return false;
    }
  }
}

// ------------------------------------------------------------------ //
//  Pre-configured service instances                                   //
// ------------------------------------------------------------------ //

export const complianceService = new ServiceClient({
  baseUrl: process.env.COMPLIANCE_SERVICE_URL ?? 'http://localhost:8000',
  serviceName: 'compliance',
  timeout: 10_000,
});

export const billingService = new ServiceClient({
  baseUrl: process.env.BILLING_SERVICE_URL ?? 'http://localhost:4001',
  serviceName: 'billing',
  timeout: 15_000,
});

export const aiAssistService = new ServiceClient({
  baseUrl: process.env.AI_ASSIST_SERVICE_URL ?? 'http://localhost:8001',
  serviceName: 'ai-assist',
  timeout: 30_000,
});

export const aiCopilotService = new ServiceClient({
  baseUrl: process.env.AI_COPILOT_SERVICE_URL ?? 'http://localhost:8002',
  serviceName: 'ai-copilot',
  timeout: 30_000,
});

export const aiDocsService = new ServiceClient({
  baseUrl: process.env.AI_DOCS_SERVICE_URL ?? 'http://localhost:8003',
  serviceName: 'ai-docs',
  timeout: 30_000,
});

export const aiMediaService = new ServiceClient({
  baseUrl: process.env.AI_MEDIA_SERVICE_URL ?? 'http://localhost:8004',
  serviceName: 'ai-media',
  timeout: 60_000,
});

export const aiMarketingService = new ServiceClient({
  baseUrl: process.env.AI_MARKETING_SERVICE_URL ?? 'http://localhost:8005',
  serviceName: 'ai-marketing',
  timeout: 30_000,
});

export const mediaEncoderService = new ServiceClient({
  baseUrl: process.env.MEDIA_ENCODER_SERVICE_URL ?? 'http://localhost:8010',
  serviceName: 'media-encoder',
  timeout: 120_000,
});

export const preferenceEngineService = new ServiceClient({
  baseUrl: process.env.PREFERENCE_ENGINE_SERVICE_URL ?? 'http://localhost:8006',
  serviceName: 'preference-engine',
  timeout: 10_000,
});
