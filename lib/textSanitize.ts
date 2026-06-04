// Server-side text hygiene for fields that persist user-supplied strings.
//
// Why: React escapes text by default at render time, so stored text is not
// directly a XSS vector today. But persisting raw HTML/tags creates a latent
// hazard: any future consumer that adds `dangerouslySetInnerHTML`, copies the
// value into an email template, or serialises it into HTML (OG tags, RSS)
// could silently become vulnerable. Stripping + capping at the write boundary
// is cheap insurance.
//
// Also enforces length caps so a user can't bloat the DB with multi-MB blobs.

const HTML_TAG_RE = /<[^>]*>/g;
// Strip C0 control chars except \t (0x09), \n (0x0A), \r (0x0D), plus DEL (0x7F).
// Matching control chars in the regex is the entire point of this sanitiser.
// eslint-disable-next-line no-control-regex
const CTRL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Strip HTML tags and control characters, trim, and cap to `max` characters.
 * Non-strings become ''. Preserves newlines and tabs for multi-line fields.
 */
export function stripHtml(raw: unknown, max: number): string {
    if (typeof raw !== 'string') return '';
    return raw
        .replace(HTML_TAG_RE, '')
        .replace(CTRL_RE, '')
        .trim()
        .slice(0, max);
}

/**
 * Single-line variant: also collapses newlines to spaces. Good for titles,
 * names, mottos, labels.
 */
export function stripHtmlSingleLine(raw: unknown, max: number): string {
    if (typeof raw !== 'string') return '';
    return raw
        .replace(HTML_TAG_RE, '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(CTRL_RE, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}
