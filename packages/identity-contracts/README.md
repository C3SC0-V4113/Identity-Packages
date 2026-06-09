# @cesco_valle/identity-contracts

Shared **Zod schemas + inferred TypeScript types** for the portfolio identity
service wire contracts. The single source of truth, mirrored 1:1 from
`identity-service` and consumed by it (server-side validation) and by
`@cesco_valle/identity-auth-sdk`.

Only depends on `zod`. ESM-only.

## Install

```bash
npm install @cesco_valle/identity-contracts zod
```

## Entry points

Import from the surface you need:

- `@cesco_valle/identity-contracts/user` — end-user cookie/session surface
  (`projectAuthLoginRequestSchema`, `projectAuthResponseSchema`,
  `registerEmailCheckResponseSchema`, …).
- `@cesco_valle/identity-contracts/project-admin` — project-admin (cookie) surface
  (memberships, audit logs, sessions, admin-operations list).
- `@cesco_valle/identity-contracts/admin` — machine-admin surface (the mutation
  envelope, per-operation payloads, `decideApproval`, read queries).
- `@cesco_valle/identity-contracts/shared` — common primitives
  (`projectSummarySchema`, `membershipStatusSchema`, `apiErrorSchema`, …).
- The package root re-exports `shared` flat plus the `user` / `projectAdmin` /
  `admin` **namespaces** (e.g. `import { user } from '@cesco_valle/identity-contracts'`).

## Usage

```ts
import {
  projectAuthLoginRequestSchema,
  type ProjectAuthResponse,
} from '@cesco_valle/identity-contracts/user';

const body = projectAuthLoginRequestSchema.parse({ email, password });
// `ProjectAuthResponse` types the /login response.
```
