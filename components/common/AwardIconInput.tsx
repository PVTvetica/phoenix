import React from 'react';
import AwardIcon from './AwardIcon';
import { isSafeImageUrl } from '../../lib/imageUrl';

interface AwardIconInputProps {
    icon: string;
    onIconChange: (v: string) => void;
    imageUrl: string;
    onImageUrlChange: (v: string) => void;
    mode: 'fa' | 'url';
    onModeChange: (m: 'fa' | 'url') => void;
    fallbackIcon: string;
    accentClass?: string;
    disabled?: boolean;
    iconPlaceholder?: string;
}

/**
 * Shared input block for picking either a Font Awesome class OR a user-supplied
 * image URL. Used in SpecializationModal / CertificationModal / CommendationModal.
 * Hides the inactive field so the user commits to one source.
 */
const AwardIconInput: React.FC<AwardIconInputProps> = ({
    icon, onIconChange,
    imageUrl, onImageUrlChange,
    mode, onModeChange,
    fallbackIcon,
    accentClass = 'text-sky-400',
    disabled,
    iconPlaceholder = 'e.g., fa-solid fa-star',
}) => {
    const urlValid = !imageUrl.trim() || isSafeImageUrl(imageUrl);
    const tabBase = 'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors';
    const tabActive = 'bg-sky-500/20 text-sky-300 border border-sky-500/40';
    const tabInactive = 'bg-slate-900/50 text-slate-500 border border-slate-800 hover:text-slate-300';
    const inputClass = 'w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 outline-hidden transition-all';

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onModeChange('fa')}
                    className={`${tabBase} ${mode === 'fa' ? tabActive : tabInactive}`}
                    disabled={disabled}
                >
                    <i className="fa-solid fa-icons mr-1.5"></i>Font Awesome
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('url')}
                    className={`${tabBase} ${mode === 'url' ? tabActive : tabInactive}`}
                    disabled={disabled}
                >
                    <i className="fa-solid fa-image mr-1.5"></i>Bild URL</button>
            </div>

            <div className="flex gap-3 items-start">
                <div className="flex-1">
                    {mode === 'fa' ? (
                        <input
                            type="text"
                            value={icon}
                            onChange={(e) => onIconChange(e.target.value)}
                            placeholder={iconPlaceholder}
                            className={`${inputClass} font-mono text-xs`}
                            disabled={disabled}
                        />
                    ) : (
                        <>
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => onImageUrlChange(e.target.value)}
                                placeholder="https://cdn.example.com/award.png"
                                className={`${inputClass} text-xs`}
                                disabled={disabled}
                            />
                            {imageUrl.trim() && !urlValid && (
                                <p className="text-[10px] text-red-400 mt-1.5">
                                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                    URL must be https and end in .png, .jpg, .jpeg, .gif, .webp, or .avif. Colors are not tinted on uploaded images.
                                </p>
                            )}
                            {imageUrl.trim() && urlValid && (
                                <p className="text-[10px] text-slate-500 mt-1.5">Bildfarben werden von der Benutzeroberfläche nicht getönt.</p>
                            )}
                        </>
                    )}
                </div>
                <div className="w-12 h-12 shrink-0 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden">
                    <AwardIcon
                        imageUrl={mode === 'url' ? imageUrl : undefined}
                        icon={mode === 'fa' ? icon : undefined}
                        fallbackIcon={fallbackIcon}
                        className={`${accentClass} text-xl max-w-full max-h-full`}
                        alt="preview"
                    />
                </div>
            </div>
        </div>
    );
};

export default AwardIconInput;
