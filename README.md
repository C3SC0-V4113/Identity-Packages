# identity-packages

Shared npm packages for the portfolio identity service ecosystem. Published under
the personal scope **`@cesco`** on public npm.

| Package | What it is | Consumed by |
| --- | --- | --- |
| [`@cesco/identity-contracts`](./packages/identity-contracts) | Zod schemas + inferred TypeScript types for every wire shape (user, project-admin, machine-admin surfaces). | `identity-service` (server validation), and the SDK below. |
| [`@cesco/identity-auth-sdk`](./packages/identity-auth-sdk) | Typed HTTP clients: `./user` (cookie/session, browser + Next.js) and `./admin` (service-principal, Node/`mcp-server`). | `other-gpt`, `cost-console`, `mcp-server`. |

These codify the contracts of [`Identity-Service`](../Identity-Service) so consumer
projects don't hand-write DTOs or HTTP clients. See
`Identity-Service/docs/shared-auth-packages.md` for the design rationale and
`platform-ai-architecture` ADR 0002 for the multi-repo + shared-packages strategy.

## Workspace

- Monorepo with **pnpm workspaces** + **tsup** (ESM, `.d.ts`), TypeScript strict,
  **Vitest**.
- Requirements: Node >= 18, pnpm.

```bash
pnpm install
pnpm build        # pnpm -r build
pnpm typecheck
pnpm lint
pnpm test
```

Publishing is documented in [PUBLISHING.md](./PUBLISHING.md). Architecture
decisions live in [docs/adrs](./docs/adrs).
