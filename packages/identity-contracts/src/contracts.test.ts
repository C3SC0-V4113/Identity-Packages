import { describe, expect, it } from 'vitest';

import { adminMutationEnvelopeSchema, revokeSessionOperationSchema } from './admin.js';
import { listProjectMembershipsQuerySchema, membershipAuditActionSchema } from './project-admin.js';
import { apiErrorSchema, KNOWN_API_ERROR_CODES } from './shared.js';
import { projectAuthLoginRequestSchema, registerEmailCheckResponseSchema } from './user.js';

describe('user surface', () => {
  it('accepts a valid login and trims the email', () => {
    const parsed = projectAuthLoginRequestSchema.parse({
      email: '  Person@Example.com ',
      password: 'x',
    });
    expect(parsed.email).toBe('Person@Example.com');
  });

  it('rejects an invalid email and an empty password', () => {
    expect(projectAuthLoginRequestSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(
      false,
    );
    expect(
      projectAuthLoginRequestSchema.safeParse({ email: 'a@b.com', password: '' }).success,
    ).toBe(false);
  });

  it('constrains nextStep to REGISTER/LOGIN', () => {
    expect(
      registerEmailCheckResponseSchema.safeParse({
        email: 'a@b.com',
        exists: false,
        nextStep: 'OTHER',
      }).success,
    ).toBe(false);
  });
});

describe('project-admin surface', () => {
  it('coerces and defaults the list query', () => {
    const parsed = listProjectMembershipsQuerySchema.parse({ limit: '5' });
    expect(parsed.limit).toBe(5);
    expect(listProjectMembershipsQuerySchema.parse({}).limit).toBe(20);
  });

  it('includes READMITTED in the audit actions', () => {
    expect(membershipAuditActionSchema.options).toContain('READMITTED');
  });
});

describe('admin surface', () => {
  it('requires the common envelope fields', () => {
    expect(
      adminMutationEnvelopeSchema.safeParse({
        targetProjectId: 'p',
        reason: 'r',
        idempotencyKey: 'k',
        channel: 'c',
      }).success,
    ).toBe(true);
    expect(adminMutationEnvelopeSchema.safeParse({ targetProjectId: 'p' }).success).toBe(false);
  });

  it('enforces exactly one revoke-session target', () => {
    const base = {
      targetProjectId: 'p',
      reason: 'r',
      idempotencyKey: 'k',
      channel: 'c',
    };
    expect(revokeSessionOperationSchema.safeParse({ ...base, payload: { sessionId: 's' } }).success).toBe(
      true,
    );
    expect(revokeSessionOperationSchema.safeParse({ ...base, payload: {} }).success).toBe(false);
    expect(
      revokeSessionOperationSchema.safeParse({ ...base, payload: { sessionId: 's', userId: 'u' } })
        .success,
    ).toBe(false);
  });
});

describe('shared', () => {
  it('parses the api error envelope', () => {
    expect(
      apiErrorSchema.safeParse({ error: { code: 'PROJECT_NOT_FOUND', message: 'nope' } }).success,
    ).toBe(true);
    expect(KNOWN_API_ERROR_CODES).toContain('ADMIN_IDEMPOTENCY_KEY_REUSED');
  });
});
