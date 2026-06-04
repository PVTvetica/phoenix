export type AccentKey =
    | 'sky'
    | 'emerald'
    | 'purple'
    | 'amber'
    | 'rose'
    | 'indigo'
    | 'cyan'
    | 'orange'
    | 'red'
    | 'slate';

export interface AccentSpec {
    text: string;
    bg: string;
    border: string;
    dot: string;
    grad: string;
    ring: string;
    btn: string;
    /** Vertical gradient used by HeroShell for the hero background. */
    heroGrad: string;
    /** Soft blurred orb color used behind the hero content. */
    heroOrb: string;
}

export const ACCENTS: Record<AccentKey, AccentSpec> = {
    sky:     { text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     dot: 'bg-sky-500',     grad: 'from-sky-500/20 to-sky-500/0',         ring: 'ring-sky-500/20',     btn: 'bg-sky-600 hover:bg-sky-500',         heroGrad: 'bg-linear-to-b from-sky-950/30 via-slate-950/80 to-slate-950',     heroOrb: 'bg-sky-500/10' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500', grad: 'from-emerald-500/20 to-emerald-500/0', ring: 'ring-emerald-500/20', btn: 'bg-emerald-600 hover:bg-emerald-500', heroGrad: 'bg-linear-to-b from-emerald-950/30 via-slate-950/80 to-slate-950', heroOrb: 'bg-emerald-500/10' },
    purple:  { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  dot: 'bg-purple-500',  grad: 'from-purple-500/20 to-purple-500/0',   ring: 'ring-purple-500/20',  btn: 'bg-purple-600 hover:bg-purple-500',   heroGrad: 'bg-linear-to-b from-purple-950/30 via-slate-950/80 to-slate-950',  heroOrb: 'bg-purple-500/10' },
    amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-500',   grad: 'from-amber-500/20 to-amber-500/0',     ring: 'ring-amber-500/20',   btn: 'bg-amber-600 hover:bg-amber-500',     heroGrad: 'bg-linear-to-b from-amber-950/30 via-slate-950/80 to-slate-950',   heroOrb: 'bg-amber-500/10' },
    rose:    { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    dot: 'bg-rose-500',    grad: 'from-rose-500/20 to-rose-500/0',       ring: 'ring-rose-500/20',    btn: 'bg-rose-600 hover:bg-rose-500',       heroGrad: 'bg-linear-to-b from-rose-950/30 via-slate-950/80 to-slate-950',    heroOrb: 'bg-rose-500/10' },
    indigo:  { text: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  dot: 'bg-indigo-500',  grad: 'from-indigo-500/20 to-indigo-500/0',   ring: 'ring-indigo-500/20',  btn: 'bg-indigo-600 hover:bg-indigo-500',   heroGrad: 'bg-linear-to-b from-indigo-950/30 via-slate-950/80 to-slate-950',  heroOrb: 'bg-indigo-500/10' },
    cyan:    { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    dot: 'bg-cyan-500',    grad: 'from-cyan-500/20 to-cyan-500/0',       ring: 'ring-cyan-500/20',    btn: 'bg-cyan-600 hover:bg-cyan-500',       heroGrad: 'bg-linear-to-b from-cyan-950/30 via-slate-950/80 to-slate-950',    heroOrb: 'bg-cyan-500/10' },
    orange:  { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-500',  grad: 'from-orange-500/20 to-orange-500/0',   ring: 'ring-orange-500/20',  btn: 'bg-orange-600 hover:bg-orange-500',   heroGrad: 'bg-linear-to-b from-orange-950/30 via-slate-950/80 to-slate-950',  heroOrb: 'bg-orange-500/10' },
    red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-500',     grad: 'from-red-500/20 to-red-500/0',         ring: 'ring-red-500/20',     btn: 'bg-red-600 hover:bg-red-500',         heroGrad: 'bg-linear-to-b from-red-950/30 via-slate-950/80 to-slate-950',     heroOrb: 'bg-red-500/10' },
    slate:   { text: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   dot: 'bg-slate-500',   grad: 'from-slate-500/10 to-slate-500/0',     ring: 'ring-slate-500/10',   btn: 'bg-slate-700 hover:bg-slate-600',     heroGrad: 'bg-linear-to-b from-slate-900/60 via-slate-950/80 to-slate-950',   heroOrb: 'bg-slate-500/10' },
};
