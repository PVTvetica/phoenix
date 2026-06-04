
import React from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { sanitizeImageUrl } from '../../lib/imageUrl';

const HeroCard: React.FC = () => {
    const { heroCardConfig } = useConfig();

    // Hide card if neither URL is configured
    if (!heroCardConfig.discordUrl && !heroCardConfig.organizationUrl) return null;

    const safeBg = sanitizeImageUrl(heroCardConfig.backgroundImageUrl);
    const cardStyle = safeBg ? { backgroundImage: `url("${safeBg.replace(/"/g, '%22')}")` } : undefined;

    return (
        <div
            className="rounded-xl border border-slate-700/50 bg-cover bg-center flex flex-col justify-between p-5 text-white relative overflow-hidden min-h-[250px]"
            style={cardStyle}
        >
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs"></div>
            <div className="relative z-10">
                <h2 className="text-xl font-bold">{heroCardConfig.title}</h2>
                <p className="text-slate-300 mt-1 text-xs leading-relaxed">{heroCardConfig.subtitle}</p>
            </div>
            <div className="relative z-10 space-y-2 mt-4">
                <a
                    href={heroCardConfig.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full bg-[#5865F2] hover:bg-[#4f5bda] text-white font-bold text-xs uppercase tracking-wide px-4 py-2.5 rounded-lg transition-colors"
                >
                    <i className="fa-brands fa-discord h-4 w-4 mr-2" />Beitreten Discord</a>
                <a
                    href={heroCardConfig.organizationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wide px-4 py-2.5 rounded-lg transition-colors border border-white/10"
                >
                    <span className="mr-2">RSI Org-Seite</span>
                    <i className="fa-solid fa-arrow-up-right-from-square h-3 w-3" />
                </a>
            </div>
        </div>
    );
};

export default HeroCard;
