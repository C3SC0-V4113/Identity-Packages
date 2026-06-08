# Publishing

The packages are published to **public npm** under the `@cesco` scope. Scoped
packages are private by default, so they are published with `--access public`
(already set via each package's `publishConfig.access`).

## One-time setup

- An npm account that owns the `@cesco` scope, with **2FA enabled**.
- For CI publishing: add a repository secret `NODE_AUTH_TOKEN` (an npm
  **automation** token) to GitHub.

## Manual publish (from a clean checkout)

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm build && pnpm test
npm login                       # interactive, with 2FA
pnpm -r publish --access public # publishes in dependency order; converts workspace:* to the real version
```

Verify:

```bash
npm view @cesco_valle/identity-contracts version
npm view @cesco_valle/identity-auth-sdk version
```

## Recommended: release via Changesets + CI

1. For each change, run `pnpm changeset` and commit the generated file.
2. `release.yml` opens a "Version Packages" PR; merging it publishes the updated
   packages to npm with **provenance** (no laptop publishing needed).

## Notes

- `@cesco_valle/identity-auth-sdk` depends on `@cesco_valle/identity-contracts`. Bump and
  publish contracts first (pnpm handles ordering automatically with `-r`).
- A breaking change to a contract shape is a **major** version bump and should be
  reflected in the SDK.
