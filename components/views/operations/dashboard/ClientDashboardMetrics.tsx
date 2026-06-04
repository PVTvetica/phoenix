import React, { useMemo } from 'react';
import { useData } from '../../../../contexts/DataContext';
import { useAuth, useFormatDate } from '../../../../contexts/AuthContext';
import { ServiceRequestStatus } from '../../../../types';
import { MetricCard } from '../../../shared/ui';

export default function ClientDashboardMetrics() {
    const { hydratedServiceRequests } = useData();
    const { currentUser } = useAuth();
    const fmt = useFormatDate();

    const requestsFilled = useMemo(() => hydratedServiceRequests.filter((r: any) =>
        r.clientId === currentUser?.id && r.status === ServiceRequestStatus.Success,
    ).length, [hydratedServiceRequests, currentUser?.id]);

    if (!currentUser) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard
                label="Requests Filled"
                value={requestsFilled}
                sub={requestsFilled === 0 ? 'Your first op awaits' : 'Completed services'}
                icon="fa-clipboard-check"
                accent="emerald"
            />
            <MetricCard
                label="Ruf"
                value={currentUser.reputation}
                sub="Standing with this org"
                icon="fa-star"
                accent="amber"
            />
            <MetricCard
                label="Member Since"
                value={(currentUser.tenureStartDate || currentUser.createdAt) ? fmt.date(currentUser.tenureStartDate || currentUser.createdAt) : '—'}
                sub="Your service tenure"
                icon="fa-calendar-day"
                accent="slate"
            />
        </div>
    );
}
