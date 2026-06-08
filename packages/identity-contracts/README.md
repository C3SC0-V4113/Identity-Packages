# @cesco_valle/identity-contracts

Shared **Zod schemas + inferred TypeScript types** for the portfolio identity
service wire contracts (user / project-admin / machine-admin surfaces). The single
source of truth consumed by `identity-service` (server-side validation) and
`@cesco_valle/identity-auth-sdk`.

> Scaffold in progress — the schemas land in the next checkpoint.

## Install

```bash
npm install @cesco_valle/identity-contracts
```

## Usage (planned)

```ts
import { loginRequestSchema, type ProjectAuthResponse } from '@cesco_valle/identity-contracts';
```

Only depends on `zod`. ESM-only.
