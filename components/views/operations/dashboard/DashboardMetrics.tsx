import React, { useMemo } from 'react';
import { useData } from '../../../../contexts/DataContext';
import { useMembers } from '../../../../contexts/MembersContext';
import { useOperations } from '../../../../contexts/OperationsContext';
import { useAuth } from '../../../../contexts/AuthContext';
import {
    ServiceRequestStatus,
    UrgencyLevel,
    OperationStatus,
    WarrantStatus,
} from '../../../../types';
import { MetricCard } from '../../../shared/ui';

export default function DashboardMetrics() {
    const { hydratedServiceRequests } = useData();
    const { members } = useMembers();
    const { operations, warrants } = useOperations();
    const { currentUser, hasPermission } = useAuth();

    const userLevel = currentUser?.clearanceLevel?.level || 0;
    const userMarkers = useMemo(
        () => new Set(currentUser?.limitingMarkers?.map((m: any) => m.id) || []),
        [currentUser],
    );

    const activeOpsCount = useMemo(() => operations.filter((op) => {
        if (op.status !== OperationStatus.Active && op.status !== OperationStatus.Scheduled) return false;
        if (op.isSpecial || op.ownerId === currentUser?.id || hasPermission('operations:manage')) return true;
        if ((op.clearanceLevel || 0) > userLevel) return false;
        if (op.limitingMarkers && op.limitingMarkers.length > 0) {
            return op.limitingMarkers.every((m: any) => userMarkers.has(m.id));
        }
        return true;
    }).length, [operations, currentUser, userLevel, userMarkers, hasPermission]);

    const pendingRequestsCount = useMemo(() => hydratedServiceRequests.filter((r) =>
        [ServiceRequestStatus.Submitted, ServiceRequestStatus.Triaged, ServiceRequestStatus.InProgress].includes(r.status),
    ).length, [hydratedServiceRequests]);

    const criticalRequestsCount = useMemo(() => hydratedServiceRequests.filter((r) =>
        r.urgency === UrgencyLevel.Critical &&
        [ServiceRequestStatus.Submitted, ServiceRequestStatus.Triaged].includes(r.status),
    ).length, [hydratedServiceRequests]);

    const activeWarrantsCount = useMemo(() => warrants.filter((w) =>
        w.status === WarrantStatus.Active || w.status === WarrantStatus.Standing,
    ).length, [warrants]);

    const onDutyCount = useMemo(() => members.filter((m: any) => m.isDuty).length, [members]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
                label="Aktive Einsätze"
                value={activeOpsCount}
                sub={activeOpsCount === 0 ? 'Nichts läuft' : 'Laufend'}
                icon="fa-crosshairs"
                accent="amber"
            />
            <MetricCard
                label="Ausstehende Anfragen"
                value={pendingRequestsCount}
                sub={criticalRequestsCount > 0 ? `${criticalRequestsCount} kritisch` : 'Warteschlange leer'}
                icon="fa-clipboard-list"
                accent={criticalRequestsCount > 0 ? 'rose' : 'sky'}
                emphasize={criticalRequestsCount > 0}
            />
            <MetricCard
                label="Aktive Vorsichtsmaßnahmen"
                value={activeWarrantsCount}
                sub={activeWarrantsCount === 0 ? 'Keine aktiv' : 'Live'}
                icon="fa-triangle-exclamation"
                accent="rose"
            />
            <MetricCard
                label="Mitglieder im Dienst"
                value={onDutyCount}
                sub={onDutyCount === 0 ? 'Niemand im Dienst' : 'Einsatzbereit'}
                icon="fa-user-shield"
                accent={onDutyCount === 0 ? 'slate' : 'emerald'}
            />
        </div>
    );
}
