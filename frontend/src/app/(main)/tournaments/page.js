"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTournaments } from "@/hooks/useTournaments";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Zap, Users } from "lucide-react";
import {
  ScrollablePage,
  ScrollablePageHeader,
  ScrollablePageContent,
} from "@/components/layout/ScrollablePage";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [showLiveOnly, setShowLiveOnly] = useState(false);

  const { data: tournamentsData, isLoading, error } = useTournaments(filters);

  const allTournaments = tournamentsData?.tournaments || [];

  const isTournamentLive = (tournament) => {
    if (!tournament.start_date || !tournament.end_date) return false;
    const now = new Date();
    const startTime = new Date(tournament.start_date);
    const endTime = new Date(tournament.end_date);
    return now >= startTime && now <= endTime;
  };

  const tournaments = useMemo(() => {
    let filtered = allTournaments;

    if (showLiveOnly) {
      filtered = filtered.filter(isTournamentLive);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tournament) =>
          tournament.name?.toLowerCase().includes(query) ||
          tournament.venue?.name?.toLowerCase().includes(query) ||
          tournament.venue?.address?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTournaments, showLiveOnly, searchQuery]);

  const handleFilterClick = (gender) => {
    setFilters((prev) => ({
      ...prev,
      eligible_gender: prev.eligible_gender === gender ? undefined : gender,
    }));
  };

  return (
    <ScrollablePage className="bg-background">
      <ScrollablePageHeader className="pb-2 bg-transparent">
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/40 supports-backdrop-filter:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black italic tracking-tighter text-foreground">
                AURA
              </span>
            </div>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="px-4 py-2 space-y-3 pt-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 bg-muted/40 border-transparent focus:bg-background focus:border-input transition-all rounded-xl"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
            <Button
              variant={showLiveOnly ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowLiveOnly(!showLiveOnly)}
              className={`rounded-full px-4 h-8 text-xs font-medium border ${
                showLiveOnly
                  ? "border-transparent animate-pulse"
                  : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap
                className={`size-3.5 mr-1.5 ${
                  showLiveOnly ? "fill-current" : ""
                }`}
              />
              Live Now
            </Button>

            <div className="w-px h-6 bg-border mx-1 self-center" />

            <Button
              size="sm"
              onClick={() => handleFilterClick("male")}
              variant={
                filters.eligible_gender === "male" ? "default" : "outline"
              }
              className={`rounded-full h-8 text-xs border ${
                filters.eligible_gender === "male"
                  ? ""
                  : "border-dashed border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              <Users className="size-3.5 mr-1.5" />
              Men's Doubles
            </Button>
            <Button
              size="sm"
              onClick={() => handleFilterClick("female")}
              variant={
                filters.eligible_gender === "female" ? "default" : "outline"
              }
              className={`rounded-full h-8 text-xs border ${
                filters.eligible_gender === "female"
                  ? ""
                  : "border-dashed border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              <Users className="size-3.5 mr-1.5" />
              Women's Doubles
            </Button>
          </div>
        </div>
      </ScrollablePageHeader>

      <ScrollablePageContent className="pb-24 pt-2 relative">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 inset-x-0 h-48 bg-linear-to-b from-brand-blue/10 to-transparent skew-y-3 origin-top-left scale-110 pointer-events-none -z-10" />
        <div className="absolute top-0 right-0 size-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none -z-10" />

        <div className="px-4 space-y-4">
          {/* Tournament List */}
          {isLoading && (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 w-full bg-muted/50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="bg-destructive/10 p-4 rounded-full">
                <Zap className="size-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  Oops! Something went wrong
                </h3>
                <p className="text-muted-foreground text-sm">
                  Failed to load tournaments.
                </p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && tournaments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="bg-muted/30 p-8 rounded-full">
                <Filter className="size-12 text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">
                  No tournaments found
                </h3>
                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                  {searchQuery || showLiveOnly || filters.eligible_gender
                    ? "Try adjusting your filters or search query."
                    : "There are no upcoming tournaments at the moment."}
                </p>
              </div>
              {!searchQuery && !showLiveOnly && !filters.eligible_gender && (
                <Button
                  onClick={() => router.push("/tournaments/new")}
                  className="rounded-full px-6"
                >
                  Create First Tournament
                </Button>
              )}
            </div>
          )}

          <div className="space-y-4">
            {tournaments.map((tournament, index) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                index={index}
              />
            ))}
          </div>
        </div>
      </ScrollablePageContent>
    </ScrollablePage>
  );
}
