# Tournament Creation Scripts

## createGroupMensDoublesTournament.ts

This script automatically creates a group mixed doubles tournament with 14 players.

### What it does:

1. **Fetches 14 players** from the database
2. **Assigns roles**:
   - First player → Tournament Host (not in any team)
   - Second player → Referee (not in any team)
   - Remaining 12 players → Form 6 teams (2 players each)
3. **Creates the tournament**:
   - Format: `group_knockout`
   - Match type: `mixed_doubles`
   - Capacity: 12 players (6 teams)
   - Uses the first available venue
4. **Registers all teams** automatically

### Prerequisites:

- At least 14 players in the `players` table (12 for teams + 1 host + 1 referee)
- At least 1 venue in the `venue` table
- Environment variables configured (SUPABASE_URL, SUPABASE_ANON_KEY)

### Usage:

```bash
# From the backend directory
bun run create-tournament

# Or directly
bun run src/scripts/createGroupMensDoublesTournament.ts
```

### Output:

The script will print:
- Tournament details (ID, name, host, referee)
- Team information
- Registration summary
- Start and end times

### Notes:

- The tournament is created with a start time 1 hour from now
- Duration is set to 4 hours
- Registration fee is set to 0 (free)
- All teams are automatically registered
