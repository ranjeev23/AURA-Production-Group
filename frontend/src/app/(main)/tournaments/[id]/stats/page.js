"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { createWebSocketConnection } from "@/lib/websocket";
import { useTournament } from "@/hooks/useTournament";
import { useTournamentRound } from "@/hooks/useTournamentRound";
import { useTournamentRounds } from "@/hooks/useTournamentRounds";
import { useTournamentEngine } from "@/hooks/useTournamentEngine";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TournamentStatsHeader } from "@/components/tournaments/TournamentStatsHeader";
import { RoundNavigation } from "@/components/tournaments/RoundNavigation";
import { PairingsTab } from "@/components/tournaments/PairingsTab";
import { LeaderboardTab } from "@/components/tournaments/LeaderboardTab";
import { ScrollablePage, ScrollablePageHeader, ScrollablePageContent } from "@/components/layout/ScrollablePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Crown, Medal, ChevronRight, Zap, Target, Award } from "lucide-react";

// Group Standings Component for Group+Knockout format
function GroupStandings({ standings, engineInfo, matches, selectedRound }) {
  // Determine if we're in knockout stage
  const isKnockoutStage = engineInfo?.stage === 'knockout' || engineInfo?.stage === 'complete';

  // Get knockout matches
  const knockoutMatches = matches?.filter(m =>
    m.round === 'QF' || m.round === 'SF' || m.round === 'F'
  ) || [];

  // Format round name
  const formatRoundName = (round) => {
    if (round === 'QF') return 'Quarter Finals';
    if (round === 'SF') return 'Semi Finals';
    if (round === 'F') return 'Final';
    return round;
  };

  // Check if selected round is a group round (e.g., GS-A-R1) or knockout round
  const isGroupRoundSelected = selectedRound && selectedRound.startsWith('GS-');
  const isKnockoutRoundSelected = selectedRound && (selectedRound === 'QF' || selectedRound === 'SF' || selectedRound === 'F');

  // Extract group from selected round (e.g., GS-A-R1 -> Group A)
  const selectedGroupFromRound = isGroupRoundSelected
    ? `Group ${selectedRound.split('-')[1]}`
    : null;

  // Render knockout bracket
  const renderKnockoutBracket = () => {
    if (knockoutMatches.length === 0) return null;

    // Group by round
    const matchesByRound = knockoutMatches.reduce((acc, match) => {
      const round = match.round || 'Unknown';
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    }, {});

    const roundOrder = ['QF', 'SF', 'F'];
    const availableRounds = roundOrder.filter(r => matchesByRound[r]);

    return (
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Award className="size-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-wider">Knockout Bracket</h3>
        </div>

        {availableRounds.map((round) => {
          const roundMatches = matchesByRound[round] || [];
          const isFinal = round === 'F';

          return (
            <Card key={round} className={`overflow-hidden ${isFinal ? 'border-primary/50 bg-primary/5' : ''}`}>
              <CardHeader className={`py-2 px-3 ${isFinal ? 'bg-primary/10' : 'bg-muted/30'}`}>
                <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  {isFinal && <Trophy className="size-3 text-yellow-500" />}
                  {formatRoundName(round)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {roundMatches.map((match, idx) => {
                  const team1Name = match.team1?.name || match.team1?.display_name || 'TBD';
                  const team2Name = match.team2?.name || match.team2?.display_name || 'TBD';
                  const isComplete = match.status === 'completed';
                  const isLive = match.status === 'in_progress';
                  const winner = match.winner_team_id;
                  const team1Won = winner === match.team1?.team_id;
                  const team2Won = winner === match.team2?.team_id;

                  return (
                    <div key={match.match_id || idx} className={`p-3 ${idx > 0 ? 'border-t' : ''} ${isLive ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <div className="space-y-2">
                        {/* Team 1 */}
                        <div className={`flex items-center justify-between ${team1Won ? 'font-bold text-green-600' : team2Won ? 'text-muted-foreground' : ''}`}>
                          <div className="flex items-center gap-2">
                            {team1Won && <Crown className="size-3 text-yellow-500" />}
                            <span className="text-sm">{team1Name}</span>
                          </div>
                        </div>
                        {/* VS Divider */}
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-border/50" />
                          <span className="text-[10px] font-bold text-muted-foreground/50">VS</span>
                          <div className="h-px flex-1 bg-border/50" />
                        </div>
                        {/* Team 2 */}
                        <div className={`flex items-center justify-between ${team2Won ? 'font-bold text-green-600' : team1Won ? 'text-muted-foreground' : ''}`}>
                          <div className="flex items-center gap-2">
                            {team2Won && <Crown className="size-3 text-yellow-500" />}
                            <span className="text-sm">{team2Name}</span>
                          </div>
                        </div>
                      </div>
                      {/* Status */}
                      <div className="mt-2 flex justify-end">
                        {isLive && (
                          <Badge className="text-[10px] bg-red-500 animate-pulse">LIVE</Badge>
                        )}
                        {isComplete && (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            COMPLETE
                          </Badge>
                        )}
                        {!isLive && !isComplete && (
                          <Badge variant="outline" className="text-[10px]">PENDING</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Show message if no standings and no knockout matches
  if ((!standings || Object.keys(standings).length === 0) && knockoutMatches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No standings available yet</p>
        <p className="text-sm">Matches need to be played first</p>
      </div>
    );
  }

  const groupKeys = Object.keys(standings || {}).sort();

  // Filter groups based on selected round
  const filteredGroupKeys = selectedGroupFromRound
    ? groupKeys.filter(key => key === selectedGroupFromRound)
    : groupKeys;

  // Should show group standings?
  const showGroupStandings = !isKnockoutRoundSelected && filteredGroupKeys.length > 0;

  // Should show knockout bracket?
  const showKnockout = !isGroupRoundSelected && (isKnockoutStage || knockoutMatches.length > 0);

  // Filter knockout matches by selected round if a knockout round is selected
  const filteredKnockoutMatches = isKnockoutRoundSelected
    ? knockoutMatches.filter(m => m.round === selectedRound)
    : knockoutMatches;

  return (
    <div className="space-y-6">
      {/* Knockout Bracket */}
      {showKnockout && filteredKnockoutMatches.length > 0 && (
        <>
          {/* Render knockout bracket with filtered matches */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="size-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                {isKnockoutRoundSelected ? formatRoundName(selectedRound) : 'Knockout Bracket'}
              </h3>
            </div>

            {(() => {
              // Group filtered knockout matches by round
              const matchesByRound = filteredKnockoutMatches.reduce((acc, match) => {
                const round = match.round || 'Unknown';
                if (!acc[round]) acc[round] = [];
                acc[round].push(match);
                return acc;
              }, {});

              const roundOrder = ['QF', 'SF', 'F'];
              const availableRounds = roundOrder.filter(r => matchesByRound[r]);

              return availableRounds.map((round) => {
                const roundMatches = matchesByRound[round] || [];
                const isFinal = round === 'F';

                return (
                  <Card key={round} className={`py-0 gap-0 overflow-hidden ${isFinal ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <CardHeader className={`py-2 px-3 ${isFinal ? 'bg-primary/10' : 'bg-muted/30'}`}>
                      <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        {isFinal && <Trophy className="size-3 text-yellow-500" />}
                        {formatRoundName(round)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {roundMatches.map((match, idx) => {
                        const team1Name = match.team1?.name || match.team1?.display_name || 'TBD';
                        const team2Name = match.team2?.name || match.team2?.display_name || 'TBD';
                        const isComplete = match.status === 'completed';
                        const isLive = match.status === 'in_progress';
                        const winner = match.winner_team_id;
                        const team1Won = winner === match.team1?.team_id;
                        const team2Won = winner === match.team2?.team_id;

                        return (
                          <div key={match.match_id || idx} className={`p-3 ${idx > 0 ? 'border-t' : ''} ${isLive ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                            <div className="space-y-2">
                              <div className={`flex items-center justify-between ${team1Won ? 'font-bold text-green-600' : team2Won ? 'text-muted-foreground' : ''}`}>
                                <div className="flex items-center gap-2">
                                  {team1Won && <Crown className="size-3 text-yellow-500" />}
                                  <span className="text-sm">{team1Name}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-border/50" />
                                <span className="text-[10px] font-bold text-muted-foreground/50">VS</span>
                                <div className="h-px flex-1 bg-border/50" />
                              </div>
                              <div className={`flex items-center justify-between ${team2Won ? 'font-bold text-green-600' : team1Won ? 'text-muted-foreground' : ''}`}>
                                <div className="flex items-center gap-2">
                                  {team2Won && <Crown className="size-3 text-yellow-500" />}
                                  <span className="text-sm">{team2Name}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end">
                              {isLive && <Badge className="text-[10px] bg-red-500 animate-pulse">LIVE</Badge>}
                              {isComplete && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">COMPLETE</Badge>}
                              {!isLive && !isComplete && <Badge variant="outline" className="text-[10px]">PENDING</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </>
      )}

      {/* Group Standings */}
      {showGroupStandings && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="size-5 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              {selectedGroupFromRound || 'Group Standings'}
            </h3>
          </div>

          {filteredGroupKeys.map((groupKey) => {
            const groupStandings = standings[groupKey] || [];

            return (
              <Card key={groupKey} className="py-0 gap-0 overflow-hidden">
                <CardHeader className="pt-4 px-3 bg-muted/30 ">
                  <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="size-3" />
                    {groupKey}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Team</div>
                    <div className="col-span-2 text-center">W</div>
                    <div className="col-span-2 text-center">L</div>
                    <div className="col-span-2 text-center">Status</div>
                  </div>

                  {groupStandings.map((team, idx) => {
                    const isFirst = idx === 0;
                    const isSecond = idx === 1;
                    const isQualified = team.qualified;

                    return (
                      <div
                        key={team.team_id}
                        className={`grid grid-cols-12 gap-2 px-3 py-3 items-center ${isQualified ? 'bg-green-50 dark:bg-green-950/20' : ''
                          } ${idx > 0 ? 'border-t' : ''}`}
                      >
                        {/* Rank */}
                        <div className="col-span-1">
                          <div className={`size-6 rounded-full flex items-center justify-center text-xs font-black ${isFirst ? 'bg-yellow-500 text-white' :
                            isSecond ? 'bg-gray-400 text-white' :
                              'bg-muted text-muted-foreground'
                            }`}>
                            {idx + 1}
                          </div>
                        </div>

                        {/* Team Name */}
                        <div className="col-span-5">
                          <p className="font-semibold text-sm truncate">
                            {team.name || team.display_name || `Team ${team.team_id}`}
                          </p>
                          {(team.player1_name || team.player2_name) && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {team.player1_name} & {team.player2_name}
                            </p>
                          )}
                        </div>

                        {/* Wins */}
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-bold text-green-600">{team.wins || 0}</span>
                        </div>

                        {/* Losses */}
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-bold text-red-500">{team.losses || 0}</span>
                        </div>

                        {/* Qualified Status */}
                        <div className="col-span-2 text-center">
                          {isQualified ? (
                            <Badge className="text-[10px] bg-green-500 px-1.5">
                              Q
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {groupStandings.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No standings yet
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Show knockout bracket at bottom if not in knockout stage but has knockout matches */}
      {!isKnockoutStage && knockoutMatches.length > 0 && renderKnockoutBracket()}
    </div>
  );
}

// Matches List Component for Group+Knockout format
function MatchesList({ matches, stage, selectedRound, tournamentId, onMatchClick, realtimeScores }) {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No matches yet</p>
        <p className="text-sm">Start the first round to generate matches</p>
      </div>
    );
  }

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round || 'Unknown';
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  // Get matches for selected round, or all if no filter
  const filteredMatches = selectedRound
    ? (matchesByRound[selectedRound] || [])
    : matches;

  // Sort rounds: Group stage rounds first (GS-*), then knockout (QF, SF, F)
  const knockoutOrder = { 'QF': 1, 'SF': 2, 'F': 3 };
  const roundKeys = Object.keys(matchesByRound).sort((a, b) => {
    // Group stage rounds (GS-A-R1, GS-B-R1, etc.)
    const isGroupA = a.startsWith('GS-');
    const isGroupB = b.startsWith('GS-');

    if (isGroupA && isGroupB) {
      return a.localeCompare(b);
    }
    if (isGroupA) return -1;
    if (isGroupB) return 1;

    // Knockout rounds
    const orderA = knockoutOrder[a] || 0;
    const orderB = knockoutOrder[b] || 0;
    if (orderA && orderB) return orderA - orderB;

    // Fallback: numeric sort
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  // Helper to format round name
  const formatRoundName = (roundKey) => {
    if (roundKey.startsWith('GS-')) {
      // GS-A-R1 -> Group A - Round 1
      const parts = roundKey.split('-');
      if (parts.length === 3) {
        return `Group ${parts[1]} - Round ${parts[2].replace('R', '')}`;
      }
    }
    if (roundKey === 'QF') return 'Quarter Finals';
    if (roundKey === 'SF') return 'Semi Finals';
    if (roundKey === 'F') return 'Final';
    return `Round ${roundKey}`;
  };

  return (
    <div className="space-y-3">
      {filteredMatches.map((match) => {
        const team1Name = match.team1?.name || match.team1?.display_name ||
          (match.team1?.team_id ? `Team ${match.team1.team_id}` : 'TBD');
        const team2Name = match.team2?.name || match.team2?.display_name ||
          (match.team2?.team_id ? `Team ${match.team2.team_id}` : 'TBD');
        const matchId = match.match_id || match.id;
        const isLive = match.status === 'in_progress';
        const isComplete = match.status === 'completed';

        // Get realtime scores if available
        const liveScores = realtimeScores?.[matchId];
        const scoreA = liveScores?.teamA ?? null;
        const scoreB = liveScores?.teamB ?? null;
        const winRate = liveScores?.winRate ?? null;

        return (
          <Card
            key={matchId}
            className={`overflow-hidden py-0 cursor-pointer hover:border-primary/50 transition-all group ${isLive ? 'border-red-500/30' : ''
              }`}
            onClick={() => onMatchClick && onMatchClick(match.tournament_id || tournamentId, match.round, matchId)}
          >
            <div className="flex">
              {/* Status Indicator */}
              <div className={`w-1.5 ${isLive ? 'bg-red-500' :
                isComplete ? 'bg-green-500' :
                  'bg-yellow-500'
                }`} />

              <div className="flex-1 p-3">
                {/* Round & Status Header */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {formatRoundName(match.round)}
                  </span>
                  <div className="flex items-center gap-2">
                    {isLive && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase animate-pulse">
                        <span className="relative flex size-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full size-2 bg-red-500"></span>
                        </span>
                        LIVE
                      </span>
                    )}
                    {isComplete && (
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                        DONE
                      </Badge>
                    )}
                    {!isLive && !isComplete && (
                      <Badge variant="outline" className="text-[10px]">
                        PENDING
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Teams */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue font-black text-[10px]">
                        A
                      </div>
                      <span className={`font-medium text-sm ${match.winner_team_id === match.team1?.team_id ? 'text-green-600 font-bold' : ''
                        }`}>
                        {team1Name}
                      </span>
                      {match.winner_team_id === match.team1?.team_id && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    {/* Live Score for Team A */}
                    {scoreA !== null && (
                      <span className="text-lg font-black tabular-nums text-brand-blue">{scoreA}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green font-black text-[10px]">
                        B
                      </div>
                      <span className={`font-medium text-sm ${match.winner_team_id === match.team2?.team_id ? 'text-green-600 font-bold' : ''
                        }`}>
                        {team2Name}
                      </span>
                      {match.winner_team_id === match.team2?.team_id && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    {/* Live Score for Team B */}
                    {scoreB !== null && (
                      <span className="text-lg font-black tabular-nums text-brand-green">{scoreB}</span>
                    )}
                  </div>
                </div>

                {/* View Match Button */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {match.court ? `Court ${match.court}` : ''}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    {isLive ? 'View Live' : 'View Details'}
                    <ChevronRight className="size-3" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function TournamentStatsPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("matches");
  const [selectedRound, setSelectedRound] = useState("1");
  const [selectedMatchRound, setSelectedMatchRound] = useState(null); // null = show all
  const [realtimeScores, setRealtimeScores] = useState({});
  const wsConnectionsRef = useRef({});

  const { data: tournament, isLoading: tournamentLoading } = useTournament(
    params.id
  );
  const { data: roundsData, isLoading: roundsLoading } = useTournamentRounds(
    params.id
  );
  const { data: roundData, isLoading: roundLoading } = useTournamentRound(
    params.id,
    selectedRound
  );

  // Tournament Engine data for Group+Knockout format
  const {
    info: engineInfo,
    standings: engineStandings,
    teams: engineTeams,
    matches: engineMatches,
    isLoading: engineLoading,
    isGroupKnockout
  } = useTournamentEngine(params.id);

  // Determine tournament format - must be before conditional returns
  const tournamentFormat = useMemo(() => {
    if (!tournament) return 'swiss';
    let metadata = tournament.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        metadata = {};
      }
    }
    return metadata?.format || 'swiss';
  }, [tournament]);

  const isGroupKnockoutFormat = tournamentFormat === 'group_knockout' || isGroupKnockout;

  // Generate rounds for Group+Knockout format - must be before conditional returns
  const groupKnockoutRounds = useMemo(() => {
    if (!isGroupKnockoutFormat || !engineInfo) return [];

    const rounds = [];
    const totalGroupRounds = engineInfo.total_group_rounds || 0;

    // Add group stage rounds
    for (let i = 1; i <= totalGroupRounds; i++) {
      rounds.push(`${i}`);
    }

    // Add knockout rounds based on teams advancing
    const teamsAdvancing = (engineInfo.number_of_groups || 2) * (engineInfo.teams_to_advance || 2);
    if (teamsAdvancing >= 8) rounds.push('QF');
    if (teamsAdvancing >= 4) rounds.push('SF');
    rounds.push('F');

    return rounds;
  }, [isGroupKnockoutFormat, engineInfo]);

  // Get unique rounds from matches for Group+Knockout - must be before conditional returns
  const availableMatchRounds = useMemo(() => {
    if (!engineMatches || engineMatches.length === 0) return [];
    const rounds = [...new Set(engineMatches.map(m => m.round).filter(Boolean))];

    // Sort: GS-* first, then knockout rounds
    const knockoutOrder = { 'QF': 1, 'SF': 2, 'F': 3 };
    return rounds.sort((a, b) => {
      const isGroupA = a.startsWith('GS-');
      const isGroupB = b.startsWith('GS-');
      if (isGroupA && isGroupB) return a.localeCompare(b);
      if (isGroupA) return -1;
      if (isGroupB) return 1;
      const orderA = knockoutOrder[a] || 0;
      const orderB = knockoutOrder[b] || 0;
      return orderA - orderB;
    });
  }, [engineMatches]);

  // WebSocket connections for live score updates - must be before conditional returns
  useEffect(() => {
    if (!engineMatches || engineMatches.length === 0) {
      setRealtimeScores({});
      return;
    }

    // Clean up existing connections
    Object.values(wsConnectionsRef.current).forEach((ws) => {
      if (ws && ws.close) ws.close();
    });
    wsConnectionsRef.current = {};
    setRealtimeScores({});

    // Create WebSocket connection for each match
    engineMatches.forEach((match) => {
      const matchId = match.match_id || match.id;
      if (!matchId) return;

      const ws = createWebSocketConnection(`/ws/match/${matchId}/score`, {
        onMessage: (data) => {
          if (data.type === "score_update") {
            setRealtimeScores((prev) => ({
              ...prev,
              [matchId]: {
                teamA: data.teamA,
                teamB: data.teamB,
                winRate: data.winRate,
              },
            }));
          }
        },
        reconnect: true,
      });

      wsConnectionsRef.current[matchId] = ws;
    });

    return () => {
      Object.values(wsConnectionsRef.current).forEach((ws) => {
        if (ws && ws.close) ws.close();
      });
      wsConnectionsRef.current = {};
    };
  }, [engineMatches?.length]);

  // Auto-select latest round when matches load
  useEffect(() => {
    if (availableMatchRounds.length > 0 && selectedMatchRound === null) {
      // Select the last round (most recent)
      setSelectedMatchRound(availableMatchRounds[availableMatchRounds.length - 1]);
    }
  }, [availableMatchRounds, selectedMatchRound]);

  if (tournamentLoading) {
    return (
      <div className="pb-20">
        <div className="p-4 text-center">Loading tournament...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="pb-20">
        <div className="p-4 text-center">Tournament not found</div>
      </div>
    );
  }

  const category =
    tournament.match_format?.eligible_gender === "M"
      ? "Men's Doubles"
      : tournament.match_format?.eligible_gender === "W"
        ? "Women's Doubles"
        : "Mixed Doubles";

  // Swiss format data
  const pairings = roundData?.round?.pairings || [];
  const leaderboard = roundData?.round?.leaderboard || [];

  // Group pairings by court (Swiss format)
  const pairingsByCourt = pairings.reduce((acc, pairing) => {
    const court = pairing.court || "Unknown";
    if (!acc[court]) acc[court] = [];
    acc[court].push(pairing);
    return acc;
  }, {});

  // Get top 3 and remaining players (Swiss format)
  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  // Get rounds from API endpoint (parsed from metadata)
  const rounds = roundsData?.rounds || [];

  // Fallback: Generate rounds based on total_rounds if API data not available
  const fallbackRounds = [];
  if (rounds.length === 0 && !roundsLoading) {
    const totalRounds = tournament.match_format?.total_rounds || 7;
    // Add numbered rounds (1-4)
    for (let i = 1; i <= Math.min(totalRounds, 4); i++) {
      fallbackRounds.push(String(i));
    }
    // Add special rounds only if they don't conflict with numbered rounds
    if (totalRounds >= 5 && !fallbackRounds.includes("4")) fallbackRounds.push("4");
    if (totalRounds >= 6) fallbackRounds.push("8");
    if (totalRounds >= 7) fallbackRounds.push("16");
  }

  const displayRounds = rounds.length > 0 ? rounds : fallbackRounds;

  // Handle match click - navigate to match detail page
  const handleMatchClick = (tournamentId, round, matchId) => {
    router.push(`/tournaments/${tournamentId}/${round}/${matchId}`);
  };

  // Render Group+Knockout format
  if (isGroupKnockoutFormat) {
    return (
      <ScrollablePage className="bg-background">
        <ScrollablePageHeader className="pb-0 bg-transparent">
          <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/40 supports-backdrop-filter:bg-background/60">
            <TournamentStatsHeader
              tournamentName={tournament.name}
              category={category}
            />
            {/* Round Navigation for matches */}
            {availableMatchRounds.length > 0 && (
              <div className="px-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-none py-3">
                  <Button
                    variant={selectedMatchRound === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMatchRound(null)}
                    className="text-xs font-bold shrink-0"
                  >
                    All
                  </Button>
                  {availableMatchRounds.map((round) => {
                    // Format round name for display
                    let displayName = round;
                    if (round.startsWith('GS-')) {
                      const parts = round.split('-');
                      displayName = `G${parts[1]}-R${parts[2]?.replace('R', '')}`;
                    }
                    return (
                      <Button
                        key={round}
                        variant={selectedMatchRound === round ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMatchRound(round)}
                        className="text-xs font-bold shrink-0"
                      >
                        {displayName}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </header>
        </ScrollablePageHeader>

        <ScrollablePageContent className="pb-24 pt-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
            <div className="px-4 mb-4">
              <TabsList className="w-full h-12 p-1.5 bg-muted/30 border rounded-xl grid grid-cols-2">
                <TabsTrigger
                  value="matches"
                  className="rounded-lg text-xs font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  Matches
                </TabsTrigger>
                <TabsTrigger
                  value="leaderboard"
                  className="rounded-lg text-xs font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  Standings
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content */}
            <div className="flex-1 px-4">
              <TabsContent value="matches" className="mt-0 space-y-4">
                {engineLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading matches...
                  </div>
                ) : (
                  <MatchesList
                    matches={engineMatches}
                    stage={engineInfo?.stage}
                    selectedRound={selectedMatchRound}
                    tournamentId={params.id}
                    onMatchClick={handleMatchClick}
                    realtimeScores={realtimeScores}
                  />
                )}
              </TabsContent>
              <TabsContent value="leaderboard" className="mt-0 space-y-4">
                {engineLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading standings...
                  </div>
                ) : (
                  <GroupStandings
                    standings={engineStandings}
                    groups={engineInfo?.groups}
                    teams={engineTeams?.teams}
                    engineInfo={engineInfo}
                    matches={engineMatches}
                    selectedRound={selectedMatchRound}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </ScrollablePageContent>
      </ScrollablePage>
    );
  }

  // Render Swiss format (original)
  return (
    <ScrollablePage className="bg-background">
      <ScrollablePageHeader className="pb-0 bg-transparent">
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/40 supports-backdrop-filter:bg-background/60">
          <TournamentStatsHeader
            tournamentName={tournament.name}
            category={category}
          />
          <div className="px-0 pb-2">
            <RoundNavigation
              rounds={displayRounds}
              selectedRound={selectedRound}
              onRoundChange={setSelectedRound}
            />
          </div>
        </header>
      </ScrollablePageHeader>

      <ScrollablePageContent className="pb-24 pt-4">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 inset-x-0 h-48 bg-linear-to-b from-brand-blue/10 to-transparent skew-y-3 origin-top-left scale-110 pointer-events-none -z-10" />
        <div className="absolute top-0 right-0 size-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none -z-10" />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
          <div className="px-4 mb-4">
            <TabsList className="w-full h-12 p-1.5 bg-muted/30 rounded-xl grid grid-cols-2">
              <TabsTrigger
                value="pairings"
                className="rounded-lg text-xs font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Pairings
              </TabsTrigger>
              <TabsTrigger
                value="leaderboard"
                className="rounded-lg text-xs font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Leaderboard
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1 px-4">
            <TabsContent value="pairings" className="mt-0 space-y-4">
              <PairingsTab
                pairingsByCourt={pairingsByCourt}
                selectedRound={selectedRound}
                isLoading={roundLoading}
              />
            </TabsContent>
            <TabsContent value="leaderboard" className="mt-0 space-y-4">
              <LeaderboardTab
                topThree={topThree}
                remaining={remaining}
                isLoading={roundLoading}
              />
            </TabsContent>
          </div>
        </Tabs>
      </ScrollablePageContent>
    </ScrollablePage>
  );
}
