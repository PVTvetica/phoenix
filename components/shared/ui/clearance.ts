// Shared clearance level color tokens. Used by personnel-side and admin-side
// surfaces that render a member's clearance level badge.

export function getClearanceColor(level: number): string {
    switch (level) {
        case 1: return 'bg-green-500 border-green-500/50 shadow-green-500/20';
        case 2: return 'bg-sky-500 border-sky-500/50 shadow-sky-500/20';
        case 3: return 'bg-amber-500 border-amber-500/50 shadow-amber-500/20';
        case 4: return 'bg-orange-500 border-orange-500/50 shadow-orange-500/20';
        case 5: return 'bg-red-600 border-red-600/50 shadow-red-600/30';
        default: return 'bg-slate-600 border-slate-500/50';
    }
}
