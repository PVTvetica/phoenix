import type { TablesStatus } from '../../../services/nextcloudTablesTypes';

export function tablesStatusLabel(status: {
    configured: boolean;
    available: boolean;
}): 'Aktiv' | 'Nicht konfiguriert' | 'Fehler' {
    if (!status.configured) return 'Nicht konfiguriert';
    if (status.available) return 'Aktiv';
    return 'Fehler';
}

export function tablesStatusAccent(
    status: { configured: boolean; available: boolean },
): 'emerald' | 'amber' | 'red' {
    if (!status.configured) return 'amber';
    if (status.available) return 'emerald';
    return 'red';
}

export function cellText(value: string | undefined): string {
    return (value ?? '').trim() || '—';
}
