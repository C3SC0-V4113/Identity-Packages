import { describe, expect, it, vi } from 'vitest';

import { createAdminClient } from './admin.js';
import { ApiError } from './http.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const completed = {
  status: 'completed',
  operationId: 'op',
  approvalId: null,
  auditEventId: 'a',
  message: 'ok',
  result: {},
};

describe('admin client', () => {
  it('createUser sends the envelope (bearer + generated idempotencyKey) and returns the response', async () => {
    let captured: { url: string; init?: RequestInit } | undefined;
    const fakeFetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
        captured = { url: String(url), init };
        return jsonResponse(200, completed);
      },
    );

    const client = createAdminClient({
      baseUrl: 'https://api.test',
      token: 'tok',
      fetch: fakeFetch as unknown as typeof fetch,
    });
    const res = await client.createUser({
      targetProjectId: 'p',
      reason: 'r',
      channel: 'c',
      payload: { email: 'a@b.com' },
    });

    expect(res.status).toBe('completed');
    expect(captured?.url).toBe('https://api.test/admin/users');
    expect(new Headers(captured?.init?.headers).get('authorization')).toBe('Bearer tok');
    const body = JSON.parse(String(captured?.init?.body)) as { idempotencyKey: string; payload: { email: string } };
    expect(body.idempotencyKey).toEqual(expect.any(String));
    expect(body.payload.email).toBe('a@b.com');
  });

  it('returns denied/failed envelopes as data (no throw)', async () => {
    const fakeFetch = vi.fn(
      async (): Promise<Response> =>
        jsonResponse(200, { ...completed, status: 'denied', message: 'no', result: null }),
    );
    const client = createAdminClient({
      baseUrl: 'https://api.test',
      token: 'tok',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    const res = await client.banUser({
      targetProjectId: 'p',
      reason: 'r',
      channel: 'c',
      operatorUserId: 'op-1',
      payload: { userId: 'u' },
    });
    expect(res.status).toBe('denied');
  });

  it('throws ApiError on a transport error (409)', async () => {
    const fakeFetch = vi.fn(
      async (): Promise<Response> =>
        jsonResponse(409, { error: { code: 'ADMIN_IDEMPOTENCY_KEY_REUSED', message: 'reuse' } }),
    );
    const client = createAdminClient({
      baseUrl: 'https://api.test',
      token: 'tok',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    await expect(
      client.unbanUser({
        targetProjectId: 'p',
        reason: 'r',
        channel: 'c',
        idempotencyKey: 'k',
        payload: { userId: 'u' },
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('uses the provided idempotencyKey and correlation id', async () => {
    let captured: RequestInit | undefined;
    const fakeFetch = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
        captured = init;
        return jsonResponse(200, { ...completed, status: 'pending_approval', approvalId: 'ap' });
      },
    );
    const client = createAdminClient({
      baseUrl: 'https://api.test',
      token: 'tok',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    await client.banUser({
      targetProjectId: 'p',
      reason: 'r',
      channel: 'c',
      idempotencyKey: 'fixed',
      correlationId: 'corr-1',
      operatorUserId: 'op-1',
      payload: { userId: 'u' },
    });

    expect(new Headers(captured?.headers).get('x-correlation-id')).toBe('corr-1');
    const body = JSON.parse(String(captured?.body)) as { idempotencyKey: string };
    expect(body.idempotencyKey).toBe('fixed');
  });

  it('builds read query strings', async () => {
    let url = '';
    const fakeFetch = vi.fn(async (requested: string | URL | Request): Promise<Response> => {
      url = String(requested);
      return jsonResponse(200, { items: [] });
    });
    const client = createAdminClient({
      baseUrl: 'https://api.test',
      token: 'tok',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    await client.listProjectUsers({ targetProjectId: 'p', limit: 10, status: 'ACTIVE' });
    expect(url).toContain('/admin/users?');
    expect(url).toContain('targetProjectId=p');
    expect(url).toContain('limit=10');
    expect(url).toContain('status=ACTIVE');
  });
});
