/** Ensure a value is a renderable primitive (prevents React #300 if data is unexpectedly an object) */
export const safe = (v: any, fallback: string = ''): string | number => {
    if (v == null) return fallback;
    if (typeof v === 'object') {
        // Always return the fallback for objects — never let them through as React children.
        // Previous `String(v)` produced "[object Object]" which is never desirable.
        return fallback;
    }
    return v;
};

/** Ensure a string value is actually a string. Used for state initialization from external data. */
export const safeString = (v: any, fallback: string = ''): string => {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return fallback;
};
