import { describe, it, expect } from 'vitest';
import { assertCanManageRolePermissions } from '../lib/db/users';

// Regression for the privilege-escalation finding: a non-Admin holder of
// admin:config:roles could grant admin:access to their own role and become
// Admin. These cover the guard's pre-DB branches (Admin bypass, amplification,
// missing actor); the tier-ceiling branch is exercised against a live DB.
describe('assertCanManageRolePermissions — privilege ceiling', () => {
    it('allows an Admin actor (full control)', async () => {
        await expect(assertCanManageRolePermissions(
            { id: 1, role: 'Admin', roleId: 4, permissions: [] } as any,
            3, ['admin:access'],
        )).resolves.toBeUndefined();
    });

    it('blocks a non-Admin from granting a permission they do not hold', async () => {
        await expect(assertCanManageRolePermissions(
            { id: 2, role: 'Dispatcher', roleId: 3, permissions: ['warrant:view', 'admin:config:roles'] } as any,
            99, ['admin:access'],
        )).rejects.toThrow(/cannot grant permissions you do not hold/i);
    });

    it('rejects when actor identity is missing', async () => {
        await expect(assertCanManageRolePermissions(null, 3, []))
            .rejects.toThrow(/actor identity/i);
    });
});
