# AGENTS.md

## Project nature

`identity-packages` is a **pnpm monorepo** of shared npm libraries for the
portfolio identity ecosystem, published under the `@cesco` scope on public npm:

- `@cesco/identity-contracts` — Zod schemas + inferred types (the wire contracts).
- `@cesco/identity-auth-sdk` — typed HTTP clients (`./user`, `./admin`).

It is library code consumed by `identity-service` (server), `other-gpt` /
`cost-console` (Next.js), and `mcp-server` (Node). The authority for auth/identity
behavior lives in `identity-service`; these packages only carry contracts and thin
transport.

## Technical baseline

- Language: `TypeScript` strict, **ESM-only**.
- Build: `tsup` (emits `.js` + `.d.ts`).
- Tests: `Vitest`.
- Validation library: `Zod` (in `identity-contracts`).
- Lint/format: ESLint (flat) + Prettier.
- Runtime target: Node >= 18 (uses global `fetch`); the user client must also run
  in the browser and Next.js edge.

## Architecture rules

- **No business logic.** The SDK only does transport, typing, and ergonomics.
  Permission, risk, and approval decisions stay in `identity-service`.
- **`identity-contracts` is the single source of truth** for request/response
  shapes; mirror `identity-service`'s schemas 1:1 (same field names and enums).
- **Keep the package framework-agnostic** — only `zod`. No Fastify/Prisma/Next
  imports in either package.
- **Separate, server-safe entrypoints.** `@cesco/identity-auth-sdk` exposes only
  `./user` and `./admin` (no root) so a frontend bundle can never pull in the
  admin client. The user client is edge-safe (global `fetch` / web APIs only);
  the admin client may assume Node.
- **Envelope outcomes are data, not exceptions.** The admin client returns
  `denied`/`failed`; it throws only on transport-level failures.
- Keep each package's `package.json` `exports`, `files`, `sideEffects:false`, and
  `publishConfig.access:"public"` correct.

## Documentation and decisions

- Architecture decisions live in `docs/adrs`.
- Use the local `architecture-decision-records` skill when creating, updating,
  superseding, or reviewing ADRs.

## Verification

Before considering work complete, run from the repo root:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm test`

## Releasing

See `PUBLISHING.md`. Changes are versioned with Changesets and published to npm by
CI (`.github/workflows/release.yml`). Do not publish from a laptop unless doing a
deliberate manual release.
