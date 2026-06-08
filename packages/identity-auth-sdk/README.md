# @cesco_valle/identity-auth-sdk

Typed HTTP clients for the portfolio identity service, built on
`@cesco_valle/identity-contracts`. Two **separate, server-safe entrypoints**:

- `@cesco_valle/identity-auth-sdk/user` — cookie/session surface for end-user apps
  (browser + Next.js server/edge).
- `@cesco_valle/identity-auth-sdk/admin` — service-principal (bearer) surface for
  `mcp-server` and operators. **Server-only**; never import it in a browser/edge
  bundle.

> Scaffold in progress — the clients land in a later checkpoint.

## Install

```bash
npm install @cesco_valle/identity-auth-sdk
```

## Usage (planned)

```ts
import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';
import { createAdminClient } from '@cesco_valle/identity-auth-sdk/admin';
```

ESM-only. The user client uses only global `fetch` / web APIs (edge-safe).
