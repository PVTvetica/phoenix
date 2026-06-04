import { WarrantStatus, WarrantAction } from '../../../../types';
import type { AccentKey } from '../../../shared/ui/accents';

/** Visual accent for the warrant status. Active + Standing share red — both are live hunts. */
export const warrantStatusAccent = (s: WarrantStatus): AccentKey => {
    switch (s) {
        case WarrantStatus.Active:
        case WarrantStatus.Standing:
            return 'red';
        case WarrantStatus.Claimed: return 'emerald';
        case WarrantStatus.Cancelled: return 'slate';
        default: return 'slate';
    }
};

export const warrantStatusLabel = (s: WarrantStatus): string => s.toUpperCase();

export const warrantStatusIcon = (s: WarrantStatus): string => {
    switch (s) {
        case WarrantStatus.Active: return 'fa-bolt';
        case WarrantStatus.Standing: return 'fa-fire';
        case WarrantStatus.Claimed: return 'fa-handcuffs';
        case WarrantStatus.Cancelled: return 'fa-ban';
        default: return 'fa-circle';
    }
};

/** Is this warrant still live (one of the "hunt now" statuses)? */
export const warrantIsLive = (s: WarrantStatus): boolean =>
    s === WarrantStatus.Active || s === WarrantStatus.Standing;

export const warrantActionAccent = (a: WarrantAction): AccentKey => {
    switch (a) {
        case WarrantAction.ExtremeCaution: return 'red';
        case WarrantAction.HighCaution: return 'amber';
        case WarrantAction.Caution: return 'sky';
        default: return 'slate';
    }
};

export const warrantActionIcon = (a: WarrantAction): string => {
    switch (a) {
        case WarrantAction.ExtremeCaution: return 'fa-triangle-exclamation';
        case WarrantAction.HighCaution: return 'fa-circle-exclamation';
        case WarrantAction.Caution: return 'fa-eye';
        default: return 'fa-file-signature';
    }
};

export const warrantActionLabel = (a: WarrantAction): string => {
    switch (a) {
        case WarrantAction.ExtremeCaution: return 'EXTREME CAUTION';
        case WarrantAction.HighCaution: return 'HIGH CAUTION';
        case WarrantAction.Caution: return 'CAUTION';
        default: return String(a).toUpperCase();
    }
};

export const timeAgoShort = (iso: string): string => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60_000);
    const hours = Math.round(diffMs / 3_600_000);
    const days = Math.round(diffMs / 86_400_000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 30) return `${days}d`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo`;
    return `${Math.round(days / 365)}y`;
};
