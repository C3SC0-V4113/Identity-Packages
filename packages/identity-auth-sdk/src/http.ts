/** Per-call context for server-side usage (Next.js). Omit it in the browser. */
export interface RequestContext {
  /** Forward the incoming session cookie (server-side has no browser cookie jar). */
  cookie?: string;
  /** Extra headers to forward (e.g. X-Forwarded-For, User-Agent). */
  headers?: Record<string, string>;
}

/** Thrown on transport-level failures (non-2xx that isn't an envelope outcome). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: unknown;

  constructor(status: number, code: string, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

/** A parsed Set-Cookie, framework-agnostic so it maps onto any cookie store. */
export interface SetCookieEntry {
  name: string;
  value: string;
  options: {
    maxAge?: number;
    expires?: Date;
    path?: string;
    domain?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
  };
}

export type FetchLike = typeof fetch;

export interface HttpClientConfig {
  baseUrl: string;
  fetchImpl: FetchLike;
}

export interface HttpRequestInit {
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  ctx?: RequestContext;
  credentials?: RequestCredentials;
}

export interface HttpResponse {
  status: number;
  setCookie: string[];
  json: unknown;
}

export async function httpRequest(
  config: HttpClientConfig,
  init: HttpRequestInit,
): Promise<HttpResponse> {
  const url = buildUrl(config.baseUrl, init.path, init.query);
  const headers = new Headers(init.headers);

  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  if (init.ctx?.cookie) {
    headers.set('cookie', init.ctx.cookie);
  }
  if (init.ctx?.headers) {
    for (const [key, value] of Object.entries(init.ctx.headers)) {
      headers.set(key, value);
    }
  }

  const response = await config.fetchImpl(url, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: init.credentials,
  });

  const setCookie = readSetCookie(response.headers);
  const json = await readJson(response);

  if (!response.ok) {
    throw toApiError(response.status, json);
  }

  return { status: response.status, setCookie, json };
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  if (!query) {
    return url;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function readSetCookie(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetter.getSetCookie === 'function') {
    return withGetter.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(status: number, json: unknown): ApiError {
  let code = 'HTTP_ERROR';
  let message = `Request failed with status ${status}`;

  if (json !== null && typeof json === 'object' && 'error' in json) {
    const error = (json as { error?: { code?: unknown; message?: unknown } }).error;
    if (error !== null && typeof error === 'object') {
      if (typeof error.code === 'string') {
        code = error.code;
      }
      if (typeof error.message === 'string') {
        message = error.message;
      }
    }
  }

  return new ApiError(status, code, message, json);
}

/**
 * Parse raw Set-Cookie header values (from `AuthResult.setCookie`) into entries
 * that map onto any cookie store (e.g. Next.js `cookies().set(name, value, opts)`),
 * without importing a framework or hardcoding the cookie's attributes.
 */
export function toCookieEntries(setCookie: string[]): SetCookieEntry[] {
  return setCookie.map(parseSetCookie);
}

function parseSetCookie(raw: string): SetCookieEntry {
  const segments = raw.split(';');
  const nameValue = segments[0] ?? '';
  const attributes = segments.slice(1);
  const eq = nameValue.indexOf('=');
  const name = (eq === -1 ? nameValue : nameValue.slice(0, eq)).trim();
  const value = eq === -1 ? '' : nameValue.slice(eq + 1).trim();
  const options: SetCookieEntry['options'] = {};

  for (const attribute of attributes) {
    const splitAt = attribute.indexOf('=');
    const key = (splitAt === -1 ? attribute : attribute.slice(0, splitAt)).trim().toLowerCase();
    const attrValue = splitAt === -1 ? '' : attribute.slice(splitAt + 1).trim();

    switch (key) {
      case 'max-age': {
        const parsed = Number.parseInt(attrValue, 10);
        if (!Number.isNaN(parsed)) {
          options.maxAge = parsed;
        }
        break;
      }
      case 'expires': {
        const parsed = new Date(attrValue);
        if (!Number.isNaN(parsed.getTime())) {
          options.expires = parsed;
        }
        break;
      }
      case 'path':
        options.path = attrValue;
        break;
      case 'domain':
        options.domain = attrValue;
        break;
      case 'httponly':
        options.httpOnly = true;
        break;
      case 'secure':
        options.secure = true;
        break;
      case 'samesite': {
        const normalized = attrValue.toLowerCase();
        if (normalized === 'lax' || normalized === 'strict' || normalized === 'none') {
          options.sameSite = normalized;
        }
        break;
      }
      default:
        break;
    }
  }

  return { name, value, options };
}
