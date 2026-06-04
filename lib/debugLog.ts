// DEV-only browser console logging.
//
// Several client-side handlers log realtime/event payloads to aid debugging.
// Those payloads can contain org data or PII (request details, user names,
// EAM messages, broadcast bodies) and must never spill into an end user's
// production DevTools console. Route all such debug logging through `debugLog`
// instead of `console.log`. Vite statically replaces `process.env.NODE_ENV`,
// so in a production build these calls compile down to a no-op.
//
// Genuine error/warning diagnostics should still use `console.error` /
// `console.warn` directly — those are intentionally kept in production.
export const debugLog: (...args: unknown[]) => void =
    process.env.NODE_ENV !== 'production' ? (...args) => console.log(...args) : () => { };
