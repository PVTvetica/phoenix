export type DeckUrlStyle = 'index.php' | 'pretty';

function deckWebPrefix(style: DeckUrlStyle = 'index.php'): string {
    return style === 'index.php' ? '/index.php/apps/deck' : '/apps/deck';
}

export function buildDeckCardOpenUrl(
    serverUrl: string | undefined,
    boardId: number,
    cardId: number,
    urlStyle?: DeckUrlStyle,
): string | null {
    if (!serverUrl) return null;
    return `${serverUrl.replace(/\/+$/, '')}${deckWebPrefix(urlStyle)}#/board/${boardId}/card/${cardId}`;
}

export function buildDeckBoardOpenUrl(
    serverUrl: string | undefined,
    boardId: number,
    urlStyle?: DeckUrlStyle,
): string | null {
    if (!serverUrl) return null;
    return `${serverUrl.replace(/\/+$/, '')}${deckWebPrefix(urlStyle)}#/board/${boardId}`;
}

export function isoToDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDeckDueDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function boardColorStyle(hex?: string): { borderTopColor: string } | undefined {
    if (!hex) return undefined;
    const clean = hex.replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return undefined;
    return { borderTopColor: `#${clean}` };
}
