
import type { NextcloudFileList, NextcloudStatus, NextcloudUploadResult } from './nextcloudTypes';

const API_URL = '/api';

class ApiService {
    private token: string | null = null;

    constructor() {
        // Restore token from storage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('myrsi_auth_token');
        }
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    public setToken(token: string) {
        this.token = token;
        localStorage.setItem('myrsi_auth_token', token);
    }

    private logoutRedirectPending = false;

    /** Detect Vite accidentally serving api/*.ts when the dev API is not proxied. */
    private async parseJsonResponse(response: Response, label: string): Promise<unknown> {
        const ct = response.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
            return response.json();
        }
        const text = (await response.text()).trimStart();
        if (text.startsWith('import ')) {
            throw new Error(
                `${label}: Antwort ist Quellcode statt JSON. ` +
                'Vite neu starten und in einem zweiten Terminal „npm run dev:server“ ausführen (API auf Port 3001).',
            );
        }
        throw new Error(`${label}: Unerwartete Antwort — ${text.slice(0, 120)}`);
    }

    private handleResponseError(status: number) {
        if (status === 401) {
            console.warn("Session expired or unauthorized. Clearing session.");
            const hadToken = !!localStorage.getItem('myrsi_auth_token');
            localStorage.removeItem('myrsi_auth_token');
            localStorage.removeItem('myrsi_user');
            this.token = null;
            // Only reload if we actually cleared a token — prevents infinite reload loop
            // when the user is already logged out and initial-state returns 401.
            if (typeof window !== 'undefined' && hadToken && !this.logoutRedirectPending) {
                this.logoutRedirectPending = true;
                window.location.replace('/');
            }
        }
    }

    async getInitialState(): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=initial-state`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            const status = response.status;
            let hint = `HTTP ${status}`;
            if (status === 502 || status === 503) {
                hint = 'API nicht erreichbar — starte in einem zweiten Terminal: npm run dev:server';
            } else if (status === 401) {
                hint = 'Nicht autorisiert (Session abgelaufen oder ungültig)';
            }
            this.handleResponseError(status);
            throw new Error(`Failed to fetch initial state (${hint})`);
        }
        return this.parseJsonResponse(response, 'getInitialState');
    }

    async getState(): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=state`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error('Failed to fetch state');
        }
        return response.json();
    }

    async getStateSubset(subset: string): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=state&subset=${subset}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error(`Failed to fetch state subset: ${subset}`);
        }
        return response.json();
    }

    async getUserDetail(userId: number): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=state&subset=user_detail&id=${userId}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error(`Failed to fetch user detail: ${userId}`);
        }
        return response.json();
    }

    /** Realtime slice fetch: lite roster rows for the given user ids only. */
    async getUsersSlice(userIds: number[]): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=state&subset=users_slice&ids=${userIds.join(',')}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error(`Failed to fetch users slice: ${userIds.join(',')}`);
        }
        return response.json();
    }

    /** Realtime slice fetch: a single-row subset by id (operation_slice,
     *  warrant_slice, bulletin_slice, wiki_page_slice, ...). */
    async getStateSubsetWithId(subset: string, id: string): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=state&subset=${subset}&id=${encodeURIComponent(id)}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error(`Failed to fetch ${subset}: ${id}`);
        }
        return response.json();
    }

    /** Realtime slice fetch: one list-shaped operation (null = absent/not visible). */
    async getOperationSlice(operationId: string): Promise<any> {
        return this.getStateSubsetWithId('operation_slice', operationId);
    }

    /** Realtime slice fetch: operation templates only (not the ops list). */
    async getOperationTemplates(): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=state&subset=operation_templates`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error('Failed to fetch operation templates');
        }
        return response.json();
    }

    async getServiceRequest(id: string): Promise<any> {
        const response = await fetch(`${API_URL}/query?target=state&subset=request_detail&id=${id}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error(`Failed to fetch request detail: ${id}`);
        }
        return response.json();
    }

    async discordCallback(code: string, state: string | null, redirectUri: string): Promise<{ user: any, isNewUser: boolean, adminSetupToken?: string }> {
        // Explicitly send action in query param to bypass auth middleware logic if body parsing fails
        const response = await fetch(`${API_URL}/services?target=auth&action=auth:discord_callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'auth:discord_callback', // Also include in body for redundancy
                payload: { code, state, redirectUri }
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Auth Error Details:", error);
            throw new Error(error.message || 'Failed to authenticate with Discord');
        }

        // Unwrap RPC response structure { success: true, data: { ... } }
        const responseBody = await response.json();
        const data = responseBody.data;

        if (data && data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    async finalizeUserSetup(userData: { discordId: string, name: string, avatarUrl: string, rsiHandle: string, verificationCode?: string, isAdmin?: boolean, adminSetupToken?: string, skipVerification?: boolean }): Promise<any> {
        const response = await fetch(`${API_URL}/services?target=auth&action=auth:finalize_setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'auth:finalize_setup',
                payload: userData
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to finalize user setup');
        }

        // Unwrap RPC response structure { success: true, data: { ... } }
        const responseBody = await response.json();
        const data = responseBody.data;

        if (data && data.token) {
            this.setToken(data.token);
        }

        // Remove token from user object returned to UI (cleanliness)
        const { token, ...user } = data;
        return user;
    }

    async rpc(action: string, payload: any): Promise<any> {
        const response = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ action, payload }),
        });

        if (!response.ok) {
            this.handleResponseError(response.status);
            let message = `RPC action ${action} failed`;
            let requestId: string | undefined;
            try {
                const error = await response.json();
                if (error.message) message = error.message;
                if (typeof error.requestId === 'string') requestId = error.requestId;
            } catch {
                message = response.statusText || message;
            }
            // Surface the server-side requestId so users can quote it when
            // reporting issues; ops can grep server logs for [${requestId}].
            const err = new Error(requestId ? `${message} (ref: ${requestId})` : message);
            if (requestId) (err as Error & { requestId?: string }).requestId = requestId;
            throw err;
        }

        if (response.headers.get('content-type')?.includes('application/json')) {
            return response.json();
        }
    }

    // --- First-run onboarding ---

    /** Pre-auth preflight status (booleans only) for the setup wizard. */
    async preflight(): Promise<{ dbConnected: boolean; adminExists: boolean; discordConfigured: boolean; realtimeEnabled: boolean; secretsEncrypted: boolean; setupCompleted: boolean; setupCodeExists: boolean } | undefined> {
        const res = await this.rpc('system:preflight', {});
        return res?.data;
    }

    /** Validate + consume the admin claim code (after Discord sign-in) → admin grant. */
    async redeemSetupCode(discordId: string, code: string): Promise<{ adminSetupToken?: string }> {
        const res = await this.rpc('auth:redeem_setup_code', { discordId, code });
        return (res?.data || {}) as { adminSetupToken?: string };
    }

    /** Mark first-run setup complete (final wizard screen dismissed). */
    async completeSetup(): Promise<void> {
        await this.rpc('system:complete_setup', {});
    }

    /** Streamed org-data import: POST the raw NDJSON; onEvent fires per progress
     *  event (start/phase/table/warning/done/error) as the server emits it.
     *  `mergeImportedUserId` is the export user.id the admin mapped to themselves
     *  (the server re-anchors the admin onto it). A 'reauth' event carries a fresh
     *  session token (the merge may have changed the admin's id) — swapped in here
     *  transparently before it reaches onEvent. */
    async importOrgStream(ndjson: string, onEvent: (evt: any) => void, mergeImportedUserId?: number): Promise<void> {
        const headers: Record<string, string> = { 'Content-Type': 'application/x-ndjson' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        const qs = mergeImportedUserId != null ? `?mergeUserId=${encodeURIComponent(String(mergeImportedUserId))}` : '';
        const response = await fetch(`${API_URL}/admin/import-stream${qs}`, { method: 'POST', headers, body: ndjson });
        if (!response.ok || !response.body) {
            this.handleResponseError(response.status);
            let message = 'Import failed';
            try { const e = await response.json(); if (e.error) message = e.error; } catch { /* non-json error body */ }
            throw new Error(message);
        }
        const emit = (raw: string) => {
            let evt: any;
            try { evt = JSON.parse(raw); } catch { return; }
            // Merge re-anchor: adopt the re-issued token before surfacing the event
            // so the next call (e.g. completeSetup / refreshUser) is authenticated.
            if (evt && evt.type === 'reauth' && typeof evt.token === 'string') this.setToken(evt.token);
            onEvent(evt);
        };
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (line) emit(line);
            }
        }
        const tail = buffer.trim();
        if (tail) emit(tail);
    }

    async getNextcloudStatus(): Promise<NextcloudStatus> {
        const response = await fetch(`${API_URL}/nextcloud/status`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            throw new Error('Failed to fetch Nextcloud status');
        }
        return this.parseJsonResponse(response, 'getNextcloudStatus') as Promise<NextcloudStatus>;
    }

    async getNextcloudFiles(path: string = '/'): Promise<NextcloudFileList> {
        const qs = new URLSearchParams({ path });
        const response = await fetch(`${API_URL}/nextcloud/files?${qs}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            const body = await response.json().catch(() => ({})) as { message?: string };
            throw new Error(body.message || 'Failed to fetch Nextcloud files');
        }
        return this.parseJsonResponse(response, 'getNextcloudFiles') as Promise<NextcloudFileList>;
    }

    private async fetchNextcloudBlob(path: string, endpoint: 'preview' | 'download'): Promise<Blob> {
        const qs = new URLSearchParams({ path });
        const response = await fetch(`${API_URL}/nextcloud/${endpoint}?${qs}`, {
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            const body = await response.json().catch(() => ({})) as { message?: string };
            throw new Error(body.message || `Nextcloud ${endpoint} fehlgeschlagen`);
        }
        return response.blob();
    }

    async getNextcloudPreviewBlob(path: string): Promise<Blob> {
        return this.fetchNextcloudBlob(path, 'preview');
    }

    async downloadNextcloudFile(path: string): Promise<Blob> {
        return this.fetchNextcloudBlob(path, 'download');
    }

    async uploadNextcloudFile(file: File, targetPath: string): Promise<NextcloudUploadResult> {
        const form = new FormData();
        form.append('file', file);
        form.append('targetPath', targetPath);
        const response = await fetch(`${API_URL}/nextcloud/upload`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: form,
        });
        if (!response.ok) {
            this.handleResponseError(response.status);
            const body = await response.json().catch(() => ({})) as { message?: string };
            throw new Error(body.message || 'Upload fehlgeschlagen');
        }
        return this.parseJsonResponse(response, 'uploadNextcloudFile') as Promise<NextcloudUploadResult>;
    }
}

export default new ApiService();
