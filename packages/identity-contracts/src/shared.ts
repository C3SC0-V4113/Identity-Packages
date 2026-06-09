import { z } from 'zod';

export const projectSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectRoleSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});
export type ProjectRoleSummary = z.infer<typeof projectRoleSummarySchema>;

export const membershipStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']);
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const userStatusSchema = z.enum(['ACTIVE', 'BANNED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const projectMembershipUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
});
export type ProjectMembershipUser = z.infer<typeof projectMembershipUserSchema>;

/**
 * The JSON error envelope returned by identity-service on any failure:
 * `{ "error": { "code", "message", "issues?" } }`.
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Stable error codes the surfaces may return (non-exhaustive, for ergonomics). */
export const KNOWN_API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'USER_BANNED',
  'PROJECT_DISABLED',
  'PROJECT_NOT_FOUND',
  'PROJECT_ADMIN_REQUIRED',
  'SERVICE_PRINCIPAL_AUTH_REQUIRED',
  'SERVICE_PRINCIPAL_DISABLED',
  'SERVICE_PRINCIPAL_PROJECT_FORBIDDEN',
  'ADMIN_IDEMPOTENCY_KEY_REUSED',
] as const;
export type KnownApiErrorCode = (typeof KNOWN_API_ERROR_CODES)[number];
