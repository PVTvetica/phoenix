
import { supabase, handleSupabaseError, safeFetch } from '../common.js';
import { ElectionType, ElectionStatus, GovernmentElection, GovernmentElectionCandidate } from '../../../types.js';
import {
    log,
    USER_HYDRATE,
    broadcastGovernmentUpdate,
    toGovernmentElection,
    toGovernmentElectionCandidate,
    computeVoterHash,
    TallyResult,
    getVotesForElection,
    getVoterCount,
    tallySimpleMajority,
    tallyPlurality,
    tallyApproval,
    tallyPreferentialFull,
    tallyProportional,
} from './internal.js';
import { appointPositionHolder } from './structure.js';
import type { Tables } from '../rows.js';

// Election creation input. Mirrors the ElectionData RPC payload in
// api/actions/government.ts (plus the server-injected userId); lib/db cannot
// import from the action layer.
interface ElectionInput {
    title?: string;
    positionId?: number;
    description?: string;
    electionType?: string;
    candidacyStart?: string;
    candidacyEnd?: string;
    votingStart?: string;
    votingEnd?: string;
    minCandidates?: number;
    maxWinners?: number;
    minVoterTurnoutPct?: number;
    minVoteThresholdPct?: number;
    allowRunoff?: boolean;
    runoffTopN?: number;
    isByElection?: boolean;
    remainingTermDays?: number;
    userId?: number;
}

// ---------------------------------------------------------------------------
// Election State (included in government subset)
// ---------------------------------------------------------------------------

export async function getElectionsState(currentUserId?: number): Promise<GovernmentElection[]> {
    const electionsResult = await safeFetch(
        supabase.from('government_elections')
            .select(`
                *,
                position:government_positions(*),
                created_by:users!government_elections_created_by_id_fkey(${USER_HYDRATE}),
                candidates:government_election_candidates(
                    *,
                    user:users!government_election_candidates_user_id_fkey(${USER_HYDRATE})
                )
            `)
            
            .order('created_at', { ascending: false })
            .limit(50),
        [], 'government_elections'
    );

    const elections = Array.isArray(electionsResult)
        ? electionsResult.map(toGovernmentElection)
        : [];

    // Check if current user has voted in active elections
    if (currentUserId && elections.length > 0) {
        const activeElectionIds = elections
            .filter(e => e.status === ElectionStatus.Voting)
            .map(e => e.id);

        if (activeElectionIds.length > 0) {
            const { data: voted } = await supabase
                .from('government_election_voter_registry')
                .select('election_id')
                .eq('user_id', currentUserId)
                
                .in('election_id', activeElectionIds);

            const votedSet = new Set((voted || []).map((v: { election_id: number }) => v.election_id));
            for (const election of elections) {
                election.hasVoted = votedSet.has(election.id);
            }
        }
    }

    // Filter out withdrawn candidates
    for (const election of elections) {
        if (election.candidates) {
            election.candidates = election.candidates.filter(c => !c.withdrawnAt);
        }
        // Hide vote counts until election is concluded
        if (election.status !== ElectionStatus.Concluded) {
            for (const c of election.candidates || []) {
                c.voteCount = undefined;
                c.votePercentage = undefined;
            }
        }
    }

    return elections;
}

// ---------------------------------------------------------------------------
// Election CRUD
// ---------------------------------------------------------------------------

export async function createElection(data: ElectionInput): Promise<GovernmentElection | null> {
    const payload = {
        position_id: data.positionId,
        title: data.title,
        description: data.description || null,
        election_type: data.electionType || 'SimpleMajority',
        status: 'Draft',
        candidacy_start: data.candidacyStart || null,
        candidacy_end: data.candidacyEnd || null,
        voting_start: data.votingStart || null,
        voting_end: data.votingEnd || null,
        min_candidates: data.minCandidates ?? 1,
        max_winners: data.maxWinners ?? 1,
        min_voter_turnout_pct: data.minVoterTurnoutPct || null,
        min_vote_threshold_pct: data.minVoteThresholdPct || null,
        allow_runoff: data.allowRunoff ?? false,
        runoff_top_n: data.runoffTopN ?? 2,
        is_by_election: data.isByElection ?? false,
        remaining_term_days: data.remainingTermDays || null,
        created_by_id: data.userId,
    };
    const { data: result, error } = await supabase.from('government_elections')
        .insert(payload).select().single();
    handleSupabaseError({ error, message: 'Failed to create election' });
    broadcastGovernmentUpdate('elections');
    return result ? toGovernmentElection(result) : null;
}

export async function updateElection(electionId: number, updates: Partial<GovernmentElection>) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.electionType !== undefined) dbUpdates.election_type = updates.electionType;
    if (updates.candidacyStart !== undefined) dbUpdates.candidacy_start = updates.candidacyStart;
    if (updates.candidacyEnd !== undefined) dbUpdates.candidacy_end = updates.candidacyEnd;
    if (updates.votingStart !== undefined) dbUpdates.voting_start = updates.votingStart;
    if (updates.votingEnd !== undefined) dbUpdates.voting_end = updates.votingEnd;
    if (updates.minCandidates !== undefined) dbUpdates.min_candidates = updates.minCandidates;
    if (updates.maxWinners !== undefined) dbUpdates.max_winners = updates.maxWinners;
    if (updates.minVoterTurnoutPct !== undefined) dbUpdates.min_voter_turnout_pct = updates.minVoterTurnoutPct;
    if (updates.minVoteThresholdPct !== undefined) dbUpdates.min_vote_threshold_pct = updates.minVoteThresholdPct;
    if (updates.allowRunoff !== undefined) dbUpdates.allow_runoff = updates.allowRunoff;
    if (updates.runoffTopN !== undefined) dbUpdates.runoff_top_n = updates.runoffTopN;
    dbUpdates.updated_at = new Date().toISOString();

    if (Object.keys(dbUpdates).length <= 1) return; // only updated_at

    const { error } = await supabase.from('government_elections')
        .update(dbUpdates).eq('id', electionId);
    handleSupabaseError({ error, message: 'Failed to update election' });
    broadcastGovernmentUpdate('elections');
}

export async function advanceElection(electionId: number) {
    const { data: election, error: fetchErr } = await supabase.from('government_elections')
        .select('*, candidates:government_election_candidates(id, withdrawn_at)')
        .eq('id', electionId).single();
    if (fetchErr || !election) throw new Error('Election not found');

    const activeCandidates = (election.candidates || []).filter((c: { id: number; withdrawn_at: string | null }) => !c.withdrawn_at);
    const now = new Date().toISOString();

    if (election.status === 'Draft') {
        // Advance to Candidacy
        const { error } = await supabase.from('government_elections')
            .update({
                status: 'Candidacy',
                candidacy_start: election.candidacy_start || now,
                updated_at: now
            })
            .eq('id', electionId);
        handleSupabaseError({ error, message: 'Failed to advance election to Candidacy' });

    } else if (election.status === 'Candidacy') {
        // Advance to Voting — check min candidates
        if (activeCandidates.length < election.min_candidates) {
            throw new Error(`Need at least ${election.min_candidates} candidate(s), currently ${activeCandidates.length}`);
        }
        const { error } = await supabase.from('government_elections')
            .update({
                status: 'Voting',
                candidacy_end: election.candidacy_end || now,
                voting_start: election.voting_start || now,
                updated_at: now
            })
            .eq('id', electionId);
        handleSupabaseError({ error, message: 'Failed to advance election to Voting' });

    } else if (election.status === 'Voting') {
        // Conclude — tally votes
        await concludeElection(electionId);
        return;

    } else {
        throw new Error(`Cannot advance election from status: ${election.status}`);
    }

    broadcastGovernmentUpdate('elections');
}

// ---------------------------------------------------------------------------
// Candidacy
// ---------------------------------------------------------------------------

export async function declareCandidacy(electionId: number, userId: number, statement: string | null): Promise<GovernmentElectionCandidate | null> {
    const { data: election } = await supabase.from('government_elections')
        .select('status').eq('id', electionId).single();
    if (!election || election.status !== 'Candidacy') throw new Error('Election is not in candidacy phase');

    const { data: result, error } = await supabase.from('government_election_candidates')
        .insert({
            election_id: electionId,
            user_id: userId,
            platform_statement: statement || null,
        })
        .select()
        .single();
    handleSupabaseError({ error, message: 'Failed to declare candidacy' });
    broadcastGovernmentUpdate('elections');
    return result ? toGovernmentElectionCandidate(result) : null;
}

export async function withdrawCandidacy(electionId: number, userId: number) {
    const { error } = await supabase.from('government_election_candidates')
        .update({ withdrawn_at: new Date().toISOString() })
        .eq('election_id', electionId)
        .eq('user_id', userId)

        .is('withdrawn_at', null);
    handleSupabaseError({ error, message: 'Failed to withdraw candidacy' });
    broadcastGovernmentUpdate('elections');
}

// ---------------------------------------------------------------------------
// Voting (secret ballot)
// ---------------------------------------------------------------------------

export async function castElectionVote(
    electionId: number,
    userId: number,
    selections: { candidateId: number; rankOrder?: number }[]
) {
    // Verify election is in Voting phase
    const { data: election } = await supabase.from('government_elections')
        .select('status, election_type')
        .eq('id', electionId).single();
    if (!election || election.status !== 'Voting') throw new Error('Election is not in voting phase');

    // Check if already voted (registry check — the DB constraint is the real guard)
    const { count: alreadyVoted } = await supabase.from('government_election_voter_registry')
        .select('id', { count: 'exact', head: true })
        .eq('election_id', electionId).eq('user_id', userId);
    if (alreadyVoted && alreadyVoted > 0) throw new Error('You have already voted in this election');

    // Record participation FIRST so UNIQUE(election_id, user_id) is the atomic
    // one-vote guard: under a concurrent double-submit the second registry insert
    // fails (23505) BEFORE any ballots are written, so no orphaned duplicate votes.
    const { error: regError } = await supabase.from('government_election_voter_registry').insert({
        election_id: electionId,
        user_id: userId,
    });
    handleSupabaseError({ error: regError, message: 'Failed to record vote participation' });

    const voterHash = computeVoterHash(electionId, userId);

    // Insert ballots (reached only after participation is uniquely recorded above).
    const voteRows = selections.map(s => ({
        election_id: electionId,
        voter_hash: voterHash,
        candidate_id: s.candidateId,
        rank_order: s.rankOrder ?? null,
    }));

    const { error: voteError } = await supabase.from('government_election_votes').insert(voteRows);
    handleSupabaseError({ error: voteError, message: 'Failed to cast vote' });

    broadcastGovernmentUpdate('elections');
}

// ---------------------------------------------------------------------------
// Conclude Election
// ---------------------------------------------------------------------------

export async function concludeElection(electionId: number) {
    const { data: election } = await supabase.from('government_elections')
        .select('*, position:government_positions(max_holders)')
        .eq('id', electionId).single();
    if (!election) throw new Error('Election not found');
    if (election.status !== 'Voting') throw new Error('Election is not in voting phase');

    const votes = await getVotesForElection(electionId);
    const voterCount = await getVoterCount(electionId);
    const maxWinners = election.max_winners;

    // Run tally based on election type
    let result: TallyResult;
    const elType = election.election_type as ElectionType;

    if (elType === ElectionType.Preferential) {
        result = await tallyPreferentialFull(electionId, maxWinners);
    } else if (elType === ElectionType.ProportionalRepresentation) {
        result = tallyProportional(votes, maxWinners);
    } else if (elType === ElectionType.Approval) {
        result = tallyApproval(votes, maxWinners);
    } else if (elType === ElectionType.Plurality) {
        result = tallyPlurality(votes, maxWinners);
    } else {
        result = tallySimpleMajority(votes, maxWinners);
    }

    // Check turnout threshold
    let conclusionReason = 'Election concluded normally';
    let status: string = 'Concluded';

    if (election.min_voter_turnout_pct && election.eligible_voter_count) {
        const turnoutPct = (voterCount / election.eligible_voter_count) * 100;
        if (turnoutPct < parseFloat(election.min_voter_turnout_pct)) {
            status = 'Cancelled';
            conclusionReason = `Insufficient voter turnout (${turnoutPct.toFixed(1)}% < ${election.min_voter_turnout_pct}% required)`;
            result.isConclusive = false;
        }
    }

    // Check vote threshold
    if (result.isConclusive && election.min_vote_threshold_pct && result.winners.length > 0) {
        const thresholdPct = parseFloat(election.min_vote_threshold_pct);
        const winnersAboveThreshold = result.winners.filter(w => w.percentage >= thresholdPct);
        if (winnersAboveThreshold.length === 0) {
            if (election.allow_runoff) {
                // Create runoff election
                await createRunoffElection(election, result);
                status = 'Runoff';
                conclusionReason = `No candidate met ${thresholdPct}% threshold — runoff triggered`;
                result.isConclusive = false;
            } else {
                conclusionReason = `No candidate met ${thresholdPct}% threshold — election inconclusive`;
                result.isConclusive = false;
            }
        }
    }

    // Check for tie (when not using proportional)
    if (result.isConclusive && result.winners.length >= 2 && elType !== ElectionType.ProportionalRepresentation) {
        const topVotes = result.winners[0].voteCount;
        const tied = result.winners.filter(w => w.voteCount === topVotes);
        if (tied.length > maxWinners) {
            if (election.allow_runoff) {
                await createRunoffElection(election, result);
                status = 'Runoff';
                conclusionReason = `Tie between ${tied.length} candidates — runoff triggered`;
                result.isConclusive = false;
            } else {
                conclusionReason = `Tie between ${tied.length} candidates — no clear winner`;
                result.isConclusive = false;
            }
        }
    }

    const now = new Date().toISOString();

    // Update candidate vote counts and mark winners
    for (const r of result.allResults) {
        const isWinner = result.isConclusive && result.winners.some(w => w.candidateId === r.candidateId);
        await supabase.from('government_election_candidates')
            .update({
                vote_count: r.voteCount,
                vote_percentage: r.percentage,
                is_winner: isWinner,
            })
            .eq('id', r.candidateId);
    }

    // Update election status
    await supabase.from('government_elections')
        .update({
            status,
            concluded_at: now,
            conclusion_reason: conclusionReason,
            total_votes_cast: voterCount,
            voting_end: election.voting_end || now,
            updated_at: now,
        })
        .eq('id', electionId);

    // Auto-appoint winners to positions
    if (result.isConclusive && status === 'Concluded') {
        for (const winner of result.winners) {
            // Get candidate's user_id
            const { data: candidate } = await supabase.from('government_election_candidates')
                .select('user_id').eq('id', winner.candidateId).single();
            if (candidate) {
                try {
                    await appointPositionHolder({
                        positionId: election.position_id,
                        userId: candidate.user_id,
                        electionId,
                    });
                } catch (e) {
                    log.warn('auto-appoint election winner failed', { electionId, positionId: election.position_id, candidateId: winner.candidateId, err: e });
                }
            }
        }
    }

    broadcastGovernmentUpdate('elections');
    return { status, conclusionReason, result };
}

async function createRunoffElection(parentElection: Tables<'government_elections'>, tallyResult: TallyResult) {
    const topN = parentElection.runoff_top_n || 2;
    const topCandidates = tallyResult.allResults.slice(0, topN);

    const { data: runoff, error } = await supabase.from('government_elections')
        .insert({
            position_id: parentElection.position_id,
            title: `${parentElection.title} — Runoff`,
            description: `Runoff election following inconclusive results.`,
            election_type: parentElection.election_type,
            status: 'Candidacy',
            candidacy_start: new Date().toISOString(),
            min_candidates: 2,
            max_winners: parentElection.max_winners,
            allow_runoff: false,
            runoff_top_n: 2,
            parent_election_id: parentElection.id,
            created_by_id: parentElection.created_by_id,
        })
        .select()
        .single();

    if (error || !runoff) {
        log.error('create runoff election failed', { parentElectionId: parentElection.id, err: error });
        return;
    }

    // Pre-register top candidates in runoff
    for (const r of topCandidates) {
        const { data: origCandidate } = await supabase.from('government_election_candidates')
            .select('user_id, platform_statement').eq('id', r.candidateId).single();
        if (origCandidate) {
            await supabase.from('government_election_candidates').insert({
                election_id: runoff.id,
                user_id: origCandidate.user_id,
                platform_statement: origCandidate.platform_statement,
            });
        }
    }
}

// ---------------------------------------------------------------------------
// By-Elections & Cancellation
// ---------------------------------------------------------------------------

export async function callByElection(data: ElectionInput) {
    // Calculate remaining term if the position has a term length
    const { data: position } = await supabase.from('government_positions')
        .select('term_length_days').eq('id', data.positionId).single();

    return createElection({
        ...data,
        isByElection: true,
        remainingTermDays: position?.term_length_days || null,
    });
}

export async function cancelElection(electionId: number, reason: string) {
    const { error } = await supabase.from('government_elections')
        .update({
            status: 'Cancelled',
            concluded_at: new Date().toISOString(),
            conclusion_reason: reason || 'Cancelled by electoral officer',
            updated_at: new Date().toISOString(),
        })
        .eq('id', electionId)
        
        .in('status', ['Draft', 'Candidacy', 'Voting']);
    handleSupabaseError({ error, message: 'Failed to cancel election' });
    broadcastGovernmentUpdate('elections');
}

export async function certifyElection(electionId: number, userId: number) {
    const { error } = await supabase.from('government_elections')
        .update({
            certified_by_id: userId,
            certified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', electionId)
        
        .eq('status', 'Concluded');
    handleSupabaseError({ error, message: 'Failed to certify election' });
    broadcastGovernmentUpdate('elections');
}
