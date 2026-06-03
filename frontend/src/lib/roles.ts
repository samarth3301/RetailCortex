export const ROLES = {
  USER: "user",
  STORE_ADMIN: "store_admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function canManageInventory(role: Role | undefined): boolean {
  return role === ROLES.STORE_ADMIN || role === ROLES.SUPER_ADMIN;
}

export function canResolveIssues(role: Role | undefined): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function canOnboardStores(role: Role | undefined): boolean {
  return role === ROLES.SUPER_ADMIN;
}
