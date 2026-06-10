# @cesco_valle/identity-auth-sdk

## 0.2.0

### Minor Changes

- 2df194c: Implement the real packages (replacing the scaffold placeholders):
  - `identity-contracts`: Zod schemas + inferred types for the user, project-admin,
    and machine-admin surfaces, mirrored 1:1 from identity-service, exposed via the
    `./shared`, `./user`, `./project-admin`, and `./admin` subpaths.
  - `identity-auth-sdk`: the `./user` client (cookie/session, edge-safe, with
    `toCookieEntries`) and the server-only `./admin` client (service-principal
    bearer, envelope + idempotency + correlation id), plus the `ApiError` type.

### Patch Changes

- Updated dependencies [2df194c]
  - @cesco_valle/identity-contracts@0.2.0
