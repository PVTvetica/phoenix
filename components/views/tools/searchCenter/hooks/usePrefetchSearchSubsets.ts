import { useEffect, useState } from 'react';
import { useData } from '../../../../../contexts/DataContext';
import { useHR } from '../../../../../contexts/HRContext';
import { useAuth } from '../../../../../contexts/AuthContext';

export interface PrefetchState {
    hr: 'idle' | 'loading' | 'ready' | 'error' | 'forbidden';
    wiki: 'idle' | 'loading' | 'ready' | 'error';
}

/**
 * Pre-fetches HR and Wiki subsets when the search view mounts. These
 * collections are loaded on-demand elsewhere in the app, but search wants
 * them cached so the user can find HR cases and wiki pages without first
 * visiting those views.
 */
export const usePrefetchSearchSubsets = (): PrefetchState & {
    retryHr: () => void;
    retryWiki: () => void;
} => {
    const { refreshHR, refreshWiki, wikiPages } = useData();
    const { hrApplicants, hrJobs } = useHR();
    const { hasPermission } = useAuth();
    const canSeeHr = hasPermission('hr:view');

    const [hrState, setHrState] = useState<PrefetchState['hr']>(() => {
        if (!canSeeHr) return 'forbidden';
        return hrApplicants.length > 0 || hrJobs.length > 0 ? 'ready' : 'idle';
    });
    const [wikiState, setWikiState] = useState<PrefetchState['wiki']>(() =>
        wikiPages.length > 0 ? 'ready' : 'idle',
    );

    useEffect(() => {
        if (!canSeeHr) {
            setHrState('forbidden');
            return;
        }
        if (hrState !== 'idle') return;
        let cancelled = false;
        setHrState('loading');
        refreshHR()
            .then(() => { if (!cancelled) setHrState('ready'); })
            .catch(() => { if (!cancelled) setHrState('error'); });
        return () => { cancelled = true; };
    }, [canSeeHr, hrState, refreshHR]);

    useEffect(() => {
        if (wikiState !== 'idle') return;
        let cancelled = false;
        setWikiState('loading');
        refreshWiki()
            .then(() => { if (!cancelled) setWikiState('ready'); })
            .catch(() => { if (!cancelled) setWikiState('error'); });
        return () => { cancelled = true; };
    }, [wikiState, refreshWiki]);

    const retryHr = () => {
        if (!canSeeHr) return;
        setHrState('idle');
    };
    const retryWiki = () => setWikiState('idle');

    return { hr: hrState, wiki: wikiState, retryHr, retryWiki };
};
