import React, { useState, useEffect } from 'react';
import { isSafeImageUrl } from '../../lib/imageUrl';

interface AwardIconProps {
    imageUrl?: string | null;
    icon?: string | null;
    fallbackIcon: string;
    className?: string;
    alt?: string;
}

/**
 * Unified renderer for Specialization / Certification / Commendation icons.
 * Precedence: valid https imageUrl → FA `icon` → fallbackIcon.
 * If the image 404s or fails to load, onError downgrades to the FA path.
 *
 * The URL is re-validated client-side with the same rules as the server
 * sanitizer so stale/tampered rows don't leak unsafe strings into <img src>.
 */
const AwardIcon: React.FC<AwardIconProps> = ({ imageUrl, icon, fallbackIcon, className, alt }) => {
    const [failed, setFailed] = useState(false);

    useEffect(() => { setFailed(false); }, [imageUrl]);

    const canUseImage = !!imageUrl && isSafeImageUrl(imageUrl) && !failed;

    if (canUseImage) {
        return (
            <img
                src={imageUrl as string}
                alt={alt || ''}
                onError={() => setFailed(true)}
                referrerPolicy="no-referrer"
                loading="lazy"
                className={`object-contain ${className || ''}`}
            />
        );
    }

    return <i className={`${icon || fallbackIcon} ${className || ''}`} aria-hidden={!alt} aria-label={alt || undefined} />;
};

export default AwardIcon;
