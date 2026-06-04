import { describe, it, expect } from 'vitest';
import { validateTemplatePayload } from '../lib/operation-template-validate';
import { TaskPriority } from '../types';

// These tests lock in the contract that the wizard's `inlinePhases` payload
// (sent through operation:create) and JSON-imported templates must satisfy.
// The same validator runs on both paths server-side, so a regression here
// would silently ship malformed phases into operations.

describe('validateTemplatePayload — happy path', () => {
    it('accepts an empty phase list', () => {
        const result = validateTemplatePayload({ phases: [] });
        expect(result).toEqual({ phases: [] });
    });

    it('keeps a minimal phase intact', () => {
        const result = validateTemplatePayload({ phases: [{ name: 'Approach' }] });
        expect(result.phases).toHaveLength(1);
        expect(result.phases[0]).toEqual({ name: 'Approach' });
    });

    it('trims phase names and descriptions', () => {
        const result = validateTemplatePayload({ phases: [{ name: '  Hold  ', description: '  do the thing  ' }] });
        expect(result.phases[0].name).toBe('Hold');
        expect(result.phases[0].description).toBe('do the thing');
    });

    it('accepts the snake_case alias phase_type', () => {
        const result = validateTemplatePayload({ phases: [{ name: 'Fallback', phase_type: 'contingency' }] });
        expect(result.phases[0].phaseType).toBe('contingency');
    });

    it('preserves milestones with a label and trims notes', () => {
        const result = validateTemplatePayload({
            phases: [{ name: 'P', milestones: [{ label: '  Stack form-up  ', notes: '  brief on TS  ' }] }],
        });
        expect(result.phases[0].milestones).toEqual([{ label: 'Stack form-up', notes: 'brief on TS' }]);
    });

    it('truncates non-integer offsetMinutes', () => {
        const result = validateTemplatePayload({
            phases: [{ name: 'P', milestones: [{ label: 'm', offsetMinutes: 12.7 }] }],
        });
        expect(result.phases[0].milestones![0].offsetMinutes).toBe(12);
    });

    it('drops a non-numeric offsetMinutes silently', () => {
        const result = validateTemplatePayload({
            phases: [{ name: 'P', milestones: [{ label: 'm', offsetMinutes: 'soon' as any }] }],
        });
        expect(result.phases[0].milestones![0].offsetMinutes).toBeUndefined();
    });

    it('preserves task fields', () => {
        const result = validateTemplatePayload({
            phases: [{
                name: 'Engagement',
                tasks: [{ title: 'Engage hostile', priority: TaskPriority.Critical, taskType: 'primary' }],
            }],
        });
        expect(result.phases[0].tasks).toEqual([{
            title: 'Engage hostile',
            priority: TaskPriority.Critical,
            taskType: 'primary',
        }]);
    });

    it('drops empty milestones / tasks arrays from output to keep payloads tight', () => {
        const result = validateTemplatePayload({
            phases: [{ name: 'P', milestones: [], tasks: [] }],
        });
        expect(result.phases[0]).not.toHaveProperty('milestones');
        expect(result.phases[0]).not.toHaveProperty('tasks');
    });
});

describe('validateTemplatePayload — rejection paths', () => {
    it('rejects non-object payloads', () => {
        expect(() => validateTemplatePayload(null)).toThrow(/must be an object/);
        expect(() => validateTemplatePayload('hello')).toThrow(/must be an object/);
        expect(() => validateTemplatePayload(42)).toThrow(/must be an object/);
    });

    it('rejects payloads missing the phases array', () => {
        expect(() => validateTemplatePayload({})).toThrow(/phases must be an array/);
        expect(() => validateTemplatePayload({ phases: 'oops' })).toThrow(/phases must be an array/);
    });

    it('rejects a phase with no name', () => {
        expect(() => validateTemplatePayload({ phases: [{}] })).toThrow(/Phase #1 requires a non-empty name/);
        expect(() => validateTemplatePayload({ phases: [{ name: '   ' }] })).toThrow(/Phase #1 requires a non-empty name/);
    });

    it('rejects an unknown phaseType', () => {
        expect(() => validateTemplatePayload({ phases: [{ name: 'P', phaseType: 'parallel' }] }))
            .toThrow(/invalid phaseType "parallel"/);
    });

    it('rejects a milestone missing its label', () => {
        expect(() => validateTemplatePayload({ phases: [{ name: 'P', milestones: [{}] }] }))
            .toThrow(/Milestone #1 of phase "P" requires a non-empty label/);
    });

    it('rejects a task missing its title', () => {
        expect(() => validateTemplatePayload({ phases: [{ name: 'P', tasks: [{}] }] }))
            .toThrow(/Task #1 of phase "P" requires a non-empty title/);
    });

    it('rejects an unknown task priority', () => {
        expect(() => validateTemplatePayload({ phases: [{ name: 'P', tasks: [{ title: 't', priority: 'Urgent' }] }] }))
            .toThrow(/invalid priority "Urgent"/);
    });

    it('rejects an unknown taskType', () => {
        expect(() => validateTemplatePayload({ phases: [{ name: 'P', tasks: [{ title: 't', taskType: 'epic' }] }] }))
            .toThrow(/invalid taskType "epic"/);
    });
});

describe('validateTemplatePayload — round-trip stability', () => {
    it('is idempotent: validating an already-valid payload returns the same shape', () => {
        const input = {
            phases: [
                {
                    name: 'Approach',
                    phaseType: 'sequential',
                    tasks: [{ title: 'Form up', priority: TaskPriority.High }],
                    milestones: [{ label: 'Jump-point stack', offsetMinutes: -15 }],
                },
                {
                    name: 'Engagement',
                    tasks: [{ title: 'Engage', priority: TaskPriority.Critical }],
                },
            ],
        };
        const once = validateTemplatePayload(input);
        const twice = validateTemplatePayload(once);
        expect(twice).toEqual(once);
    });
});
