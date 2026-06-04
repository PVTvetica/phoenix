
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import * as db from '../lib/db.js';
import { verifyToken, tokenIssuedAt } from '../lib/auth.js';
import { isOpaqueServerError } from '../lib/errors.js';
import { getClientIp } from '../lib/clientIp.js';
import { checkAuthRateLimit } from '../lib/authRateLimit.js';
import { log as baseLog } from '../lib/log.js';

const log = baseLog.child({ module: 'services' });

// Import Action Modules
import { authActions } from './actions/auth.js';
import { adminActions } from './actions/admin.js';
import { hrActions } from './actions/hr.js';
import { operationActions } from './actions/operations.js';
import { requestActions } from './actions/requests.js';
import { intelActions } from './actions/intel.js';
import { systemActions } from './actions/system.js';
import { userActions } from './actions/user.js';
import { wikiActions } from './actions/wiki.js';
import { fleetActions } from './actions/fleet.js';
import { governmentActions } from './actions/government.js';
import { financesActions } from './actions/finances.js';
import { quartermasterActions } from './actions/quartermaster.js';
import { warehouseActions } from './actions/warehouse.js';
import { catalogActions } from './actions/catalog.js';
import { allianceActions } from './actions/alliances.js';
import { operationsFederationActions } from './actions/operations-federation.js';

type ActionHandler = (payload: any, token?: string) => Promise<unknown>;

// Public actions are dispatched without auth/permission checks. They short-circuit
// at the public-action handler before the protected-prefix BOLA gate runs.
export const PUBLIC_ACTIONS: readonly string[] = ['auth:discord_callback', 'auth:finalize_setup', 'auth:redeem_setup_code', 'system:get_push_config', 'system:preflight'];

// Action prefixes that require a permission entry in fullPermissionMap. Any
// authenticated request to an action with one of these prefixes is gated by
// the BOLA/permission check below. Actions outside this list (e.g. user:*) are
// authenticated-but-not-permission-gated.
export const PROTECTED_PREFIXES: readonly string[] = ['admin:', 'hr:', 'intel:', 'warrant:', 'unit:', 'operation:', 'request:', 'broadcast:', 'api:', 'wiki:', 'fleet:', 'gov:', 'radio:', 'warehouse:', 'finance:', 'qm:', 'system:', 'discord:', 'org:', 'catalog:', 'alliance:', 'mirror:'];

export const fullPermissionMap: Record<string, string> = {
    // Admin User Management
    'admin:update_user': 'admin:user:update',
    'admin:update_user_clearance': 'admin:user:manage_clearance',
    'admin:bulk_update_user_clearances': 'admin:user:manage_clearance',
    'admin:bulk_demote_to_client': 'admin:user:update_role',
    'admin:bulk_promote_users': 'admin:user:update_role',
    'admin:bulk_set_affiliate': 'admin:user:update',
    'admin:bulk_set_vip': 'admin:user:update',
    'admin:bulk_assign_unit': 'admin:user:update',
    'admin:bulk_assign_rank': 'admin:user:update',
    'admin:bulk_assign_position': 'admin:user:update',
    'admin:bulk_grant_certification': 'admin:award:certification',
    'admin:bulk_grant_commendation': 'admin:award:commendation',
    'admin:adjust_rep': 'admin:user:adjust_reputation',
    'admin:promote_user': 'admin:user:update_role',
    'admin:get_rep_history': 'admin:user:view_history',
    'admin:get_rating_history': 'admin:user:view_history',
    'admin:toggle_duty': 'admin:user:update',
    'admin:toggle_affiliate': 'admin:user:update',
    'admin:toggle_vip': 'admin:user:update',

    // Org Config
    'admin:add_unit': 'admin:config:units',
    'admin:update_unit': 'admin:config:units',
    'admin:delete_unit': 'admin:config:units',
    'admin:add_rank': 'admin:config:ranks',
    'admin:update_rank': 'admin:config:ranks',
    'admin:delete_rank': 'admin:config:ranks',
    'admin:add_role': 'admin:config:roles',
    'admin:update_role': 'admin:config:roles',
    'admin:delete_role': 'admin:config:roles',
    'admin:get_role_details': 'admin:config:roles',
    'admin:update_role_permissions': 'admin:config:roles',
    'admin:add_location': 'admin:config:locations',
    'admin:update_location': 'admin:config:locations',
    'admin:delete_location': 'admin:config:locations',
    'admin:seed_default_locations': 'admin:config:locations',
    'admin:update_clearance': 'admin:config:clearance',
    'admin:add_marker': 'admin:config:clearance',
    'admin:update_marker': 'admin:config:clearance',
    'admin:delete_marker': 'admin:config:clearance',

    // Recognition
    'admin:add_specialization': 'admin:config:specializations',
    'admin:update_specialization': 'admin:config:specializations',
    'admin:delete_specialization': 'admin:config:specializations',
    'admin:add_certification': 'admin:config:certifications',
    'admin:update_certification': 'admin:config:certifications',
    'admin:delete_certification': 'admin:config:certifications',
    'admin:award_certification': 'admin:award:certification',
    'admin:revoke_certification': 'admin:revoke:certification',
    'admin:add_commendation': 'admin:config:commendations',
    'admin:update_commendation': 'admin:config:commendations',
    'admin:delete_commendation': 'admin:config:commendations',
    'admin:award_commendation': 'admin:award:commendation',
    'admin:revoke_commendation': 'admin:revoke:commendation',
    'admin:preview_specializations_import': 'admin:config:specializations',
    'admin:bulk_import_specializations': 'admin:config:specializations',
    'admin:preview_certifications_import': 'admin:config:certifications',
    'admin:bulk_import_certifications': 'admin:config:certifications',
    'admin:preview_commendations_import': 'admin:config:commendations',
    'admin:bulk_import_commendations': 'admin:config:commendations',

    // Comms & Notices
    'admin:add_announcement': 'admin:config:notices',
    'admin:update_announcement': 'admin:config:notices',
    'admin:delete_announcement': 'admin:config:notices',
    'broadcast:eam': 'admin:broadcast:eam',
    'broadcast:alert': 'admin:broadcast:eam',
    // Any authenticated user may CALL it; the handler enforces the
    // staff-or-user:receive:eam audience (mirrors the client UI gate).
    'broadcast:get_active_eam': 'user:manage:self',

    // Settings & Integrations
    'admin:update_discord_config': 'admin:config:discord',
    'admin:sync_discord_roles': 'admin:config:discord',
    'admin:sync_all_member_roles': 'admin:config:discord',
    'admin:sync_user_roles': 'admin:config:discord',
    'admin:update_rank_mapping': 'admin:config:discord',
    'admin:update_branding_config': 'admin:config:branding',
    'admin:update_public_page_config': 'admin:config:branding',
    'admin:list_testimonial_candidates': 'admin:config:branding',
    'admin:update_system_config': 'admin:config:branding',
    'admin:update_intel_sharing_config': 'admin:config:api',
    'admin:update_hr_config': 'hr:admin',
    'admin:get_intel_sharing_config': 'admin:config:api',
    'admin:update_radio_config': 'admin:config:branding',
    'admin:update_hero_config': 'admin:config:branding',
    'admin:update_opengraph_config': 'admin:config:metadata',
    'admin:update_ai_config': 'admin:config:ai',
    'admin:update_wiki_home_config': 'wiki:edit_page',
    'admin:add_radio_channel': 'radio:manage',
    'admin:update_radio_channel': 'radio:manage',
    'admin:delete_radio_channel': 'radio:manage',
    'radio:reboot': 'radio:manage',
    'radio:auth': 'user:manage:self',
    'radio:op_auth': 'user:manage:self',
    'radio:status': 'user:manage:self',
    'system:search_locations': 'user:manage:self',
    // Reference-data lookups (clearances, markers, global search). Reference
    // tables, available to any authenticated user — same shape as
    // system:search_locations above. Behaviour-neutral entries added so the
    // BOLA prefix gate does not 403 legitimate callers.
    'system:get_clearances': 'user:manage:self',
    'system:get_markers': 'user:manage:self',
    // org:claim: any authenticated user can attempt; the claim code itself is
    // the privilege guard (validateClaimCode TTL + rate limit).
    'org:claim': 'user:manage:self',

    // Finances (org treasury / bank ledger)
    'finance:list_accounts':            'finance:view',
    'finance:list_ledger':              'finance:view',
    'finance:get_entry':                'finance:view',
    'finance:get_account':              'finance:view',
    'finance:get_overview':             'finance:view',
    'finance:export_csv':               'finance:view',
    'finance:submit_deposit':           'finance:deposit',
    'finance:submit_withdrawal':        'finance:withdraw_request',
    'finance:approve_entry':            'finance:approve',
    'finance:reject_entry':             'finance:approve',
    'finance:reverse_entry':            'finance:manage',
    'finance:record_adjustment':        'finance:manage',
    'finance:create_account':           'finance:manage',
    'finance:update_account':           'finance:manage',
    'finance:archive_account':          'finance:manage',
    'finance:reconcile':                'finance:manage',

    // Quartermaster (org inventory / armoury)
    'qm:list_catalog':                  'qm:view',
    'qm:get_catalog_item':              'qm:view',
    'qm:search_catalog':                'qm:view',
    'qm:list_locations':                'qm:view',
    'qm:get_location':                  'qm:view',
    'qm:list_inventory':                'qm:view',
    'qm:count_inventory':               'qm:view',
    'qm:list_issuances':                'qm:view',
    'qm:get_issuance':                  'qm:view',
    'qm:list_member_records':           'qm:view',
    'qm:list_overdue':                  'qm:view',
    'qm:get_overview':                  'qm:view',
    'qm:list_low_stock':                'qm:view',
    'qm:export_csv':                    'qm:view',
    'qm:request_issuance':              'qm:request',
    'qm:create_inventory':              'qm:manage',
    'qm:update_inventory':              'qm:manage',
    'qm:adjust_inventory':              'qm:manage',
    'qm:fulfil_issuance':               'qm:manage',
    'qm:issue_direct':                  'qm:manage',
    'qm:issue_bulk':                    'qm:manage',
    'qm:return_issuance':               'qm:manage',
    'qm:return_bulk':                   'qm:manage',
    'qm:write_off_issuance':            'qm:manage',
    'qm:create_location':               'qm:manage',
    'qm:update_location':               'qm:manage',
    'qm:delete_location':               'qm:manage',
    'qm:create_catalog_item':           'qm:admin',
    'qm:update_catalog_item':           'qm:admin',
    'qm:delete_catalog_item':           'qm:admin',

    // Warehouse — bulk fungible commodities
    'warehouse:list_catalog':           'warehouse:view',
    'warehouse:search_catalog':         'warehouse:view',
    'warehouse:list_locations':         'warehouse:view',
    'warehouse:list_stock':             'warehouse:view',
    'warehouse:count_stock':            'warehouse:view',
    'warehouse:list_movements':         'warehouse:view',
    'warehouse:list_withdrawals':       'warehouse:view',
    'warehouse:get_overview':           'warehouse:view',
    'warehouse:export_csv':             'warehouse:view',
    'warehouse:request_withdrawal':     'warehouse:request',
    'warehouse:cancel_withdrawal':      'warehouse:request',
    'warehouse:create_stock':           'warehouse:manage',
    'warehouse:delete_stock':           'warehouse:manage',
    'warehouse:adjust_stock':           'warehouse:manage',
    'warehouse:transfer_stock':         'warehouse:manage',
    'warehouse:approve_withdrawal':     'warehouse:manage',
    'warehouse:deny_withdrawal':        'warehouse:manage',
    'warehouse:fulfil_withdrawal':      'warehouse:manage',
    'warehouse:create_location':        'warehouse:manage',
    'warehouse:update_location':        'warehouse:manage',
    'warehouse:delete_location':        'warehouse:manage',
    'warehouse:create_catalog_item':    'warehouse:admin',
    'warehouse:update_catalog_item':    'warehouse:admin',
    'warehouse:archive_catalog_item':   'warehouse:admin',
    'warehouse:delete_catalog_item':    'warehouse:admin',
    'warehouse:export_catalog':         'warehouse:view',
    'warehouse:preview_import_catalog': 'warehouse:admin',
    'warehouse:import_catalog':         'warehouse:admin',

    // External Tools & API
    'admin:add_tool': 'admin:config:tools',
    'admin:update_tool': 'admin:config:tools',
    'admin:delete_tool': 'admin:config:tools',
    'admin:reorder_tool': 'admin:config:tools',
    'api:create_key': 'admin:config:api',
    'api:delete_key': 'admin:config:api',
    'api:list_keys': 'admin:config:api',

    // Service Types
    'admin:add_service_type': 'admin:config:servicetypes',
    'admin:update_service_type': 'admin:config:servicetypes',
    'admin:delete_service_type': 'admin:config:servicetypes',

    // Warrants
    'warrant:create': 'warrant:create',
    'warrant:update': 'warrant:manage',
    'warrant:delete': 'warrant:manage',
    'warrant:generate_report': 'intel:create',
    // #11: notes — read for anyone who can view warrants, post for managers.
    'warrant:add_note': 'warrant:manage',
    'warrant:get_notes': 'warrant:view',

    // Intel
    'intel:get_reports': 'intel:view',
    'intel:get_recent': 'intel:view',
    'intel:list': 'intel:view',
    'intel:hub_stats': 'intel:view',
    'intel:get_dossier': 'intel:view',
    'intel:search': 'intel:view',
    'intel:get_stats': 'intel:view',
    'intel:create_report': 'intel:create',
    // Authoring a bulletin (org-wide push + Discord fan-out) is a WRITE —
    // gate it like report authoring, not at the read permission.
    'intel:create_bulletin': 'intel:create',
    'intel:delete_bulletin': 'intel:manage',
    'intel:get_bulletins': 'intel:view',
    'intel:update_report': 'intel:manage',
    'intel:delete_report': 'intel:manage',
    'intel:update_affiliation': 'intel:manage',
    'intel:bulk_update_affiliation': 'intel:manage',
    'intel:bulk_add_tags': 'intel:manage',
    'intel:bulk_delete_reports': 'intel:manage',
    'intel:generate_summary': 'intel:view',
    'intel:sync_feeds': 'intel:manage', // Feed Ingest stays in the Intel tab
    // Receive-only feed CRUD moved to the Alliances tab (feeds are alliance_peers rows).
    'admin:get_trusted_feeds': 'alliance:manage',
    'admin:add_trusted_feed': 'alliance:manage',
    'admin:update_trusted_feed': 'alliance:manage',
    'admin:delete_trusted_feed': 'alliance:manage',
    'admin:sync_warrants_to_reports': 'intel:manage',
    'admin:deduplicate_warrants': 'intel:manage',
    'admin:deduplicate_intel': 'intel:manage',

    // Conduct
    'admin:add_conduct_entry': 'user:manage:conduct_record',
    'admin:delete_conduct_entry': 'user:manage:conduct_record',
    'admin:delete_request': 'request:delete',

    // Database
    'admin:db:check': 'admin:access',
    'admin:db:repair': 'admin:access',
    'admin:db:prune': 'admin:access',
    'admin:db:reset_finances': 'admin:access',
    'admin:db:reset_quartermaster': 'admin:access',
    'admin:import_org': 'admin:access',
    'system:complete_setup': 'admin:access',
    'admin:get_platform_settings': 'admin:access',
    'admin:update_platform_settings': 'admin:access',
    'admin:force_logout_all': 'admin:access',
    'admin:update_features': 'admin:config:features',

    // Global Catalog Management (ships / items / commodities / locations)
    'catalog:list_ships': 'admin:config:catalog',
    'catalog:sync_ships': 'admin:config:catalog',
    'catalog:repair_ships': 'admin:config:catalog',
    'catalog:update_ship': 'admin:config:catalog',
    'catalog:delete_ship': 'admin:config:catalog',
    'catalog:merge_ships': 'admin:config:catalog',
    'catalog:list_items': 'admin:config:catalog',
    'catalog:count_items': 'admin:config:catalog',
    'catalog:list_item_categories': 'admin:config:catalog',
    'catalog:update_item_category': 'admin:config:catalog',
    'catalog:delete_item_category': 'admin:config:catalog',
    'catalog:sync_items': 'admin:config:catalog',
    'catalog:update_item': 'admin:config:catalog',
    'catalog:delete_item': 'admin:config:catalog',
    'catalog:list_commodities': 'admin:config:catalog',
    'catalog:count_commodities': 'admin:config:catalog',
    'catalog:list_commodity_categories': 'admin:config:catalog',
    'catalog:update_commodity_category': 'admin:config:catalog',
    'catalog:delete_commodity_category': 'admin:config:catalog',
    'catalog:sync_commodities': 'admin:config:catalog',
    'catalog:update_commodity': 'admin:config:catalog',
    'catalog:delete_commodity': 'admin:config:catalog',
    'catalog:list_locations': 'admin:config:catalog',
    'catalog:count_locations': 'admin:config:catalog',
    'catalog:sync_locations': 'admin:config:catalog',
    'catalog:update_location': 'admin:config:catalog',
    'catalog:delete_location': 'admin:config:catalog',

    // Discord directory (read-only) — used by both the Comms Plan editor
    // (manager-only context) and the operation announcement picker in the
    // create wizard (creator-level context). Channel names are not sensitive
    // (any Discord member could see them), so we gate at the lowest needed
    // permission.
    'discord:list_guild_channels': 'operations:create',

    // HR Actions
    'hr:get_state': 'hr:view',
    'hr:create_application': 'user:manage:self',
    'hr:update_app_status': 'hr:recruiter',
    'hr:update_application_data': 'hr:recruiter',
    'hr:delete_application': 'hr:manager',
    'hr:assign_recruiter': 'hr:manager',
    'hr:create_interview': 'hr:recruiter',
    'hr:update_interview': 'hr:recruiter',
    'hr:update_interview_interviewer': 'hr:manager',
    'hr:delete_interview': 'hr:manager',
    'hr:save_interview': 'hr:recruiter',
    'hr:reopen_interview': 'hr:manager',
    'hr:create_job': 'hr:manager',
    'hr:update_job': 'hr:manager',
    'hr:update_job_status': 'hr:manager',
    'hr:delete_job': 'hr:manager',
    'hr:apply_job': 'user:manage:self',
    'hr:request_transfer': 'user:manage:self',
    'hr:process_transfer': 'hr:manager',
    'hr:create_template': 'hr:admin',
    'hr:update_template': 'hr:admin',
    'hr:delete_template': 'hr:admin',
    'hr:get_template_details': 'hr:recruiter',
    'hr:get_my_interviews': 'hr:view',
    'hr:create_position': 'hr:manage:positions',
    'hr:update_position': 'hr:manage:positions',
    'hr:delete_position': 'hr:manage:positions',
    'hr:add_log': 'hr:recruiter',
    'hr:get_application_logs': 'hr:view',
    // Vetting data is recruiter-grade PII (matches the hr:update_application_data
    // write gate and the getHRState non-recruiter redaction).
    'hr:get_application_data': 'hr:recruiter',
    'hr:process_job_approval': 'hr:recruiter',

    // User Self-Service HR
    'user:apply_job': 'user:manage:self',
    'user:submit_application': 'user:manage:self',

    // Unit Feed
    'unit:get_feed': 'user:view:roster',
    'unit:create_post': 'user:view:roster',
    'unit:delete_post': 'user:view:roster',
    'unit:update_details': 'unit:manage:own',

    // Request Actions
    'request:create': 'request:create',
    'request:create_adhoc': 'request:create_adhoc',
    'request:triage': 'request:triage',
    'request:admin_accept': 'request:dispatch',
    'request:accept': 'request:accept',
    'request:start': 'request:start',
    'request:complete': 'request:complete',
    'request:cancel': 'request:cancel',
    'request:rate': 'request:rate',
    'request:add_note': 'request:update',
    'request:update_status': 'request:update',
    'request:dispatch_members': 'request:dispatch',
    'request:add_responder': 'request:manage_responders',
    'request:remove_responder': 'request:manage_responders',
    'request:set_lead': 'request:set_lead',
    'request:add_party_member': 'request:update',
    'request:remove_party_member': 'request:update',
    'request:refuse': 'request:triage',
    'request:delete': 'request:delete',

    // Operation Actions
    'operation:create': 'operations:create',
    'operation:get_details': 'operations:view',
    'operation:delete': 'operations:manage',
    'operation:update': 'operations:manage',
    'operation:update_status': 'operations:manage',
    'operation:join': 'operations:view',
    'operation:leave': 'operations:view',
    'operation:add_participant': 'operations:manage',
    'operation:add_uec': 'operations:manage',
    'operation:add_cost': 'operations:manage',
    'operation:set_payout_mode': 'operations:manage',
    'operation:set_payout_splits': 'operations:manage',
    'operation:toggle_payout_paid': 'operations:manage',
    'operation:timeline_add': 'operations:view',
    'operation:toggle_ready': 'operations:view',
    'operation:update_participant_live_status': 'operations:view',
    'operation:reset_readiness': 'operations:manage',
    'operation:join_with_role': 'operations:view',
    'operation:update_participant': 'operations:manage',
    'operation:rsvp': 'operations:view',

    'operation:get_participant_ships': 'operations:view',

    'operation:update_live_status': 'operations:manage',

    // Operation Sub-resources (Phases, Schedule, Tasks, C2, Board, Logistics, AAR)
    'operation:add_phase': 'operations:manage',
    'operation:update_phase': 'operations:manage',
    'operation:delete_phase': 'operations:manage',
    'operation:add_schedule_entry': 'operations:manage',
    'operation:update_schedule_entry': 'operations:manage',
    'operation:delete_schedule_entry': 'operations:manage',
    'operation:add_task': 'operations:manage',
    'operation:update_task': 'operations:manage',
    'operation:delete_task': 'operations:manage',
    'operation:add_command_node': 'operations:manage',
    'operation:update_command_node': 'operations:manage',
    'operation:delete_command_node': 'operations:manage',
    'operation:add_board_element': 'operations:manage',
    'operation:update_board_element': 'operations:manage',
    'operation:delete_board_element': 'operations:manage',
    'operation:save_board': 'operations:manage',
    'operation:add_logistics': 'operations:manage',
    'operation:update_logistics': 'operations:manage',
    'operation:delete_logistics': 'operations:manage',
    'operation:fulfill_logistics': 'operations:view',
    'operation:add_aar_entry': 'operations:view',
    'operation:delete_aar_entry': 'operations:manage',
    'operation:submit_aar': 'operations:manage',
    'operation:reopen_aar': 'operations:manage',
    'operation:generate_aar_summary': 'operations:manage',
    // Templates: read for anyone with operations:view, mutate gated to creators.
    // operations:create is the existing perm a user needs to make a new op.
    'operation:template:list': 'operations:view',
    'operation:template:get': 'operations:view',
    'operation:template:create': 'operations:create',
    'operation:template:update': 'operations:create',
    'operation:template:delete': 'operations:create',
    'operation:template:from_operation': 'operations:create',
    'operation:template:import': 'operations:create',
    'operation:broadcast_alert': 'operations:manage',
    // Alert-content fetch for the trigger-only realtime ping; the handler
    // additionally re-applies the per-op clearance predicate.
    'operation:get_latest_alert': 'operations:view',
    'operation:repost_announcement': 'operations:manage',

    // Wiki
    'wiki:create_page': 'wiki:add_page',
    'wiki:update_page': 'wiki:edit_page',
    'wiki:delete_page': 'wiki:delete_page',
    'wiki:reorder_pages': 'wiki:edit_page',
    // Full unfiltered page dump (bypasses the clearance filter applied to the
    // wiki read path) — restrict to Admin so a clearance-limited wiki editor
    // can't export above-clearance classified pages (H3 residual).
    'wiki:export_pages': 'admin:access',
    'wiki:import_pages': 'admin:access',

    // Fleet Manager
    'fleet:add_ship': 'fleet:manage_own',
    'fleet:add_ships': 'fleet:manage_own',
    'fleet:update_ship': 'fleet:manage_own',
    'fleet:remove_ship': 'fleet:manage_own',
    'fleet:remove_ships': 'fleet:manage_own',
    'fleet:create_group': 'fleet:manage',
    'fleet:update_group': 'fleet:manage',
    'fleet:delete_group': 'fleet:manage',
    'fleet:assign_ship': 'fleet:manage',
    'fleet:unassign_ship': 'fleet:manage',
    'fleet:reorder_groups': 'fleet:manage',
    'fleet:reorder_group_ships': 'fleet:manage',
    'fleet:reparent_group': 'fleet:manage',
    'fleet:sync_catalog': 'admin:access',

    // Government
    'gov:update_feature_config': 'gov:admin',
    'gov:upsert_config': 'gov:admin',
    'gov:apply_template': 'gov:admin',
    'gov:get_templates': 'gov:view',
    'gov:update_constitution': 'gov:admin',
    'gov:create_branch': 'gov:admin',
    'gov:update_branch': 'gov:admin',
    'gov:delete_branch': 'gov:admin',
    'gov:reorder_branches': 'gov:admin',
    'gov:create_position': 'gov:admin',
    'gov:update_position': 'gov:admin',
    'gov:delete_position': 'gov:admin',
    'gov:reorder_positions': 'gov:admin',
    'gov:appoint_holder': 'gov:manage',
    'gov:remove_holder': 'gov:manage',
    'gov:create_election': 'gov:electoral_officer',
    'gov:update_election': 'gov:electoral_officer',
    'gov:advance_election': 'gov:electoral_officer',
    'gov:cancel_election': 'gov:electoral_officer',
    'gov:certify_results': 'gov:electoral_officer',
    'gov:call_by_election': 'gov:electoral_officer',
    'gov:declare_candidacy': 'gov:participate',
    'gov:withdraw_candidacy': 'gov:participate',
    'gov:cast_election_vote': 'gov:participate',
    'gov:create_legislation': 'gov:elected_official',
    'gov:update_legislation': 'gov:elected_official',
    'gov:propose_legislation': 'gov:elected_official',
    'gov:start_legislation_debate': 'gov:manage',
    'gov:start_legislation_vote': 'gov:manage',
    'gov:cast_legislation_vote': 'gov:elected_official',
    'gov:conclude_legislation_vote': 'gov:manage',
    'gov:veto_legislation': 'gov:elected_official',
    'gov:repeal_legislation': 'gov:manage',
    'gov:add_legislation_comment': 'gov:view',
    'gov:delete_legislation_comment': 'gov:manage',
    'gov:create_motion': 'gov:manage',
    'gov:start_motion_vote': 'gov:manage',
    'gov:cast_motion_vote': 'gov:participate',
    'gov:conclude_motion': 'gov:manage',
    'gov:cancel_motion': 'gov:manage',

    // Orders — reads open to anyone viewing gov; mutations gated by position holdership (server-side in db layer)
    'gov:list_orders': 'gov:view',
    'gov:get_order': 'gov:view',
    'gov:get_my_issuing_positions': 'gov:view',
    'gov:create_order': 'gov:issue_orders',
    'gov:update_order': 'gov:issue_orders',
    'gov:revoke_order': 'gov:issue_orders',
    'gov:delete_order': 'gov:issue_orders',

    // Alliances — mutations + the admin peer list require manage; the member
    // directory + self-profile read require view.
    'alliance:generate_code': 'alliance:manage',
    'alliance:add_peer': 'alliance:manage',
    'alliance:connect_peer': 'alliance:manage',
    'alliance:list_peers': 'alliance:manage',
    'alliance:update_peer': 'alliance:manage',
    'alliance:delete_peer': 'alliance:manage',
    'alliance:save_self_profile': 'alliance:manage',
    'alliance:get_directory': 'alliance:view',
    'alliance:get_self_profile': 'alliance:view',
    'alliance:fetch_peer_roster': 'alliance:view',
    'alliance:fetch_peer_fleet': 'alliance:view',

    // Joint-op federation (P3): host invite/revoke = manage operations; guest
    // accept/decline = diplomacy admin; list/get/rsvp/poll = view operations.
    'operation:invite_ally': 'operations:manage',
    'operation:revoke_ally': 'operations:manage',
    'mirror:list': 'operations:view',
    'mirror:list_pending': 'alliance:manage',
    'mirror:get': 'operations:view',
    'mirror:accept': 'alliance:manage',
    'mirror:decline': 'alliance:manage',
    'mirror:poll': 'operations:view',
    'mirror:rsvp': 'operations:view',
};

export const actions: Record<string, ActionHandler> = {
    ...authActions,
    ...adminActions,
    ...hrActions,
    ...operationActions,
    ...requestActions,
    ...intelActions,
    ...systemActions,
    ...userActions,
    ...wikiActions,
    ...fleetActions,
    ...governmentActions,
    ...financesActions,
    ...quartermasterActions,
    ...warehouseActions,
    ...catalogActions,
    ...allianceActions,
    ...operationsFederationActions,
};

// Validate permission-map coverage against the actions registry.
// - `missing`: protected, non-public actions with no entry in fullPermissionMap.
//   These silently 403 in prod (the dispatcher denies any protected action it can't map).
// - `stale`: map entries that don't correspond to a registered action — dead config
//   from a rename/delete; harmless but indicates drift.
// Called once at server boot; results are logged so drift is visible in deploy logs
// without waiting for a real user to hit the 403.
// Actor-identity fields the dispatcher overrides with the authenticated user's
// id (see "IDENTITY SPOOFING MITIGATION" in the handler below). Hoisted to
// module scope so the same list drives both the dispatcher mutation and the
// stripActorFields helper used by handlers that need a clean payload blob.
// Target-identity fields (targetUserId, assignedUserId, memberId, recruiterId,
// leadResponderId, newInterviewerId, allyOrgId, etc.) are intentionally NOT
// in this list — admin actions legitimately act on other users.
export const ACTOR_ID_FIELDS: readonly string[] = [
    'userId',
    'adminId',
    'creatorId',
    'createdById',
    'authorId',
    'issuedById',
    'issuerId',
    'reporterId',
    'senderId',
    'requesterId',
    'actorId',
    'performedById',
    'appointedById',
];

// Plumbing fields the dispatcher injects on every authenticated request:
// the populated user object + `interviewerId` for hr:save_interview. Combined
// with ACTOR_ID_FIELDS, this is the set stripActorFields() removes when a
// handler wants only the user-supplied data from a payload (e.g. a config
// blob it's about to write to the DB verbatim).
//
// `interviewerId` is in this list because admin/config handlers never want it,
// and the dispatcher only legitimately injects it for hr:save_interview —
// which doesn't use stripActorFields(). organizationId is NOT in this list:
// handlers typically need it as an explicit argument, not embedded in the data
// blob, and pull it from the original payload before calling the helper.
const PLUMBING_FIELDS: readonly string[] = ['user', 'interviewerId'];
const STRIPPABLE_FIELDS = new Set<string>([...ACTOR_ID_FIELDS, ...PLUMBING_FIELDS]);

/**
 * Return a shallow copy of `payload` with all actor-identity + dispatcher
 * plumbing fields removed. Used by handlers (notably api/actions/admin.ts
 * config-update endpoints) to derive a clean data blob from the payload
 * before passing it to the DB layer. Does not mutate the input.
 *
 * Does NOT strip `organizationId` — handlers usually pass that as a separate
 * argument to the DB function. Callers needing both should destructure
 * organizationId off the original payload before invoking this helper.
 */
export function stripActorFields<T extends Record<string, any>>(payload: T): Partial<T> {
    const out: Record<string, any> = {};
    for (const key of Object.keys(payload)) {
        if (STRIPPABLE_FIELDS.has(key)) continue;
        out[key] = payload[key];
    }
    return out as Partial<T>;
}

export function validatePermissionMap(): { missing: string[]; stale: string[] } {
    const publicSet = new Set(PUBLIC_ACTIONS);
    const missing = Object.keys(actions).filter(a =>
        !publicSet.has(a) &&
        PROTECTED_PREFIXES.some(p => a.startsWith(p)) &&
        !(a in fullPermissionMap)
    );
    const stale = Object.keys(fullPermissionMap).filter(k => !(k in actions));
    return { missing, stale };
}

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { action, payload } = req.body;

    // --- AUTH RATE LIMITING ---
    // Per-IP cap on `auth:*` actions (10/min/IP across all auth callbacks)
    // applied before context resolution so rejected requests short-circuit
    // the DB lookups in resolveContext + maintenance check. Riding the global
    // 100 req/min/IP limit alone left ~100 OAuth attempts/min/IP, enough room
    // for credential-stuffing-style probing across many accounts.
    if (typeof action === 'string' && action.startsWith('auth:')) {
        const ip = getClientIp(req);
        const check = checkAuthRateLimit(ip);
        if (!check.ok) {
            res.setHeader('Retry-After', String(check.retryAfter));
            return res.status(429).json({
                success: false,
                message: 'Too many authentication attempts. Please try again shortly.',
                code: 'AUTH_RATE_LIMITED',
                retryAfter: check.retryAfter,
            });
        }
    }

    // Single-org: no subdomain/tenant resolution. There is exactly one org and
    // no organization_id column, so nothing is injected into the payload here.

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const publicActions = PUBLIC_ACTIONS;

    // --- MAINTENANCE MODE + FORCE LOGOUT ENFORCEMENT ---
    // Force-logout bypass is NARROWER than maintenance bypass. SECURITY
    // (mutation-dispatcher#4): user:heartbeat previously rode the maintenance
    // bypass, which ALSO skipped force-logout — so a force-logged-out (revoked)
    // session could keep heart-beating indefinitely. Only the pre-login auth
    // bootstrap actions skip force-logout; heartbeat is now subject to it.
    const forceLogoutBypass = ['auth:discord_callback', 'auth:finalize_setup', 'auth:redeem_setup_code', 'system:get_push_config', 'system:preflight'];
    const maintenanceBypass = ['user:heartbeat', ...forceLogoutBypass];
    if (!forceLogoutBypass.includes(action) || !maintenanceBypass.includes(action)) {
        try {
            const platformSettings = await db.getPlatformSettings();
            const isMaintenanceActive = platformSettings?.maintenance_mode === true;

            // Force logout: enforce regardless of maintenance state. The platform
            // admin needs to revoke compromised sessions without taking the whole
            // platform offline. Tokens issued before force_logout_timestamp 401.
            if (!forceLogoutBypass.includes(action) && platformSettings?.force_logout_timestamp && token) {
                const decoded = verifyToken(token);
                if (decoded && tokenIssuedAt(decoded).toISOString() < platformSettings.force_logout_timestamp) {
                    return res.status(401).json({ message: 'Session expired. Please log in again.', force_logout: true });
                }
            }

            if (isMaintenanceActive && !maintenanceBypass.includes(action)) {
                // Allow the org Admin through — check the session JWT if present.
                let isAdmin = false;
                if (token) {
                    const decoded = verifyToken(token);
                    if (decoded) {
                        const adminUser = await db.getUserById(decoded.userId);
                        if (adminUser?.role === 'Admin') isAdmin = true;
                    }
                }
                if (!isAdmin) {
                    return res.status(503).json({ message: 'The platform is currently undergoing maintenance. Please try again later.' });
                }
            }
        } catch (e) {
            log.warn('maintenance check failed', { err: e });
        }
    }

    // --- PUBLIC ACTION HANDLER ---
    if (publicActions.includes(action)) {
        if (typeof action !== 'string' || !actions[action]) {
            log.error('invalid action', { action });
            return res.status(400).json({ message: `Invalid action: ${action}` });
        }
        try {
            const result = await actions[action](payload, token);
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            const requestId = randomUUID();
            log.error('error executing public action', { requestId, action, err: error });
            const message = isOpaqueServerError(error)
                ? 'An internal server error occurred.'
                : (error?.message || 'An internal server error occurred.');
            return res.status(500).json({ success: false, message, requestId });
        }
    }

    // --- AUTHENTICATED ACTION HANDLER ---
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    // Verify Token
    const decodedUser = verifyToken(token);
    let user = null;
    let authUserId = null;

    if (!decodedUser) {
        // Fallback: Verify as Supabase Token
        const { data: { user: sbUser }, error } = await db.supabase.auth.getUser(token);
        if (!error && sbUser) {
            authUserId = sbUser.id;
        } else {
            return res.status(401).json({ message: 'Unauthorized: Invalid token signature' });
        }
    } else {
        const dbUser = await db.getUserById(decodedUser.userId);
        if (dbUser) authUserId = dbUser.auth_user_id;
        user = dbUser;
    }

    if (!user && authUserId) {
        user = await db.getUserByAuthId(authUserId);
    }

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized: User account not found.' });
    }

    const fullUser = user;

    if (!fullUser) return res.status(401).json({ message: 'Unauthorized: User data unavailable.' });

    // --- PAYLOAD INJECTION ---
    if (payload && typeof payload === 'object') {
        if (fullUser) {
            payload.userId = fullUser.id;
            payload.user = fullUser;
        }
    }
    // Single-org: no cross-org isolation check — there is exactly one org.

    // --- IDENTITY SPOOFING MITIGATION ---
    // Force every "actor identity" field in the payload to the authenticated
    // user's id, so handlers that destructure a field like creatorId/authorId
    // can't be tricked by a crafted request. The ACTOR_ID_FIELDS list is at
    // module scope (above) so stripActorFields() can share it.
    if (payload && user) {
        for (const field of ACTOR_ID_FIELDS) {
            if (field in payload) payload[field] = user.id;
        }
        // Always inject userId even if caller omitted it — many handlers rely on its presence.
        payload.userId = user.id;
        // interviewerId: only override for actions where the current user IS the interviewer
        // (e.g. saving interview results). Do NOT override for schedule/update where admins
        // select a different interviewer from a dropdown.
        if (payload.interviewerId && !payload.newInterviewerId && action === 'hr:save_interview') {
            payload.interviewerId = user.id;
        }
    }

    if (typeof action !== 'string' || !actions[action]) {
        log.error('invalid action', { action });
        return res.status(400).json({ message: `Invalid action: ${action}` });
    }

    // Single-org self-hosted: all optional modules (warehouse, etc.) are always
    // enabled — the former per-org feature-flag gate is gone with multi-tenancy.

    // BOLA MITIGATION & Permission Verification
    if (PROTECTED_PREFIXES.some(p => action.startsWith(p))) {
        const isOrgOwner = false; // single-org: no owner-subdomain bypass; Admin role bypasses via permissions

        if (!isOrgOwner) {
            // Determine the required permission string based on the action map
            const requiredPerm = fullPermissionMap[action];

            if (requiredPerm) {
                // 'user:manage:self' is a pseudo-permission meaning "any authenticated user".
                // Actions using it (e.g. hr:request_transfer, hr:create_application) just need a valid session.
                if (requiredPerm === 'user:manage:self') {
                    // Allowed — skip further permission checks
                } else {
                const hasPerm = user?.permissions?.includes(requiredPerm);
                const hasClearanceView = requiredPerm === 'intel:view' && user?.permissions?.includes('intel:view:clearance');

                const isOpOwner = action.startsWith('operation:') && payload.operationId && (await db.getFullOperationDetails(payload.operationId))?.ownerId === user?.id;

                const isUnitLeader = action === 'unit:update_details' && payload.unitId && user?.unit?.id === payload.unitId && user?.unit?.leaderId === user.id;

                // Bulletin authors can delete their own bulletins
                let isBulletinAuthor = false;
                if (action === 'intel:delete_bulletin' && payload.bulletinId && user?.id) {
                    const { data: bulletin } = await db.supabase.from('intel_bulletins').select('created_by_id').eq('id', payload.bulletinId).single();
                    isBulletinAuthor = bulletin?.created_by_id === user.id;
                }

                // Lead responder can manage their request's team
                let isRequestLead = false;
                if ((action === 'request:add_responder' || action === 'request:remove_responder') && payload.requestId && user?.id) {
                    const { data: req } = await db.supabase.from('service_requests').select('lead_responder_id').eq('id', payload.requestId).single();
                    isRequestLead = req?.lead_responder_id === user.id;
                }

                if (!hasPerm && !hasClearanceView && !isOpOwner && !isUnitLeader && !isBulletinAuthor && !isRequestLead) {
                    log.warn('permission denied', { userId: user?.id, action, requiredPerm });
                    return res.status(403).json({ message: 'Insufficient permissions' });
                }
                }
            } else {
                log.warn('permission denied — unmapped action', { action });
                return res.status(403).json({ message: 'Insufficient permissions' });
            }
        }
    }

    // Execute Action (for all authenticated requests)
    try {
        const result = await actions[action](payload, token);
        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        const requestId = randomUUID();
        log.error('error executing action', { requestId, action, err: error });
        const message = isOpaqueServerError(error)
            ? 'An internal server error occurred.'
            : (error?.message || 'An internal server error occurred.');
        return res.status(500).json({ success: false, message, requestId });
    }
}
