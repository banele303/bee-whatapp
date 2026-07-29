#!/usr/bin/env node

import { createClerkClient } from "@clerk/backend";

const permissionDefinition = {
  name: "Manage operations hub",
  key: "org:operations_hub:manage",
  description:
    "Access customer contacts and manage operational bookings for the active organization.",
};

const legacyPermissionKey = "org:operations:manage";

const operatorRoleDefinition = {
  name: "Operator",
  key: "org:operator",
  description:
    "Operational staff who can manage customer contacts and bookings.",
};

const adminRoleKey = "org:admin";
const initialRoleSetKey = "role_set:default";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error(
    "CLERK_SECRET_KEY is required. Run this command with the target Clerk instance's server environment loaded.",
  );
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function ensurePermission() {
  const { data } = await clerk.organizationPermissions.getOrganizationPermissionList({
    limit: 100,
  });
  const existing = data.find(
    (permission) => permission.key === permissionDefinition.key,
  );
  if (existing) return existing;

  const legacy = data.find(
    (permission) => permission.key === legacyPermissionKey,
  );
  if (legacy) {
    return clerk.organizationPermissions.updateOrganizationPermission({
      permissionId: legacy.id,
      ...permissionDefinition,
    });
  }
  return clerk.organizationPermissions.createOrganizationPermission(
    permissionDefinition,
  );
}

async function ensureRole(definition) {
  const { data } = await clerk.organizationRoles.getOrganizationRoleList({
    limit: 100,
  });
  const existing = data.find((role) => role.key === definition.key);
  return (
    existing ??
    clerk.organizationRoles.createOrganizationRole(definition)
  );
}

async function requireRole(roleKey) {
  const { data } = await clerk.organizationRoles.getOrganizationRoleList({
    limit: 100,
    query: roleKey,
  });
  const role = data.find((candidate) => candidate.key === roleKey);
  if (!role) throw new Error(`Required Clerk role ${roleKey} was not found.`);
  return role;
}

async function ensureRolePermission(role, permission) {
  if (role.permissions.some((candidate) => candidate.id === permission.id)) {
    return role;
  }
  return clerk.organizationRoles.assignPermissionToOrganizationRole({
    organizationRoleId: role.id,
    permissionId: permission.id,
  });
}

async function ensureInitialRoleSetIncludesOperator() {
  const roleSet = await clerk.roleSets.getRoleSet(initialRoleSetKey);
  if (roleSet.roles.some((role) => role.key === operatorRoleDefinition.key)) {
    return roleSet;
  }
  return clerk.roleSets.addRolesToRoleSet({
    roleSetKeyOrId: initialRoleSetKey,
    roleKeys: [operatorRoleDefinition.key],
  });
}

async function removeLegacyPermission(permission) {
  const [{ data: permissions }, { data: roles }] = await Promise.all([
    clerk.organizationPermissions.getOrganizationPermissionList({ limit: 100 }),
    clerk.organizationRoles.getOrganizationRoleList({ limit: 100 }),
  ]);
  const legacyPermissions = permissions.filter(
    (candidate) =>
      candidate.key === legacyPermissionKey && candidate.id !== permission.id,
  );
  for (const legacy of legacyPermissions) {
    for (const role of roles) {
      if (!role.permissions.some((candidate) => candidate.id === legacy.id)) {
        continue;
      }
      if (!role.permissions.some((candidate) => candidate.id === permission.id)) {
        await clerk.organizationRoles.assignPermissionToOrganizationRole({
          organizationRoleId: role.id,
          permissionId: permission.id,
        });
      }
    }
    await clerk.organizationPermissions.deleteOrganizationPermission(legacy.id);
  }
}

const permission = await ensurePermission();
const operatorRole = await ensureRole(operatorRoleDefinition);
const adminRole = await requireRole(adminRoleKey);

const [verifiedAdminRole, verifiedOperatorRole, roleSet] = await Promise.all([
  ensureRolePermission(adminRole, permission),
  ensureRolePermission(operatorRole, permission),
  ensureInitialRoleSetIncludesOperator(),
]);
await removeLegacyPermission(permission);

const expectedRoleKeys = [adminRoleKey, "org:member", operatorRoleDefinition.key];
const actualRoleKeys = new Set(roleSet.roles.map((role) => role.key));
for (const roleKey of expectedRoleKeys) {
  if (!actualRoleKeys.has(roleKey)) {
    throw new Error(`Clerk role set verification failed: ${roleKey} is missing.`);
  }
}
if (roleSet.defaultRole?.key !== "org:member") {
  throw new Error("Clerk role set verification failed: the default role changed.");
}
if (roleSet.creatorRole?.key !== adminRoleKey) {
  throw new Error("Clerk role set verification failed: the creator role changed.");
}

console.log(
  JSON.stringify(
    {
      permission: { id: permission.id, key: permission.key },
      roles: [verifiedAdminRole, verifiedOperatorRole].map((role) => ({
        id: role.id,
        key: role.key,
        permissions: role.permissions.map((candidate) => candidate.key),
      })),
      roleSet: {
        id: roleSet.id,
        key: roleSet.key,
        defaultRole: roleSet.defaultRole?.key,
        creatorRole: roleSet.creatorRole?.key,
        roles: roleSet.roles.map((role) => role.key),
      },
    },
    null,
    2,
  ),
);
