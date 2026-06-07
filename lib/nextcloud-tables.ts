import { getNextcloudConfig } from './nextcloud.js';
import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'nextcloud-tables' });

export type TablesUrlStyle = 'index.php' | 'pretty';

export interface TablesStatus {
    configured: boolean;
    available: boolean;
    urlStyle?: TablesUrlStyle;
    error?: string;
}

export interface TablesTable {
    id: number;
    title: string;
    description?: string;
    ownership?: string;
    url?: string;
}

export interface TablesColumn {
    id: number;
    title: string;
    type?: string;
    mandatory?: boolean;
}

export interface TablesSchema {
    tableId: number;
    columns: TablesColumn[];
}

export interface TablesRow {
    id: number;
    cells: Record<string, string>;
}

export interface TablesRowsResult {
    tableId: number;
    rows: TablesRow[];
    columns?: TablesColumn[];
    limit: number;
    offset: number;
    hasMore: boolean;
}

const TABLES_URL_STYLES: TablesUrlStyle[] = ['index.php', 'pretty'];
const DEFAULT_ROW_LIMIT = 50;
const MAX_ROW_LIMIT = 100;

let resolvedTablesUrlStyle: TablesUrlStyle | null = null;

function tablesApiBaseForStyle(serverUrl: string, style: TablesUrlStyle): string {
    const base = serverUrl.replace(/\/+$/, '');
    return style === 'index.php'
        ? `${base}/index.php/apps/tables/api/1`
        : `${base}/apps/tables/api/1`;
}

export function tablesWebAppPathForStyle(style: TablesUrlStyle): string {
    return style === 'index.php' ? '/index.php/apps/tables' : '/apps/tables';
}

export function getResolvedTablesUrlStyle(): TablesUrlStyle | null {
    return resolvedTablesUrlStyle;
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

export function parseTableIdParam(raw: string | string[] | undefined): number | null {
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (!s || !/^\d+$/.test(s)) return null;
    return parsePositiveInt(s);
}

export function parseRowPagination(
    limitRaw?: string,
    offsetRaw?: string,
): { limit: number; offset: number } {
    let limit = DEFAULT_ROW_LIMIT;
    if (limitRaw != null && limitRaw !== '') {
        const n = Number(limitRaw);
        if (!Number.isInteger(n) || n < 1) throw new Error('invalid_pagination');
        limit = Math.min(n, MAX_ROW_LIMIT);
    }

    let offset = 0;
    if (offsetRaw != null && offsetRaw !== '') {
        const n = Number(offsetRaw);
        if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw new Error('invalid_pagination');
        offset = n;
    }

    return { limit, offset };
}

function buildTablesHeaders(init: RequestInit, user: string, password: string): Headers {
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

function unwrapTablesPayload(body: unknown): unknown {
    const root = asRecord(body);
    if (!root) return body;
    const ocs = asRecord(root.ocs);
    if (ocs && 'data' in ocs) return ocs.data;
    return body;
}

function mapTablesHttpError(res: Response): Error {
    if (res.status === 401 || res.status === 403) return new Error('tables_auth_failed');
    if (res.status === 404) return new Error('tables_not_found');
    return new Error('tables_unreachable');
}

async function tablesRequest(path: string, init: RequestInit = {}): Promise<unknown> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    const stylesToTry: TablesUrlStyle[] = resolvedTablesUrlStyle
        ? [resolvedTablesUrlStyle]
        : TABLES_URL_STYLES;

    let lastRetryable = false;

    for (let i = 0; i < stylesToTry.length; i++) {
        const style = stylesToTry[i];
        const url = `${tablesApiBaseForStyle(cfg.url, style)}${path}`;
        const headers = buildTablesHeaders(init, cfg.user, cfg.password);
        const res = await fetch(url, { ...init, headers });

        if (!resolvedTablesUrlStyle && shouldRetryWithFallback(res) && i < stylesToTry.length - 1) {
            log.info('tables api path fallback', { tried: style, path });
            lastRetryable = true;
            continue;
        }

        const ct = res.headers.get('content-type') ?? '';
        if (!ct.includes('json')) {
            log.warn('tables non-json response', { status: res.status, path, style });
            if (res.status === 404) throw new Error('tables_unavailable');
            throw new Error('tables_unreachable');
        }

        if (!res.ok) throw mapTablesHttpError(res);

        if (!resolvedTablesUrlStyle) {
            resolvedTablesUrlStyle = style;
            log.info('tables api path resolved', { style });
        }

        const body = await res.json() as unknown;
        return unwrapTablesPayload(body);
    }

    if (lastRetryable) throw new Error('tables_unavailable');
    throw new Error('tables_unreachable');
}

async function tablesOcsV2Request(path: string, init: RequestInit = {}): Promise<unknown> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    const base = cfg.url.replace(/\/+$/, '');
    const url = `${base}/ocs/v2.php/apps/tables/api/2${path}`;
    const headers = buildTablesHeaders(init, cfg.user, cfg.password);
    const res = await fetch(url, { ...init, headers });

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) {
        if (res.status === 404) throw new Error('tables_unavailable');
        throw new Error('tables_unreachable');
    }
    if (!res.ok) throw mapTablesHttpError(res);

    const body = await res.json() as unknown;
    return unwrapTablesPayload(body);
}

export function buildTablesOpenUrl(serverUrl: string, tableId: number, style?: TablesUrlStyle): string {
    const base = serverUrl.replace(/\/+$/, '');
    const pathStyle = style ?? resolvedTablesUrlStyle ?? 'index.php';
    return `${base}${tablesWebAppPathForStyle(pathStyle)}/#/table/${tableId}`;
}

function sanitizeTable(raw: unknown, serverUrl: string, style?: TablesUrlStyle): TablesTable | null {
    const o = asRecord(raw);
    if (!o) return null;
    const id = parsePositiveInt(o.id);
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!id || !title) return null;
    if (o.archived === true) return null;

    let description: string | undefined;
    if (typeof o.description === 'string' && o.description.trim()) {
        description = stripHtml(o.description).slice(0, 2000);
    }

    const ownership = typeof o.ownership === 'string' ? o.ownership.slice(0, 128) : undefined;

    return {
        id,
        title: title.slice(0, 255),
        description,
        ownership,
        url: buildTablesOpenUrl(serverUrl, id, style),
    };
}

function sanitizeColumn(raw: unknown): TablesColumn | null {
    const o = asRecord(raw);
    if (!o) return null;
    const id = parsePositiveInt(o.id);
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!id || !title) return null;
    return {
        id,
        title: title.slice(0, 255),
        type: typeof o.type === 'string' ? o.type.slice(0, 64) : undefined,
        mandatory: typeof o.mandatory === 'boolean' ? o.mandatory : undefined,
    };
}

function formatCellValue(raw: unknown): string {
    if (raw == null) return '';
    if (typeof raw === 'string') return stripHtml(raw).slice(0, 2000);
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
    if (Array.isArray(raw)) {
        return raw.map(formatCellValue).filter(Boolean).join(', ').slice(0, 2000);
    }
    if (typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        if (typeof o.label === 'string') return stripHtml(o.label).slice(0, 2000);
        if (typeof o.displayName === 'string') return stripHtml(o.displayName).slice(0, 2000);
        if (typeof o.value === 'string') return stripHtml(o.value).slice(0, 2000);
        if (typeof o.value === 'number') return String(o.value);
        if (typeof o.name === 'string') return stripHtml(o.name).slice(0, 2000);
        if (typeof o.title === 'string') return stripHtml(o.title).slice(0, 2000);
        try {
            return JSON.stringify(raw).slice(0, 500);
        } catch {
            return '';
        }
    }
    return String(raw).slice(0, 2000);
}

function extractRowCells(data: unknown): Record<string, string> {
    const cells: Record<string, string> = {};
    const o = asRecord(data);
    if (!o) return cells;

    for (const [key, value] of Object.entries(o)) {
        if (!/^\d+$/.test(key)) continue;
        const text = formatCellValue(value);
        if (text) cells[key] = text;
    }
    return cells;
}

function sanitizeRow(raw: unknown): TablesRow | null {
    const o = asRecord(raw);
    if (!o) return null;
    const id = parsePositiveInt(o.id);
    if (!id) return null;
    return {
        id,
        cells: extractRowCells(o.data),
    };
}

function sortColumns(columns: TablesColumn[], rawColumns: unknown[]): TablesColumn[] {
    const order = new Map<number, number>();
    for (const raw of rawColumns) {
        const o = asRecord(raw);
        const id = parsePositiveInt(o?.id);
        const weight = typeof o?.orderWeight === 'number' ? o.orderWeight : null;
        if (id != null && weight != null) order.set(id, weight);
    }
    return [...columns].sort((a, b) => {
        const wa = order.get(a.id) ?? a.id;
        const wb = order.get(b.id) ?? b.id;
        return wa - wb || a.id - b.id;
    });
}

export async function getTablesStatus(): Promise<TablesStatus> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) {
        return { configured: false, available: false };
    }
    try {
        await tablesRequest('/tables');
        return {
            configured: true,
            available: true,
            urlStyle: resolvedTablesUrlStyle ?? undefined,
        };
    } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'tables_unavailable' || msg === 'tables_auth_failed') {
            try {
                await tablesOcsV2Request('/init');
                return {
                    configured: true,
                    available: true,
                    urlStyle: resolvedTablesUrlStyle ?? 'index.php',
                };
            } catch {
                return {
                    configured: true,
                    available: false,
                    error: 'Tables-App nicht verfügbar. App installiert und App-Passwort berechtigt?',
                };
            }
        }
        return {
            configured: true,
            available: false,
            error: 'Tables-Integration nicht erreichbar.',
        };
    }
}

export async function listTables(): Promise<TablesTable[]> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    try {
        const raw = await tablesRequest('/tables');
        if (Array.isArray(raw)) {
            const style = resolvedTablesUrlStyle ?? undefined;
            return raw
                .map((t) => sanitizeTable(t, cfg.url, style))
                .filter((t): t is TablesTable => !!t)
                .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg !== 'tables_unavailable' && msg !== 'tables_unreachable' && msg !== 'tables_auth_failed') {
            throw e;
        }
        log.info('tables v1 list failed, trying ocs v2', { msg });
    }

    const rawV2 = await tablesOcsV2Request('/tables');
    if (!Array.isArray(rawV2)) return [];
    const style = resolvedTablesUrlStyle ?? 'index.php';
    return rawV2
        .map((t) => sanitizeTable(t, cfg.url, style))
        .filter((t): t is TablesTable => !!t)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

async function fetchColumnsRaw(tableId: number): Promise<unknown[]> {
    try {
        const raw = await tablesRequest(`/tables/${tableId}/columns`);
        if (Array.isArray(raw)) return raw;
    } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg !== 'tables_not_found' && msg !== 'tables_unreachable' && msg !== 'tables_unavailable') {
            throw e;
        }
        log.info('tables v1 columns failed, trying ocs v2', { tableId, msg });
    }

    const rawV2 = await tablesOcsV2Request(`/columns/table/${tableId}`);
    return Array.isArray(rawV2) ? rawV2 : [];
}

export async function getTableSchema(tableId: number): Promise<TablesSchema> {
    const raw = await fetchColumnsRaw(tableId);
    const columns = sortColumns(
        raw.map(sanitizeColumn).filter((c): c is TablesColumn => !!c),
        raw,
    );
    return { tableId, columns };
}

export async function listTableRows(
    tableId: number,
    limitRaw?: string,
    offsetRaw?: string,
): Promise<TablesRowsResult> {
    const { limit, offset } = parseRowPagination(limitRaw, offsetRaw);
    const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
    });

    const raw = await tablesRequest(`/tables/${tableId}/rows?${params}`);
    const rows = Array.isArray(raw)
        ? raw.map(sanitizeRow).filter((r): r is TablesRow => !!r)
        : [];

    let columns: TablesColumn[] | undefined;
    try {
        columns = (await getTableSchema(tableId)).columns;
    } catch {
        columns = undefined;
    }

    return {
        tableId,
        rows,
        columns,
        limit,
        offset,
        hasMore: rows.length >= limit,
    };
}

export async function assertTableExists(tableId: number): Promise<void> {
    const tables = await listTables();
    if (!tables.some(t => t.id === tableId)) throw new Error('tables_not_found');
}
