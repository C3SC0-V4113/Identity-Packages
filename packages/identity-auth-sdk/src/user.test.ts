import { describe, expect, it, vi } from 'vitest';

import { ApiError, toCookieEntries } from './http.js';
import { createUserAuthClient } from './user.js';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('user auth client', () => {
  it('login returns data and relays Set-Cookie (server-side)', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const fakeFetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
        calls.push({ url: String(url), method: init?.method });
        return jsonResponse(
          200,
          { user: { id: 'u' }, project: { slug: 'other-gpt' }, membership: null },
          { 'set-cookie': 'identity_service_session=abc; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax' },
        );
      },
    );

    const auth = createUserAuthClient({
      baseUrl: 'https://api.test',
      fetch: fakeFetch as unknown as typeof fetch,
    });
    const result = await auth.login('other-gpt', { email: 'a@b.com', password: 'x' });

    expect(result.data.project.slug).toBe('other-gpt');
    expect(result.setCookie).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.test/projects/other-gpt/auth/login');
    expect(calls[0]?.method).toBe('POST');
  });

  it('hasValidSession is true on 204 and false on 401', async () => {
    const seq = [
      new Response(null, { status: 204 }),
      jsonResponse(401, { error: { code: 'AUTHENTICATION_REQUIRED', message: 'no' } }),
    ];
    let index = 0;
    const fakeFetch = vi.fn(async (): Promise<Response> => seq[index++]!);

    const auth = createUserAuthClient({
      baseUrl: 'https://api.test',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    expect(await auth.hasValidSession('other-gpt')).toBe(true);
    expect(await auth.hasValidSession('other-gpt')).toBe(false);
  });

  it('throws a typed ApiError on non-2xx', async () => {
    const fakeFetch = vi.fn(
      async (): Promise<Response> =>
        jsonResponse(403, { error: { code: 'USER_BANNED', message: 'banned' } }),
    );
    const auth = createUserAuthClient({
      baseUrl: 'https://api.test',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    await expect(auth.getMe('other-gpt')).rejects.toBeInstanceOf(ApiError);
    await expect(auth.getMe('other-gpt')).rejects.toMatchObject({ status: 403, code: 'USER_BANNED' });
  });

  it('forwards the cookie header from ctx', async () => {
    let sentCookie: string | null = null;
    const fakeFetch = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
        sentCookie = new Headers(init?.headers).get('cookie');
        return new Response(null, { status: 204 });
      },
    );
    const auth = createUserAuthClient({
      baseUrl: 'https://api.test',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    await auth.hasValidSession('other-gpt', { cookie: 'identity_service_session=abc' });
    expect(sentCookie).toBe('identity_service_session=abc');
  });

  it('toCookieEntries parses Set-Cookie attributes', () => {
    const [entry] = toCookieEntries([
      'identity_service_session=abc; Path=/; HttpOnly; Secure; Max-Age=86400; SameSite=Lax',
    ]);
    expect(entry?.name).toBe('identity_service_session');
    expect(entry?.value).toBe('abc');
    expect(entry?.options).toMatchObject({
      path: '/',
      httpOnly: true,
      secure: true,
      maxAge: 86400,
      sameSite: 'lax',
    });
  });
});
