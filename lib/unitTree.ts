import type { OrganizationalUnit } from '../types.js';

// Shared unit-hierarchy tree builder. Used by DutyRosterView (hierarchical
// roster mode) and OrganisationView (org chart). Extracting here keeps the
// two surfaces in lock-step when units change shape and avoids duplicating
// the recursive-sort logic.

export interface UnitNode extends OrganizationalUnit {
    children: UnitNode[];
}

export function buildUnitTree(units: OrganizationalUnit[]): UnitNode[] {
    const nodes: UnitNode[] = units.map(u => ({ ...u, children: [] }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const roots: UnitNode[] = [];

    for (const node of nodes) {
        if (node.parentUnitId && nodeMap.has(node.parentUnitId)) {
            nodeMap.get(node.parentUnitId)!.children.push(node);
        } else {
            roots.push(node);
        }
    }

    const sortNodes = (nodeList: UnitNode[]) => {
        nodeList.sort((a, b) =>
            (a.sortOrder || 0) - (b.sortOrder || 0)
            || a.name.localeCompare(b.name)
        );
        nodeList.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
}
