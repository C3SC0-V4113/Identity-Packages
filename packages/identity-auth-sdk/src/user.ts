import type { ProjectAccessResponse } from '@cesco_valle/identity-contracts/project-admin';
import type {
  ProjectAuthLoginRequest,
  ProjectAuthRegisterRequest,
  ProjectAuthResponse,
  RegisterEmailCheckResponse,
} from '@cesco_valle/identity-contracts/user';

import { ApiError, httpRequest, toCookieEntries } from './http.js';
import type { HttpClientConfig, RequestContext, SetCookieEntry } from './http.js';

export { ApiError, toCookieEntries };
export type { RequestContext, SetCookieEntry };

export interface AuthClientOptions {
  baseUrl: string;
  /** Override the fetch implementation (defaults to global `fetch`). */
  fetch?: typeof fetch;
}

/** Wraps responses that set/clear the session cookie so a BFF can relay it. */
export interface AuthResult<T> {
  data: T;
  /**
   * Raw Set-Cookie header values from identity-service. Readable only
   * server-side; in the browser the cookie is applied automatically by the
   * browser and is not exposed to JS, so this will be empty there.
   */
  setCookie: string[];
}

export interface UserAuthClient {
  checkEmail(slug: string, email: string, ctx?: RequestContext): Promise<RegisterEmailCheckResponse>;
  register(
    slug: string,
    body: ProjectAuthRegisterRequest,
    ctx?: RequestContext,
  ): Promise<AuthResult<ProjectAuthResponse>>;
  login(
    slug: string,
    body: ProjectAuthLoginRequest,
    ctx?: RequestContext,
  ): Promise<AuthResult<ProjectAuthResponse>>;
  logout(slug: string, ctx?: RequestContext): Promise<AuthResult<void>>;
  /** true on 204, false on 401. Pass ctx.cookie when calling from server/middleware. */
  hasValidSession(slug: string, ctx?: RequestContext): Promise<boolean>;
  getMe(slug: string, ctx?: RequestContext): Promise<ProjectAuthResponse>;
  getAccess(slug: string, ctx?: RequestContext): Promise<ProjectAccessResponse>;
}

export function createUserAuthClient(options: AuthClientOptions): UserAuthClient {
  const config: HttpClientConfig = {
    baseUrl: options.baseUrl,
    fetchImpl: options.fetch ?? fetch,
  };

  const authBase = (slug: string): string => `/projects/${encodeURIComponent(slug)}/auth`;

  return {
    async checkEmail(slug, email, ctx) {
      const res = await httpRequest(config, {
        method: 'POST',
        path: `${authBase(slug)}/register/email-check`,
        body: { email },
        ctx,
        credentials: 'include',
      });
      return res.json as RegisterEmailCheckResponse;
    },

    async register(slug, body, ctx) {
      const res = await httpRequest(config, {
        method: 'POST',
        path: `${authBase(slug)}/register`,
        body,
        ctx,
        credentials: 'include',
      });
      return { data: res.json as ProjectAuthResponse, setCookie: res.setCookie };
    },

    async login(slug, body, ctx) {
      const res = await httpRequest(config, {
        method: 'POST',
        path: `${authBase(slug)}/login`,
        body,
        ctx,
        credentials: 'include',
      });
      return { data: res.json as ProjectAuthResponse, setCookie: res.setCookie };
    },

    async logout(slug, ctx) {
      const res = await httpRequest(config, {
        method: 'POST',
        path: `${authBase(slug)}/logout`,
        ctx,
        credentials: 'include',
      });
      return { data: undefined, setCookie: res.setCookie };
    },

    async hasValidSession(slug, ctx) {
      try {
        await httpRequest(config, {
          method: 'GET',
          path: `${authBase(slug)}/session`,
          ctx,
          credentials: 'include',
        });
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return false;
        }
        throw error;
      }
    },

    async getMe(slug, ctx) {
      const res = await httpRequest(config, {
        method: 'GET',
        path: `${authBase(slug)}/me`,
        ctx,
        credentials: 'include',
      });
      return res.json as ProjectAuthResponse;
    },

    async getAccess(slug, ctx) {
      const res = await httpRequest(config, {
        method: 'GET',
        path: `/projects/${encodeURIComponent(slug)}/me`,
        ctx,
        credentials: 'include',
      });
      return res.json as ProjectAccessResponse;
    },
  };
}
