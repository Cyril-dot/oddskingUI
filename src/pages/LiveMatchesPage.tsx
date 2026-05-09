import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { matches as matchesApi, publicMatches } from '../utils/api';
import type { Match } from '../utils/api';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OddsMap {
  home: number;
  draw: number;
  away: number;
}

interface EnrichedMatch extends Match {
  oddsMap?: OddsMap;
}

// ---------------------------------------------------------------------------
// Live status set
//
// NOTE: The backend's LiveScorePoller normalises ALL provider status strings
// (1H, 2H, HT, ET, PEN, SHOOTOUT, BREAK, SUSPENDED, INTERRUPTED, etc.)
// into exactly "LIVE" before persisting.  So the primary value we ever
// receive from the API is "LIVE".
//
// The extended set below acts as a safety net for any edge-case pass-through
// values from the /live endpoint or raw LiveScoreApiClient responses,
// keeping parity with the backend's IN_PLAY_STATUSES set.
// ---------------------------------------------------------------------------
const LIVE_STATUSES = new Set([
  // Backend normalised value (primary — only this matters in practice)
  'LIVE',
  // Safety net — raw provider values if ever passed through
  'live', 'IN_PLAY', 'in_play', 'inplay',
  'FIRST_HALF', 'first_half', '1H', '1h',
  'SECOND_HALF', 'second_half', '2H', '2h',
  'HALFTIME', 'halftime', 'HALF_TIME', 'half_time', 'HT', 'ht',
  'EXTRA_TIME', 'extra_time', 'ET', 'et', 'ET1', 'et1', 'ET2', 'et2',
  'PENALTIES', 'penalties', 'PEN', 'pen', 'P', 'SHOOTOUT', 'shootout',
  'BREAK', 'break', 'SUSPENDED', 'suspended', 'INTERRUPTED', 'interrupted',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatMinute(match: Match): string {
  if (match.minutePlayed != null) return `${match.minutePlayed}'`;
  return 'LIVE';
}

function groupByLeague(matches: EnrichedMatch[]): Map<string, EnrichedMatch[]> {
  const map = new Map<string, EnrichedMatch[]>();
  for (const m of matches) {
    const key = m.league ?? 'Other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Odds extraction
//
// The backend's MatchService.getMatchOdds() returns an array of odds objects.
// Each entry may have: selection ("1", "X", "2" or team name), odd (decimal
// value), market ("1X2"), etc.  The extractor handles the backend's format
// as well as common fallback shapes.
// ---------------------------------------------------------------------------
function extractOddsMap(
  oddsArray: unknown[],
  homeTeam: string,
  awayTeam: string,
): OddsMap | undefined {
  if (!Array.isArray(oddsArray) || oddsArray.length === 0) return undefined;

  // Filter to 1X2 / match-result market if market field is present
  const entries = (oddsArray as Array<Record<string, unknown>>).filter((o) => {
    const market = String(o.market ?? o.market_name ?? o.marketName ?? o.type ?? '')
      .toLowerCase()
      .replace(/[\s_-]/g, '');
    return !market || market === '1x2' || market === 'matchresult' || market === 'matchodds';
  });

  const pool = entries.length > 0 ? entries : (oddsArray as Array<Record<string, unknown>>);
  const parseOdd = (o: Record<string, unknown>): number =>
    parseFloat(String(o.odd ?? o.value ?? o.odds ?? o.price ?? o.decimal ?? '0'));

  const norm = (s: string) => s.toLowerCase().trim();
  const normHome = norm(homeTeam);
  const normAway = norm(awayTeam);
  const matchesTeam = (selection: string, teamNorm: string) => {
    const sel = norm(selection);
    return sel === teamNorm || sel.includes(teamNorm) || teamNorm.includes(sel);
  };

  let home = 0, draw = 0, away = 0;
  for (const o of pool) {
    const sel = norm(String(o.selection ?? o.outcome ?? o.name ?? o.label ?? ''));
    const val = parseOdd(o);
    if (val <= 0) continue;
    if (sel === 'draw' || sel === 'x') { if (draw === 0) draw = val; }
    else if (matchesTeam(sel, normHome)) { if (home === 0) home = val; }
    else if (matchesTeam(sel, normAway)) { if (away === 0) away = val; }
  }

  if (home === 0 && draw === 0 && away === 0) {
    const numericVals = pool.map(parseOdd).filter((v) => v > 1 && v < 50);
    if (numericVals.length >= 3)
      return { home: numericVals[0], draw: numericVals[1], away: numericVals[2] };
    return undefined;
  }
  return { home, draw, away };
}

// ---------------------------------------------------------------------------
// Unwrap /live or /with-all-odds response
//
// The backend's /live endpoint returns: { success, data: Match[] }
// The backend's /with-all-odds endpoint returns:
//   { success, data: { live: [{match, match_result, asian_handicap}], ... } }
//
// This helper handles both shapes so LiveMatchesPage works regardless of
// which endpoint was used.
// ---------------------------------------------------------------------------
function unwrapLiveResponse(raw: unknown): Array<{ match: Match; odds: unknown[] }> {
  if (!raw) return [];
  const obj = raw as Record<string, unknown>;

  // Shape 1: { success, data: Match[] } — direct array from /live endpoint
  if (obj.success && Array.isArray(obj.data)) {
    return (obj.data as Match[])
      .filter((m) => m && m.id)
      .map((m) => ({ match: m, odds: [] }));
  }

  // Shape 2: { success, data: { live: [{match, match_result, ...}] } }
  if (obj.success && obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const data = obj.data as Record<string, unknown>;
    const liveArr = data['live'];
    if (Array.isArray(liveArr)) {
      return liveArr
        .map((item) => {
          const i = item as Record<string, unknown>;
          const match = i.match as Match;
          if (!match || !match.id) return null;
          const odds: unknown[] =
            Array.isArray(i.match_result) ? (i.match_result as unknown[]) :
            Array.isArray(i.odds)         ? (i.odds as unknown[]) :
            [];
          return { match, odds };
        })
        .filter(Boolean) as Array<{ match: Match; odds: unknown[] }>;
    }
  }

  // Shape 3: raw Match[] (no wrapper)
  if (Array.isArray(raw)) {
    return (raw as Match[])
      .filter((m) => m && m.id)
      .map((m) => ({ match: m, odds: [] }));
  }

  return [];
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function MatchSkeleton() {
  return (
    <div className="animate-pulse p-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
      <div className="flex justify-between mb-3">
        <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-9 flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-9 flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single match card
// ---------------------------------------------------------------------------
function MatchCard({ match }: { match: EnrichedMatch }) {
  const navigate = useNavigate();
  const { betSlip, addToBetSlip, showToast } = useAppStore();

  const isSelected = (market: string, selection: string) =>
    betSlip.some(
      (s) => s.matchId === match.id && s.market === market && s.selection === selection,
    );

  const handleOddClick = (
    e: React.MouseEvent,
    market: string,
    selection: string,
    odd: number,
  ) => {
    e.stopPropagation();
    addToBetSlip({
      matchId: match.id,
      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
      market,
      selection,
      odd,
    });
    showToast('Added to bet slip', 'success');
  };

  const odds = match.oddsMap;

  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0"
    >
      {/* League + minute row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {match.leagueLogo ? (
            <img
              src={match.leagueLogo}
              alt={match.league ?? ''}
              className="w-4 h-4 object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <SportsSoccerIcon className="text-slate-400" sx={{ fontSize: 14 }} />
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {match.league ?? 'Football'}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs text-green-500 font-semibold shrink-0">
          <FiberManualRecordIcon sx={{ fontSize: 8 }} className="animate-pulse" />
          {formatMinute(match)}
        </span>
      </div>

      {/* Teams + score */}
      <div className="flex items-center justify-between mb-4 gap-2">
        {/* Home */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {match.homeLogo && (
            <img
              src={match.homeLogo}
              alt={match.homeTeam}
              className="w-6 h-6 object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
            {match.homeTeam}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-heading text-2xl font-bold text-primary tabular-nums">
            {match.scoreHome ?? 0}
          </span>
          <span className="font-heading text-xl font-bold text-slate-400 mx-0.5">-</span>
          <span className="font-heading text-2xl font-bold text-primary tabular-nums">
            {match.scoreAway ?? 0}
          </span>
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm text-right">
            {match.awayTeam}
          </span>
          {match.awayLogo && (
            <img
              src={match.awayLogo}
              alt={match.awayTeam}
              className="w-6 h-6 object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
      </div>

      {/* Odds buttons */}
      {odds ? (
        <div className="grid grid-cols-3 gap-1.5" onClick={(e) => e.stopPropagation()}>
          {(['1', 'X', '2'] as const).map((sel, i) => {
            const odd = [odds.home, odds.draw, odds.away][i];
            const selected = isSelected('1X2', sel);
            return (
              <button
                key={sel}
                onClick={(e) => handleOddClick(e, '1X2', sel, odd)}
                className={`flex flex-col items-center py-1.5 px-2 rounded border text-xs font-semibold transition-colors
                  ${selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary'
                  }`}
              >
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mb-0.5">
                  {sel === 'X' ? 'Draw' : sel === '1' ? '1 (Home)' : '2 (Away)'}
                </span>
                <span className="tabular-nums">{odd > 0 ? odd.toFixed(2) : '—'}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-10 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center"
            >
              <span className="text-xs text-slate-400">—</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function LiveMatchesPage() {
  const [allMatches, setAllMatches]   = useState<EnrichedMatch[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [teamFilter, setTeamFilter]   = useState('');
  const genRef = useRef(0);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLive = useCallback(async (silent = false) => {
    const myGen = ++genRef.current;
    const alive = () => myGen === genRef.current;

    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // ── Step 1: fetch raw live matches ──────────────────────────────────
      // Try authenticated endpoint first, fall back to public.
      // Backend MatchService.getLiveMatches() queries DB for status="LIVE"
      // only — so this list is already filtered to genuinely live matches.
      let rawItems: Array<{ match: Match; odds: unknown[] }> = [];

      try {
        const res = await matchesApi.live();
        rawItems = unwrapLiveResponse(res);
      } catch {
        const res = await publicMatches.live();
        rawItems = unwrapLiveResponse(res);
      }

      if (!alive()) return;

      // ── Step 2: fetch odds for each match in parallel (best-effort) ─────
      // Backend MatchService.getMatchOdds() generates live odds on demand
      // (or returns cached live odds if available).  N+1 is acceptable here
      // because the /live list is typically small (< 20 matches).
      // If the response already contains odds (withAllOdds shape), we skip
      // the per-match call.
      const enriched: EnrichedMatch[] = await Promise.all(
        rawItems.map(async ({ match: m, odds: existingOdds }) => {
          // If odds came bundled with the response, use them directly
          if (existingOdds.length > 0) {
            const oddsMap = extractOddsMap(existingOdds, m.homeTeam ?? '', m.awayTeam ?? '');
            return { ...m, oddsMap };
          }

          // Otherwise fetch odds separately
          try {
            let oddsRaw: unknown[] = [];
            try {
              const oddsRes = await matchesApi.odds(m.id);
              oddsRaw = Array.isArray(oddsRes.data) ? oddsRes.data : [];
            } catch {
              const oddsRes = await publicMatches.odds(m.id) as unknown as { data?: unknown[] } | unknown[];
              oddsRaw = Array.isArray(oddsRes)
                ? (oddsRes as unknown[])
                : Array.isArray((oddsRes as { data?: unknown[] }).data)
                  ? (oddsRes as { data: unknown[] }).data
                  : [];
            }
            const oddsMap = extractOddsMap(oddsRaw, m.homeTeam ?? '', m.awayTeam ?? '');
            return { ...m, oddsMap };
          } catch {
            return { ...m, oddsMap: undefined };
          }
        }),
      );

      if (!alive()) return;

      // ── Step 3: deduplicate by id ───────────────────────────────────────
      const seen = new Set<string>();
      const deduped = enriched.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      // ── Step 4: keep only genuinely live matches ────────────────────────
      // Backend already filters to status="LIVE" in getLiveMatches(), but
      // the extended LIVE_STATUSES set handles any edge-case pass-throughs.
      const live = deduped.filter((m) => LIVE_STATUSES.has(m.status ?? ''));

      if (alive()) {
        setAllMatches(live);
        setLastUpdated(new Date());
      }
    } catch (err: unknown) {
      if (alive())
        setError(err instanceof Error ? err.message : 'Failed to load live matches');
    } finally {
      if (alive()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  // FIX: Both effects use the same genRef so unmounting the component
  // correctly cancels both the initial load and subsequent interval fetches.
  useEffect(() => {
    fetchLive();
    // Cancel initial load on unmount
    return () => { genRef.current++; };
  }, [fetchLive]);

  useEffect(() => {
    // Auto-refresh every 60s — only when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchLive(true);
    }, 60_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLive(true);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchLive]);

  // ── Filter + group ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!teamFilter.trim()) return allMatches;
    const lower = teamFilter.toLowerCase();
    return allMatches.filter(
      (m) =>
        (m.homeTeam ?? '').toLowerCase().includes(lower) ||
        (m.awayTeam ?? '').toLowerCase().includes(lower),
    );
  }, [allMatches, teamFilter]);

  const grouped    = useMemo(() => groupByLeague(filtered), [filtered]);
  const leagueKeys = useMemo(() => [...grouped.keys()].sort(), [grouped]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-4">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <LiveTvIcon className="text-green-500" fontSize="large" />
        <h1 className="font-heading text-2xl font-bold">Live Now</h1>

        {!loading && (
          <span className="badge-green">{filtered.length} events</span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchLive(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshIcon fontSize="small" className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            sx={{ fontSize: 18 }}
          />
          <input
            type="text"
            placeholder="Search team..."
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="card overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <MatchSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-16">
          <LiveTvIcon
            fontSize="large"
            className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
          />
          <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Failed to load live matches
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => fetchLive()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <LiveTvIcon fontSize="large" className="mx-auto mb-3" />
          <p className="font-semibold">
            {teamFilter
              ? `No live matches for "${teamFilter}"`
              : 'No live matches right now'}
          </p>
          <p className="text-sm mt-1">Check back soon — we refresh every minute.</p>
        </div>
      )}

      {/* Matches grouped by league */}
      {!loading && !error && leagueKeys.length > 0 && (
        <div className="space-y-4">
          {leagueKeys.map((league) => {
            const lm = grouped.get(league)!;
            return (
              <div key={league} className="card overflow-hidden">
                {/* League header */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  {lm[0]?.leagueLogo ? (
                    <img
                      src={lm[0].leagueLogo}
                      alt={league}
                      className="w-4 h-4 object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <SportsSoccerIcon className="text-slate-400" sx={{ fontSize: 14 }} />
                  )}
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    {league}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-green-500 font-semibold ml-1">
                    <FiberManualRecordIcon sx={{ fontSize: 7 }} className="animate-pulse" />
                    {lm.length} live
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 ml-2" />
                </div>

                {/* Match rows */}
                {lm.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}