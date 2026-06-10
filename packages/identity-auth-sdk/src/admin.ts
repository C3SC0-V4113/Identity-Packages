import type {
  AdminGetUserAccessQuery,
  AdminListPendingApprovalsQuery,
  AdminListProjectUsersQuery,
  AdminMutationResponse,
} from '@cesco_valle/identity-contracts/admin';

import { httpRequest } from './http.js';
import type { HttpClientConfig } from './http.js';

export { ApiError } from './http.js';
export type { AdminMutationResponse };

// Operation payloads (mirror the identity-contracts admin payloads).
export interface CreateUserPayload {
  email: string;
  displayName?: string;
  password?: string;
  roleCodes?: string[];
}
export interface UserTargetPayload {
  userId: string;
}
export interface AssignProjectRolePayload {
  userId: string;
  roleCodes: string[];
}
export interface ReadmitMembershipPayload {
  userId: string;
  roleCodes?: string[];
}
export type RevokeSessionPayload = { sessionId: string } | { userId: string };
export interface DecideApprovalBody {
  decision: 'approve' | 'reject';
  operatorUserId: string;
  decisionReason?: string;
}

/**
 * The common mutation envelope. `idempotencyKey` is optional here — the client
 * fills it from `newIdempotencyKey` when omitted.
 */
export interface MutationEnvelope<TPayload> {
  targetProjectId: string;
  reason: string;
  channel: string;
  idempotencyKey?: string;
  ticketRef?: string;
  operatorUserId?: string;
  correlationId?: string;
  payload: TPayload;
}

export interface AdminClientOptions {
  baseUrl: string;
  /** Service-principal bearer token. Server-only — never ship it to a browser. */
  token: string;
  fetch?: typeof fetch;
  /** Defaults to `crypto.randomUUID()` when available. */
  newIdempotencyKey?: () => string;
  /** Per-client default correlation id (overridable per call via the envelope). */
  correlationId?: () => string | undefined;
}

export interface AdminClient {
  listProjectUsers(query: AdminListProjectUsersQuery): Promise<unknown>;
  getUserAccessStatus(userId: string, query: AdminGetUserAccessQuery): Promise<unknown>;
  listPendingApprovals(query?: AdminListPendingApprovalsQuery): Promise<unknown>;
  createUser(env: MutationEnvelope<CreateUserPayload>): Promise<AdminMutationResponse>;
  banUser(env: MutationEnvelope<UserTargetPayload>): Promise<AdminMutationResponse>;
  unbanUser(env: MutationEnvelope<UserTargetPayload>): Promise<AdminMutationResponse>;
  assignProjectRole(env: MutationEnvelope<AssignProjectRolePayload>): Promise<AdminMutationResponse>;
  revokeProjectAccess(env: MutationEnvelope<UserTargetPayload>): Promise<AdminMutationResponse>;
  readmitMembership(env: MutationEnvelope<ReadmitMembershipPayload>): Promise<AdminMutationResponse>;
  revokeSession(env: MutationEnvelope<RevokeSessionPayload>): Promise<AdminMutationResponse>;
  decideApproval(approvalId: string, body: DecideApprovalBody): Promise<AdminMutationResponse>;
}

export function createAdminClient(options: AdminClientOptions): AdminClient {
  const config: HttpClientConfig = {
    baseUrl: options.baseUrl,
    fetchImpl: options.fetch ?? fetch,
  };
  const newIdempotencyKey = options.newIdempotencyKey ?? defaultIdempotencyKey;
  const correlationId = options.correlationId ?? (() => undefined);
  const authHeader = (): Record<string, string> => ({ authorization: `Bearer ${options.token}` });

  async function read(
    path: string,
    query: Record<string, string | number | boolean | undefined>,
  ): Promise<unknown> {
    const res = await httpRequest(config, {
      method: 'GET',
      path,
      query,
      headers: authHeader(),
    });
    return res.json;
  }

  async function mutate<TPayload>(
    path: string,
    env: MutationEnvelope<TPayload>,
  ): Promise<AdminMutationResponse> {
    const headers = authHeader();
    const trace = env.correlationId ?? correlationId();
    if (trace) {
      headers['x-correlation-id'] = trace;
    }

    const res = await httpRequest(config, {
      method: 'POST',
      path,
      headers,
      body: {
        targetProjectId: env.targetProjectId,
        reason: env.reason,
        channel: env.channel,
        idempotencyKey: env.idempotencyKey ?? newIdempotencyKey(),
        ticketRef: env.ticketRef,
        operatorUserId: env.operatorUserId,
        payload: env.payload,
      },
    });
    return res.json as AdminMutationResponse;
  }

  return {
    listProjectUsers: (query) => read('/admin/users', query),
    getUserAccessStatus: (userId, query) =>
      read(`/admin/users/${encodeURIComponent(userId)}/access`, query),
    listPendingApprovals: (query) => read('/admin/approvals', query ?? {}),
    createUser: (env) => mutate('/admin/users', env),
    banUser: (env) => mutate('/admin/users/ban', env),
    unbanUser: (env) => mutate('/admin/users/unban', env),
    assignProjectRole: (env) => mutate('/admin/memberships/roles', env),
    revokeProjectAccess: (env) => mutate('/admin/memberships/revoke', env),
    readmitMembership: (env) => mutate('/admin/memberships/readmit', env),
    revokeSession: (env) => mutate('/admin/sessions/revoke', env),
    async decideApproval(approvalId, body) {
      const res = await httpRequest(config, {
        method: 'POST',
        path: `/admin/approvals/${encodeURIComponent(approvalId)}/decide`,
        headers: authHeader(),
        body,
      });
      return res.json as AdminMutationResponse;
    },
  };
}

function defaultIdempotencyKey(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
