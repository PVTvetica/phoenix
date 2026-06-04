
import React, { useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';

import { useRadio } from '../../contexts/RadioContext';
import HeaderNotificationsBell from './HeaderNotificationsBell';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface HeaderProps {
    setActiveView: (view: string) => void;
    toggleMobileSidebar: () => void;
    isMobileSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ setActiveView, toggleMobileSidebar, isMobileSidebarOpen }) => {
    const { currentUser, logout, hasPermission } = useAuth();
    const { brandingConfig, radioConfig } = useConfig();
    const { volume, setVolume, addToast, playSound } = useNotification();
    const { globalSearchQuery, setGlobalSearchQuery, isRadioOpen, setIsRadioOpen } = useNavigation();
    const { isConnected, isTransmitting, activeSpeakers } = useRadio();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = globalSearchQuery.trim();
        if (!q) return;
        setActiveView('search');
    };

    if (!currentUser) return null;

    const getRoleClass = (role: string) => {
        switch (role) {
            case 'Admin': return 'text-red-400';
            case 'Dispatcher': return 'text-yellow-400';
            case 'Member': return 'text-sky-400';
            case 'Client': default: return 'text-green-400';
        }
    };

    const handleTestSound = () => {
        if (brandingConfig.newRequestSoundUrl) {
            playSound(brandingConfig.newRequestSoundUrl);
        } else {
            addToast("Kein Ton konfiguriert", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Der Administrator hat keinen Testton hinterlegt." });
        }
    };

    return (
        <header className="relative z-50 shrink-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 h-16 flex items-center justify-between shadow-lg">
            <div className="flex items-center lg:hidden pl-4 pr-2">
                <button
                    onClick={toggleMobileSidebar}
                    className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors"
                    aria-label={isMobileSidebarOpen ? "Menü schließen" : "Menü öffnen"}
                >
                    <i className={`fa-solid ${isMobileSidebarOpen ? 'fa-xmark' : 'fa-bars'} h-6 w-6`}></i>
                </button>
            </div>

            {/* Global Search Bar */}
            <div className="flex-1 px-4 md:px-6 max-w-3xl">
                <form onSubmit={handleSearchSubmit} className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-500 transition-colors"></i>
                    <input
                        type="text"
                        placeholder="Globale Suche…"
                        className="w-full bg-slate-900/50 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 outline-hidden transition-all hover:bg-slate-900"
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="flex items-stretch h-full">

                {/* Radio Toggle Element - Accessible by All Authenticated Users */}
                <button
                    onClick={() => radioConfig.configured ? setIsRadioOpen(!isRadioOpen) : undefined}
                    aria-disabled={!radioConfig.configured}
                    className={`
                        relative flex items-center justify-center px-5 h-full border-l border-white/5 transition-all duration-200 group
                        ${!radioConfig.configured
                            ? 'text-slate-500 cursor-default'
                            : isRadioOpen ? 'bg-sky-500/10 text-sky-400 border-l-sky-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                    `}
                    title={radioConfig.configured ? 'Radio ein-/ausblenden' : 'Radio nicht verfügbar — LiveKit wurde vom Organisations-Admin nicht konfiguriert'}
                >
                    {radioConfig.configured && isConnected && (
                        <span className="absolute top-3.5 right-3 flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTransmitting ? 'bg-red-500' : activeSpeakers.length > 0 ? 'bg-green-500' : 'bg-sky-500'}`}></span>
                            <span className={`relative inline-flex rounded-full h-full w-full ${isTransmitting ? 'bg-red-500' : activeSpeakers.length > 0 ? 'bg-green-500' : 'bg-sky-500'}`}></span>
                        </span>
                    )}
                    <span className="relative inline-flex items-center justify-center">
                        <i className={`fa-solid fa-walkie-talkie text-lg ${!radioConfig.configured ? 'text-slate-500' : isTransmitting ? 'text-red-400' : ''}`}></i>
                    </span>
                    <span className={`ml-3 font-bold text-xs uppercase tracking-wider hidden md:block ${!radioConfig.configured ? 'text-slate-500' : ''}`}>Radio</span>
                    {!radioConfig.configured && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest bg-slate-700/40 text-slate-400 border border-slate-600/40 hidden lg:inline-block">Nicht verfügbar</span>
                    )}
                </button>

                {/* Cross-feature action-required bell — sole notification surface (HR, Government, Requests, Intel) */}
                <HeaderNotificationsBell />

                {/* User Profile Element */}
                <div className="relative h-full" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`
                            flex items-center gap-4 px-6 h-full border-l border-white/5 transition-all duration-200
                            ${isDropdownOpen ? 'bg-white/5 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}
                        `}
                    >
                        <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-8 w-8 rounded-full bg-slate-900 object-cover border border-white/10" />

                        <div className="text-left hidden md:block">
                            <p className="text-xs font-bold leading-tight">{currentUser.name}</p>
                            <div className="flex items-center gap-1.5">
                                {currentUser.rank?.iconUrl && (
                                    <img src={currentUser.rank.iconUrl} className="w-3 h-3 object-contain" alt="" />
                                )}
                                <p className={`text-[10px] font-mono leading-tight ${getRoleClass(currentUser.role)} uppercase`}>
                                    {currentUser.rank?.name || currentUser.role}
                                </p>
                            </div>
                        </div>

                        <i className={`fa-solid fa-chevron-down h-3 w-3 text-slate-500 transition-transform duration-200 hidden sm:block ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-2 top-full mt-2 w-64 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 animate-fade-in-down overflow-hidden origin-top-right">
                            <div className="flex flex-col divide-y divide-white/5">
                                <div className="p-4 bg-white/5">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Angemeldet als</p>
                                    <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center text-amber-400 text-xs">
                                            <i className="fa-solid fa-star mr-1"></i>
                                            <span className="font-mono font-bold">{currentUser.reputation}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-1">
                                    <button
                                        onClick={() => {
                                            setActiveView('profile');
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full text-left flex items-center px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors text-xs font-medium text-slate-300 group"
                                    >
                                        <i className="fa-solid fa-id-card w-5 text-slate-500 group-hover:text-sky-400 text-center"></i>Mein Konto</button>

                                    {hasPermission('admin:access') && (
                                        <button
                                            onClick={() => {
                                                setActiveView('admin');
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full text-left flex items-center px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors text-xs font-medium text-slate-300 group"
                                        >
                                            <i className="fa-solid fa-screwdriver-wrench w-5 text-slate-500 group-hover:text-red-400 text-center"></i>Admin Konsole</button>
                                    )}

                                    {currentUser.role !== 'Client' && (
                                        <button
                                            onClick={() => {
                                                setActiveView('member-record');
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full text-left flex items-center px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors text-xs font-medium text-slate-300 group"
                                        >
                                            <i className="fa-solid fa-file-contract w-5 text-slate-500 group-hover:text-amber-400 text-center"></i>Mein Dienstprotokoll</button>
                                    )}

                                    {currentUser.role !== 'Client' && (
                                        <button
                                            onClick={() => {
                                                localStorage.setItem('hr_active_tab', 'gazette');
                                                window.dispatchEvent(new CustomEvent('app:navigate-hr-tab', { detail: 'gazette' }));
                                                setActiveView('hr');
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full text-left flex items-center px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors text-xs font-medium text-slate-300 group"
                                        >
                                            <i className="fa-solid fa-briefcase w-5 text-slate-500 group-hover:text-green-400 text-center"></i>Stellenanzeiger</button>
                                    )}
                                </div>

                                <div className="p-4 text-slate-300 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold uppercase">Audiolautstärke</span>
                                        <span className="font-mono text-sky-400">{volume}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={volume}
                                        onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-white"
                                    />
                                    <button
                                        onClick={handleTestSound}
                                        className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:border-slate-600 px-2 py-1.5 rounded-sm transition-all"
                                    >
                                        <i className="fa-solid fa-play mr-1"></i>Audio testen</button>
                                </div>

                                <div className="p-1">
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full text-left flex items-center px-3 py-2.5 rounded-md hover:bg-red-500/10 transition-colors text-xs font-bold text-red-400 group"
                                    >
                                        <i className="fa-solid fa-power-off w-5 text-center group-hover:text-red-500"></i>Trennen</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
