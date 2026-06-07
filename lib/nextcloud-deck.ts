import { getNextcloudConfig } from './nextcloud.js';
import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'nextcloud-deck' });

export type DeckUrlStyle = 'index.php' | 'pretty';

export interface DeckStatus {
    configured: boolean;
    available: boolean;
    urlStyle?: DeckUrlStyle;
    error?: string;
}

export interface DeckBoard {
    id: number;
    title: string;
    color?: string;
    archived: boolean;
}

export interface DeckStack {
    id: number;
    boardId: number;
    title: string;
    order: number;
}

export interface DeckCard {
    id: number;
    boardId: number;
    stackId: number;
    title: string;
    description?: string;
    dueDate?: string | null;
    order: number;
    archived: boolean;
}

export interface CreateDeckCardInput {
    boardId: number;
    stackId: number;
    title: string;
    description?: string;
    dueDate?: string;
}

export interface UpdateDeckCardInput {
    cardId: number;
    boardId: number;
    stackId: number;
    title: string;
    description?: string;
    dueDate?: string | null;
}

const DECK_URL_STYLES: DeckUrlStyle[] = ['index.php', 'pretty'];

/** Cached after first successful Deck API call in this process. */
let resolvedDeckUrlStyle: DeckUrlStyle | null = null;

function deckApiBaseForStyle(serverUrl: string, style: DeckUrlStyle): string {
    const base = serverUrl.replace(/\/+$/, '');
    return style === 'index.php'
        ? `${base}/index.php/apps/deck/api/v1.0`
        : `${base}/apps/deck/api/v1.0`;
}

export function deckWebAppPathForStyle(style: DeckUrlStyle): string {
    return style === 'index.php' ? '/index.php/apps/deck' : '/apps/deck';
}

export function getResolvedDeckUrlStyle(): DeckUrlStyle | null {
    return resolvedDeckUrlStyle;
}

function basicAuthHeader(user: string, password: string): string {
    const token = Buffer.from(`${user}:${password}`, 'utf8').toString('base64');
    return `Basic ${token}`;
}

function stripHtml(raw: string): string {
    return raw
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
}

function parsePositiveInt(raw: unknown): number | null {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(n) || n <= 0 || n > Number.MAX_SAFE_INTEGER) return null;
    return n;
}

export function parseDeckIdParam(raw: string | string[] | undefined): number | null {
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (!s || !/^\d+$/.test(s)) return null;
    return parsePositiveInt(s);
}

function sanitizeBoard(raw: unknown): DeckBoard | null {
    const o = asRecord(raw);
    if (!o) return null;
    const id = parsePositiveInt(o.id);
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!id || !title) return null;
    return {
        id,
        title: title.slice(0, 255),
        color: typeof o.color === 'string' ? o.color : undefined,
        archived: !!o.archived,
    };
}

function sanitizeStack(raw: unknown, boardId: number): DeckStack | null {
    const o = asRecord(raw);
    if (!o) return null;
    const id = parsePositiveInt(o.id);
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const order = typeof o.order === 'number' ? o.order : 0;
    if (!id || !title) return null;
    return { id, boardId, title: title.slice(0, 100), order };
}

function sanitizeCard(raw: unknown, boardId: number, stackId: number): DeckCard | null {
    const o = asRecord(raw);
    if (!o) return null;
    const id = parsePositiveInt(o.id);
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const order = typeof o.order === 'number' ? o.order : 0;
    if (!id || !title) return null;
    let description: string | undefined;
    if (typeof o.description === 'string' && o.description.trim()) {
        description = stripHtml(o.description).slice(0, 5000);
    }
    const dueDate = typeof o.duedate === 'string' ? o.duedate : (o.duedate === null ? null : undefined);
    return {
        id,
        boardId,
        stackId,
        title: title.slice(0, 255),
        description,
        dueDate,
        order,
        archived: !!o.archived,
    };
}

function buildDeckHeaders(init: RequestInit, user: string, password: string): Headers {
    const headers = new Headers(init.headers);
    headers.set('Authorization', basicAuthHeader(user, password));
    headers.set('OCS-APIRequest', 'true');
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    return headers;
}

function shouldRetryWithFallback(res: Response): boolean {
    const ct = res.headers.get('content-type') ?? '';
    return res.status === 404 || !ct.includes('json');
}

function mapDeckHttpError(res: Response): Error {
    if (res.status === 401 || res.status === 403) return new Error('deck_auth_failed');
    if (res.status === 404) return new Error('deck_not_found');
    return new Error('deck_unreachable');
}

async function deckRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    const stylesToTry: DeckUrlStyle[] = resolvedDeckUrlStyle
        ? [resolvedDeckUrlStyle]
        : DECK_URL_STYLES;

    let lastRetryable = false;

    for (let i = 0; i < stylesToTry.length; i++) {
        const style = stylesToTry[i];
        const url = `${deckApiBaseForStyle(cfg.url, style)}${path}`;
        const headers = buildDeckHeaders(init, cfg.user, cfg.password);
        const res = await fetch(url, { ...init, headers });

        if (!resolvedDeckUrlStyle && shouldRetryWithFallback(res) && i < stylesToTry.length - 1) {
            log.info('deck api path fallback', { tried: style, path });
            lastRetryable = true;
            continue;
        }

        const ct = res.headers.get('content-type') ?? '';
        if (!ct.includes('json')) {
            log.warn('deck non-json response', { status: res.status, path, style });
            if (res.status === 404) throw new Error('deck_unavailable');
            throw new Error('deck_unreachable');
        }

        if (!res.ok) throw mapDeckHttpError(res);

        if (!resolvedDeckUrlStyle) {
            resolvedDeckUrlStyle = style;
            log.info('deck api path resolved', { style });
        }

        return res.json() as Promise<T>;
    }

    if (lastRetryable) throw new Error('deck_unavailable');
    throw new Error('deck_unreachable');
}

export async function getDeckStatus(): Promise<DeckStatus> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) {
        return { configured: false, available: false };
    }
    try {
        await deckRequest<unknown[]>('/boards');
        return {
            configured: true,
            available: true,
            urlStyle: resolvedDeckUrlStyle ?? undefined,
        };
    } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'deck_unavailable' || msg === 'deck_auth_failed') {
            return {
                configured: true,
                available: false,
                error: 'Deck-Integration nicht verfügbar. App installiert und App-Passwort berechtigt?',
            };
        }
        return {
            configured: true,
            available: false,
            error: 'Deck-Integration nicht erreichbar.',
        };
    }
}

export async function listDeckBoards(): Promise<DeckBoard[]> {
    const raw = await deckRequest<unknown[]>('/boards');
    if (!Array.isArray(raw)) return [];
    return raw
        .map(sanitizeBoard)
        .filter((b): b is DeckBoard => !!b && !b.archived)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

export async function listDeckStacks(boardId: number): Promise<DeckStack[]> {
    const raw = await deckRequest<unknown[]>(`/boards/${boardId}/stacks`);
    if (!Array.isArray(raw)) return [];
    return raw
        .map((s) => sanitizeStack(s, boardId))
        .filter((s): s is DeckStack => !!s)
        .sort((a, b) => a.order - b.order || a.id - b.id);
}

export async function listDeckCards(boardId: number, stackId: number): Promise<DeckCard[]> {
    const raw = await deckRequest<Record<string, unknown>>(`/boards/${boardId}/stacks/${stackId}`);
    const cards = raw?.cards;
    if (!Array.isArray(cards)) return [];
    return cards
        .map((c) => sanitizeCard(c, boardId, stackId))
        .filter((c): c is DeckCard => !!c && !c.archived)
        .sort((a, b) => a.order - b.order || a.id - b.id);
}

function parseOptionalDueDate(o: Record<string, unknown>): string | undefined {
    if (typeof o.dueDate === 'string' && o.dueDate.trim()) {
        const d = Date.parse(o.dueDate);
        if (Number.isNaN(d)) throw new Error('invalid_due_date');
        return new Date(d).toISOString();
    }
    return undefined;
}

export function validateCreateCardInput(body: unknown): CreateDeckCardInput {
    const o = asRecord(body);
    if (!o) throw new Error('invalid_body');
    const boardId = parsePositiveInt(o.boardId);
    const stackId = parsePositiveInt(o.stackId);
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!boardId || !stackId || !title) throw new Error('invalid_body');
    if (title.length > 255) throw new Error('title_too_long');

    const input: CreateDeckCardInput = { boardId, stackId, title };
    if (typeof o.description === 'string' && o.description.trim()) {
        input.description = stripHtml(o.description).slice(0, 5000);
    }
    const due = parseOptionalDueDate(o);
    if (due) input.dueDate = due;
    return input;
}

export function validateUpdateCardInput(cardId: number, body: unknown): UpdateDeckCardInput {
    const o = asRecord(body);
    if (!o) throw new Error('invalid_body');
    const boardId = parsePositiveInt(o.boardId);
    const stackId = parsePositiveInt(o.stackId);
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!boardId || !stackId || !title || !cardId) throw new Error('invalid_body');
    if (title.length > 255) throw new Error('title_too_long');

    const input: UpdateDeckCardInput = { cardId, boardId, stackId, title };
    if (typeof o.description === 'string') {
        const desc = stripHtml(o.description).slice(0, 5000);
        if (desc) input.description = desc;
        else input.description = '';
    }
    if (o.dueDate === null) {
        input.dueDate = null;
    } else if (typeof o.dueDate === 'string') {
        if (!o.dueDate.trim()) {
            input.dueDate = null;
        } else {
            const d = Date.parse(o.dueDate);
            if (Number.isNaN(d)) throw new Error('invalid_due_date');
            input.dueDate = new Date(d).toISOString();
        }
    }
    return input;
}

export async function createDeckCard(input: CreateDeckCardInput): Promise<DeckCard> {
    const payload: Record<string, unknown> = {
        title: input.title,
        type: 'plain',
        order: 999,
    };
    if (input.description) payload.description = input.description;
    if (input.dueDate) payload.duedate = input.dueDate;

    const raw = await deckRequest<Record<string, unknown>>(
        `/boards/${input.boardId}/stacks/${input.stackId}/cards`,
        { method: 'POST', body: JSON.stringify(payload) },
    );
    const card = sanitizeCard(raw, input.boardId, input.stackId);
    if (!card) throw new Error('deck_invalid_response');
    return card;
}

export async function updateDeckCard(input: UpdateDeckCardInput): Promise<DeckCard> {
    const existing = await deckRequest<Record<string, unknown>>(
        `/boards/${input.boardId}/stacks/${input.stackId}/cards/${input.cardId}`,
    );
    const order = typeof existing.order === 'number' ? existing.order : 999;

    const payload: Record<string, unknown> = {
        title: input.title,
        description: input.description ?? '',
        type: 'plain',
        order,
        duedate: input.dueDate === undefined
            ? (typeof existing.duedate === 'string' ? existing.duedate : null)
            : input.dueDate,
    };

    const raw = await deckRequest<Record<string, unknown>>(
        `/boards/${input.boardId}/stacks/${input.stackId}/cards/${input.cardId}`,
        { method: 'PUT', body: JSON.stringify(payload) },
    );
    const card = sanitizeCard(raw, input.boardId, input.stackId);
    if (!card) throw new Error('deck_invalid_response');
    return card;
}

export function buildDeckCardOpenUrl(boardId: number, cardId: number): string | null {
    const cfg = getNextcloudConfig();
    if (!cfg.configured || !cfg.url) return null;
    const style = resolvedDeckUrlStyle ?? 'index.php';
    const prefix = deckWebAppPathForStyle(style);
    return `${cfg.url.replace(/\/+$/, '')}${prefix}#/board/${boardId}/card/${cardId}`;
}

export function buildDeckBoardOpenUrl(boardId: number): string | null {
    const cfg = getNextcloudConfig();
    if (!cfg.configured || !cfg.url) return null;
    const style = resolvedDeckUrlStyle ?? 'index.php';
    const prefix = deckWebAppPathForStyle(style);
    return `${cfg.url.replace(/\/+$/, '')}${prefix}#/board/${boardId}`;
}
