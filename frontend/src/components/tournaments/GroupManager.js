"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowRightLeft,
  Users,
  Trophy,
  AlertTriangle,
  Eye,
  UserCheck,
} from "lucide-react";
import { useTournamentEngine } from "@/hooks/useTournamentEngine";

/**
 * GroupManager - Component for tournament hosts to view and manage groups
 *
 * Features:
 * - View all groups with teams
 * - Swap teams between groups (before matches start)
 * - Initialize groups with different configurations
 * - View standings for each group
 */
export function GroupManager({ tournamentId }) {
  const {
    info,
    teams,
    standings,
    isLoading,
    isLoadingTeams,
    initializeGroups,
    isInitializing,
    swapTeam,
    isSwapping,
    reset,
    isResetting,
  } = useTournamentEngine(tournamentId);

  const [selectedGroups, setSelectedGroups] = useState(2);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [targetGroup, setTargetGroup] = useState("");
  const [playersDialogOpen, setPlayersDialogOpen] = useState(false);

  // Can only edit groups before matches start
  const canEditGroups =
    info?.stage === "registration" ||
    (info?.stage === "group_stage" && info?.current_round === 0);

  const handleInitialize = () => {
    initializeGroups(selectedGroups);
  };

  const handleSwapTeam = () => {
    if (!selectedTeam || !targetGroup) return;

    swapTeam({
      teamId: selectedTeam.team_id,
      fromGroup: selectedTeam.currentGroup,
      toGroup: targetGroup,
    });

    setSwapDialogOpen(false);
    setSelectedTeam(null);
    setTargetGroup("");
  };

  const openSwapDialog = (team, currentGroup) => {
    setSelectedTeam({ ...team, currentGroup });
    setSwapDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate team and player counts
  const teamCount = teams?.teams?.length || 0;
  const playerCount = teamCount * 2; // Doubles = 2 players per team

  // Not initialized - show initialization UI
  if (!info?.groups) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Initialize Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Set up groups for the tournament. Teams will be distributed using
              snake draft based on ratings.
            </p>

            {/* Registration Stats */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{teamCount}</strong> teams
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{playerCount}</strong> players
                </span>
              </div>
              {teamCount > 0 && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setPlayersDialogOpen(true)}
                  >
                    <Eye className="h-3 w-3" />
                    View All
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Number of Groups:</span>
              <Select
                value={String(selectedGroups)}
                onValueChange={(v) => setSelectedGroups(Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Groups</SelectItem>
                  <SelectItem value="4">4 Groups</SelectItem>
                  <SelectItem value="8">8 Groups</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {teamCount > 0 && teamCount < selectedGroups * 2 && (
              <p className="text-sm text-destructive">
                Need at least {selectedGroups * 2} teams for {selectedGroups}{" "}
                groups. Currently have {teamCount}.
              </p>
            )}

            <Button
              onClick={handleInitialize}
              disabled={isInitializing || teamCount < selectedGroups * 2}
            >
              {isInitializing ? "Initializing..." : "Initialize Groups"}
            </Button>
          </CardContent>
        </Card>

        {/* Players Dialog */}
        <Dialog open={playersDialogOpen} onOpenChange={setPlayersDialogOpen}>
          <DialogContent className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Registered Teams ({teamCount})
              </DialogTitle>
              <DialogDescription>
                {playerCount} players in {teamCount} teams
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {teams?.teams?.map((team, idx) => (
                <div
                  key={team.team_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {idx + 1}.
                    </span>
                    <div>
                      <p className="font-medium text-sm">{team.display_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {team.player1_name}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {team.player2_name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {team.avg_rating?.toFixed(1) || "?"}
                  </Badge>
                </div>
              ))}

              {teamCount === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No teams registered yet</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPlayersDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show groups
  const groups = teams?.groups || {};
  const groupLetters = Object.keys(groups).sort();

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tournament Groups
        </h2>
        {canEditGroups && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => reset()}
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Reset Groups"}
          </Button>
        )}
      </div>

      {/* Registration Stats */}
      <div>
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm">
            <strong>{teamCount}</strong> teams
          </span>
        </div>
        <div className="size-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <UserCheck className="size-4 text-muted-foreground" />
          <span className="text-sm">
            <strong>{playerCount}</strong> players
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-sm">
            <strong>{groupLetters.length}</strong> groups
          </span>
        </div>
      </div>
      <div>
        {teamCount > 0 && (
          <>
            <div className="ml-auto" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setPlayersDialogOpen(true)}
            >
              <Eye className="h-3 w-3" />
              View All Teams
            </Button>
          </>
        )}
      </div>
      </div>

      {/* Stage indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={info.stage === "group_stage" ? "default" : "secondary"}>
          {info.stage?.replace("_", " ").toUpperCase()}
        </Badge>
        {info.current_round > 0 && (
          <Badge variant="outline">
            Round {info.current_round} / {info.total_group_rounds}
          </Badge>
        )}
        {!canEditGroups && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Locked
          </Badge>
        )}
      </div>

      {/* Groups grid */}
      <div className="flex flex-col gap-4">
        {groupLetters.map((groupKey) => {
          // Extract letter from "Group A" format
          const letter = groupKey.replace("Group ", "");
          const groupTeams = groups[groupKey] || [];
          const groupStandings = standings?.[groupKey] || [];

          return (
            <Card key={groupKey}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{groupKey}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groupTeams.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No teams</p>
                  ) : (
                    groupTeams.map((team, idx) => {
                      const standing = groupStandings.find(
                        (s) => s.team_id === team.team_id
                      );

                      return (
                        <div
                          key={team.team_id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-6">
                              {standing?.position || idx + 1}.
                            </span>
                            <div>
                              <p className="font-medium text-sm">
                                {team.display_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Rating: {team.avg_rating?.toFixed(1) || "?"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {standing && (
                              <Badge
                                variant={
                                  standing.qualified ? "default" : "secondary"
                                }
                                className="text-xs"
                              >
                                {standing.wins}W - {standing.losses}L
                              </Badge>
                            )}

                            {canEditGroups && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openSwapDialog(team, letter)}
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Swap Team Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Swap Team</DialogTitle>
            <DialogDescription>
              Move {selectedTeam?.display_name} to a different group
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm mb-2">
              Current group: <strong>Group {selectedTeam?.currentGroup}</strong>
            </p>

            <div className="flex items-center gap-2">
              <span className="text-sm">Move to:</span>
              <Select value={targetGroup} onValueChange={setTargetGroup}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groupLetters
                    .map((g) => g.replace("Group ", ""))
                    .filter((g) => g !== selectedTeam?.currentGroup)
                    .map((g) => (
                      <SelectItem key={g} value={g}>
                        Group {g}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSwapTeam}
              disabled={!targetGroup || isSwapping}
            >
              {isSwapping ? "Swapping..." : "Swap Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Teams Dialog */}
      <Dialog open={playersDialogOpen} onOpenChange={setPlayersDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Teams ({teamCount})
            </DialogTitle>
            <DialogDescription>
              {playerCount} players in {teamCount} teams across{" "}
              {groupLetters.length} groups
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {teams?.teams?.map((team, idx) => (
              <div
                key={team.team_id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {idx + 1}.
                  </span>
                  <div>
                    <p className="font-medium text-sm">{team.display_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {team.player1_name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {team.player2_name}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {team.avg_rating?.toFixed(1) || "?"}
                </Badge>
              </div>
            ))}

            {teamCount === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No teams registered yet</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlayersDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GroupManager;
