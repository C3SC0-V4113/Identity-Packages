# ADR 0001: Adopt a pnpm Monorepo for the Shared Identity Packages

- Date: 2026-06-02
- Status: Accepted

## Context

`platform-ai-architecture` ADR 0002 decided the portfolio is multi-repo with
shared packages to avoid duplicating contracts and clients across projects. The
auth/identity slice needs two such libraries — the wire contracts and a typed HTTP
client — consumed by `identity-service` (server), `other-gpt` / `cost-console`
(Next.js), and `mcp-server` (Node). Their design is specified in
`Identity-Service/docs/shared-auth-packages.md`. This ADR records how the
implementing repository is structured.

## Decision Drivers

- One source of truth for request/response shapes (no client/server drift).
- Atomic changes across contracts + SDK with a single CI pipeline.
- Friction-free consumption for a solo maintainer with no organization.
- Keep a frontend bundle from ever importing the privileged admin client.

## Decision

- **pnpm workspace monorepo** hosting `@cesco_valle/identity-contracts` and
  `@cesco_valle/identity-auth-sdk` (room for future `@cesco_valle/*` libs).
- **ESM-only**, built with **tsup** (`.js` + `.d.ts`), TypeScript strict, tested
  with **Vitest**.
- **`@cesco_valle/identity-contracts`** holds Zod schemas + inferred types, mirroring
  `identity-service`'s schemas 1:1, and depends only on `zod`.
- **`@cesco_valle/identity-auth-sdk`** ships only the `./user` and `./admin` subpath
  exports (no root) so the admin client cannot leak into a browser bundle. The
  user client is edge-safe; the admin client is Node/server-only.
- **Public npm** under the personal `@cesco` scope (`publishConfig.access:
  "public"`); these packages contain no secrets. Versioned with **Changesets** and
  published by **CI** with npm provenance.

## Consequences

### Positive

- Consumers import typed contracts/clients instead of hand-writing them.
- Contracts and SDK version and release together.
- No registry auth needed to consume (public), minimal setup for a solo dev.

### Negative

- The contracts must be kept in sync with `identity-service` (mitigated by
  `identity-service` consuming the published package as the single source).
- A monorepo adds workspace/release tooling overhead vs a single package.

## Related Decisions

- `platform-ai-architecture` ADR 0002 — multi-repo with shared packages.
- `Identity-Service/docs/shared-auth-packages.md` — package surface design.
