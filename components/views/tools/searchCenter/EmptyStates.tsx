import React from 'react';

interface EmptyProps {
    query?: string;
}

export const EmptyIdle: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-60">
        <i className="fa-brands fa-searchengin text-6xl mb-4" aria-hidden />
        <p className="text-lg font-bold uppercase tracking-widest">Warten auf Abfrageeingabe</p>
        <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wider">Verwenden du das Filterfeld, um den Bereich einzugrenzen</p>
    </div>
);

export const EmptyNoMatches: React.FC<EmptyProps> = ({ query }) => (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <i className="fa-solid fa-ghost text-4xl mb-4" aria-hidden />
        <p>No records found{query ? ` matching "${query}"` : ''}</p>
        <p className="text-xs text-slate-600 mt-2 font-mono uppercase tracking-wider">Versuche es mit einem anderen Begriff oder lockern du die Filter</p>
    </div>
);

export const EmptyNoTypes: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-20 text-amber-400">
        <i className="fa-solid fa-filter-circle-xmark text-4xl mb-4" aria-hidden />
        <p>Alle Ergebnistypen werden herausgefiltert</p>
        <p className="text-xs text-amber-500/70 mt-2 font-mono uppercase tracking-wider">Aktivieren du mindestens einen Typ im Filterbereich</p>
    </div>
);
