import type {
    OperationTemplatePayload,
    OperationTemplatePhase,
    OperationTemplateMilestone,
    OperationTemplateTask,
    TaskPriority,
} from '../types.js';

// Pure validator extracted from lib/db/operation-templates.ts so it can be
// imported from tests without dragging in the Supabase client. Throws on the
// first invalid field with a descriptive message; the action handler turns
// that into a 4xx for the client.

const VALID_PHASE_TYPES = new Set(['sequential', 'contingency']);
const VALID_TASK_TYPES = new Set(['primary', 'secondary', 'assignment']);
const VALID_PRIORITIES = new Set<string>(['Low', 'Normal', 'High', 'Critical']);

export function validateTemplatePayload(raw: unknown): OperationTemplatePayload {
    if (!raw || typeof raw !== 'object') throw new Error('Template payload must be an object.');
    const r = raw as any;
    if (!Array.isArray(r.phases)) throw new Error('Template payload.phases must be an array.');

    const phases: OperationTemplatePhase[] = r.phases.map((p: any, idx: number) => {
        if (!p || typeof p !== 'object') throw new Error(`Phase #${idx + 1} must be an object.`);
        if (typeof p.name !== 'string' || !p.name.trim()) throw new Error(`Phase #${idx + 1} requires a non-empty name.`);

        const phaseType = p.phaseType ?? p.phase_type;
        if (phaseType !== undefined && !VALID_PHASE_TYPES.has(phaseType)) {
            throw new Error(`Phase #${idx + 1} has invalid phaseType "${phaseType}".`);
        }

        const milestones: OperationTemplateMilestone[] | undefined = Array.isArray(p.milestones)
            ? p.milestones.map((m: any, mi: number) => {
                if (!m || typeof m !== 'object' || typeof m.label !== 'string' || !m.label.trim()) {
                    throw new Error(`Milestone #${mi + 1} of phase "${p.name}" requires a non-empty label.`);
                }
                const out: OperationTemplateMilestone = { label: m.label.trim() };
                if (typeof m.notes === 'string' && m.notes.trim()) out.notes = m.notes.trim();
                if (typeof m.offsetMinutes === 'number' && Number.isFinite(m.offsetMinutes)) {
                    out.offsetMinutes = Math.trunc(m.offsetMinutes);
                }
                return out;
            })
            : undefined;

        const tasks: OperationTemplateTask[] | undefined = Array.isArray(p.tasks)
            ? p.tasks.map((t: any, ti: number) => {
                if (!t || typeof t !== 'object' || typeof t.title !== 'string' || !t.title.trim()) {
                    throw new Error(`Task #${ti + 1} of phase "${p.name}" requires a non-empty title.`);
                }
                if (t.taskType !== undefined && !VALID_TASK_TYPES.has(t.taskType)) {
                    throw new Error(`Task #${ti + 1} of phase "${p.name}" has invalid taskType "${t.taskType}".`);
                }
                if (t.priority !== undefined && !VALID_PRIORITIES.has(t.priority)) {
                    throw new Error(`Task #${ti + 1} of phase "${p.name}" has invalid priority "${t.priority}".`);
                }
                const out: OperationTemplateTask = { title: t.title.trim() };
                if (typeof t.description === 'string' && t.description.trim()) out.description = t.description.trim();
                if (t.taskType) out.taskType = t.taskType;
                if (t.priority) out.priority = t.priority as TaskPriority;
                return out;
            })
            : undefined;

        const out: OperationTemplatePhase = { name: p.name.trim() };
        if (typeof p.description === 'string' && p.description.trim()) out.description = p.description.trim();
        if (phaseType) out.phaseType = phaseType;
        if (typeof p.color === 'string' && p.color.trim()) out.color = p.color.trim();
        if (milestones?.length) out.milestones = milestones;
        if (tasks?.length) out.tasks = tasks;
        return out;
    });

    return { phases };
}
