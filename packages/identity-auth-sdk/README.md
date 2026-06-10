# @cesco_valle/identity-auth-sdk

Typed HTTP clients for the portfolio identity service, built on
`@cesco_valle/identity-contracts`. Two **separate, server-safe entrypoints**:

- `@cesco_valle/identity-auth-sdk/user` — cookie/session surface for end-user apps
  (browser + Next.js server/edge).
- `@cesco_valle/identity-auth-sdk/admin` — service-principal (bearer) surface for
  `mcp-server` and operators. **Server-only**; never import it in a browser/edge
  bundle.

ESM-only. The user client uses only global `fetch` / web APIs (edge-safe). The
authoritative behaviour of each endpoint lives in the identity-service guides
([user](https://github.com/C3SC0-V4113/Identity-Packages) ·
[admin](https://github.com/C3SC0-V4113/Identity-Packages)); this client is a thin
transport/typing layer over them.

## Install

```bash
npm install @cesco_valle/identity-auth-sdk
```

`@cesco_valle/identity-contracts` comes along as a dependency; install `zod` too if
you want to reuse its schemas directly.

---

## User client (`/user`)

Cookie/session surface. In the browser the cookie is handled automatically
(`credentials: 'include'`); on the server you pass the incoming cookie per call
and relay the returned `Set-Cookie`.

```ts
import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

const auth = createUserAuthClient({ baseUrl: process.env.IDENTITY_URL! });
```

| Method | Returns | Notes |
| --- | --- | --- |
| `checkEmail(slug, email, ctx?)` | `RegisterEmailCheckResponse` | step 1 of registration |
| `register(slug, body, ctx?)` | `AuthResult<ProjectAuthResponse>` | sets the session cookie |
| `login(slug, body, ctx?)` | `AuthResult<ProjectAuthResponse>` | sets the session cookie |
| `logout(slug, ctx?)` | `AuthResult<void>` | clears the cookie |
| `hasValidSession(slug, ctx?)` | `boolean` | `204 → true`, `401 → false` (never throws) |
| `getMe(slug, ctx?)` | `ProjectAuthResponse` | full profile + membership |
| `getAccess(slug, ctx?)` | `ProjectAccessResponse` | focused access/roles view |

`login` / `register` / `logout` return `{ data, setCookie }`. On the server, apply
`setCookie` to the response (Route Handler) or via `toCookieEntries(setCookie)` to
the Next.js cookie store (Server Action). Every method except `hasValidSession`
throws a typed `ApiError` (`status`, `code`, `body`) on non-2xx.

### Browser (Client Component)

```ts
'use client';
import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

const auth = createUserAuthClient({ baseUrl: process.env.NEXT_PUBLIC_IDENTITY_URL! });

// The browser stores/sends the httpOnly cookie; `setCookie` is empty here.
await auth.login('other-gpt', { email, password });
if (!(await auth.hasValidSession('other-gpt'))) {
  // redirect to login
}
```

> Direct browser → identity-service calls require CORS enabled on identity-service
> for your origin (`credentials: true`) **and** `sameSite=none; secure` cookies for
> cross-site use. The **BFF pattern below is the recommended default** — it keeps
> the cookie same-origin and needs no CORS.

### Next.js App Router (BFF pattern)

The browser talks only to your own Next.js routes; those call identity-service
server-side and relay cookies both ways. App Router notes: `cookies()` is **async
in Next.js 15** (`await cookies()`); only Server Actions and Route Handlers may
*write* cookies (Server Components are read-only); keep `IDENTITY_URL` server-side
(no `NEXT_PUBLIC_*`).

#### Server Action (form submit)

```ts
// app/(auth)/actions.ts
'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUserAuthClient, toCookieEntries } from '@cesco_valle/identity-auth-sdk/user';

const auth = createUserAuthClient({ baseUrl: process.env.IDENTITY_URL! });

export async function loginAction(formData: FormData) {
  const result = await auth.login('other-gpt', {
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });

  const cookieStore = await cookies(); // async in Next.js 15
  for (const entry of toCookieEntries(result.setCookie)) {
    cookieStore.set(entry.name, entry.value, entry.options);
  }
  redirect('/');
}
```

Use it from a server form: `<form action={loginAction}>`. For inline error states,
wrap it with `useActionState` and return the `ApiError` message instead of
redirecting.

#### Route Handler (proxy)

```ts
// app/api/auth/login/route.ts — relays the raw Set-Cookie verbatim
import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

const auth = createUserAuthClient({ baseUrl: process.env.IDENTITY_URL! });

export async function POST(req: Request) {
  const result = await auth.login('other-gpt', await req.json());
  const res = Response.json(result.data);
  for (const cookie of result.setCookie) res.headers.append('set-cookie', cookie);
  return res;
}
```

#### Server Component (authenticated read)

```tsx
// app/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

const auth = createUserAuthClient({ baseUrl: process.env.IDENTITY_URL! });

export default async function Page() {
  const cookie = (await cookies()).toString();
  if (!(await auth.hasValidSession('other-gpt', { cookie }))) redirect('/login');
  const me = await auth.getMe('other-gpt', { cookie });
  return <p>Hello {me.user.email}</p>;
}
```

#### Middleware (coarse route gate, edge)

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

const auth = createUserAuthClient({ baseUrl: process.env.IDENTITY_URL! });

export async function middleware(req: NextRequest) {
  const ok = await auth.hasValidSession('other-gpt', {
    cookie: req.headers.get('cookie') ?? undefined,
  });
  return ok ? NextResponse.next() : NextResponse.redirect(new URL('/login', req.url));
}

// Scope the gate so it doesn't hit the network on every asset/route.
export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
};
```

Treat middleware as a **coarse gate** only: it runs on the edge and calls the
network per matched navigation. The authoritative check still happens in the
Server Component / Route Handler that reads `getMe` / `getAccess`.

---

## Admin client (`/admin`, server-only)

Carries a service-principal bearer token and wraps `/admin/*`. **Never import it
into a browser or Next.js edge bundle** — keep the token in server-only env (not
`NEXT_PUBLIC_*`). Mutations take the common envelope and return the response
envelope, so `denied` / `failed` are inspected as data, not thrown; only
transport-level failures (`401/403/404/409/400`) throw `ApiError`.

```ts
import { createAdminClient } from '@cesco_valle/identity-auth-sdk/admin';

const admin = createAdminClient({
  baseUrl: process.env.IDENTITY_URL!,
  token: process.env.SP_TOKEN!, // service-principal bearer token
});

const res = await admin.banUser({
  targetProjectId,            // the project id (cuid), not the slug
  reason: 'abuse',
  channel: 'telegram',
  operatorUserId: 'op-1',     // the real human operator; the SDK never invents it
  payload: { userId },
});
// res.status: 'completed' | 'pending_approval' | 'denied' | 'failed'
if (res.status === 'pending_approval') {
  await admin.decideApproval(res.approvalId!, { decision: 'approve', operatorUserId: 'op-1' });
}
```

- **Auto-filled meta.** `idempotencyKey` is generated when omitted (override via
  `newIdempotencyKey`); pass `correlationId` to thread `X-Correlation-Id` across a
  trace.
- **Risk.** High-risk operations (`banUser`, mass `revokeSession` by `userId`,
  `assignProjectRole` granting `admin`, `readmitMembership`) return
  `pending_approval`; the side effect applies only after a second deliberate
  `decideApproval`. It is a two-step confirmation guard, not a two-person rule.
- **Reads.** `listProjectUsers`, `getUserAccessStatus`, `listPendingApprovals`.
- **`targetProjectId` is the cuid, not the slug.** There is no public slug→id
  resolver; cache the id per project in your `mcp-server` config.

### Guidance for `mcp-server` implementers

- Map each tool 1:1 to an operation; do not expose a generic "run any admin action"
  tool.
- Inject identity server-side: set `operatorUserId` from the real operator and
  `channel` from the source; never trust the model to supply them.
- Surface the envelope `status` to the operator. On `pending_approval`, expose the
  `approvalId` and the `decide` tool; on `denied` / `failed`, show `message`.
- Treat `409 ADMIN_IDEMPOTENCY_KEY_REUSED` as a client bug (key reused across
  different requests).
