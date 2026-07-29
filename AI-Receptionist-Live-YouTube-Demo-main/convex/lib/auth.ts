import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export type ActiveClerkOrganization = {
  clerkOrgId: string;
  clerkOrgSlug?: string;
  permissions: readonly string[];
  role?: string;
  userId: string;
};

export const MANAGE_OPERATIONS_PERMISSION = "org:operations_hub:manage";

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizedRole(role: string | undefined): string | undefined {
  if (!role) return undefined;
  return role.startsWith("org:") ? role.slice(4) : role;
}

function normalizedPermission(permission: string): string | undefined {
  const value = permission.trim();
  if (!value) return undefined;
  const withPrefix = value.startsWith("org:") ? value : `org:${value}`;
  return /^org:[a-z0-9_]+:[a-z0-9_]+$/.test(withPrefix)
    ? withPrefix
    : undefined;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    } catch {
      return [];
    }
  }
  return trimmed.split(",");
}

/**
 * Decode Clerk JWT v2's compact organization-permission representation.
 *
 * `fea` lists scoped feature keys, `o.per` lists permission actions, and each
 * decimal integer in `o.fpm` is a bitset mapping those actions to the feature
 * at the same index in `fea`. Keeping that original index is important when a
 * token mixes user (`u:`) and organization (`o:`) features. BigInt keeps the
 * decoder correct if Clerk expands the action count beyond JavaScript's safe
 * integer bit width.
 */
function compactOrganizationPermissions(
  claims: Record<string, unknown>,
  compact: Record<string, unknown> | undefined,
): string[] {
  const featuresClaim = optionalString(claims.fea);
  const permissionsClaim = optionalString(compact?.per);
  const featurePermissionMapClaim = optionalString(compact?.fpm);
  if (!featuresClaim || !permissionsClaim || !featurePermissionMapClaim) {
    return [];
  }

  const featureEntries = featuresClaim.split(",");
  if (featureEntries.length > 128) return [];
  const actions = permissionsClaim
    .split(",")
    .map((action) => action.trim());
  if (
    actions.length === 0 ||
    actions.length > 64 ||
    actions.some((action) => !/^[a-z0-9_]+$/.test(action))
  ) {
    return [];
  }
  const rawFeaturePermissionMaps = featurePermissionMapClaim
    .split(",")
    .map((entry) => entry.trim())
    .slice(0, 64);

  const decoded = new Set<string>();
  for (
    let featureIndex = 0;
    featureIndex < featureEntries.length;
    featureIndex += 1
  ) {
    const featureEntry = featureEntries[featureIndex].trim();
    const colonIndex = featureEntry.indexOf(":");
    if (colonIndex < 1) return [];
    const scope = featureEntry.slice(0, colonIndex);
    const feature = featureEntry.slice(colonIndex + 1);
    if (!/^[a-z0-9_]+$/.test(feature)) return [];
    if (scope !== "o") continue;

    const rawBitset = rawFeaturePermissionMaps[featureIndex];
    if (!rawBitset || !/^\d+$/.test(rawBitset)) continue;

    let bitset: bigint;
    try {
      bitset = BigInt(rawBitset);
    } catch {
      continue;
    }
    for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
      if (
        (bitset & (BigInt(1) << BigInt(actionIndex))) !== BigInt(0)
      ) {
        decoded.add(`org:${feature}:${actions[actionIndex]}`);
      }
    }
  }
  return [...decoded];
}

export function decodeOrganizationPermissions(
  claims: Record<string, unknown>,
  compact: Record<string, unknown> | undefined,
): readonly string[] {
  const decoded = new Set(
    compactOrganizationPermissions(claims, compact),
  );
  for (const rawPermission of stringArray(claims.org_permissions)) {
    const permission = normalizedPermission(rawPermission);
    if (permission) decoded.add(permission);
  }
  return [...decoded];
}

/**
 * Read the active Clerk organization from the authenticated JWT.
 *
 * Clerk Core 3 emits the compact `o` claim (`o.id`, `o.slg`, `o.rol`). Older
 * Clerk JWT templates emitted `org_id`, `org_slug`, and `org_role`. Supporting
 * both lets existing sessions roll over without ever trusting a client-supplied
 * organization id.
 */
export async function requireActiveClerkOrganization(
  ctx: Ctx,
): Promise<ActiveClerkOrganization> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required.");
  }

  const claims = identity as unknown as Record<string, unknown>;
  let compact: Record<string, unknown> | undefined;
  if (claims.o && typeof claims.o === "object") {
    compact = claims.o as Record<string, unknown>;
  } else if (typeof claims.o === "string") {
    try {
      const parsed = JSON.parse(claims.o) as unknown;
      if (parsed && typeof parsed === "object") {
        compact = parsed as Record<string, unknown>;
      }
    } catch {
      // A malformed compact claim falls through to the legacy claim names.
    }
  }

  const clerkOrgId =
    optionalString(compact?.id) ??
    optionalString(claims.org_id) ??
    optionalString(claims.orgId) ??
    optionalString(claims.organization_id);

  if (!clerkOrgId) {
    throw new Error(
      "Select an organization before using the workspace. The active Clerk session has no organization claim.",
    );
  }

  return {
    clerkOrgId,
    clerkOrgSlug:
      optionalString(compact?.slg) ?? optionalString(claims.org_slug),
    permissions: decodeOrganizationPermissions(claims, compact),
    role: normalizedRole(
      optionalString(compact?.rol) ?? optionalString(claims.org_role),
    ),
    userId: identity.subject,
  };
}

export async function requireCurrentOrganization(
  ctx: Ctx,
): Promise<{
  auth: ActiveClerkOrganization;
  organization: Doc<"organizations">;
}> {
  const auth = await requireActiveClerkOrganization(ctx);
  const organization = await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", auth.clerkOrgId))
    .unique();

  if (!organization) {
    throw new Error(
      "This organization has not been initialized yet. Run organizations.bootstrapCurrent first.",
    );
  }

  return { auth, organization };
}

export async function requireCurrentOrganizationAdmin(
  ctx: Ctx,
): Promise<{
  auth: ActiveClerkOrganization;
  organization: Doc<"organizations">;
}> {
  const current = await requireCurrentOrganization(ctx);
  if (current.auth.role !== "admin" && current.auth.role !== "owner") {
    throw new Error("An organization admin role is required for this action.");
  }
  return current;
}

export async function requireCurrentOrganizationOperator(
  ctx: Ctx,
): Promise<{
  auth: ActiveClerkOrganization;
  organization: Doc<"organizations">;
}> {
  const current = await requireCurrentOrganization(ctx);
  const isAdmin =
    current.auth.role === "admin" || current.auth.role === "owner";
  if (
    !isAdmin &&
    !current.auth.permissions.includes(MANAGE_OPERATIONS_PERMISSION)
  ) {
    throw new Error(
      "The organization operator permission is required for this action.",
    );
  }
  return current;
}
