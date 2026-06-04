import React from 'react';

// Toggle switch with a sliding thumb. Used in the operation-creation wizard
// in place of a checkbox + label combo so the surface feels like a settings
// surface, not a form. Supports four accent colors that match the wizard's
// palette (purple/amber/cyan/discord).

export type SwitchAccent = 'purple' | 'amber' | 'cyan' | 'discord';

interface SwitchProps {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    accent?: SwitchAccent;
    disabled?: boolean;
    className?: string;
}

const ACCENTS: Record<SwitchAccent, { track: string; thumbRing: string; labelHover: string }> = {
    purple:  { track: 'bg-purple-500',     thumbRing: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]', labelHover: 'group-hover:text-purple-300' },
    amber:   { track: 'bg-amber-500',      thumbRing: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]', labelHover: 'group-hover:text-amber-300' },
    cyan:    { track: 'bg-cyan-500',       thumbRing: 'shadow-[0_0_8px_rgba(6,182,212,0.5)]',  labelHover: 'group-hover:text-cyan-300' },
    discord: { track: 'bg-[#5865F2]',      thumbRing: 'shadow-[0_0_8px_rgba(88,101,242,0.5)]', labelHover: 'group-hover:text-[#7289da]' },
};

const Switch: React.FC<SwitchProps> = ({
    label,
    hint,
    checked,
    onChange,
    accent = 'purple',
    disabled = false,
    className = '',
}) => {
    const a = ACCENTS[accent];

    return (
        <label
            className={`group flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
        >
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex shrink-0 h-5 w-9 items-center rounded-full border transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500/40 ${
                    checked
                        ? `${a.track} border-transparent`
                        : 'bg-slate-800 border-slate-700'
                }`}
            >
                <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        checked ? `translate-x-[18px] ${a.thumbRing}` : 'translate-x-[3px]'
                    }`}
                    aria-hidden
                />
            </button>
            <div className="min-w-0">
                <span className={`text-xs font-bold text-white block transition-colors ${a.labelHover}`}>{label}</span>
                {hint && <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{hint}</span>}
            </div>
        </label>
    );
};

export default Switch;
