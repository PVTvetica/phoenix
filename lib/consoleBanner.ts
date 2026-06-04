// A small console calling-card, printed once when the app loads. A friendly note
// for the curious — and a genuine responsible-disclosure invite. Purely cosmetic:
// wrapped so a vanity banner can never break boot.
// Security / responsible-disclosure contact.
const SECURITY_CONTACT = 'hello@myrsi.org';

export function printConsoleBanner(): void {
    try {
        if (typeof console === 'undefined' || typeof console.log !== 'function') return;

        const heading = 'font-size:16px;font-weight:700;color:#38bdf8';
        const body = 'font-size:13px;line-height:1.6;color:#93c5fd';
        const sign = 'font-size:12px;font-style:italic;color:#9ca3af';

        console.log('%c👋 Poking around the internals?', heading);
        console.log(
            '%cNice — we like the curious type. MyRSI.org is source-available under a\n' +
            'noncommercial license — free to explore, self-host, and build on, just not for profit.',
            body,
        );
        console.log(
            `%cFound a security flaw or something that looks off? We genuinely want to hear about it —\n` +
            `please report it responsibly to ${SECURITY_CONTACT} and give us a chance to fix it. Thanks for looking out.\n— The MyRSI Team 🫡`,
            sign,
        );
    } catch {
        /* a calling-card is never worth a crash */
    }
}
