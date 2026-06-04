// Generic clearance + limiting-marker visibility filter (single-org).
//
// SECURITY (H3): classified resources (intel reports/bulletins, wiki pages,
// operations) carry a numeric `classificationLevel` (0 = unclassified) and a set
// of `limitingMarkers` (compartment tags). Visibility was previously enforced
// only by client-side React filters, which the project's own model treats as
// cosmetic — so any holder of the base view permission received above-clearance
// or marker-restricted content in the raw HTTP response. This helper enforces it
// server-side, deny-by-default:
//   - the item's classification must be at/below the viewer's clearance level, AND
//   - the viewer must hold EVERY limiting marker attached to the item.
// Admins (and any caller holding one of `bypassPermissions`) see everything.
//
// Marker values are compared as strings on both sides (the mappers project both
// the user's and the item's limiting markers to the same `marker` scalar).

export interface ClearanceItem {
    classificationLevel?: number | null;
    limitingMarkers?: unknown[];
}

export interface ClearanceUser {
    clearanceLevel?: { level?: number } | null;
    limitingMarkers?: unknown[];
    role?: string;
    permissions?: string[];
}

export function canViewAllClassifications(user?: ClearanceUser | null, bypassPermissions: string[] = []): boolean {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return Array.isArray(user.permissions) && bypassPermissions.some((p) => user.permissions!.includes(p));
}

// A limiting marker is, at runtime, the embedded security_limiting_markers ROW
// object ({ id, code, name, ... }) on BOTH the user side (mappers.toUser) and the
// item side (intel/wiki/op mappers) — the `marker:security_limiting_markers(*)`
// PostgREST alias. A previous version compared with String(m), which collapsed
// every object to '[object Object]' and defeated compartmentation (any one marker
// passed all checks). Derive a stable scalar key, preferring id, then code/name;
// strings (e.g. tests) pass through. Both sides use the same projection, so the
// same marker yields the same key.
function markerKey(m: unknown): string {
    if (m && typeof m === 'object') {
        const o = m as Record<string, unknown>;
        if (o.id !== undefined && o.id !== null) return `id:${String(o.id)}`;
        if (o.code !== undefined && o.code !== null) return `code:${String(o.code)}`;
        if (o.name !== undefined && o.name !== null) return `name:${String(o.name)}`;
    }
    return `v:${String(m)}`;
}

export function passesClearance(
    user: ClearanceUser | null | undefined,
    classificationLevel?: number | null,
    itemMarkers?: unknown[],
    bypassPermissions: string[] = [],
): boolean {
    if (canViewAllClassifications(user, bypassPermissions)) return true;
    const level = user?.clearanceLevel?.level ?? 0;
    if ((classificationLevel ?? 0) > level) return false;
    if (itemMarkers && itemMarkers.length > 0) {
        const held = new Set<string>((user?.limitingMarkers || []).map(markerKey));
        for (const m of itemMarkers) {
            if (!held.has(markerKey(m))) return false;
        }
    }
    return true;
}

export function filterByClearance<T extends ClearanceItem>(
    items: T[],
    user?: ClearanceUser | null,
    bypassPermissions: string[] = [],
): T[] {
    if (canViewAllClassifications(user, bypassPermissions)) return items;
    return items.filter((it) => passesClearance(user, it.classificationLevel, it.limitingMarkers, bypassPermissions));
}
