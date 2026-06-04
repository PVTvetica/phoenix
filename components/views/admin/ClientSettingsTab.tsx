
import React, { useState, useEffect } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';

import { HeroCardConfig } from '../../../types';
import { sanitizeImageUrl } from '../../../lib/imageUrl';
import { TabPageHeader, SectionPanel } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';

const ClientSettingsTab: React.FC = () => {
    const { heroCardConfig, updateHeroCardConfig } = useConfig();
    const { addToast } = useNotification();
    const [config, setConfig] = useState<HeroCardConfig>(heroCardConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setConfig(heroCardConfig);
    }, [heroCardConfig]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateHeroCardConfig(config);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            console.error(err);
            addToast("Speichern fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Client-Dashboard-Einstellungen konnten nicht gespeichert werden. Bitte versuche es erneut." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            <TabPageHeader
                title="Client Dashboard Settings"
                icon="fa-solid fa-gear"
                accent="sky"
                subtitle="Konfiguriere die Hero-Karte für Nutzer mit der Client-Rolle."
            />

            <SectionPanel title="Hero Card" icon="fa-solid fa-image">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="md:col-span-3 space-y-6">
                        <div>
                            <label htmlFor="backgroundImageUrl" className="block text-sm font-medium text-slate-300 mb-2">Hintergrundbild URL</label>
                            <input
                                type="text"
                                id="backgroundImageUrl"
                                name="backgroundImageUrl"
                                value={config.backgroundImageUrl}
                                onChange={handleChange}
                                placeholder="https://..."
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white font-mono"
                            />
                        </div>
                        <div>
                            <label htmlFor="discordUrl" className="block text-sm font-medium text-slate-300 mb-2">Discord Einladen URL</label>
                            <input
                                type="text"
                                id="discordUrl"
                                name="discordUrl"
                                value={config.discordUrl}
                                onChange={handleChange}
                                placeholder="https://discord.gg/..."
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white font-mono"
                            />
                        </div>
                        <div>
                            <label htmlFor="organizationUrl" className="block text-sm font-medium text-slate-300 mb-2">Organisation URL</label>
                            <input
                                type="text"
                                id="organizationUrl"
                                name="organizationUrl"
                                value={config.organizationUrl}
                                onChange={handleChange}
                                placeholder="https://robertsspaceindustries.com/orgs/..."
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white font-mono"
                            />
                        </div>
                         <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">Kartentitel</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={config.title}
                                onChange={handleChange}
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="subtitle" className="block text-sm font-medium text-slate-300 mb-2">Untertitel der Karte</label>
                            <textarea
                                id="subtitle"
                                name="subtitle"
                                value={config.subtitle}
                                onChange={handleChange}
                                rows={5}
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white text-sm"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Live-Vorschau</label>
                        <div
                            className="w-full aspect-video min-h-[280px] rounded-lg border border-slate-700 bg-cover bg-center flex flex-col justify-between p-4 text-white relative overflow-hidden"
                            style={(() => {
                                const s = sanitizeImageUrl(config.backgroundImageUrl);
                                return s ? { backgroundImage: `url("${s.replace(/"/g, '%22')}")` } : undefined;
                            })()}
                        >
                            <div className="absolute inset-0 bg-slate-900/60"></div>
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold">{config.title}</h2>
                                <p className="text-slate-300 mt-1 text-xs">{config.subtitle}</p>
                            </div>
                            <div className="relative z-10 space-y-2">
                                <button className="flex items-center justify-center w-full bg-[#5865F2] text-white font-semibold px-4 py-2 rounded-md text-sm">
                                    <i className="fa-brands fa-discord h-4 w-4 mr-2" />Treten du unserem Discord bei</button>
                                <button className="flex items-center justify-center w-full bg-slate-700/80 text-slate-200 font-semibold px-4 py-2 rounded-md text-sm">Treten du der Organisation bei<i className="fa-solid fa-arrow-up-right-from-square h-3 w-3 ml-2" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving || isSaved} className={`px-6 py-2 text-sm font-semibold text-white rounded-md border border-slate-600 transition-colors w-32 text-center ${isSaving ? 'bg-slate-800 cursor-wait' : isSaved ? 'bg-green-600 border-green-500' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        {isSaving ? <i className="fa-solid fa-spinner animate-spin" /> : isSaved ? 'Saved!' : 'Save Settings'}
                    </button>
                </div>
            </SectionPanel>
        </div>
    );
};

export default ClientSettingsTab;
