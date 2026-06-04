
import { supabase, handleSupabaseError } from '../common.js';

const ORDER_SELECT = `
    *,
    issuer_position:government_positions!government_orders_issuer_position_id_fkey(id, name, icon),
    issuer:users!government_orders_issuer_user_id_fkey(id, name, avatar_url, rsi_handle),
    revoked_by:users!government_orders_revoked_by_user_id_fkey(id, name, avatar_url, rsi_handle)
`;

// Raw government_orders row (with joined embeds) as returned to the client. The
// embeds aren't captured by the generated Row types, so the shape stays loose;
// only the fields read for draft-visibility filtering are named explicitly.
type GovernmentOrderRow = { status?: string; issuer_user_id?: number; [k: string]: unknown };

// A position the user holds that is authorized to issue orders.
type OrderIssuingPosition = { id: number; name?: string; icon?: string | null; can_issue_orders: boolean };

export interface GovernmentOrderInput {
    id?: string;
    issuerPositionId: number;
    number?: string | null;
    title: string;
    preamble?: string | null;
    body: string;
    rationale?: string | null;
    effectiveAt?: string | null;
    expiresAt?: string | null;
    status?: 'draft' | 'active';
}

/** List orders for an org. Drafts visible only to their author. Auto-expires stale active orders on read. */
export async function listGovernmentOrders(viewerUserId?: number): Promise<GovernmentOrderRow[]> {
    await supabase.from('government_orders')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString());

    const { data } = await supabase.from('government_orders')
        .select(ORDER_SELECT)
        
        .order('issued_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(200);

    const rows = (data || []) as GovernmentOrderRow[];
    return rows.filter(r => r.status !== 'draft' || r.issuer_user_id === viewerUserId);
}

export async function getGovernmentOrder(orderId: string, viewerUserId?: number): Promise<GovernmentOrderRow | null> {
    const { data } = await supabase.from('government_orders')
        .select(ORDER_SELECT)
        .eq('id', orderId)
        
        .maybeSingle();
    const row = data as GovernmentOrderRow | null;
    if (!row) return null;
    if (row.status === 'draft' && row.issuer_user_id !== viewerUserId) return null;
    return row;
}

/** Verify caller currently holds a position with can_issue_orders. Throws if not. */
async function assertCanIssueOrders(userId: number, positionId?: number): Promise<OrderIssuingPosition> {
    const { data } = await supabase.from('government_position_holders')
        .select('position:government_positions!inner(id, name, can_issue_orders)')
        .eq('user_id', userId)
        .is('ended_at', null);
    type HeldPosition = { id: number; name?: string; can_issue_orders: boolean };
    const holdings = ((data || []) as unknown as Array<{ position: HeldPosition | null }>)
        .map(r => r.position)
        .filter((p): p is HeldPosition => Boolean(p));
    const eligible = holdings.filter(p =>
        p.can_issue_orders === true &&
        (positionId == null || p.id === positionId)
    );
    if (eligible.length === 0) {
        throw new Error('You do not currently hold a position authorized to issue orders.');
    }
    return eligible[0];
}

export async function createGovernmentOrder(input: GovernmentOrderInput, userId: number): Promise<GovernmentOrderRow | null> {
    if (!input.title?.trim() || !input.body?.trim()) throw new Error('Title and body are required.');

    const pos = await assertCanIssueOrders(userId, input.issuerPositionId);

    const status = input.status === 'active' ? 'active' : 'draft';
    const now = new Date().toISOString();
    const issuedAt = status === 'active' ? now : null;
    const effectiveAt = status === 'active' ? (input.effectiveAt || now) : input.effectiveAt || null;

    const row = {
        issuer_position_id: pos.id,
        issuer_user_id: userId,
        number: input.number?.trim() || null,
        title: input.title.trim(),
        preamble: input.preamble?.trim() || null,
        body: input.body.trim(),
        rationale: input.rationale?.trim() || null,
        status,
        effective_at: effectiveAt,
        expires_at: input.expiresAt || null,
        issued_at: issuedAt,
    };
    const { data, error } = await supabase.from('government_orders').insert(row).select(ORDER_SELECT).single();
    handleSupabaseError({ error, message: 'Failed to create order' });
    // No broadcast: orders are not part of the government subset and are
    // RPC-fetched on demand (gov:list_orders) — emitting government_update
    // here only triggered a wasted full-bundle refetch on every client.
    return data as GovernmentOrderRow | null;
}

export async function updateGovernmentOrder(orderId: string, patch: Partial<GovernmentOrderInput>, userId: number): Promise<void> {
    const { data: existing } = await supabase.from('government_orders')
        .select('issuer_user_id, status')
        .eq('id', orderId)
        
        .maybeSingle();
    const ex = existing as { issuer_user_id?: number; status?: string } | null;
    if (!ex) throw new Error('Order not found.');
    if (ex.issuer_user_id !== userId) throw new Error('Only the author can edit this order.');
    if (ex.status !== 'draft' && patch.status !== 'active') {
        throw new Error('Published orders cannot be edited. Revoke and issue a replacement if needed.');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) updates.title = patch.title.trim();
    if (patch.body !== undefined) updates.body = patch.body.trim();
    if (patch.preamble !== undefined) updates.preamble = patch.preamble?.trim() || null;
    if (patch.rationale !== undefined) updates.rationale = patch.rationale?.trim() || null;
    if (patch.number !== undefined) updates.number = patch.number?.trim() || null;
    if (patch.effectiveAt !== undefined) updates.effective_at = patch.effectiveAt || null;
    if (patch.expiresAt !== undefined) updates.expires_at = patch.expiresAt || null;

    if (patch.status === 'active' && ex.status === 'draft') {
        const now = new Date().toISOString();
        updates.status = 'active';
        updates.issued_at = now;
        if (!updates.effective_at && patch.effectiveAt === undefined) updates.effective_at = now;
    }

    const { error } = await supabase.from('government_orders').update(updates)
        .eq('id', orderId)
        ;
    handleSupabaseError({ error, message: 'Failed to update order' });
    // No broadcast — see createGovernmentOrder.
}

export async function revokeGovernmentOrder(orderId: string, reason: string, userId: number): Promise<void> {
    const { data: existing } = await supabase.from('government_orders')
        .select('issuer_user_id, issuer_position_id, status')
        .eq('id', orderId)
        
        .maybeSingle();
    const ex = existing as { issuer_user_id?: number; issuer_position_id?: number; status?: string } | null;
    if (!ex) throw new Error('Order not found.');
    if (ex.status !== 'active') throw new Error(`Cannot revoke an order in status "${ex.status}".`);
    if (ex.issuer_user_id !== userId) throw new Error('Only the author can revoke this order.');

    const now = new Date().toISOString();
    const { error } = await supabase.from('government_orders').update({
        status: 'revoked',
        revoked_at: now,
        revoked_by_user_id: userId,
        revoked_by_position_id: ex.issuer_position_id,
        revoked_reason: (reason || '').trim().slice(0, 500) || null,
        updated_at: now,
    })
        .eq('id', orderId)
        ;
    handleSupabaseError({ error, message: 'Failed to revoke order' });
    // No broadcast — see createGovernmentOrder.
}

export async function deleteGovernmentOrder(orderId: string, userId: number): Promise<void> {
    const { data: ex } = await supabase.from('government_orders')
        .select('issuer_user_id, status')
        .eq('id', orderId)
        
        .maybeSingle();
    const row = ex as { issuer_user_id?: number; status?: string } | null;
    if (!row) throw new Error('Order not found.');
    if (row.status !== 'draft') throw new Error('Only draft orders can be deleted. Revoke published orders instead.');
    if (row.issuer_user_id !== userId) throw new Error('Only the author can delete this draft.');

    const { error } = await supabase.from('government_orders').delete()
        .eq('id', orderId)
        ;
    handleSupabaseError({ error, message: 'Failed to delete order' });
    // No broadcast — see createGovernmentOrder.
}

/** Return positions held by the user that can issue orders (for UI authoring gate). */
export async function getMyOrderIssuingPositions(userId: number): Promise<OrderIssuingPosition[]> {
    const { data } = await supabase.from('government_position_holders')
        .select('position:government_positions!inner(id, name, icon, can_issue_orders)')
        .eq('user_id', userId)
        .is('ended_at', null);
    return ((data || []) as unknown as Array<{ position: OrderIssuingPosition | null }>)
        .map(r => r.position)
        .filter((p): p is OrderIssuingPosition => Boolean(p) && p!.can_issue_orders === true);
}
