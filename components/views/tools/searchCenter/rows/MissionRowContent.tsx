import React from 'react';
import { HydratedServiceRequest, ServiceRequestStatus } from '../../../../../types';
import { AccentKey } from '../../../../shared/ui/accents';
import SearchResultCard from '../SearchResultCard';
import { timeAgoShort } from '../../../intel/intelStyles';

interface Props {
    request: HydratedServiceRequest;
    onClick: () => void;
    isSelected?: boolean;
}

const statusAccent = (s: ServiceRequestStatus): AccentKey => {
    switch (s) {
        case ServiceRequestStatus.Submitted:
        case ServiceRequestStatus.Triaged:
            return 'amber';
        case ServiceRequestStatus.Accepted:
        case ServiceRequestStatus.InProgress:
            return 'sky';
        case ServiceRequestStatus.Success:
            return 'emerald';
        case ServiceRequestStatus.Failed:
        case ServiceRequestStatus.Aborted:
        case ServiceRequestStatus.GameError:
            return 'red';
        case ServiceRequestStatus.Cancelled:
        case ServiceRequestStatus.Refused:
            return 'slate';
        default:
            return 'sky';
    }
};

const MissionRowContent: React.FC<Props> = ({ request, onClick, isSelected }) => {
    const accent = statusAccent(request.status);
    const shortId = request.id.split('-')[1]?.toUpperCase() ?? request.id.slice(0, 8).toUpperCase();
    const clientLabel = request.client?.name || request.unregisteredClientRsiHandle || 'Unknown';
    const isActive = request.status === ServiceRequestStatus.InProgress;
    return (
        <SearchResultCard
            accent={accent}
            pulseRail={isActive}
            icon="fa-list-check"
            onClick={onClick}
            isSelected={isSelected}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] text-slate-500 tracking-wider shrink-0">REQ-{shortId}</span>
                <span className="text-slate-700 shrink-0">·</span>
                <h3 className="text-white font-bold text-sm truncate">{request.location || request.serviceType}</h3>
                <span className="text-slate-700 shrink-0">·</span>
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    <i className="fa-regular fa-clock mr-1" aria-hidden />
                    {timeAgoShort(request.updatedAt || request.createdAt)}
                </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded-sm border bg-slate-900/60 border-white/10 text-slate-400 font-mono text-[10px] uppercase tracking-wider shrink-0">
                    {request.serviceType}
                </span>
                <span className="text-[10px] text-slate-400 truncate min-w-0">
                    <i className="fa-solid fa-user text-slate-600 mr-1" aria-hidden />
                    {clientLabel}
                </span>
                <span className={`ml-auto px-1.5 py-0.5 rounded border font-black text-[9px] uppercase tracking-widest shrink-0 ${
                    request.status === ServiceRequestStatus.Success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : isActive
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                            : 'bg-slate-900/60 border-white/10 text-slate-400'
                }`}>
                    {request.status}
                </span>
            </div>
        </SearchResultCard>
    );
};

export default React.memo(MissionRowContent);
