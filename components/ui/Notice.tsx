import React from 'react';
import { Announcement, AnnouncementType } from '../../types';
import { ACCENTS, AccentKey } from '../shared/ui/accents';
import { timeAgoShort } from '../views/intel/intelStyles';

const typeAccent = (type: AnnouncementType): AccentKey => {
    switch (type) {
        case AnnouncementType.Danger: return 'red';
        case AnnouncementType.Warning: return 'amber';
        case AnnouncementType.Information:
        default: return 'sky';
    }
};

const typeIcon = (type: AnnouncementType): string => {
    switch (type) {
        case AnnouncementType.Danger: return 'fa-circle-exclamation';
        case AnnouncementType.Warning: return 'fa-triangle-exclamation';
        case AnnouncementType.Information:
        default: return 'fa-circle-info';
    }
};

const formatRemaining = (ms: number): string => {
    const mins = Math.round(ms / 60_000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(ms / 3_600_000);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(ms / 86_400_000);
    return `${days}d`;
};

const formatExpiry = (iso: string | undefined): { label: string; isSoon: boolean } | null => {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return null;
    const remainingMs = t - Date.now();
    if (remainingMs <= 0) return { label: 'EXPIRED', isSoon: true };
    const hours = remainingMs / 3_600_000;
    return { label: `EXPIRES IN ${formatRemaining(remainingMs)}`.toUpperCase(), isSoon: hours < 24 };
};

const Notice: React.FC<{ announcement: Announcement }> = ({ announcement }) => {
    const accentKey = typeAccent(announcement.type);
    const a = ACCENTS[accentKey];
    const icon = typeIcon(announcement.type);
    const isDanger = announcement.type === AnnouncementType.Danger;
    const expiry = formatExpiry(announcement.expiryDate);

    return (
        <div
            className="group relative rounded-xl overflow-hidden border border-white/10 bg-linear-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 backdrop-blur-xs shadow-lg transition-colors hover:border-white/20 animate-fade-in"
        >
            {/* accent rail */}
            <div
                className={`absolute inset-y-0 left-0 w-1 ${a.dot} ${isDanger ? 'animate-pulse' : ''}`}
                aria-hidden
            />

            {/* hover orb */}
            <div
                className={`absolute -top-20 -left-10 w-64 h-64 ${a.bg} rounded-full blur-[90px] opacity-0 group-hover:opacity-60 pointer-events-none transition-opacity duration-500`}
                aria-hidden
            />

            {/* HEADER */}
            <div className="relative pl-4 pr-3 py-3 bg-slate-950/40 border-b border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg ${a.bg} border ${a.border} flex items-center justify-center shrink-0`}>
                        <i className={`fa-solid ${icon} ${a.text} text-base`} aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-white font-bold text-base sm:text-lg leading-tight truncate">
                            {announcement.title}
                        </h2>
                        {announcement.publishDate && (
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                <i className="fa-regular fa-clock mr-1" aria-hidden />
                                {timeAgoShort(announcement.publishDate)}
                            </p>
                        )}
                    </div>
                </div>
                <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-black text-[9px] uppercase tracking-widest shrink-0 ${a.bg} ${a.border} ${a.text}`}
                >
                    {announcement.type}
                </span>
            </div>

            {/* BODY */}
            <div className="relative pl-4 pr-4 py-4">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {announcement.body}
                </p>
            </div>

            {/* FOOTER */}
            <div className="relative pl-4 pr-3 py-2 bg-slate-950/40 border-t border-white/5 flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-widest">
                <span className="text-slate-500 truncate">
                    AUTH · {announcement.author}
                </span>
                {expiry && (
                    <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border shrink-0 ${
                            expiry.isSoon
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-slate-900/60 border-white/10 text-slate-500'
                        }`}
                    >
                        <i className="fa-regular fa-hourglass-half" aria-hidden />
                        {expiry.label}
                    </span>
                )}
            </div>
        </div>
    );
};

export default Notice;
