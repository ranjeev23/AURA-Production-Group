/**
 * ============================================================================
 * TOURNAMENT GROUPS - Group Initialization Module
 * ============================================================================
 * 
 * Functions for initializing tournament groups using snake draft.
 * Reads teams directly from teams table using tournament_id.
 */

import { supabase } from './supabase';

// --- TYPES ---
export interface Team {
    team_id: number;
    player1_id: number;
    player2_id: number;
    player1_name: string;
    player2_name: string;
    display_name: string;
    avg_rating: number;
}

interface GroupResult {
    success: boolean;
    groups: Record<string, Team[]>;
    message: string;
    metadata?: any;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get teams for a tournament directly from teams table
 * @param tournamentId - Tournament ID
 * @param strictMode - If true, only return teams with exactly 2 members (for group initialization)
 *                     If false, return all teams including incomplete ones (for display)
 */
export async function getTeamsForTournament(tournamentId: number, strictMode: boolean = false): Promise<Team[]> {
    // First, try to get team IDs from tournament metadata (if groups are initialized)
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('metadata')
        .eq('id', tournamentId)
        .single();

    const metadata = tournament?.metadata as Record<string, any> | null;
    let teamIds: number[] = [];

    // If groups are initialized, get team IDs from metadata
    if (metadata?.groups) {
        const groupTeamIds = Object.values(metadata.groups as Record<string, number[]>).flat();
        teamIds = [...new Set(groupTeamIds)];
    }

    // Get teams directly from teams table using tournament_id (if column exists)
    const { data: registeredTeams, error } = await supabase
      .from('teams')
      .select('team_id')
      .eq('tournament_id', tournamentId);

    if (registeredTeams && registeredTeams.length > 0) {
        const registeredTeamIds = registeredTeams.map(t => t.team_id);
        teamIds = [...new Set([...teamIds, ...registeredTeamIds])];
    }

    // Fallback: Get teams from tournament_invites if no teams found yet
    if (teamIds.length === 0) {
        const { data: invites, error: invitesError } = await supabase
            .from('tournament_invites')
            .select('team_id')
            .eq('tournament_id', tournamentId)
            .not('team_id', 'is', null);

        if (invites && invites.length > 0) {
            const inviteTeamIds = invites.map(inv => inv.team_id).filter((id, index, self) => self.indexOf(id) === index);
            teamIds = [...new Set(inviteTeamIds)];
        }
    }

    if (teamIds.length === 0) {
        console.log(`No teams found for tournament ${tournamentId}`);
        return [];
    }

    // Get team members for each team
    const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('team_id, player_id')
        .in('team_id', teamIds);

    if (membersError || !teamMembers) {
        console.log(`Error fetching team_members: ${membersError?.message}`);
        return [];
    }

    // Get all player IDs
    const allPlayerIds = teamMembers.map(tm => tm.player_id);

    // Get player info
    const { data: players } = await supabase
        .from('players')
        .select('id, username')
        .in('id', allPlayerIds);

    // Get ratings
    const { data: ratings } = await supabase
        .from('ratings')
        .select('player_id, aura_mu')
        .in('player_id', allPlayerIds);

    const playerNameMap = new Map(players?.map(p => [p.id, p.username || `Player ${p.id}`]) || []);
    const ratingMap = new Map(ratings?.map(r => [r.player_id, r.aura_mu || 5]) || []);

    // Group team members by team_id
    const teamMembersMap = new Map<number, number[]>();
    teamMembers.forEach(tm => {
        if (!teamMembersMap.has(tm.team_id)) {
            teamMembersMap.set(tm.team_id, []);
        }
        teamMembersMap.get(tm.team_id)?.push(tm.player_id);
    });

    // Build teams array
    const teams: Team[] = [];

    for (const teamId of teamIds) {
        const memberIds = teamMembersMap.get(teamId) || [];

        // In strict mode, skip teams without exactly 2 members (for group initialization)
        if (strictMode && memberIds.length !== 2) {
            console.log(`Team ${teamId} has ${memberIds.length} members, skipping (strict mode requires 2)`);
            continue;
        }

        // For display purposes, show teams with any members
        if (memberIds.length === 0) {
            // No members - still include with placeholder for display
            teams.push({
                team_id: teamId,
                player1_id: 0,
                player2_id: 0,
                player1_name: 'Unknown',
                player2_name: 'Unknown',
                display_name: `Team ${teamId}`,
                avg_rating: 5
            });
            continue;
        }

        const player1_id = memberIds[0] || 0;
        const player2_id = memberIds[1] || 0;
        const name1 = player1_id ? (playerNameMap.get(player1_id) || `Player ${player1_id}`) : 'TBD';
        const name2 = player2_id ? (playerNameMap.get(player2_id) || `Player ${player2_id}`) : 'TBD';
        const rating1 = player1_id ? (ratingMap.get(player1_id) || 5) : 5;
        const rating2 = player2_id ? (ratingMap.get(player2_id) || 5) : 5;
        const avgRating = (rating1 + rating2) / 2;

        teams.push({
            team_id: teamId,
            player1_id,
            player2_id,
            player1_name: name1,
            player2_name: name2,
            display_name: player2_id ? `${name1} & ${name2}` : name1,
            avg_rating: avgRating
        });
    }

    // Sort by rating DESC (highest first for snake draft)
    return teams.sort((a, b) => b.avg_rating - a.avg_rating);
}

// Keep old function name as alias for backward compatibility
export const getTeamsFromInvites = getTeamsForTournament;

/**
 * Snake draft distribution for balanced groups
 * Pattern: A, B, C, D, D, C, B, A, A, B, C, D...
 */
function snakeDraft(teams: Team[], numberOfGroups: number): Team[][] {
    const groups: Team[][] = Array.from({ length: numberOfGroups }, () => []);
    let direction = 1;
    let currentGroup = 0;

    for (const team of teams) {
        groups[currentGroup].push(team);
        currentGroup += direction;

        if (currentGroup >= numberOfGroups) {
            currentGroup = numberOfGroups - 1;
            direction = -1;
        } else if (currentGroup < 0) {
            currentGroup = 0;
            direction = 1;
        }
    }

    return groups;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Initialize groups for a tournament
 * 
 * @param tournamentId - Tournament ID
 * @param numberOfGroups - Number of groups (2, 4, or 8)
 * @returns GroupResult with groups and metadata
 */
export async function initializeGroups(
    tournamentId: number,
    numberOfGroups: 2 | 4 | 8 = 2
): Promise<GroupResult> {

    // 1. Check tournament exists
    const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id, metadata')
        .eq('id', tournamentId)
        .single();

    if (tournamentError || !tournament) {
        return { success: false, groups: {}, message: 'Tournament not found' };
    }

    const metadata = tournament.metadata as Record<string, any> | null;

    // 2. Check if groups already initialized
    if (metadata?.groups && Object.keys(metadata.groups).length > 0) {
        return { success: false, groups: {}, message: 'Groups already initialized. Reset tournament first.' };
    }

    // 3. Get teams from teams table (strict mode - require 2 members)
    const teams = await getTeamsForTournament(tournamentId, true);

    if (teams.length === 0) {
        return {
            success: false,
            groups: {},
            message: 'No complete teams found. Each team must have 2 registered members.'
        };
    }

    const minTeams = numberOfGroups * 2;
    if (teams.length < minTeams) {
        return {
            success: false,
            groups: {},
            message: `Need at least ${minTeams} teams for ${numberOfGroups} groups. Have ${teams.length}.`
        };
    }

    // 4. Distribute teams using snake draft
    const groupedTeams = snakeDraft(teams, numberOfGroups);

    // 5. Build groups map
    const groups: Record<string, Team[]> = {};
    const groupTeamIds: Record<string, number[]> = {};

    for (let g = 0; g < numberOfGroups; g++) {
        const letter = String.fromCharCode(65 + g); // A, B, C, D...
        groups[letter] = groupedTeams[g];
        groupTeamIds[letter] = groupedTeams[g].map(t => t.team_id);
    }

    // 6. Calculate metadata
    const teamsPerGroup = Math.ceil(teams.length / numberOfGroups);
    const totalGroupRounds = teamsPerGroup - 1; // Round-robin

    const newMetadata = {
        ...(metadata || {}),
        format: 'group_knockout',
        number_of_groups: numberOfGroups,
        teams_per_group: teamsPerGroup,
        teams_to_advance: 2,
        groups: groupTeamIds,
        current_round: 0,
        total_group_rounds: totalGroupRounds,
        stage: 'group_stage'
    };

    // 7. Save to database
    const { error: updateError } = await supabase
        .from('tournaments')
        .update({ metadata: newMetadata })
        .eq('id', tournamentId);

    if (updateError) {
        return { success: false, groups: {}, message: `Database error: ${updateError.message}` };
    }

    return {
        success: true,
        groups,
        message: `Initialized ${numberOfGroups} groups with ${teams.length} teams (${teamsPerGroup} per group, ${totalGroupRounds} group rounds)`,
        metadata: newMetadata
    };
}

/**
 * Swap a team between groups
 */
export async function swapTeamGroup(
    tournamentId: number,
    teamId: number,
    fromGroup: string,
    toGroup: string
): Promise<{ success: boolean; message: string; groups?: Record<string, number[]> }> {

    // 1. Get tournament metadata
    const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('metadata')
        .eq('id', tournamentId)
        .single();

    if (error || !tournament) {
        return { success: false, message: 'Tournament not found' };
    }

    const metadata = tournament.metadata as Record<string, any> | null;

    if (!metadata?.groups) {
        return { success: false, message: 'Groups not initialized' };
    }

    // 2. Check if tournament has started (any matches exist)
    const { count: matchCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

    if (matchCount && matchCount > 0) {
        return { success: false, message: 'Cannot swap teams after matches have started' };
    }

    const groups = metadata.groups as Record<string, number[]>;

    // 3. Validate groups exist
    if (!groups[fromGroup]) {
        return { success: false, message: `Group ${fromGroup} does not exist` };
    }
    if (!groups[toGroup]) {
        return { success: false, message: `Group ${toGroup} does not exist` };
    }

    // 4. Validate team is in fromGroup
    const fromGroupTeams = groups[fromGroup];
    if (!fromGroupTeams.includes(teamId)) {
        return { success: false, message: `Team ${teamId} is not in Group ${fromGroup}` };
    }

    // 5. Move team
    groups[fromGroup] = fromGroupTeams.filter(id => id !== teamId);
    groups[toGroup] = [...groups[toGroup], teamId];

    // 6. Update metadata
    const { error: updateError } = await supabase
        .from('tournaments')
        .update({ metadata: { ...metadata, groups } })
        .eq('id', tournamentId);

    if (updateError) {
        return { success: false, message: `Database error: ${updateError.message}` };
    }

    return {
        success: true,
        message: `Moved team ${teamId} from Group ${fromGroup} to Group ${toGroup}`,
        groups
    };
}

/**
 * Reset tournament groups (for testing/admin)
 */
export async function resetGroups(tournamentId: number): Promise<{ success: boolean; message: string }> {
    console.log(`Resetting tournament ${tournamentId}...`);

    // 1. Delete all matches for this tournament
    const { error: matchError, count: matchCount } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', tournamentId);

    if (matchError) {
        console.log(`Error deleting matches: ${matchError.message}`);
    } else {
        console.log(`Deleted ${matchCount || 0} matches`);
    }

    // 2. Get all pairings for this tournament
    const { data: pairings } = await supabase
        .from('pairings')
        .select('id')
        .eq('tournament_id', tournamentId);

    if (pairings && pairings.length > 0) {
        const pairingIds = pairings.map(p => p.id);

        // Delete pairing_teams first (foreign key)
        const { error: ptError } = await supabase
            .from('pairing_teams')
            .delete()
            .in('pairing_id', pairingIds);

        if (ptError) {
            console.log(`Error deleting pairing_teams: ${ptError.message}`);
        }

        // Then delete pairings
        const { error: pError } = await supabase
            .from('pairings')
            .delete()
            .eq('tournament_id', tournamentId);

        if (pError) {
            console.log(`Error deleting pairings: ${pError.message}`);
        }

        console.log(`Deleted ${pairings.length} pairings and their teams`);
    }

    // 3. Reset metadata (keep format but clear everything else)
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('metadata')
        .eq('id', tournamentId)
        .single();

    const existingMetadata = tournament?.metadata as Record<string, any> | null;

    const { error: updateError } = await supabase
        .from('tournaments')
        .update({
            metadata: {
                format: existingMetadata?.format || 'group_knockout',
                groups: null,
                current_round: 0,
                total_group_rounds: 0,
                stage: 'registration',
                number_of_groups: 0,
                teams_per_group: 0,
                teams_to_advance: 2
            }
        })
        .eq('id', tournamentId);

    if (updateError) {
        console.log(`Error updating metadata: ${updateError.message}`);
        return { success: false, message: `Failed to reset: ${updateError.message}` };
    }

    console.log(`Tournament ${tournamentId} reset successfully`);
    return { success: true, message: 'Tournament reset successfully. All matches and groups cleared.' };
}

