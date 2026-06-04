// Audio prefetch + replay cache.
//
// Background: `new Audio(url).play()` first paints out of sync with on-screen
// actions because the browser has to fetch + decode the file before playback.
// Subsequent plays hit disk cache but still pay a fresh-element startup cost.
//
// Strategy:
//   1. Keep a singleton HTMLAudioElement per URL with `preload='auto'`. The
//      browser starts fetching + decoding the moment the element is created.
//   2. To play, clone the cached node — overlapping triggers (e.g. two toasts
//      back-to-back) get their own playback context without cutting each other
//      off, while still benefiting from the cached source under the hood.
//   3. Prefetch the bundled chimes at module-load time so the first toast is
//      already warm. Dynamic URLs (org-configured sounds) call prefetchSound
//      explicitly when their values land in DataContext.
//
// Browser autoplay policy: we never call .play() during prefetch, only
// preload — the user must have interacted with the page before any sound
// actually triggers. Preloading without playing is allowed everywhere.

const cache = new Map<string, HTMLAudioElement>();

/**
 * Warm the cache for a URL. Idempotent — re-prefetching the same URL is a
 * no-op. Safe to call before any user interaction; only loads, never plays.
 */
export function prefetchSound(url: string | null | undefined): void {
    if (!url || typeof window === 'undefined' || cache.has(url)) return;
    try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;
        // Force the browser to start fetching + decoding now rather than
        // lazily on first play. Errors here are benign (e.g. bad URL, CORS) —
        // we'll just fall back to creating a fresh Audio at play time.
        audio.load();
        cache.set(url, audio);
    } catch (err) {
        console.warn('[audioCache] prefetch failed for', url, err);
    }
}

/**
 * Bulk prefetch. Use when DataContext gets a fresh org config bundle that
 * may contain several dynamic sound URLs.
 */
export function prefetchSounds(urls: Array<string | null | undefined>): void {
    for (const url of urls) prefetchSound(url);
}

/**
 * Play a sound from the cache (warming on first call if needed). Clones the
 * cached element so overlapping plays each get their own playback timeline.
 *
 * `volume` is 0–100 (matches the user's UIContext volume slider).
 */
export function playCachedSound(url: string | undefined, volume: number): void {
    if (!url || typeof window === 'undefined') return;
    try {
        if (!cache.has(url)) prefetchSound(url);
        const cached = cache.get(url);
        // Clone the node — each play gets its own currentTime cursor so two
        // chimes triggered ~50ms apart don't truncate each other.
        const node = cached
            ? (cached.cloneNode(true) as HTMLAudioElement)
            : new Audio(url);
        node.volume = Math.max(0, Math.min(1, volume / 100));
        const result = node.play();
        if (result && typeof result.catch === 'function') {
            result.catch(err => console.warn('[audioCache] playback failed for', url, err?.message || err));
        }
    } catch (err) {
        console.error('[audioCache] error playing', url, err);
    }
}

// Bundled chimes that fire on toasts. Prefetching at module load means the
// first toast (often a success/error after a save) plays in sync with the
// UI animation rather than 100–300 ms late.
const BUNDLED_CHIMES = [
    '/media/success-chime.mp3',
    '/media/error-chime.mp3',
    '/media/dialog-action-chime.mp3',
];

if (typeof window !== 'undefined') {
    // Defer to the next tick so we don't block initial paint. requestIdleCallback
    // is preferred where supported; otherwise a microtask is fine.
    const warm = () => prefetchSounds(BUNDLED_CHIMES);
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === 'function') {
        ric(warm, { timeout: 1000 });
    } else {
        setTimeout(warm, 0);
    }
}
