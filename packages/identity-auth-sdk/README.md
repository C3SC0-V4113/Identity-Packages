# @cesco_valle/identity-auth-sdk

Typed HTTP clients for the portfolio identity service, built on
`@cesco_valle/identity-contracts`. Two **separate, server-safe entrypoints**:

- `@cesco_valle/identity-auth-sdk/user` — cookie/session surface for end-user apps
  (browser + Next.js server/edge).
- `@cesco_valle/identity-auth-sdk/admin` — service-principal (bearer) surface for
  `mcp-server` and operators. **Server-only**; never import it in a browser/edge
  bundle.

ESM-only. The user client uses only global `fetch` / web APIs (edge-safe).

## Install

```bash
npm install @cesco_valle/identity-auth-sdk
```

## User client

```ts
import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

const auth = createUserAuthClient({ baseUrl: process.env.IDENTITY_URL! });

// Browser: the cookie is handled automatically (credentials are included).
const { data } = await auth.login('other-gpt', { email, password });

// Server (Next.js): forward the incoming cookie, relay the returned Set-Cookie.
const valid = await auth.hasValidSession('other-gpt', { cookie });
const me = await auth.getMe('other-gpt', { cookie });
```

`login` / `register` / `logout` return `{ data, setCookie }`. On the server, apply
`setCookie` to the response (Route Handler) or via `toCookieEntries(setCookie)` to
the Next.js cookie store (Server Action). `hasValidSession` returns a boolean;
other methods throw a typed `ApiError` on non-2xx.

## Admin client (server-only)

```ts
import { createAdminClient } from '@cesco_valle/identity-auth-sdk/admin';

const admin = createAdminClient({ baseUrl: process.env.IDENTITY_URL!, token: process.env.SP_TOKEN! });

const res = await admin.banUser({
  targetProjectId,
  reason: 'abuse',
  channel: 'mcp',
  operatorUserId: 'op-1',
  payload: { userId },
});
// res.status is 'completed' | 'pending_approval' | 'denied' | 'failed' (not thrown).
if (res.status === 'pending_approval') {
  await admin.decideApproval(res.approvalId!, { decision: 'approve', operatorUserId: 'op-1' });
}
```

`idempotencyKey` is auto-generated when omitted; pass `correlationId` to thread a
trace. Mutations return the response envelope (inspect `status`); only
transport-level failures (`401/403/404/409/400`) throw `ApiError`.
