
import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useGovernment } from '../../../contexts/GovernmentContext';
import CallsignChip from '../../shared/ui/CallsignChip';
import { useNavigation } from '../../../contexts/NavigationContext';

const HelpCard: React.FC<{
    title: string;
    icon: string;
    iconBgClass: string;
    iconColorClass: string;
    children: React.ReactNode
}> = ({ title, icon, iconBgClass, iconColorClass, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`bg-slate-900/80 backdrop-blur-md border rounded-xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-sky-500/30 shadow-lg shadow-sky-900/20' : 'border-slate-700/50 hover:border-slate-600'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center p-5 text-left"
            >
                <div className={`w-12 h-12 rounded-lg ${iconBgClass} flex items-center justify-center shrink-0 mr-4 border border-white/5`}>
                    <i className={`${icon} text-xl ${iconColorClass}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white">{title}</h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">
                        {isOpen ? 'Tap to collapse' : 'Tap to expand'}
                    </p>
                </div>
                <i className={`fa-solid fa-chevron-down text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 pt-0 text-slate-300 space-y-6 border-t border-white/5">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-2 pt-4">
        <h4 className="text-[10px] font-black text-sky-300 uppercase tracking-widest border-b border-white/5 pb-2 mb-3">{title}</h4>
        <div className="text-sm leading-relaxed space-y-3 text-slate-300">
            {children}
        </div>
    </div>
);

const HelpView: React.FC = () => {
    const { setActiveView } = useNavigation();
    const { hasPermission } = useAuth();
    const { orgMeta } = useData();
    const { governmentsFeatureConfig } = useGovernment();

    const governmentEnabled = !!governmentsFeatureConfig?.enabled;
    const financesEnabled = orgMeta?.features?.finances?.enabled === true;
    const quartermasterEnabled = orgMeta?.features?.quartermaster?.enabled === true;
    const warehouseEnabled = orgMeta?.features?.warehouse?.enabled === true;

    return (
        <div className="h-full flex flex-col overflow-hidden animate-fade-in">
            {/* Hero */}
            <div className="shrink-0 relative overflow-hidden border-b border-white/5 bg-linear-to-b from-sky-950/30 via-slate-950/80 to-slate-950">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" aria-hidden />

                <div className="relative px-4 sm:px-8 pt-10 pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div className="min-w-0">
                            <CallsignChip label="MODULE · FIELD MANUAL" icon="fa-book-open" accent="sky" pulse />
                            <h1 className="mt-3 text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">Einsatzhandbuch</h1>
                            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
                                Quick reference for the most common workflows. Full documentation is published at <a href="https://docs.myrsi.org" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline">docs.myrsi.org</a>.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                                onClick={() => setActiveView('changelog')}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 bg-slate-900/60 border border-slate-700 rounded-lg hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300 transition-colors"
                            >
                                <i className="fa-solid fa-scroll"></i>Änderungsprotokoll</button>
                            <button
                                onClick={() => setActiveView('tos')}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 bg-slate-900/60 border border-slate-700 rounded-lg hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300 transition-colors"
                            >
                                <i className="fa-solid fa-file-contract"></i>Nutzungsbedingungen</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            <div className="grid grid-cols-1 gap-4">

                {/* 1. INSTALLATION & ALERTS */}
                <HelpCard title="App Installation & Alerts" icon="fa-solid fa-mobile-screen" iconBgClass="bg-emerald-500/10" iconColorClass="text-emerald-400">
                    <Section title="Why Install?">
                        <p>Empfangen<strong>EAM Sendungen</strong>, <strong>service request alerts</strong>, and <strong>operation updates</strong> while the app is closed, install the terminal as a PWA on your device. Browser tabs alone don't deliver background push.
                        </p>
                    </Section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            <h5 className="text-white font-bold mb-3 flex items-center"><i className="fa-brands fa-apple text-xl mr-2"></i> iOS (iPhone/iPad)</h5>
                            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-400">
                                <li>Öffne die Website in<strong>Safari</strong> (Chrome on iOS does not support background push).</li>
                                <li>Tippen du auf<strong>Aktie</strong> button <i className="fa-solid fa-arrow-up-from-bracket"></i>.</li>
                                <li>Scrollen und tippen du<strong>Zum Startbildschirm hinzufügen</strong>.</li>
                                <li>Bestätige und tippen du auf<strong>Hinzufügen</strong>.</li>
                                <li>Always launch from the Home Screen icon — not from a Safari tab — for push to work.</li>
                            </ol>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                            <h5 className="text-white font-bold mb-3 flex items-center"><i className="fa-brands fa-android text-xl mr-2"></i> Android / Desktop</h5>
                            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-400">
                                <li>Öffne die Website in<strong>Chrom</strong>, Edge, or Brave.</li>
                                <li>Tippen du auf<strong>three-dot menu</strong> (mobile) or the <strong>install icon</strong> in the address bar (desktop).</li>
                                <li>Wählen<strong>App installieren</strong> or <strong>Zum Startbildschirm hinzufügen</strong>.</li>
                                <li>Starten du über die App-Schublade/das Startmenü.</li>
                            </ol>
                        </div>
                    </div>

                    <Section title="Activating Your Communications Uplink">
                        <p>Beim ersten Login sehen du ein<strong>Sichere Kommunikation verfügbar</strong> banner — tap <strong>Uplink aktivieren</strong> and Allow when the browser prompts. Or activate any time:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Öffnen<strong>Mein Konto</strong> from the sidebar.</li>
                            <li>Finden du die<strong>Kommunikations-Uplink</strong> card.</li>
                            <li>Klicken<strong>Gerät registrieren</strong>, accept the browser permission prompt.</li>
                            <li>Klicken<strong>Testsignal</strong> — a test push should arrive within seconds.</li>
                        </ol>
                        <p className="text-xs text-slate-500 italic mt-2">
                            If pushes stop after an OS update, unregister and re-register — phone updates can invalidate the push subscription.
                        </p>
                    </Section>
                </HelpCard>

                {/* 2. SERVICE REQUESTS — CLIENT */}
                <HelpCard title="Service Requests (Client)" icon="fa-solid fa-headset" iconBgClass="bg-teal-500/10" iconColorClass="text-teal-400">
                    <Section title="Submitting a Request">
                        <p>Klicken<strong>Neue Anfrage</strong> from the sidebar or dashboard. Fill in:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li><strong>Servicetyp</strong> — Security Escort, Medical, Logistics, etc.</li>
                            <li><strong>Standort</strong> — search platform locations or type a custom system / planet.</li>
                            <li><strong>Bedrohungsstufe</strong> — helps dispatch decide priority.</li>
                            <li><strong>Parteimitglieder</strong> by RSI handle — auto-cross-referenced against active caution notes.</li>
                            <li><strong>Beschreibung</strong> — detailed picture of your situation; the dispatcher reads this first.</li>
                            <li>Akzeptiere die Nutzungsbedingungen und klicken du<strong>Einreichen</strong>.</li>
                        </ol>
                    </Section>
                    <Section title="Tracking Your Request">
                        <p>Lebenszyklus:<strong>Eingereicht</strong> → <strong>Triagiert</strong> → <strong>Akzeptiert</strong> → <strong>Im Gange</strong> → <strong>Erfolg / Fehlgeschlagen / Abgebrochen / Abgelehnt / Abgebrochen</strong>.
                        </p>
                        <p>Du kannst nur haben<strong>one active request at a time</strong> while it's in Submitted, Triaged, Accepted, or In-Progress. Wait for the current request to reach a terminal state before starting another.
                        </p>
                        <p>
                            You'll get a sound + toast (and a push notification, if Uplink is active) at every status change and when responders are added.
                        </p>
                    </Section>
                    <Section title="Rating & Feedback">
                        <p>Wenn eine Anfrage eintrifft<strong>Erfolg</strong>, you're prompted to rate the team 1–5 stars and leave optional feedback. Ratings on Failed / Cancelled / Aborted requests aren't collected. Your rating is immutable by staff but you can update your own within the org's rating window.
                        </p>
                    </Section>
                </HelpCard>

                {/* 3. STAFF DASHBOARD */}
                <HelpCard title="Staff Dashboard" icon="fa-solid fa-gauge-high" iconBgClass="bg-violet-500/10" iconColorClass="text-violet-400">
                    <Section title="Überblick">
                        <p>
                            Real-time view of org operations: active requests, the duty roster, current operations, EAM state, and bulletins. Tiles update automatically over the realtime connection — no refresh required.
                        </p>
                    </Section>
                    <Section title="Quick Actions">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Gehen du in den Dienst:</strong>Schalte in der Seitenleiste um, um für den Versand berechtigt zu sein.</li>
                            <li><strong>Neue Anfrage/Ad-hoc protokollieren:</strong>Anfragen im Namen von Clients erstellen (registriert oder nicht).</li>
                            <li><strong>Kachel „Aktive Anfrage“:</strong>Klicke auf eine beliebige Kachel, um die Anfragedetails zu öffnen und darauf zu reagieren.</li>
                            <li><strong>Op-Kachel:</strong> Click an active operation to jump straight into Live Command / My Status.</li>
                        </ul>
                    </Section>
                    <Section title="Bulletin Board">
                        <p>Admins und Disponenten posten<strong>announcements</strong> visible at the top of the dashboard — shift briefings, policy updates, recall notices. Use sparingly so members keep reading them.
                        </p>
                    </Section>
                    <Section title="Aktion erforderlich">
                        <p>Die<strong>Aktion erforderlich</strong> panel surfaces things waiting on you personally: requests assigned to you that need a status advance, operations you've RSVP'd to that are now Active, and so on. Treat this as your daily to-do queue.
                        </p>
                    </Section>
                </HelpCard>

                {/* 4. FIELD OPERATIONS & DISPATCH */}
                <HelpCard title="Field Operations & Dispatch" icon="fa-solid fa-person-military-rifle" iconBgClass="bg-sky-500/10" iconColorClass="text-sky-400">
                    <Section title="Duty Status">
                        <p>Umschalten<strong>IM PFLICHT</strong> in the sidebar to enter the dispatch picker. The system auto-toggles you to <strong>Außer Dienst</strong> after <strong>30 minutes</strong> of inactivity (no clicks, keys, or API). Toggle back on when you return — there's no penalty.
                        </p>
                    </Section>
                    <Section title="Triage-Konsole">
                        <p>Es landen neue Anfragen<strong>Eingereicht</strong>. A dispatcher opens the <strong>Triage-Konsole</strong> to review urgency, optionally override the threat level, optionally pre-assign a lead responder (which jumps it past Triaged straight to Accepted), or <strong>Verweigern</strong> with a written reason.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Eine Ablehnung erfordert Notizen.</strong>Der Client sieht den Grund.</li>
                            <li><strong>Querverweis zum Parteimanifest:</strong> Every party member handle is auto-checked against active caution notes — alerts surface on the request card.</li>
                            <li><strong>Ad-hoc protokollieren:</strong> For unregistered clients (random pickups). Bypasses the one-active-request limit since no client account is involved.</li>
                        </ul>
                    </Section>
                    <Section title="Managing Responders">
                        <p>Klicke auf die Anfrage<strong>Team verwalten</strong> to add or remove responders and designate the mission lead. Adding the first responder automatically creates the red <strong>mission radio channel</strong>. Status pills are clickable buttons — click to advance the lifecycle, or use "More options…" for complex transitions like Aborted or GameError.
                        </p>
                    </Section>
                    <Section title="Mission Debrief">
                        <p>Durch das Schließen einer Anfrage wird die geöffnet<strong>Nachbesprechung modal</strong>. Captures the outcome (Success / Failed / Aborted / GameError), UEC earned, Medigel (L) consumed, the After-Action Report, and a <strong>client conduct assessment</strong> (Positive / Neutral / Negative) which immediately adjusts client reputation. A "File Intelligence Report" checkbox surfaces if the outcome is negative or the conduct was poor.
                        </p>
                    </Section>
                </HelpCard>

                {/* 5. OPERATIONS CENTER */}
                <HelpCard title="Operations Center" icon="fa-solid fa-chess-board" iconBgClass="bg-purple-500/10" iconColorClass="text-purple-400">
                    <Section title="When to Use">
                        <p>
                            Use Operations Center for planned, multi-person events — patrols, mining ops, joint exercises, training, org battles. Distinct from reactive service requests, which are for ad-hoc client tickets.
                        </p>
                    </Section>
                    <Section title="Lifecycle">
                        <p>Four states, advanced manually by the owner or anyone with <code className="text-xs bg-slate-800 px-1 py-0.5 rounded-sm">operations:manage</code>:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Planung:</strong>Aufstellungsplan, ORBAT, Logistik. Standardmäßig ausgeblendet.</li>
                            <li><strong>Geplant:</strong>Festgelegte Startzeit. RSVPs geöffnet.</li>
                            <li><strong>Aktiv:</strong> Live tabs unlock — My Status, Overview, Live Command. Mission clock runs.</li>
                            <li><strong>Fazit:</strong>Die Registerkarte „AAR“ wird für retrospektive Einträge entsperrt.</li>
                        </ul>
                    </Section>
                    <Section title="ORBAT (Order of Battle)">
                        <p>Zwei Ansichten:<strong>Dienstplan</strong> (flat list of participants with RSVP, ready flag, role, ship, live status) and <strong>Struktur</strong> (drag-and-drop node graph with Command / Unit / Position nodes, optional assignees, colour grouping). Structure nodes are organisational scaffolding — they don't auto-sync to the roster.
                        </p>
                    </Section>
                    <Section title="Logistics, Ledger & Payouts">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Registerkarte Logistik:</strong> Coordination tracker for items needed (Ammo / Medical / Transport / Fuel / General). Any participant can mark fulfilment; nothing auto-deducts from warehouse.</li>
                            <li><strong>Hauptbuch:</strong> Optional UEC tracking. Deposits and costs are restricted to <code className="text-xs bg-slate-800 px-1 py-0.5 rounded-sm">operations:manage_finance</code> holders so members can't self-credit.</li>
                            <li><strong>Drei Auszahlungsmodi:</strong> Equal (split evenly), Weighted (by time-in-op), or Custom (admin-set per-person %). Pie chart previews the split before payout.</li>
                        </ul>
                    </Section>
                    <Section title="Phases, Tasks & Templates">
                        <p>
                            Build a phase tree (Sequential or Contingent) with optional milestones offset in minutes from start, plus per-phase task checklists. Save any operation's phase tree as a <strong>template</strong> from the Administer tab → re-use it on the next op.
                        </p>
                    </Section>
                    <Section title="Discord Integration">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Discord Ereignis erstellen:</strong> Posts a Guild Scheduled Event server-wide (visible to everyone).</li>
                            <li><strong>Einbettung der Beitragsankündigung:</strong> Posts a rich embed with ✅ ❌ ❓ reactions to a specific channel — useful for role-restricted comms. Edit the operation and the embed updates in place; reactions are preserved.</li>
                        </ul>
                    </Section>
                    <Section title="Classified (Special) Operations">
                        <p>Umschalten<strong>Sondereinsatz</strong> at create time to require a 4-digit PIN to view or join. The op stays hidden from the regular dashboard for non-participants. Combine with clearance level + limiting markers for tiered access.
                        </p>
                    </Section>
                    <Section title="After-Action Reports (AAR)">
                        <p>Wird freigeschaltet, wenn die Operation abgeschlossen ist. Vier Eintragskategorien:<strong>Beobachtungen</strong> (factual), <strong>Aufrechterhalten</strong> (what went well), <strong>Verbessern</strong> (what to fix), <strong>Aktionselemente</strong>. Members can upvote entries. Generate an AI-drafted summary from the upvoted entries (24-hour cooldown). Owner submits the final AAR; can re-open if late edits are needed.
                        </p>
                    </Section>
                </HelpCard>

                {/* 6. TACTICAL RADIO */}
                <HelpCard title="Tactical Radio" icon="fa-solid fa-tower-broadcast" iconBgClass="bg-red-500/10" iconColorClass="text-red-400">
                    <Section title="Push-to-Talk">
                        <p>
                            Open the radio widget from the sidebar. The first time you transmit, the browser will ask for microphone permission. Hold <strong>Push-to-Talk</strong> to transmit; release to stop. The horizontal meter under PTT is your <strong>TX-Pegel</strong> — green-to-yellow is healthy, red is clipping.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Desktop:</strong> Click and hold the PTT button or use a bound HID / gamepad button.</li>
                            <li><strong>Mobile:</strong> Press and hold. Non-passive touch listeners stop accidental scrolling while transmitting.</li>
                            <li><strong>HID / Gamepad PTT:</strong>Erweitern du den Abschnitt und klicken du auf<strong>Gamepad binden</strong> or <strong>HID binden</strong>, press your button. Works while the app is in the background on Chrome / Edge; Firefox and Safari support is limited.</li>
                        </ul>
                    </Section>
                    <Section title="Channel Types">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Voreingestellte Kanäle:</strong>Admin-konfiguriert, nur für Mitarbeiter (z. B. Dispatch, Patrol).</li>
                            <li><strong>Squad-Kanäle:</strong> Auto-derived from your unit assignment. A unit can opt out of a squad channel.</li>
                            <li><strong>Missionskanäle:</strong> Auto-created (in red) when a service request is Accepted or you join an op. Auto-close on terminal state.</li>
                        </ul>
                    </Section>
                    <Section title="Volume, Mute & Devices">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Master-Lautstärke</strong> (header slider): all system sounds — alerts, EAM, radio cues. Persists across sessions.</li>
                            <li><strong>Radiolautstärke</strong> (inside widget): voice traffic only. Independent of master.</li>
                            <li><strong>Meisterstummschaltung</strong> (header icon): silences platform sounds.</li>
                            <li><strong>Radio stummgeschaltet</strong> (widget button): silences your microphone — you still hear others.</li>
                            <li><strong>Geräte:</strong> Uses your OS default mic / output. There's no in-app device picker — set defaults at the OS level.</li>
                            <li><strong>Aktive Redner</strong> section shows who's currently transmitting.</li>
                        </ul>
                        <p className="text-xs text-slate-500 italic mt-2">
                            Background tabs may degrade audio quality. For mission-critical comms, keep the tab in the foreground or use the installed PWA.
                        </p>
                    </Section>
                </HelpCard>

                {/* 7. INTELLIGENCE & SECURITY */}
                <HelpCard title="Intelligence & Security" icon="fa-solid fa-eye" iconBgClass="bg-amber-500/10" iconColorClass="text-amber-400">
                    <Section title="Reports & The Dossier">
                        <p>Datei an<strong>Intel Bericht</strong> on a person (RSI handle) or org. Each report carries a Threat Level, Classification (0–5), Limiting Markers, Tags, Evidence URLs, and an Author.
                        </p>
                        <p>Die<strong>Dossier</strong> aggregates all intel on a target across five sources: filed Reports (filtered by your clearance), Active + Standing Caution Notes, Service Request history, Operations participation, and Affiliates. Authors can always read their own reports regardless of clearance.
                        </p>
                    </Section>
                    <Section title="Bulletins">
                        <p>
                            Time-sensitive notices on the Live Bulletin Board. Each bulletin has a threat level (colour-coded), location, duration (15 min → 7 days, or indefinite), classification, and markers.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-red-400">Kritisch:</strong>Unmittelbare Gefahr – löst Personalbenachrichtigungen aus.</li>
                            <li><strong className="text-orange-400">Hoch:</strong>Erhebliche Bedrohung – erhöhte Alarmbereitschaft.</li>
                            <li><strong className="text-amber-400">Medium:</strong>Bemerkenswerte Aktivität – genau beobachten.</li>
                            <li><strong className="text-sky-400">Niedrig:</strong>Allgemeines Bewusstsein.</li>
                        </ul>
                        <p className="text-xs text-slate-500 italic">
                            Bulletins toggled "Shared with Allies" sync to the external feed unless they carry a sync-restricted marker (e.g. NOFORN).
                        </p>
                    </Section>
                    <Section title="Caution Notes">
                        <p>
                            Defensive advisories flagging handles your org should approach carefully. Caution levels: <strong>Vorsicht</strong>, <strong>Hohe Vorsicht</strong>, <strong>Äußerste Vorsicht</strong>. Two states: <strong>Aktiv</strong> (live now) and <strong>Stehen</strong> (conditional — takes effect if the target is encountered). A caution note surfaces on the target's dossier, on the Caution Notes board, and as an <strong>Aktive Vorsicht</strong> warning on any service request whose party manifest matches.
                        </p>
                        <p>Mitglieder bestätigen einen Warnhinweis durch Anklicken<strong>Beanspruchen</strong> on the detail view. The platform records the acknowledgement but does not verify any field action — admins should audit. Issuers and admins can <strong>Abbrechen</strong> a caution note at any time.
                        </p>
                    </Section>
                    <Section title="Clearance Levels & Markers">
                        <p>Zwei unabhängige Tore: ein numerisches<strong>Freigabestufe (0–5)</strong> and named <strong>Begrenzungsmarkierungen</strong> (e.g. NOFORN, EYES_ONLY). You must pass both to read protected content.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Stufe 0:</strong>Öffentlich / Partner.</li>
                            <li><strong>Level 1–3:</strong>Standard-Mitgliederstufen.</li>
                            <li><strong>Stufe 4–5:</strong>Befehl / Streng geheim.</li>
                        </ul>
                        <p>Marker sind Tags, die die Freigabestufe verschärfen.<strong>Synchronisierungsbeschränkt</strong> markers exclude that content from the external feed even if the bulletin is "Shared with Allies".
                        </p>
                        <p className="text-xs text-slate-500 italic">Um eine Abstandserhöhung anzufordern, öffnen du<strong>Mein Konto</strong> → <strong>Freigabe anfordern</strong>. The request is routed to HR for review.
                        </p>
                    </Section>
                    <Section title="AI Taktische Analyse">
                        <p>Wenn Gemini konfiguriert ist: Dossier öffnen → Übersicht →<strong>Erzeugen</strong>. Produces a threat assessment, key facts, observed patterns, and suggested precautions. Caches for 24 hours per dossier to keep API costs sane. Treat as a briefing draft — AI can hallucinate.
                        </p>
                    </Section>
                </HelpCard>

                {/* 8. PERSONNEL & HR */}
                <HelpCard title="Personnel & HR" icon="fa-solid fa-id-card" iconBgClass="bg-indigo-500/10" iconColorClass="text-indigo-400">
                    <Section title="Duty Roster">
                        <p>Zwei Ansichten:<strong>Hierarchie</strong> (tree by unit) and <strong>Wohnung</strong> (sortable table). Filter by Unit, Rank, and Duty status; search matches name, RSI handle, and rank. Hero stats show On Duty / Off Duty / Total at a glance.
                        </p>
                    </Section>
                    <Section title="Stellenanzeiger">
                        <p>Mitglieder durchsuchen offene Beiträge über<strong>HR Hub → Amtsblatt</strong>, click <strong>Bewerben du sich jetzt</strong>, write a Statement of Interest. That opens an ATS case under Recruitment. Track your applications under <strong>Meine Bewerbungen</strong>; HR moves them through Applied → Screening → Interviewing → Offered → Hired / Rejected / OnHold / Withdrawn.
                        </p>
                    </Section>
                    <Section title="Unit Transfers">
                        <p>
                            <strong>HR Hub → Meine Übertragungen → Übertragung anfordern</strong>. Pick a target unit, write a reason. HR reviews and Approves (your unit changes immediately, including squad channel) or Denies (with a reason). The change is realtime — sidebar, roster, and squad channel update without reload.
                        </p>
                    </Section>
                    <Section title="Certifications vs Commendations">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Zertifizierungen</strong> are skill / training credentials (e.g. "Advanced Piloting"). Implies <em>can-do</em>; used for role / op gating.</li>
                            <li><strong>Belobigungen</strong> are recognition / honours (e.g. "Medal of Valor"). Implies <em>did-do</em>; for public recognition.</li>
                        </ul>
                        <p>Sehen du sich unten Dein eigenes an<strong>HR Hub → Meine Zertifizierungen</strong> / <strong>Meine Empfehlungen</strong>. HR awards them via <strong>Admin Panel → Mitgliedererfolge</strong> (bulk multi-select supported). Catalogues are now <a href="#" onClick={(e) => { e.preventDefault(); }} className="text-amber-400">JSON-importierbar</a> per type from that same page.
                        </p>
                    </Section>
                    <Section title="Conduct & Case Files">
                        <p>
                            <strong>Einträge durchführen</strong> are lightweight notes on a member's record: <em>Commendation, Observation, Counseling, Warning, Infraction</em> (colour-coded). Members read their own at <strong>HR Hub → Mein Verhalten</strong>. HR adds new entries from the member detail card.
                        </p>
                        <p>
                            <strong>Fallakten</strong> are heavier — investigations, complex disciplinary, vetting. Opened from <strong>HR Hub → ATS → Neuer Fall</strong>. They share the same Applied → Screening → Interviewing → Resolved pipeline as recruitment.
                        </p>
                    </Section>
                    <Section title="Probation">
                        <p>
                            Admins set the probation window (typically 30 / 60 / 90 days) under <strong>HR Hub → Bewährung</strong>. New joiners are tracked automatically. The tracker shows days remaining (or "Overdue") with a colour-coded progress bar. Click <strong>Rezension</strong> to see service record + recent activity, then <strong>Bestätigen</strong> (clear probation, full member) or <strong>Degradieren</strong> (drops them to Client). Probationers see a banner on their dashboard with days remaining.
                        </p>
                    </Section>
                    <Section title="ATS — Applicant Tracking">
                        <p>Eine einheitliche Warteschlange für alle fünf HR-Workflows:<strong>Rekrutierung, Überprüfung, interne Fälle, Versetzungen, Jobs</strong>. Filter by category, status, or search. Each case gets a unified file view: subject, append-only notes timeline, status pipeline, scheduled interviews, and links to related records (service requests, conduct entries, prior cases).
                        </p>
                        <p>
                            Schedule interviews from any case file: pick date / time, optional template, assign one or more interviewers. The subject (if a member) and interviewers all get notifications.
                        </p>
                    </Section>
                </HelpCard>

                {/* 9. GOVERNMENT (gated) */}
                {governmentEnabled && (
                    <HelpCard title="Regierung" icon="fa-solid fa-landmark" iconBgClass="bg-blue-500/10" iconColorClass="text-blue-400">
                        <Section title="Six Tabs">
                            <p>Gefunden bei<strong>Seitenleiste → Regierung</strong>. Six tabs: <strong>Überblick</strong> (branches, positions, current officials), <strong>Wahlen</strong>, <strong>Gesetzgebung</strong>, <strong>Anträge</strong>, <strong>Bestellungen</strong>, <strong>Verfassung</strong> (an editable foundational document for the org).
                            </p>
                        </Section>
                        <Section title="Branches & Positions">
                            <p>
                                <strong>Zweige</strong> are named bodies (Executive / Legislative / Judicial / Custom) that contain <strong>Positionen</strong>. Each Position has a Fill Method (Elected / Appointed / Hereditary), a current Holder, and five independent power toggles: propose legislation, vote on legislation, veto, call elections, issue orders. The platform seeds eight common government models (Military Junta, Westminster Parliament, Pirate Code, etc.) — all editable.
                            </p>
                        </Section>
                        <Section title="Wahlen">
                            <p>
                                Five election types: Simple Majority, Plurality, Approval, Preferential (instant runoff), Proportional Representation. Phases: Draft → Candidacy → Voting → (optional Runoff) → Concluded. Members <strong>Kandidatur erklären</strong> during Candidacy and can withdraw before voting opens. Ballots are <em>secret</em> — the platform records that you voted but not your choice.
                            </p>
                        </Section>
                        <Section title="Legislation, Motions & Orders">
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Gesetzgebung</strong> — Bills with a debate phase and a public vote. Optional veto window. Becomes law on passage. To repeal, draft a new bill.</li>
                                <li><strong>Anträge</strong> — Lightweight yes/no procedural votes. Optional secret ballot. Non-binding unless your org treats them otherwise.</li>
                                <li><strong>Bestellungen</strong> — Unilateral binding directives issued by a position with <code className="text-xs bg-slate-800 px-1 py-0.5 rounded-sm">canIssueOrders</code>. Optional expiry date for time-bounded directives. Active orders can be Revoked but not edited — revoke and re-issue if you need to change one.</li>
                            </ul>
                        </Section>
                        <Section title="Verfassung">
                            <p>
                                A WikiEditor-backed reference document for your org's government model, term limits, legislative process, and amendments. Editable by <code className="text-xs bg-slate-800 px-1 py-0.5 rounded-sm">gov:admin</code> only. The platform doesn't enforce constitutional rules algorithmically — it's a written reference your members can cite.
                            </p>
                        </Section>
                    </HelpCard>
                )}

                {/* 10. FINANCES (gated) */}
                {financesEnabled && (
                    <HelpCard title="Finanzen" icon="fa-solid fa-coins" iconBgClass="bg-amber-500/10" iconColorClass="text-amber-400">
                        <Section title="Finances Ledger">
                            <p>
                                Submit deposits (with a memo so the finance officer can match your in-game transfer) and withdrawals (with a reason) under <strong>Finanzen</strong>. Both enter a <strong>pending</strong> queue that finance officers Confirm or Deny. Confirmed entries move the recorded balance.
                            </p>
                            <p>Fünf Eintragstypen:<strong>deposit, withdrawal, transfer, payout, adjustment</strong>. Direct adjustments (for opening balances or error corrections) bypass the pending queue. Reversing an entry creates a compensating opposite-sign entry — both stay in the audit trail.
                            </p>
                        </Section>
                        <Section title="Org Rating">
                            <p>Die<strong>aggregate org rating</strong> shown on the dashboard hero and your public page (if enabled) only counts rated <strong>Erfolgreich</strong> service requests — not Failed, Aborted, or Cancelled. Admins can curate 3–6 anonymized testimonial excerpts for the public page; client names are always stripped.
                            </p>
                        </Section>
                    </HelpCard>
                )}

                {/* 11. FLEET, QM, WAREHOUSE */}
                <HelpCard title="Fleet, Quartermaster & Warehouse" icon="fa-solid fa-warehouse" iconBgClass="bg-cyan-500/10" iconColorClass="text-cyan-400">
                    <Section title="My Hangar & Org Fleet">
                        <p>
                            <strong>Mein Hangar</strong> is your personal ship list. Click <strong>+ Add Ship</strong> to browse the catalog (filter by manufacturer / size / role) and multi-select. Edit a ship's custom name, status (Active / Stored / Damaged / Lent / Sold), and loadout notes.
                        </p>
                        <p>
                            <strong>Org-Flotte</strong> aggregates every member's ships. Two views: Stacked (groups duplicates with owner avatars) or Individual (one card per ship instance).
                        </p>
                    </Section>
                    <Section title="Flottenorganisation">
                        <p>
                            A drag-pan visual org chart. Group nodes (Division / Squadron / Wing / Taskforce / Custom, nestable parent → child), with assigned ships and a Commander. Officers can create groups, edit / delete them, drag ships to assign, or unassign individually.
                        </p>
                    </Section>
                    {quartermasterEnabled && <Section title="Quartermaster (Kit Issuance)">
                        <p>
                            Tracks specific equipment items issued to specific people — "Lt. Smith issued one S2 ballistic rifle, serial #45". Five tabs: <strong>Überblick</strong>, <strong>Katalog</strong> (define equipment types), <strong>Waffenkammer</strong> (inventory grid), <strong>Emissionen</strong> (ledger or grouped By Member), <strong>Einstellungen</strong>.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Mitglieder<strong>Anfrage</strong> equipment (specifies quantity + notes). Officers Fulfil to mark Active.</li>
                            <li>Offiziere<strong>Issue-Kit</strong> (bulk-assign multiple items + due-back date in one atomic operation).</li>
                            <li>Ausstellungsstatus:<strong>requested → active → returned / written_off</strong>. Write-off = lost / destroyed; doesn't return to stock.</li>
                        </ul>
                    </Section>}
                    {warehouseEnabled && <Section title="Warehouse (Bulk Commodities)">
                        <p>
                            Tracks bulk goods by quantity — "12,500 kg titanium ore at Hurston Hangar 4". Counterpart to Quartermaster's serialized items.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Katalog:</strong> Define commodities with name, category, optional quality label, unit type. JSON import / export supported.</li>
                            <li><strong>Aktie:</strong> Per-location inventory grid. Officer actions: Adjust (manual delta with reason), Transfer (move between locations, paired in/out), Delete.</li>
                            <li><strong>Bewegungsbuch:</strong> Append-only audit log. Every quantity change recorded with reason, signed delta, actor, source link, notes. Reconcile via new movements — never edits.</li>
                        </ul>
                    </Section>}
                </HelpCard>

                {/* 12. WIKI & SEARCH */}
                <HelpCard title="Wiki & Search" icon="fa-solid fa-book" iconBgClass="bg-emerald-500/10" iconColorClass="text-emerald-400">
                    <Section title="Wiki Pages">
                        <p>
                            Authoring uses a rich-text WikiEditor. Pages live in a tree (drag-and-drop reorder). Each page can carry a <strong>clearance level</strong> + <strong>limiting markers</strong> — readers must pass both gates to see it. Pages below your clearance are hidden, not greyed.
                        </p>
                    </Section>
                    <Section title="Search Center">
                        <p>
                            One unified search across wiki pages, members, ranks, units, intel reports, caution notes, operations, and service requests. Results are filtered by your clearance + role permissions automatically — you'll never see a result you can't open.
                        </p>
                    </Section>
                    <Section title="Externe Tools">
                        <p>
                            Admins maintain a list of links to outside tools (e.g. UEX Corp, SC Trade Tools, your Discord) under <strong>Admin Panel → Externe Tools</strong>. They appear on the dashboard as quick-launch tiles. Members can't add their own.
                        </p>
                    </Section>
                </HelpCard>

                {/* 13. NOTIFICATIONS & SOUNDS */}
                <HelpCard title="Notifications & Sounds" icon="fa-solid fa-bell" iconBgClass="bg-pink-500/10" iconColorClass="text-pink-400">
                    <Section title="Volume Control">
                        <p>Die<strong>master volume slider</strong> in the header controls all platform sounds: request alerts, assignment notifications, EAM sirens, and radio cues. Test it with the speaker icon next to the slider. The radio voice volume is independent — see Tactical Radio.
                        </p>
                    </Section>
                    <Section title="Alert Types">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Neue Anfrage:</strong>Spielt für Mitarbeiter, wenn ein Client eine Anfrage einreicht.</li>
                            <li><strong>Abtretung:</strong> Plays when you're added to a request, when responders join your request (clients), or when a status changes.</li>
                            <li><strong>EAM:</strong> Full-screen emergency alert with mandatory acknowledgment countdown.</li>
                            <li><strong>Radiohinweise:</strong>Mikrofonklick und Squelch für PTT-Feedback.</li>
                            <li><strong>Betriebswarnungen:</strong>Betriebsübergänge zu „Aktiv“, Broadcast-Benachrichtigungen usw.</li>
                        </ul>
                    </Section>
                    <Section title="Push Notifications">
                        <p>Push funktioniert nur für<strong>installed</strong>PWAs. Registrieren du Dein Gerät in<strong>Mein Konto → Kommunikations-Uplink</strong>, then tap <strong>Testsignal</strong> to confirm. If pushes stop after a phone update, unregister + re-register.
                        </p>
                    </Section>
                </HelpCard>

                {/* 14. ADMIN */}
                {hasPermission('admin:access') && (
                    <HelpCard title="System Administration" icon="fa-solid fa-screwdriver-wrench" iconBgClass="bg-slate-500/10" iconColorClass="text-slate-300">
                        <Section title="Admin Panel">
                            <p>
                                Single configuration view, organised into eleven groups: Dashboard, User Management, Organization, Recognition, Communications, Governance, Integrations, Operations, Appearance, Maintenance, Platform. Tabs are <em>permission-gated</em> — if your role lacks a permission, the tab is hidden, not greyed. Active tab persists on reload.
                            </p>
                        </Section>
                        <Section title="Branding & Sounds">
                            <p>
                                <strong>Branding-Einstellungen</strong> covers org identity (name, logo, callsign), site metadata (Open Graph, favicon, PWA icon), accent colour, and all alert sound URLs (must be HTTPS <code className="text-xs bg-slate-800 px-1 py-0.5 rounded-sm">.mp3</code>). Auto-saves on a 2-second debounce.
                            </p>
                        </Section>
                        <Section title="Discord Integration">
                            <p>
                                Members log in via Discord OAuth (Client ID / Secret are configured in Admin → Settings, or your server's .env). The bot (using Bot Token) posts notifications and reads server roles.
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Kanaleinstellungen:</strong>Neue Anfrage, Intel, EAM und das Neue<strong>Operationsankündigung</strong> default channel. <strong>Testversand</strong> verifies bot access.</li>
                                <li><strong>Rollenzuordnung:</strong>Klicken<strong>Rollen abrufen</strong> to pull server roles. Map each Discord role to a Rank + (optionally) a platform Role. Click <strong>Alle Benutzer aktualisieren</strong> to apply — Discord is the source of truth, the sync is one-way.</li>
                            </ul>
                        </Section>
                        <Section title="EAM Sendungen">
                            <p>
                                Emergency Action Messages override every active session with a full-screen siren and mandatory ack. Friction by design: type the message → <strong>Einleiten</strong> → confirm → <strong>Arm</strong> (3-sec countdown) → <strong>Übertragen</strong>. Posts to the Discord EAM channel and pushes to PWA devices. Reserve for genuine emergencies.
                            </p>
                        </Section>
                        <Section title="AI Konfiguration">
                            <p>Legen du den Gemini-API-Schlüssel und das Modell fest (z. B.<code className="text-xs bg-slate-800 px-1 py-0.5 rounded-sm">gemini-1.5-pro</code>, <code className="text-xs bg-slate-800 px-1 py-0.5 rounded-sm">gemini-1.5-flash</code>), temperature, and max tokens in <strong>AI Konfiguration</strong>. Auto-saves. The key is encrypted at rest. AI features (dossier analysis, AAR drafting) gracefully show "AI Key Not Installed" if missing.
                            </p>
                        </Section>
                        <Section title="Database & Intel Tools">
                            <p>
                                <strong>Datenbanktools:</strong> Integrity checks, prune old data (90-day default), exports, recompute derived fields. Pruning is destructive — confirm carefully.
                            </p>
                            <p>
                                <strong>IntelLizenzmanagement:</strong> Deduplicate reports, sync caution notes to dossiers, bulk clearance / marker operations.
                            </p>
                            <p>
                                <strong>Wiki Werkzeuge:</strong> Export / import pages (JSON or Markdown), bulk reclassify clearance, repair orphaned pages.
                            </p>
                        </Section>
                        <Section title="Achievement Catalogues">
                            <p>
                                <strong>Admin Panel → Mitgliedererfolge</strong> lets you import / export Specializations, Certifications, and Commendations as JSON — one file per type. Imports show a diff preview ("X new, Y will update") before commit. Useful for migrating between orgs or backing up your catalogue.
                            </p>
                        </Section>
                    </HelpCard>
                )}
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center mt-6 gap-4">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Einhaltung</h3>
                    <p className="text-sm text-slate-400 mt-1">Review the organization's terms of service and data policies.</p>
                </div>
                <button
                    onClick={() => setActiveView('tos')}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-sky-600 hover:bg-sky-500 border border-sky-500/40 rounded-lg shadow-lg shadow-sky-900/30 transition whitespace-nowrap"
                >
                    <i className="fa-solid fa-file-contract"></i>Nutzungsbedingungen anzeigen</button>
            </div>
            </div>
        </div>
    );
};

export default HelpView;
