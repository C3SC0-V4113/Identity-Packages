# @cesco/identity-auth-sdk

Typed HTTP clients for the portfolio identity service, built on
`@cesco/identity-contracts`. Two **separate, server-safe entrypoints**:

- `@cesco/identity-auth-sdk/user` — cookie/session surface for end-user apps
  (browser + Next.js server/edge).
- `@cesco/identity-auth-sdk/admin` — service-principal (bearer) surface for
  `mcp-server` and operators. **Server-only**; never import it in a browser/edge
  bundle.

> Scaffold in progress — the clients land in a later checkpoint.

## Install

```bash
npm install @cesco/identity-auth-sdk
```

## Usage (planned)

```ts
import { createUserAuthClient } from '@cesco/identity-auth-sdk/user';
import { createAdminClient } from '@cesco/identity-auth-sdk/admin';
```

ESM-only. The user client uses only global `fetch` / web APIs (edge-safe).
