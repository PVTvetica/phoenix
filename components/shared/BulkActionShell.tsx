import React from 'react';
import { User } from '../../types';
import WindowFrame, { WindowColor } from '../layout/WindowFrame';

interface Props {
    title: string;
    subtitle?: string;
    selectedUsers: User[];
    onClose: () => void;
    onConfirm: () => void;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    busy?: boolean;
    children: React.ReactNode;
    footerNote?: string;
    /** Hide footer entirely (used while a progress display is showing inside `children`). */
    hideFooter?: boolean;
    /** Override the window-frame icon. Defaults to a generic bulk-action glyph. */
    icon?: string;
    /** Override the window-frame accent. Defaults to sky. */
    color?: WindowColor;
}

/**
 * Common chrome for bulk-action modals: header, scrollable body slot,
 * collapsed selected-user preview, footer with Cancel/Confirm. Renders
 * inside a shared `WindowFrame` so close/minimize/drag/resize behavior is
 * consistent with every other modal in the app.
 */
const BulkActionShell: React.FC<Props> = ({
    title,
    subtitle,
    selectedUsers,
    onClose,
    onConfirm,
    confirmLabel = 'Apply',
    confirmDisabled,
    busy,
    children,
    footerNote,
    hideFooter,
    icon = 'fa-solid fa-users-gear',
    color = 'sky',
}) => {
    const userCountLabel = `${selectedUsers.length} ${selectedUsers.length === 1 ? 'user' : 'users'} selected`;

    return (
        <WindowFrame
            isOpen
            onClose={busy ? () => { /* block close while busy */ } : onClose}
            title={title}
            subtitle={subtitle || userCountLabel}
            icon={icon}
            color={color}
            width="max-w-2xl"
        >
            <div className="flex flex-col h-full">
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Repeat the count inline when caller supplied a custom subtitle, so
                        the user count is always visible somewhere in the modal. */}
                    {subtitle && (
                        <p className="text-[11px] text-slate-500">{userCountLabel}</p>
                    )}

                    {children}

                    {selectedUsers.length > 0 && (
                        <details className="rounded-md border border-white/5 bg-slate-950/30">
                            <summary className="px-3 py-2 cursor-pointer text-xs font-bold text-slate-300 hover:text-white">
                                Selected users ({selectedUsers.length})
                            </summary>
                            <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                                {selectedUsers.map((u) => (
                                    <li
                                        key={u.id}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs"
                                    >
                                        <img
                                            src={u.avatarUrl}
                                            alt=""
                                            className="w-5 h-5 rounded-full bg-slate-800"
                                        />
                                        <span className="text-white truncate flex-1">{u.name}</span>
                                        <span className="text-slate-500 text-[10px]">{u.role}</span>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>

                {/* Footer */}
                {!hideFooter && (
                    <div className="border-t border-white/10 bg-slate-950/50 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
                        <div className="text-xs text-slate-400 min-w-0 flex-1">
                            {footerNote}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={onClose}
                                disabled={busy}
                                className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                            >Abbrechen</button>
                            <button
                                onClick={onConfirm}
                                disabled={confirmDisabled || busy}
                                className="px-5 py-2 text-sm font-bold rounded-md bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {busy ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch animate-spin mr-2" />Arbeiten…</>
                                ) : (
                                    confirmLabel
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </WindowFrame>
    );
};

export default BulkActionShell;
