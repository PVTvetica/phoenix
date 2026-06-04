
import React, { useState, useEffect } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';

import { OpenGraphConfig } from '../../../types';
import { TabPageHeader, SectionPanel } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';

const SiteMetadataTab: React.FC = () => {
    const { openGraphConfig, updateOpenGraphConfig } = useConfig();
    const { addToast } = useNotification();
    const [config, setConfig] = useState<OpenGraphConfig>(openGraphConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [faviconError, setFaviconError] = useState(false);
    const [pwaIconError, setPwaIconError] = useState(false);

    useEffect(() => {
        setConfig(openGraphConfig);
    }, [openGraphConfig]);

    useEffect(() => {
        setImageError(false);
    }, [config.imageUrl]);

    useEffect(() => {
        setFaviconError(false);
    }, [config.faviconUrl]);

    useEffect(() => {
        setPwaIconError(false);
    }, [config.pwaIconUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateOpenGraphConfig(config);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            console.error(err);
            addToast("Speichern fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Site-Metadaten konnten nicht gespeichert werden. Bitte versuche es erneut." });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            <TabPageHeader
                title="Site Metadata & Open Graph"
                icon="fa-solid fa-share-nodes"
                accent="indigo"
                subtitle="Konfiguriere Titel, Beschreibung und Bilder, die diese Site identifizieren."
            />

            <SectionPanel title="Open Graph & SEO" icon="fa-solid fa-share-nodes">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="md:col-span-3 space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">Metatitel</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={config.title}
                                onChange={handleChange}
                                placeholder="e.g., My Organization Dashboard"
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">Meta-Beschreibung</label>
                            <textarea
                                id="description"
                                name="description"
                                value={config.description}
                                onChange={handleChange}
                                rows={3}
                                placeholder="e.g., An immersive portal for organization members..."
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="keywords" className="block text-sm font-medium text-slate-300 mb-2">Schlüsselwörter (durch Kommas getrennt)</label>
                            <input
                                type="text"
                                id="keywords"
                                name="keywords"
                                value={config.keywords || ''}
                                onChange={handleChange}
                                placeholder="e.g., Star Citizen, Security, Org, Dashboard"
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white text-sm"
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="themeColor" className="block text-sm font-medium text-slate-300 mb-2">Themenfarbe</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        id="themeColor"
                                        name="themeColor"
                                        value={config.themeColor || '#0f172a'}
                                        onChange={handleChange}
                                        className="bg-transparent border-none w-8 h-8 cursor-pointer p-0"
                                    />
                                    <input
                                        type="text"
                                        value={config.themeColor || '#0f172a'}
                                        onChange={handleChange}
                                        name="themeColor"
                                        className="flex-1 bg-slate-700/50 border border-slate-600 rounded-md p-2 text-white font-mono text-sm"
                                        placeholder="#0f172a"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="twitterCard" className="block text-sm font-medium text-slate-300 mb-2">Twitter-Kartentyp</label>
                                <select 
                                    id="twitterCard" 
                                    name="twitterCard" 
                                    value={config.twitterCard || 'summary_large_image'} 
                                    onChange={handleChange}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white text-sm"
                                >
                                    <option value="summary_large_image">Großes Bild (empfohlen)</option>
                                    <option value="summary">Zusammenfassung (Klein)</option>
                                </select>
                            </div>
                        </div>

                         <div>
                            <label htmlFor="faviconUrl" className="block text-sm font-medium text-slate-300 mb-2">Favicon URL (Browser-Tab)</label>
                             <div className="flex gap-4 items-center">
                                 <input
                                    type="text"
                                    id="faviconUrl"
                                    name="faviconUrl"
                                    value={config.faviconUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://example.com/favicon.png"
                                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white font-mono text-sm"
                                />
                                <div className="w-10 h-10 shrink-0 bg-slate-800 rounded-sm border border-slate-700 flex items-center justify-center p-1">
                                    {config.faviconUrl && !faviconError ? (
                                        <img 
                                            src={config.faviconUrl} 
                                            alt="Favicon" 
                                            className="max-w-full max-h-full"
                                            onError={() => setFaviconError(true)} 
                                        />
                                    ) : (
                                        <i className="fa-solid fa-globe text-slate-500"></i>
                                    )}
                                </div>
                             </div>
                             <p className="text-xs text-slate-500 mt-1">Empfohlen: 32x32px oder 64x64px PNG/ICO</p>
                        </div>
                         <div>
                            <label htmlFor="pwaIconUrl" className="block text-sm font-medium text-slate-300 mb-2">App-Symbol URL (PWA / Mobiler Startbildschirm)</label>
                             <div className="flex gap-4 items-center">
                                 <input
                                    type="text"
                                    id="pwaIconUrl"
                                    name="pwaIconUrl"
                                    value={config.pwaIconUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://example.com/icon-512.png"
                                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white font-mono text-sm"
                                />
                                <div className="w-12 h-12 shrink-0 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center p-1 overflow-hidden">
                                    {config.pwaIconUrl && !pwaIconError ? (
                                        <img 
                                            src={config.pwaIconUrl} 
                                            alt="App Icon" 
                                            className="w-full h-full object-cover"
                                            onError={() => setPwaIconError(true)} 
                                        />
                                    ) : (
                                        <i className="fa-solid fa-mobile-screen text-slate-500 text-lg"></i>
                                    )}
                                </div>
                             </div>
                             <p className="text-xs text-slate-500 mt-1">Wird für „Zum Startbildschirm hinzufügen“ verwendet. Empfohlen:<strong>512x512px PNG</strong> (Maskable/Transparent).
                            </p>
                        </div>
                        <div>
                            <label htmlFor="imageUrl" className="block text-sm font-medium text-slate-300 mb-2">Open Graph Bild URL (Social Share)</label>
                             <input
                                type="text"
                                id="imageUrl"
                                name="imageUrl"
                                value={config.imageUrl}
                                onChange={handleChange}
                                placeholder="https://example.com/social-image.png"
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2.5 text-white font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">OG-Bildvorschau</label>
                        <div className="w-full aspect-video bg-slate-800 rounded-md border border-slate-700 overflow-hidden flex items-center justify-center relative">
                           {config.imageUrl && !imageError ? (
                               <img 
                                   src={config.imageUrl} 
                                   alt="Open Graph Image Preview" 
                                   className="w-full h-full object-cover" 
                                   onError={() => setImageError(true)}
                               />
                           ) : (
                               <div className="text-center p-4">
                                   <i className="fa-solid fa-image text-3xl text-slate-600 mb-2"></i>
                                   <p className="text-xs text-slate-500">
                                       {imageError ? 'Invalid Image URL' : 'No Image Set'}
                                   </p>
                                   <p className="text-[10px] text-slate-600 mt-2">Empfohlen: 1200x630px</p>
                               </div>
                           )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving || isSaved} className={`px-6 py-2 text-sm font-semibold text-white rounded-md border border-slate-600 transition-colors w-32 text-center ${isSaving ? 'bg-slate-800 cursor-wait' : isSaved ? 'bg-green-600 border-green-500' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        {isSaving ? <i className="fa-solid fa-spinner animate-spin" /> : isSaved ? 'Saved!' : 'Save Settings'}
                    </button>
                </div>
            </SectionPanel>

            <div className="bg-amber-900/10 rounded-lg p-6 border border-amber-500/20">
                <h3 className="text-lg font-bold text-amber-500 flex items-center mb-2">
                    <i className="fa-solid fa-triangle-exclamation mr-2"></i>Updates werden nicht angezeigt?</h3>
                <p className="text-sm text-slate-300 mb-4">
                    Social media platforms (Discord, Twitter, LinkedIn) aggressively cache metadata. Updating settings here will update the internal system and PWA manifest immediately, but <strong>external links may take days to update unless you force a refresh</strong>.
                </p>
                <p className="text-sm text-slate-300 mb-2">Use the official validator tools to clear the cache for your link:</p>
                <div className="flex flex-wrap gap-3">
                    <a href="https://cards-dev.twitter.com/validator" target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-600 px-3 py-2 rounded-sm flex items-center">
                        <i className="fa-brands fa-twitter mr-2"></i>Twitter-Kartenvalidator</a>
                    <a href="https://www.linkedin.com/post-inspector/" target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-600 px-3 py-2 rounded-sm flex items-center">
                        <i className="fa-brands fa-linkedin mr-2"></i>LinkedIn-Inspektor</a>
                    <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-600 px-3 py-2 rounded-sm flex items-center">
                        <i className="fa-brands fa-facebook mr-2"></i>Facebook/Meta-Debugger</a>
                </div>
            </div>
        </div>
    );
};

export default SiteMetadataTab;
