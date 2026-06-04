
import React from 'react';
import CallsignChip from '../../shared/ui/CallsignChip';

interface ChangeLogViewProps {
    onBack: () => void;
}

const VersionCard: React.FC<{ version: string; title: string; children: React.ReactNode; isLatest?: boolean }> = ({ version, title, children, isLatest }) => (
    <section className={`bg-slate-900/80 backdrop-blur-md border rounded-xl p-5 sm:p-6 space-y-4 shadow-lg transition-all ${isLatest ? 'border-sky-500/50 shadow-sky-900/20' : 'border-slate-700/50 hover:border-slate-600'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
            <div>
                <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{`Version ${version}`}</h2>
                    {isLatest && <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest">Aktuelle Version</span>}
                </div>
                <p className="text-[10px] text-sky-300 font-black uppercase tracking-widest mt-1">{title}</p>
            </div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Archive ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
        </div>
        <ul className="list-none space-y-3 text-slate-300 text-sm">
            {children}
        </ul>
    </section>
);

const ChangeLogView: React.FC<ChangeLogViewProps> = ({ onBack }) => {
    return (
        <div className="h-full flex flex-col overflow-hidden animate-fade-in">
            {/* Hero */}
            <div className="shrink-0 relative overflow-hidden border-b border-white/5 bg-linear-to-b from-sky-950/30 via-slate-950/80 to-slate-950">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" aria-hidden />

                <div className="relative px-4 sm:px-8 pt-10 pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div className="min-w-0">
                            <CallsignChip label="MODULE · CHANGELOG" icon="fa-scroll" accent="sky" />
                            <h1 className="mt-3 text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">Systemänderungsprotokoll</h1>
                            <p className="mt-2 text-sm text-slate-400 max-w-2xl">Betriebsaktualisierungen und Versionsverlauf der Plattform.</p>
                        </div>
                        <div className="flex shrink-0">
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 bg-slate-900/60 border border-slate-700 rounded-lg hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300 transition-colors"
                            >
                                <i className="fa-solid fa-arrow-left"></i>Zurück zur Hilfe</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">

                {/* LATEST VERSION */}
                <VersionCard version="15.0.0-open" title="The Open-Source Release" isLatest>
                    <li><strong className="text-green-400">[Release]</strong> <strong className="font-semibold text-slate-100">Selbstgehosteter Open-Source-Build</strong>: MyRSI.org is now available as a self-hostable build under a source-available, noncommercial licence. One deployment runs one organisation — bring your own Supabase project and Discord application, drop in your environment config, and a polished first-run setup wizard walks you from a preflight environment check through Discord sign-in, the one-time admin claim code, RSI handle verification, and an optional import of your existing data. The first Discord login that redeems the console setup code becomes Admin.</li>
                    <li><strong className="font-semibold text-slate-100">A personal note.</strong> This release is my soft close on MyRSI. It is not the final update and I am not disappearing, but it marks the point where I step back from the day to day. I wanted to leave the platform in the best and safest state I could, and to make sure none of you are ever locked in. Here is what that looks like.</li>
                    <li><strong className="font-semibold text-slate-100">Optionsscheine sind jetzt Warnhinweise.</strong> Same feature, friendlier name. It flags people your organisation should be wary of and shows a clear warning on any service request that involves them. The old labels are gone, replaced with three simple levels: Caution, High Caution, and Extreme Caution.</li>
                    <li><strong className="font-semibold text-slate-100">Sicherheit und Datenschutz standen an erster Stelle.</strong> After the security incident some of you saw earlier, I went back through the entire platform from top to bottom reviewing any point at which data is transacted. This was the single biggest part of the release.</li>
                    <li><strong className="font-semibold text-slate-100">MyRSI ist jetzt Open Source.</strong> The platform is free and open for anyone to read, run, and build on. The full source for the self hosted version lives at <a href="https://github.com/MyRSI-org/open-myrsi-org" target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 underline">github.com/MyRSI-org/open-myrsi-org</a>. If you ever want to host your own copy or just see how everything works under the hood, it is all there. Your org owner can export your full organisation's data from the billing portal at any time to take it with you.</li>
                    <li><strong className="font-semibold text-slate-100">Zuverlässigkeit und Ordnung.</strong> I fixed a range of behind the scenes issues that could trip up sign in or pages, made the app much clearer when something goes wrong, and removed a few older tools that were no longer needed.</li>
                    <li><strong className="font-semibold text-slate-100">Danke schön.</strong> Trusting me with your organisations has genuinely meant a lot. The lights stay on, the code is yours, and I am still around. Fly safe.</li>
                </VersionCard>

                <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center">
                        <span className="h-px bg-slate-700 grow mr-4"></span>Versionsgeschichte<span className="h-px bg-slate-700 grow ml-4"></span>
                    </h3>

                    <VersionCard version="14.8.0-hosted" title="The Operations & Performance Update">
                        <li><strong className="text-slate-300">Zusamenfassend:</strong> Added cost and payout tracking to operations, the option to send each type of service request to its own Discord channel, a live level meter for the radio, and a cleaner career timeline, along with faster loading and a range of polish and reliability fixes.</li>
                    </VersionCard>

                </div>

                {/* ATTRIBUTION CARD - May not be modified under MIT licence and attribution terms*/}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-sky-500/10 rounded-lg flex items-center justify-center border border-sky-500/30">
                        <i className="fa-solid fa-code text-2xl text-sky-300"></i>
                    </div>
                    <div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Anwendungszuordnung</p>
                        <h3 className="text-xl font-black text-white mt-1 tracking-tight">Gebaut von<span className="text-sky-300">Jenk0</span></h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Empfehlungscode:<a href="https://www.robertsspaceindustries.com/enlist?referral=STAR-2GNM-TTHD">STAR-2GNM-TTHD</a></p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-widest pt-3 border-t border-white/5 w-full justify-center">
                        <span>STC-2955 Compliance Confirmed</span>
                        <span className="text-slate-700">·</span>
                        <span><a href="https://github.com/MyRSI-org/open-myrsi-org" target="_blank" rel="noopener noreferrer">Quelle verfügbar</a> · Noncommercial (with attribution)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangeLogView;
