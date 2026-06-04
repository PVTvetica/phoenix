import { describe, it, expect } from 'vitest';
import { projectOperationSnapshot, shouldApplyVersion } from '../lib/db/operations-federation';
import type { HydratedOperation } from '../types';

// A host operation stuffed with sensitive values the snapshot must NOT leak.
function makeHostOp(): HydratedOperation {
    return {
        id: 'op-1', name: 'Joint Strike', type: 'PvE', status: 'Planning', description: 'desc',
        ownerId: 42, owner: { id: 42, name: 'HostCmdr', email: 'owner-secret@host.test', avatarUrl: 'a.png' },
        tracksUec: true, totalUec: 999999, totalCosts: 5000, payoutMode: 'custom',
        createdAt: 't0', updatedAt: 't1', isSpecial: false, clearanceLevel: 0, isTraining: false,
        isJoint: true, commsPlan: [], limitingMarkers: [],
        joinCode: 'SECRET-JOIN-CODE',
        log: [{ id: 1, entryType: 'UEC_COST', logEntry: 'internal cost note', createdAt: 't' }],
        participants: [{
            userId: 7, user: { id: 7, name: 'HostPilot', email: 'pilot-secret@host.test' },
            timeJoined: 't', isReady: true, roleRequested: 'Pilot', shipUtilized: 'Gladius',
            rsvpStatus: 'Yes', payoutSharePercent: 50, payoutPaidAt: 't',
        }],
        tasks: [{ id: 1, operationId: 'op-1', title: 'Task', taskType: 'primary', assignedUserId: 7, status: 'Pending', priority: 'Normal', sortOrder: 0, createdAt: 't' }],
        commandNodes: [{ id: 1, operationId: 'op-1', label: 'CO', nodeType: 'command', assignedUserId: 7, posX: 0, posY: 0, sortOrder: 0, createdAt: 't' }],
        phases: [{ id: 1, operationId: 'op-1', name: 'Phase 1', phaseType: 'sequential', sortOrder: 0, status: 'Pending' }],
    } as unknown as HydratedOperation;
}

describe('projectOperationSnapshot (cross-org leakage guard)', () => {
    it('returns null for an op carrying a sync_restricted marker', () => {
        expect(projectOperationSnapshot(makeHostOp(), true)).toBeNull();
    });

    it('neutralises financial / join-code / log fields', () => {
        const snap = projectOperationSnapshot(makeHostOp(), false)!;
        expect(snap.totalUec).toBe(0);
        expect(snap.totalCosts).toBe(0);
        expect(snap.payoutMode).toBe('equal');
        expect(snap.tracksUec).toBe(false);
        expect(snap.joinCode).toBeUndefined();
        expect(snap.log).toEqual([]);
    });

    it('strips real user identities (no email / real ids) from owner + participants', () => {
        const snap = projectOperationSnapshot(makeHostOp(), false)!;
        const blob = JSON.stringify(snap);
        expect(blob).not.toContain('owner-secret@host.test');
        expect(blob).not.toContain('pilot-secret@host.test');
        expect(blob).not.toContain('SECRET-JOIN-CODE');
        expect(blob).not.toContain('internal cost note');
        expect(snap.ownerId).toBe(0);
        expect((snap.owner as { email?: string }).email).toBeUndefined();
        // participant payout fields gone; display name kept
        expect((snap.participants[0] as { payoutSharePercent?: number }).payoutSharePercent).toBeUndefined();
        expect(snap.participants[0].user.name).toBe('HostPilot');
    });

    it('drops local assignment FKs from tasks + command nodes', () => {
        const snap = projectOperationSnapshot(makeHostOp(), false)!;
        expect(snap.tasks?.[0].assignedUserId).toBeUndefined();
        expect(snap.commandNodes?.[0].assignedUserId).toBeUndefined();
    });

    it('preserves the shareable structure (name, status, phases)', () => {
        const snap = projectOperationSnapshot(makeHostOp(), false)!;
        expect(snap.name).toBe('Joint Strike');
        expect(snap.status).toBe('Planning');
        expect(snap.phases?.[0].name).toBe('Phase 1');
        expect(snap.participants[0].roleRequested).toBe('Pilot');
    });
});

describe('shouldApplyVersion (idempotency / staleness)', () => {
    it('applies only strictly newer versions', () => {
        expect(shouldApplyVersion(5, 3)).toBe(true);
        expect(shouldApplyVersion(3, 5)).toBe(false);
        expect(shouldApplyVersion(3, 3)).toBe(false);
        expect(shouldApplyVersion(0, null)).toBe(true);
        expect(shouldApplyVersion(0, undefined)).toBe(true);
    });
});
