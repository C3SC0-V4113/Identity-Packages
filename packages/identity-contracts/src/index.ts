// Shared primitives are flat at the root; each surface is also a namespace and a
// subpath export (`@cesco_valle/identity-contracts/user`, `/project-admin`,
// `/admin`) to avoid name collisions (e.g. `projectSummarySchema` appears in both
// the user and project-admin surfaces).
export * from './shared.js';

export * as user from './user.js';
export * as projectAdmin from './project-admin.js';
export * as admin from './admin.js';
