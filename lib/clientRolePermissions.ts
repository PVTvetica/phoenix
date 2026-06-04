/**
 * Canonical list of permissions the "Client" system role is allowed to have.
 *
 * Single source of truth — previously duplicated across seeder, system-role repair,
 * admin audit endpoints, and the Roles Audit UI. When a new feature grants default
 * client access (e.g., marketplace), add the permission here and it propagates
 * everywhere. Anything beyond this list on a Client role is flagged as excess by
 * the integrity checker and stripped by the repair tool.
 */
export const CLIENT_DEFAULT_PERMS: readonly string[] = [
    'request:create',
    'request:cancel',
    'request:rate',
] as const;
