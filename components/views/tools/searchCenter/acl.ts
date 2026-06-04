import {
    HydratedIntelligenceReport,
    HydratedOperation,
    WikiPage,
    User,
} from '../../../../types';

export interface AclContext {
    currentUser: User | null;
    userLevel: number;
    userMarkers: Set<number>;
    hasPermission: (permission: string) => boolean;
}

export const buildAclContext = (
    currentUser: User | null,
    hasPermission: (permission: string) => boolean,
): AclContext => ({
    currentUser,
    userLevel: currentUser?.clearanceLevel?.level || 0,
    userMarkers: new Set(currentUser?.limitingMarkers?.map(m => m.id) || []),
    hasPermission,
});

export const hasIntelAccess = (
    report: HydratedIntelligenceReport,
    acl: AclContext,
): boolean => {
    if (report.createdBy?.id === acl.currentUser?.id) return true;
    if (report.classificationLevel > acl.userLevel) return false;
    if (report.limitingMarkers && report.limitingMarkers.length > 0) {
        return report.limitingMarkers.every(m => acl.userMarkers.has(m.id));
    }
    return true;
};

export const hasOperationAccess = (
    op: HydratedOperation,
    acl: AclContext,
): boolean => {
    if (op.ownerId === acl.currentUser?.id) return true;
    if ((op.clearanceLevel || 0) > acl.userLevel) return false;
    if (op.limitingMarkers && op.limitingMarkers.length > 0) {
        return op.limitingMarkers.every(m => acl.userMarkers.has(m.id));
    }
    return true;
};

export const hasHrAccess = (acl: AclContext): boolean =>
    acl.hasPermission('hr:view');

export const hasWikiAccess = (page: WikiPage, acl: AclContext): boolean => {
    if ((page.classificationLevel || 0) > acl.userLevel) return false;
    if (page.limitingMarkers && page.limitingMarkers.length > 0) {
        return page.limitingMarkers.every(m => acl.userMarkers.has(m.id));
    }
    return true;
};
