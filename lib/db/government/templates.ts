
import { supabase } from '../common.js';
import { log, broadcastGovernmentUpdate, GOVERNMENT_TEMPLATES } from './internal.js';
import { upsertGovernmentConfig, getGovernmentState } from './structure.js';

export function getGovernmentTemplates() {
    return GOVERNMENT_TEMPLATES;
}

export async function applyGovernmentTemplate(templateType: string) {
    const template = GOVERNMENT_TEMPLATES.find(t => t.type === templateType);
    if (!template) throw new Error(`Unknown government template: ${templateType}`);

    // Delete existing branches and positions (cascade will handle holders)
    await supabase.from('government_branches').delete();

    // Upsert the config
    await upsertGovernmentConfig({
        governmentType: template.type,
        name: template.name,
        description: template.description,
    });

    // Create branches and their positions
    for (const branchDef of template.branches) {
        const { data: branch, error: branchError } = await supabase.from('government_branches').insert({
            name: branchDef.name,
            branch_type: branchDef.branchType,
            icon: branchDef.icon,
            sort_order: branchDef.sortOrder,
        }).select().single();

        if (branchError || !branch) {
            log.error('create branch failed', { branchName: branchDef.name, err: branchError });
            continue;
        }

        for (const posDef of branchDef.positions) {
            await supabase.from('government_positions').insert({
                branch_id: branch.id,
                name: posDef.name,
                fill_method: posDef.fillMethod,
                term_length_days: posDef.termLengthDays || null,
                max_holders: posDef.maxHolders,
                icon: posDef.icon || null,
                sort_order: posDef.sortOrder,
                permissions_granted: posDef.permissionsGranted || [],
                can_propose_legislation: posDef.canProposeLegislation ?? false,
                can_vote_legislation: posDef.canVoteLegislation ?? false,
                can_veto_legislation: posDef.canVetoLegislation ?? false,
                can_call_elections: posDef.canCallElections ?? false,
            });
        }
    }

    broadcastGovernmentUpdate();
    return getGovernmentState();
}
