import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import api from '../utils/api';
import type { Match } from '../utils/api';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SportTab = 'football' | 'basketball' | 'tennis' | 'baseball' | 'nfl' | 'mma';

interface OddsMap { home: number; draw: number; away: number; }
interface EnrichedMatch extends Match {
  oddsMap?: OddsMap;
  isAdmin?: boolean; // admin-created / operator game — odds locked when live
}
interface BetSlipEntry {
  matchId: string; matchName: string; market: string; selection: string; odd: number;
}

// ---------------------------------------------------------------------------
// Sport tab config
// ---------------------------------------------------------------------------
const SPORT_TABS: { key: SportTab; label: string; icon: React.ReactNode }[] = [
  { key: 'football',   label: 'Football',   icon: <SportsSoccerIcon sx={{ fontSize: 15 }} /> },
  { key: 'basketball', label: 'Basketball', icon: <SportsBasketballIcon sx={{ fontSize: 15 }} /> },
  { key: 'tennis',     label: 'Tennis',     icon: <SportsTennisIcon sx={{ fontSize: 15 }} /> },
  { key: 'baseball',   label: 'Baseball',   icon: <SportsBaseballIcon sx={{ fontSize: 15 }} /> },
  { key: 'nfl',        label: 'NFL',        icon: <SportsFootballIcon sx={{ fontSize: 15 }} /> },
  { key: 'mma',        label: 'MMA',        icon: <SportsMmaIcon sx={{ fontSize: 15 }} /> },
];

const TWO_WAY_ODDS_SPORTS = new Set<SportTab>(['baseball', 'basketball', 'nfl', 'mma']);

// ---------------------------------------------------------------------------
// Underground / lower-league fallback names per sport
// Used when no league name can be resolved — replaces the ugly "(no league)" label
// ---------------------------------------------------------------------------
const UNDERGROUND_LEAGUES: Record<SportTab, string[]> = {
  football: [
    'Non-League Division', 'Regional League', 'Amateur Cup', 'Sunday League Elite',
    'District Premier Division', 'County Cup', 'Grassroots Super League',
  ],
  basketball: [
    'Regional Basketball League', 'Community Hoops Division', 'Amateur Basketball Cup',
    'Local Pro-Am League', 'District Basketball Series',
  ],
  tennis: [
    'ITF Futures Circuit', 'Regional Tennis Tour', 'Amateur Open Series',
    'Club Championship', 'Local Pro Circuit',
  ],
  baseball: [
    'Independent Baseball League', 'Regional Diamond Series', 'Amateur Baseball Cup',
    'Community Diamond League', 'District Baseball Circuit',
  ],
  nfl: [
    'Regional Gridiron League', 'Semi-Pro Football Division', 'Amateur Gridiron Cup',
    'Community Football League', 'District Football Series',
  ],
  mma: [
    'Regional MMA Promotions', 'Amateur Combat Series', 'Underground Fight League',
    'Local MMA Circuit', 'Community Combat League',
  ],
};

/** Returns a consistent fallback league name for a match (deterministic from match id) */
function getFallbackLeagueName(sport: SportTab, matchId: string): string {
  const options = UNDERGROUND_LEAGUES[sport] ?? UNDERGROUND_LEAGUES.football;
  const idx = Math.abs([...matchId].reduce((acc, c) => acc + c.charCodeAt(0), 0)) % options.length;
  return options[idx];
}

// ---------------------------------------------------------------------------
// Status sets
// ---------------------------------------------------------------------------
const LIVE_STATUSES = new Set([
  'LIVE','live','IN_PLAY','in_play','inplay',
  'FIRST_HALF','first_half','1H','1h',
  'SECOND_HALF','second_half','2H','2h',
  'HALFTIME','halftime','HALF_TIME','half_time','HT','ht',
  'EXTRA_TIME','extra_time','ET','et','ET1','et1','ET2','et2',
  'PENALTIES','penalties','PEN','pen','P','SHOOTOUT','shootout',
  'BREAK','break','SUSPENDED','suspended','INTERRUPTED','interrupted',
  'STATUS_IN_PROGRESS','STATUS_HALFTIME','STATUS_END_PERIOD',
  'STATUS_OVERTIME','STATUS_FIRST_HALF','STATUS_SECOND_HALF',
]);

const FINISHED_STATUSES = new Set([
  'FINISHED','finished','FULL_TIME','full_time','FT','ft',
  'AWARDED','awarded','CANCELLED','cancelled','CANCELED','canceled',
  'POSTPONED','postponed','ABANDONED','abandoned','VOID','void',
  'AFTER_EXTRA_TIME','after_extra_time','AET','aet',
  'AFTER_PENALTIES','after_penalties','AP','ap',
  'ENDED','ended','COMPLETED','completed','COMPLETE','complete',
  'WALKOVER','walkover','RETIRED','retired','DELAYED','delayed',
  'COVERAGE_LOST','coverage_lost',
  'STATUS_FINAL','STATUS_FULL_TIME','STATUS_POSTPONED',
  'STATUS_CANCELED','STATUS_SUSPENDED','STATUS_ABANDONED',
  'STATUS_RAIN_DELAY',
]);

const HALFTIME_STATUSES  = new Set(['HALFTIME','halftime','HALF_TIME','half_time','HT','ht','STATUS_HALFTIME']);
const EXTRA_TIME_STATUSES = new Set(['EXTRA_TIME','extra_time','ET','et','ET1','et1','ET2','et2','STATUS_OVERTIME']);
const PENALTY_STATUSES   = new Set(['PENALTIES','penalties','PEN','pen','SHOOTOUT','shootout']);

// ---------------------------------------------------------------------------
// Team logo
// ---------------------------------------------------------------------------
function getTeamInitials(name: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function TeamLogo({ name, logo, size = 28 }: { name: string; logo?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = getTeamInitials(name);
  if (logo && !imgError) {
    return (
      <img src={logo} alt={name} width={size} height={size}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }}
      />
    );
  }
  const colors = [
    ['#1a3a5c','#4a9eff'],['#3a1a1a','#ff6b6b'],['#1a3a1a','#4caf50'],
    ['#3a2a1a','#ff9800'],['#2a1a3a','#9c27b0'],['#1a3a3a','#00bcd4'],
  ];
  const idx = (name.charCodeAt(0) ?? 0) % colors.length;
  const [bg, fg] = colors[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.35, fontWeight: 700,
      color: fg, letterSpacing: '-0.5px', fontFamily: 'monospace',
    }}>{initials}</div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inferLeagueFromTeams(homeTeam: string, awayTeam: string): string {
  const LEAGUE_TEAMS: Record<string, { leagueNames: string[]; teams: string[] }> = {
    premier_league: { leagueNames: ['Premier League'], teams: ['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Chelsea','Crystal Palace','Everton','Fulham','Ipswich Town','Leicester City','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Southampton','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers'] },
    la_liga:        { leagueNames: ['La Liga'],         teams: ['Athletic Club','Atlético Madrid','Barcelona','Celta Vigo','Espanyol','Getafe','Girona','Las Palmas','Leganés','Mallorca','Osasuna','Rayo Vallecano','Real Betis','Real Madrid','Real Sociedad','Real Valladolid','Sevilla','Valencia','Villarreal','Alavés'] },
    bundesliga:     { leagueNames: ['Bundesliga'],      teams: ['Augsburg','Bayer Leverkusen','Bayern Munich','Borussia Dortmund','Borussia Mönchengladbach','Eintracht Frankfurt','Freiburg','Heidenheim','Hoffenheim','Holstein Kiel','Mainz 05','RB Leipzig','St. Pauli','Stuttgart','Union Berlin','Werder Bremen','Wolfsburg'] },
    serie_a:        { leagueNames: ['Serie A'],         teams: ['AC Milan','Atalanta','Bologna','Cagliari','Como','Empoli','Fiorentina','Genoa','Hellas Verona','Inter Milan','Juventus','Lazio','Lecce','Monza','Napoli','Parma','Roma','Torino','Udinese','Venezia'] },
    ligue_1:        { leagueNames: ['Ligue 1'],         teams: ['Angers','Auxerre','Brest','Le Havre','Lens','Lille','Lyon','Marseille','Monaco','Montpellier','Nantes','Nice','Paris Saint-Germain','Reims','Rennes','Saint-Étienne','Strasbourg','Toulouse'] },
  };
  const h = homeTeam.toLowerCase();
  const a = awayTeam.toLowerCase();
  for (const { leagueNames, teams } of Object.values(LEAGUE_TEAMS)) {
    const teamSet = new Set(teams.map((t) => t.toLowerCase()));
    if (teamSet.has(h) || teamSet.has(a)) return leagueNames[0];
  }
  return '';
}

// ---------------------------------------------------------------------------
// normalizeMatch
// ---------------------------------------------------------------------------
function looksLikeFixtureName(s: string): boolean {
  return / at /i.test(s) || / vs\.? /i.test(s) || / @ /i.test(s);
}

function normalizeMatch(raw: unknown): Match | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r.matchId ?? r.match_id ?? r.fixtureId ?? r.fixture_id ?? '');
  if (!id || id === 'undefined') return null;

  let competitorHome: Record<string, unknown> | null = null;
  let competitorAway: Record<string, unknown> | null = null;
  const competitorsArr  = Array.isArray(r.competitors)  ? r.competitors  as Record<string, unknown>[] : null;
  const competitionsArr = Array.isArray(r.competitions) ? r.competitions as Record<string, unknown>[] : null;
  const firstComp = competitionsArr?.[0] as Record<string, unknown> | undefined;
  const nestedCompetitors = Array.isArray(firstComp?.competitors)
    ? firstComp!.competitors as Record<string, unknown>[] : null;

  const resolveCompetitors = (arr: Record<string, unknown>[]) => {
    for (const c of arr) {
      const side    = String(c.homeAway ?? c.type ?? '').toLowerCase();
      const teamObj = (c.team && typeof c.team === 'object') ? c.team as Record<string, unknown> : c;
      if (side === 'home') competitorHome = teamObj;
      else if (side === 'away') competitorAway = teamObj;
    }
    if (!competitorHome && !competitorAway && arr.length >= 2) {
      const t0 = arr[0]; const t1 = arr[1];
      competitorHome = (t0.team && typeof t0.team === 'object') ? t0.team as Record<string, unknown> : t0;
      competitorAway = (t1.team && typeof t1.team === 'object') ? t1.team as Record<string, unknown> : t1;
    }
  };

  if (competitorsArr) resolveCompetitors(competitorsArr);
  if (!competitorHome && !competitorAway && nestedCompetitors) resolveCompetitors(nestedCompetitors);

  const homeObj = competitorHome ?? ((r.home && typeof r.home === 'object') ? r.home as Record<string, unknown> : null);
  const awayObj = competitorAway ?? ((r.away && typeof r.away === 'object') ? r.away as Record<string, unknown> : null);

  let homeTeam = String(r.homeTeam ?? r.home_team ?? r.homeName ?? r.home_name ?? homeObj?.name ?? homeObj?.displayName ?? homeObj?.teamName ?? '').trim();
  let awayTeam = String(r.awayTeam ?? r.away_team ?? r.awayName ?? r.away_name ?? awayObj?.name ?? awayObj?.displayName ?? awayObj?.teamName ?? '').trim();

  if ((!homeTeam || !awayTeam) && typeof r.name === 'string') {
    const name = r.name as string;
    const atMatch = name.match(/^(.+?)\s+at\s+(.+)$/i);
    const vsMatch = name.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    if (atMatch)      { if (!awayTeam) awayTeam = atMatch[1].trim(); if (!homeTeam) homeTeam = atMatch[2].trim(); }
    else if (vsMatch) { if (!homeTeam) homeTeam = vsMatch[1].trim(); if (!awayTeam) awayTeam = vsMatch[2].trim(); }
  }

  if (!homeTeam && !awayTeam) return null;

  const homeLogo = String(homeObj?.logo ?? homeObj?.logoUrl ?? homeObj?.image ?? homeObj?.imageUrl ?? r.homeLogo ?? r.home_logo ?? r.homeImage ?? '');
  const awayLogo = String(awayObj?.logo ?? awayObj?.logoUrl ?? awayObj?.image ?? awayObj?.imageUrl ?? r.awayLogo ?? r.away_logo ?? r.awayImage ?? '');

  let leagueName = '';
  let leagueLogo = '';

  if (firstComp) {
    const compLeague = firstComp.league ?? firstComp.season;
    if (compLeague && typeof compLeague === 'object') {
      const lo = compLeague as Record<string, unknown>;
      leagueName = String(lo.name ?? lo.displayName ?? lo.slug ?? '');
    }
  }

  if (!leagueName) {
    const rawLeague = r.league ?? r.leagueName ?? r.competition ?? r.league_name ?? r.competitionName;
    if (rawLeague && typeof rawLeague === 'object') {
      const lo = rawLeague as Record<string, unknown>;
      leagueName = String(lo.name ?? lo.displayName ?? lo.shortName ?? lo.abbreviation ?? '');
      leagueLogo = String(lo.logo ?? lo.logoUrl ?? '');
      if (Array.isArray(lo.logos) && lo.logos.length > 0) {
        const first = lo.logos[0] as Record<string, unknown>;
        leagueLogo = String(first.href ?? first.url ?? leagueLogo);
      }
    } else if (rawLeague) {
      const candidate = String(rawLeague);
      leagueName = looksLikeFixtureName(candidate) ? '' : candidate;
    }
  }

  if (!leagueName && firstComp) {
    const season = firstComp.season as Record<string, unknown> | undefined;
    if (season?.slug) leagueName = String(season.slug);
  }
  if (!leagueLogo) leagueLogo = String(r.leagueLogo ?? r.league_logo ?? r.competitionLogo ?? r.competition_logo ?? '');
  if (!leagueName && homeTeam && awayTeam) leagueName = inferLeagueFromTeams(homeTeam, awayTeam);

  let status = '';
  const rawStatus = (firstComp?.status) ?? r.status ?? r.matchStatus ?? r.match_status ?? r.state;
  if (rawStatus && typeof rawStatus === 'object') {
    const so = rawStatus as Record<string, unknown>;
    const typeObj = so.type as Record<string, unknown> | undefined;
    status = String(typeObj?.name ?? typeObj?.description ?? so.name ?? so.description ?? so.state ?? '');
  } else {
    status = String(rawStatus ?? '');
  }

  let scoreHome: number | undefined;
  let scoreAway: number | undefined;
  const rawScoreHome = r.scoreHome ?? r.score_home ?? r.homeScore ?? r.home_score;
  const rawScoreAway = r.scoreAway ?? r.score_away ?? r.awayScore ?? r.away_score;
  if (rawScoreHome != null) scoreHome = Number(rawScoreHome);
  else if (homeObj?.score != null) scoreHome = Number(homeObj.score);
  if (rawScoreAway != null) scoreAway = Number(rawScoreAway);
  else if (awayObj?.score != null) scoreAway = Number(awayObj.score);

  const scoreCompetitors = competitorsArr ?? nestedCompetitors ?? [];
  if (scoreHome == null || scoreAway == null) {
    for (const c of scoreCompetitors) {
      const side = String(c.homeAway ?? '').toLowerCase();
      const s = c.score != null ? Number(c.score) : undefined;
      if (side === 'home' && s != null && scoreHome == null) scoreHome = s;
      if (side === 'away' && s != null && scoreAway == null) scoreAway = s;
    }
  }

  const kickoffAt = String(r.kickoffAt ?? r.kickoff_at ?? r.startTime ?? r.start_time ?? r.date ?? r.scheduledAt ?? r.datetime ?? firstComp?.date ?? '');

  let minutePlayed: number | undefined;
  if (r.minutePlayed != null) minutePlayed = Number(r.minutePlayed);
  else if (r.minute_played != null) minutePlayed = Number(r.minute_played);
  else if (rawStatus && typeof rawStatus === 'object') {
    const so = rawStatus as Record<string, unknown>;
    const clock = so.displayClock ?? so.clock;
    if (clock) { const mins = parseInt(String(clock), 10); if (!isNaN(mins)) minutePlayed = mins; }
  }

  // Detect admin/operator-created game — flagged via `isAdmin`, `source === 'ADMIN'`, or `adminCreated`
  const isAdmin = Boolean(
    r.isAdmin ?? r.is_admin ?? r.adminCreated ?? r.admin_created ?? (r.source === 'ADMIN')
  );

  return {
    id, source: (r.source as Match['source']) ?? 'ESPN',
    homeTeam, awayTeam, league: leagueName, status, kickoffAt,
    scoreHome, scoreAway, homeLogo, awayLogo, leagueLogo, minutePlayed,
    sport: String(r.sport ?? 'FOOTBALL'),
    createdAt: String(r.createdAt ?? r.created_at ?? ''),
    isAdmin,
  } as Match & { isAdmin: boolean };
}

// ---------------------------------------------------------------------------
// safeUnwrapList / unwrapWithAllOdds / safeUnwrapOddsArray
// ---------------------------------------------------------------------------
function safeUnwrapList(raw: unknown): Match[] {
  if (!raw) return [];
  const normalize = (arr: unknown[]): Match[] => arr.map(normalizeMatch).filter((m): m is Match => m !== null);
  if (Array.isArray(raw)) return normalize(raw);
  const obj = raw as Record<string, unknown>;
  if (!obj.success) return [];
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return normalize(data);
  if (typeof data === 'object') {
    const all: unknown[] = [];
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val)) all.push(...val);
    }
    return normalize(all);
  }
  return [];
}

function unwrapWithAllOdds(raw: unknown): Array<{ match: Match; odds: unknown[] }> {
  if (!raw) return [];
  const obj = raw as Record<string, unknown>;
  if (!obj.success) return [];
  if (!obj.data) return [];
  const items: Array<{ match: Match; odds: unknown[] }> = [];
  const processItem = (item: unknown) => {
    const i = item as Record<string, unknown>;
    const match = normalizeMatch(i.match ?? i);
    if (!match?.id) return;
    const odds: unknown[] =
      Array.isArray(i.match_result) ? i.match_result :
      Array.isArray(i.odds)         ? i.odds :
      Array.isArray(i.markets)      ? i.markets : [];
    items.push({ match, odds });
  };
  const data = obj.data;
  if (Array.isArray(data)) {
    data.forEach(processItem);
  } else if (data && typeof data === 'object') {
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val)) val.forEach(processItem);
    }
  }
  return items;
}

function safeUnwrapOddsArray(raw: unknown): unknown[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  if (!obj.success) return [];
  const data = obj.data;
  if (Array.isArray(data)) return data;
  return [];
}

// ---------------------------------------------------------------------------
// extractOddsMap
// ---------------------------------------------------------------------------
function extractOddsMap(oddsArray: unknown[], homeTeam: string, awayTeam: string): OddsMap | undefined {
  if (!Array.isArray(oddsArray) || oddsArray.length === 0) return undefined;
  const pool = oddsArray as Array<Record<string, unknown>>;
  const parseOdd = (o: Record<string, unknown>): number =>
    parseFloat(String(o.odd ?? o.value ?? o.odds ?? o.price ?? o.decimal ?? o.americanOdds ?? '0'));
  const norm = (s: string) => s.toLowerCase().trim();
  const normHome = norm(homeTeam);
  const normAway = norm(awayTeam);
  const matchesTeam = (sel: string, teamNorm: string) => {
    const s = norm(sel);
    return s === teamNorm || s.includes(teamNorm) || teamNorm.includes(s);
  };
  let home = 0, draw = 0, away = 0;
  for (const o of pool) {
    const sel = norm(String(o.selection ?? o.outcome ?? o.name ?? o.label ?? o.type ?? ''));
    const val = parseOdd(o);
    if (val <= 1 || val > 200) continue;
    if (sel === 'home')                    { if (home === 0) home = val; }
    else if (sel === 'away')               { if (away === 0) away = val; }
    else if (sel === 'draw' || sel === 'x'){ if (draw === 0) draw = val; }
    else if (matchesTeam(sel, normHome))   { if (home === 0) home = val; }
    else if (matchesTeam(sel, normAway))   { if (away === 0) away = val; }
  }
  if (home === 0 && draw === 0 && away === 0) {
    const vals = pool.map(parseOdd).filter((v) => v > 1 && v < 50);
    if (vals.length >= 2) return vals.length >= 3
      ? { home: vals[0], draw: vals[1], away: vals[2] }
      : { home: vals[0], draw: 0, away: vals[1] };
    return undefined;
  }
  return { home, draw, away };
}

function dedup(matches: Match[]): EnrichedMatch[] {
  const seen = new Set<string>();
  return matches
    .filter(({ id }) => { if (seen.has(id)) return false; seen.add(id); return true; })
    .map((m) => ({ ...m }));
}

function mergeOddsById(oddsById: Map<string, unknown[]>, entries: Array<{ match: Match; odds: unknown[] }>): void {
  for (const { match, odds } of entries) {
    if (odds.length === 0) continue;
    const existing = oddsById.get(match.id);
    if (!existing || odds.length > existing.length) oddsById.set(match.id, odds);
  }
}

// ---------------------------------------------------------------------------
// fetchAllFootballMatches
// ---------------------------------------------------------------------------
async function fetchAllFootballMatches(): Promise<EnrichedMatch[]> {
  const [
    withOddsRes, liveRes, upcomingRes, todayRes, resultsRes,
    livescoreLiveRes, livescoreTodayRes, allCupsUpcomingRes, allCupsTodayRes, allCupsLive,
  ] = await Promise.allSettled([
    api.publicFootball.withAllOdds(),
    api.publicFootball.live(),
    api.publicFootball.upcoming(),
    api.publicFootball.today(),
    api.publicFootball.results(50),
    api.publicFootballLivescore.live(),
    api.publicFootballLivescore.today(),
    api.publicFootball.allCupsUpcoming(),
    api.publicFootball.allCupsToday(),
    api.publicFootball.allCupsLive(),
  ]);

  const oddsById      = new Map<string, unknown[]>();
  const withOddsItems     = withOddsRes.status  === 'fulfilled' ? unwrapWithAllOdds(withOddsRes.value)  : [];
  const fromUpcomingItems = upcomingRes.status  === 'fulfilled' ? unwrapWithAllOdds(upcomingRes.value)  : [];
  const fromTodayItems    = todayRes.status     === 'fulfilled' ? unwrapWithAllOdds(todayRes.value)     : [];

  mergeOddsById(oddsById, withOddsItems);
  mergeOddsById(oddsById, fromUpcomingItems);
  mergeOddsById(oddsById, fromTodayItems);
  if (liveRes.status === 'fulfilled') mergeOddsById(oddsById, unwrapWithAllOdds(liveRes.value));

  const oddsByFingerprint = new Map<string, unknown[]>();
  const makeFingerprint = (home: string, away: string, kickoff: string) =>
    `${home.toLowerCase().trim()}|${away.toLowerCase().trim()}|${kickoff.slice(0, 10)}`;

  for (const [matchId, odds] of oddsById.entries()) {
    const sourceMatch = [...withOddsItems, ...fromUpcomingItems, ...fromTodayItems]
      .find(({ match }) => match.id === matchId)?.match;
    if (sourceMatch?.homeTeam && sourceMatch?.awayTeam && sourceMatch?.kickoffAt) {
      const fp = makeFingerprint(sourceMatch.homeTeam, sourceMatch.awayTeam, sourceMatch.kickoffAt);
      if (!oddsByFingerprint.has(fp)) oddsByFingerprint.set(fp, odds);
    }
  }

  const fromWithOdds = withOddsItems.map(({ match }) => match);
  const fromLive     = liveRes.status    === 'fulfilled' ? safeUnwrapList(liveRes.value)             : [];
  const fromUpcoming = fromUpcomingItems.map(({ match }) => match);
  const fromToday    = fromTodayItems.map(({ match }) => match);
  const fromResults  = resultsRes.status === 'fulfilled' ? safeUnwrapList(resultsRes.value)          : [];
  const fromLsLive          = livescoreLiveRes.status   === 'fulfilled' ? safeUnwrapList(livescoreLiveRes.value)   : [];
  const fromLsToday         = livescoreTodayRes.status  === 'fulfilled' ? safeUnwrapList(livescoreTodayRes.value)  : [];
  const fromAllCupsUpcoming = allCupsUpcomingRes.status === 'fulfilled' ? safeUnwrapList(allCupsUpcomingRes.value) : [];
  const fromAllCupsToday    = allCupsTodayRes.status    === 'fulfilled' ? safeUnwrapList(allCupsTodayRes.value)    : [];
  const fromAllCupsLive     = allCupsLive.status        === 'fulfilled' ? safeUnwrapList(allCupsLive.value)        : [];

  const allMatches: Match[] = [
    ...fromWithOdds, ...fromLive, ...fromUpcoming, ...fromToday, ...fromResults,
    ...fromAllCupsUpcoming, ...fromAllCupsToday, ...fromAllCupsLive,
    ...fromLsLive, ...fromLsToday,
  ];

  const seenIds = new Set<string>();
  const seenFps = new Set<string>();
  const dedupedMatches = allMatches.filter((m) => {
    if (!m?.id || seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    const fp = `${(m.homeTeam ?? '').toLowerCase()}|${(m.awayTeam ?? '').toLowerCase()}|${(m.kickoffAt ?? '').slice(0, 16)}`;
    if (fp !== '||' && seenFps.has(fp)) return false;
    if (fp !== '||') seenFps.add(fp);
    return true;
  });

  const enrichedPass1 = dedupedMatches.map((match) => {
    let odds = oddsById.get(match.id) ?? [];
    if (odds.length === 0 && match.homeTeam && match.awayTeam && match.kickoffAt) {
      const fp = makeFingerprint(match.homeTeam, match.awayTeam, match.kickoffAt);
      const fpOdds = oddsByFingerprint.get(fp);
      if (fpOdds && fpOdds.length > 0) odds = fpOdds;
    }
    const oddsMap = extractOddsMap(odds, match.homeTeam ?? '', match.awayTeam ?? '');
    return { ...match, oddsMap, _needsOdds: !oddsMap && !FINISHED_STATUSES.has(match.status ?? '') };
  });

  const needsIndividualOdds = enrichedPass1.filter((m) => m._needsOdds).slice(0, 30);
  const individualOddsResults = await Promise.allSettled(
    needsIndividualOdds.map((m) =>
      api.publicFootball.odds(m.id)
        .then((r) => ({ matchId: m.id, data: r }))
        .catch(() => ({ matchId: m.id, data: null }))
    )
  );

  const individualOddsMap = new Map<string, unknown[]>();
  individualOddsResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.data) {
      const arr = safeUnwrapOddsArray(result.value.data);
      if (arr.length > 0) individualOddsMap.set(result.value.matchId, arr);
    }
  });

  return enrichedPass1.map(({ _needsOdds, ...match }) => {
    if (!_needsOdds || match.oddsMap) return match as EnrichedMatch;
    const indOdds = individualOddsMap.get(match.id) ?? [];
    if (indOdds.length === 0) return match as EnrichedMatch;
    return { ...match, oddsMap: extractOddsMap(indOdds, match.homeTeam ?? '', match.awayTeam ?? '') } as EnrichedMatch;
  });
}

// ---------------------------------------------------------------------------
// fetchBasketballMatches / Tennis / Baseball / NFL / MMA
// ---------------------------------------------------------------------------
async function fetchBasketballMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicBasketball.live(), api.publicBasketball.upcoming(), api.publicBasketball.results(),
  ]);
  const allItems = [
    ...(live.status     === 'fulfilled' ? unwrapWithAllOdds(live.value)     : []),
    ...(upcoming.status === 'fulfilled' ? unwrapWithAllOdds(upcoming.value) : []),
    ...(results.status  === 'fulfilled' ? unwrapWithAllOdds(results.value)  : []),
  ];
  const seen = new Set<string>();
  return allItems
    .filter(({ match }) => { if (!match?.id || seen.has(match.id)) return false; seen.add(match.id); return true; })
    .map(({ match, odds }) => ({ ...match, oddsMap: extractOddsMap(odds, match.homeTeam ?? '', match.awayTeam ?? '') }));
}

async function fetchTennisMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicTennis.live(), api.publicTennis.upcoming(), api.publicTennis.results(),
  ]);
  return dedup([
    ...(live.status     === 'fulfilled' ? safeUnwrapList(live.value)     : []),
    ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []),
    ...(results.status  === 'fulfilled' ? safeUnwrapList(results.value)  : []),
  ]);
}

async function fetchBaseballMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, today] = await Promise.allSettled([
    api.publicBaseball.live(), api.publicBaseball.upcoming(), api.publicBaseball.today(),
  ]);
  const allItems = [
    ...(live.status     === 'fulfilled' ? unwrapWithAllOdds(live.value)     : []),
    ...(upcoming.status === 'fulfilled' ? unwrapWithAllOdds(upcoming.value) : []),
    ...(today.status    === 'fulfilled' ? unwrapWithAllOdds(today.value)    : []),
  ];
  const seen = new Set<string>();
  const deduped = allItems.filter(({ match }) => {
    if (!match?.id || seen.has(match.id)) return false; seen.add(match.id); return true;
  });
  const needsOdds = deduped.filter(({ odds }) => odds.length === 0).slice(0, 20);
  const oddsResponses = await Promise.allSettled(
    needsOdds.map(({ match }) => api.publicBaseball.odds(match.id).catch(() => null))
  );
  const oddsById = new Map<string, unknown[]>();
  needsOdds.forEach(({ match }, idx) => {
    const result = oddsResponses[idx];
    if (result.status === 'fulfilled' && result.value != null) {
      const parsed = safeUnwrapOddsArray(result.value);
      if (parsed.length > 0) oddsById.set(match.id, parsed);
    }
  });
  return deduped.map(({ match, odds }) => ({
    ...match,
    oddsMap: extractOddsMap(odds.length > 0 ? odds : (oddsById.get(match.id) ?? []), match.homeTeam ?? '', match.awayTeam ?? ''),
  }));
}

async function fetchNflMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicNfl.live(), api.publicNfl.upcoming(), api.publicNfl.results(),
  ]);
  return dedup([
    ...(live.status     === 'fulfilled' ? safeUnwrapList(live.value)     : []),
    ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []),
    ...(results.status  === 'fulfilled' ? safeUnwrapList(results.value)  : []),
  ]);
}

async function fetchMmaMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicMma.live(), api.publicMma.upcoming(), api.publicMma.results(),
  ]);
  return dedup([
    ...(live.status     === 'fulfilled' ? safeUnwrapList(live.value)     : []),
    ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []),
    ...(results.status  === 'fulfilled' ? safeUnwrapList(results.value)  : []),
  ]);
}

async function fetchAllForSport(sport: SportTab): Promise<EnrichedMatch[]> {
  switch (sport) {
    case 'football':   return fetchAllFootballMatches();
    case 'basketball': return fetchBasketballMatches();
    case 'tennis':     return fetchTennisMatches();
    case 'baseball':   return fetchBaseballMatches();
    case 'nfl':        return fetchNflMatches();
    case 'mma':        return fetchMmaMatches();
    default:           return [];
  }
}

// ---------------------------------------------------------------------------
// useLiveTimer
// ---------------------------------------------------------------------------
function useLiveTimer(match: EnrichedMatch): string {
  const status = match.status ?? '';
  const isLive = LIVE_STATUSES.has(status);

  const computeDisplay = useCallback((): string => {
    if (!isLive) return '';
    if (HALFTIME_STATUSES.has(status))  return 'HT';
    if (PENALTY_STATUSES.has(status))   return 'PEN';
    if (match.minutePlayed != null && match.minutePlayed > 0) {
      if (EXTRA_TIME_STATUSES.has(status)) return `${Math.min(match.minutePlayed, 120)}' ET`;
      return `${Math.min(match.minutePlayed, 90)}'`;
    }
    if (match.kickoffAt) {
      const elapsedMs = Date.now() - new Date(match.kickoffAt).getTime();
      if (elapsedMs >= 0) {
        const mins = Math.floor(elapsedMs / 60_000);
        if (EXTRA_TIME_STATUSES.has(status)) return `${Math.min(mins, 120)}' ET`;
        return `${Math.min(mins, 90)}'`;
      }
    }
    return 'LIVE';
  }, [isLive, status, match.minutePlayed, match.kickoffAt]);

  const [display, setDisplay] = useState<string>(computeDisplay);
  useEffect(() => {
    if (!isLive) return;
    setDisplay(computeDisplay());
    const id = setInterval(() => setDisplay(computeDisplay()), 15_000);
    return () => clearInterval(id);
  }, [isLive, computeDisplay]);

  return display;
}

// ---------------------------------------------------------------------------
// LiveTimerBadge
// ---------------------------------------------------------------------------
function LiveTimerBadge({ match }: { match: EnrichedMatch }) {
  const timerStr = useLiveTimer(match);
  return (
    <span className="match-status-badge live">
      <FiberManualRecordIcon sx={{ fontSize: 7 }} className="live-dot" />
      {timerStr || 'LIVE'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AdminLockedBadge — shown on admin game odds buttons
// ---------------------------------------------------------------------------
function AdminLockedBadge() {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '6px 10px', borderRadius: 8,
        border: '1px solid rgba(255,170,0,0.3)',
        background: 'rgba(255,170,0,0.08)',
        color: 'rgba(255,170,0,0.85)',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
        width: '100%',
      }}
    >
      <LockIcon sx={{ fontSize: 11 }} />
      Odds locked
    </div>
  );
}

// ---------------------------------------------------------------------------
// OddsButton + OddsRow
// — Odds are only locked when match.isAdmin === true AND match is live
// ---------------------------------------------------------------------------
function OddsButton({ subLabel, value, selected, locked, onClick }: {
  subLabel: string; value: number; selected: boolean; locked: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!locked) onClick(); }}
      disabled={locked}
      className={`match-odds-btn${locked ? ' locked' : ''}${selected ? ' selected' : ''}`}
    >
      <span className="match-odds-label">{subLabel}</span>
      <span className="match-odds-value">{locked ? '🔒' : value > 1 ? value.toFixed(2) : '—'}</span>
    </button>
  );
}

function OddsRow({ odds, selections, oddsValues, matchId, matchName, isAdminLive, betSlip, addToBetSlip, showToast }: {
  odds: OddsMap | undefined;
  selections: { key: string; sub: string }[];
  oddsValues: number[];
  matchId: string;
  matchName: string;
  /** true only when isAdmin=true AND status is live — locks all buttons */
  isAdminLive: boolean;
  betSlip: BetSlipEntry[];
  addToBetSlip: (entry: BetSlipEntry) => void;
  showToast: (message: string, type: string) => void;
}) {
  const isSelected = (sel: string) =>
    betSlip.some((s) => s.matchId === matchId && s.market === '1X2' && s.selection === sel);

  // Admin live games: show a single locked banner instead of individual buttons
  if (isAdminLive) {
    return (
      <div className="match-odds-row" style={{ padding: '4px 0' }}>
        <AdminLockedBadge />
      </div>
    );
  }

  if (!odds) {
    return (
      <div className="match-odds-row">
        {selections.map(({ key, sub }) => (
          <div key={key} className="match-odds-btn empty">
            <span className="match-odds-label">{sub}</span>
            <span className="match-odds-value">—</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="match-odds-row">
      {selections.map(({ key, sub }, idx) => (
        <OddsButton
          key={key} subLabel={sub} value={oddsValues[idx]} selected={isSelected(key)} locked={false}
          onClick={() => {
            addToBetSlip({ matchId, matchName, market: '1X2', selection: key, odd: oddsValues[idx] });
            showToast('Added to bet slip', 'success');
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchCard
// ---------------------------------------------------------------------------
function MatchCard({ match, showDraw = true }: { match: EnrichedMatch; showDraw?: boolean }) {
  const navigate = useNavigate();
  const { betSlip, addToBetSlip, showToast } = useAppStore() as {
    betSlip: BetSlipEntry[];
    addToBetSlip: (entry: BetSlipEntry) => void;
    showToast: (message: string, type: string) => void;
  };

  const odds = match.oddsMap;
  const selections = showDraw
    ? [{ key: '1', sub: '1' }, { key: 'X', sub: 'X' }, { key: '2', sub: '2' }]
    : [{ key: '1', sub: 'H' }, { key: '2', sub: 'A' }];
  const oddsValues = showDraw
    ? [odds?.home ?? 0, odds?.draw ?? 0, odds?.away ?? 0]
    : [odds?.home ?? 0, odds?.away ?? 0];

  // Lock odds only for admin games while they are live
  const isAdminLive = Boolean(match.isAdmin) && LIVE_STATUSES.has(match.status ?? '');

  return (
    <div
      className="match-card live"
      onClick={() => match.id && navigate(`/match/${match.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="match-card-topbar">
        <LiveTimerBadge match={match} />
        {/* Admin badge */}
        {match.isAdmin && (
          <span style={{
            marginLeft: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
            padding: '1px 5px', borderRadius: 4,
            background: 'rgba(255,170,0,0.15)', color: 'rgba(255,170,0,0.9)',
            textTransform: 'uppercase',
          }}>
            Admin
          </span>
        )}
        <ChevronRightIcon sx={{ fontSize: 14, ml: 'auto', color: 'var(--text-muted)', opacity: 0.5 }} />
      </div>

      <div className="match-card-body">
        <div className="match-team-row">
          <TeamLogo name={match.homeTeam ?? ''} logo={match.homeLogo} size={26} />
          <span className="match-team-name">{match.homeTeam}</span>
          <span className="match-score">{match.scoreHome ?? 0}</span>
        </div>
        <div className="match-team-row">
          <TeamLogo name={match.awayTeam ?? ''} logo={match.awayLogo} size={26} />
          <span className="match-team-name">{match.awayTeam}</span>
          <span className="match-score">{match.scoreAway ?? 0}</span>
        </div>
      </div>

      <OddsRow
        odds={odds} selections={selections} oddsValues={oddsValues}
        matchId={match.id} matchName={`${match.homeTeam} vs ${match.awayTeam}`}
        isAdminLive={isAdminLive}
        betSlip={betSlip} addToBetSlip={addToBetSlip} showToast={showToast}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonCard
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="match-card animate-pulse" style={{ pointerEvents: 'none' }}>
      <div className="match-card-topbar">
        <div className="skeleton-block" style={{ width: 48, height: 14, borderRadius: 6 }} />
      </div>
      <div className="match-card-body">
        {[0, 1].map((row) => (
          <div key={row} className="match-team-row" style={{ marginTop: row ? 6 : 0 }}>
            <div className="skeleton-block" style={{ width: 26, height: 26, borderRadius: 4, flexShrink: 0 }} />
            <div className="skeleton-block" style={{ width: '50%', height: 14, borderRadius: 4, marginLeft: 8 }} />
            <div className="skeleton-block" style={{ width: 20, height: 14, borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div className="match-odds-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="match-odds-btn empty">
            <div className="skeleton-block" style={{ width: 16, height: 10, borderRadius: 3 }} />
            <div className="skeleton-block" style={{ width: 28, height: 13, borderRadius: 3, marginTop: 3 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// League sort + grouping
// — "(no league)" replaced with deterministic underground league name
// ---------------------------------------------------------------------------
const TOP_6 = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];
const CUPS  = new Set(['FA Cup','EFL Cup / Carabao Cup','Copa del Rey','DFB Pokal','Coppa Italia','Coupe de France','UEFA Champions League','UEFA Europa League','UEFA Conference League','UEFA Nations League']);

function leagueSortKey(league: string): string {
  if (!league) return '99_zzz';
  const i = TOP_6.indexOf(league);
  if (i !== -1) return `00_${String(i).padStart(2, '0')}_${league}`;
  if (CUPS.has(league)) return `01_${league.toLowerCase()}`;
  return `02_${league.toLowerCase()}`;
}

/**
 * Groups matches by league name.
 * Matches with no resolved league get a deterministic underground league name
 * instead of the ugly "(no league)" placeholder.
 */
function groupByLeague(
  matches: EnrichedMatch[],
  sport: SportTab,
): Map<string, EnrichedMatch[]> {
  const map = new Map<string, EnrichedMatch[]>();
  for (const m of matches) {
    // Use real league name if present; otherwise derive a fallback from sport + match id
    const key = m.league?.trim()
      ? m.league.trim()
      : getFallbackLeagueName(sport, m.id);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return new Map([...map.entries()].sort(([a], [b]) => leagueSortKey(a).localeCompare(leagueSortKey(b))));
}

// ---------------------------------------------------------------------------
// Main LiveMatchesPage
// ---------------------------------------------------------------------------
export default function LiveMatchesPage() {
  const [activeSport, setActiveSport] = useState<SportTab>('football');
  const [liveMatches, setLiveMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [teamFilter, setTeamFilter]   = useState('');
  const [sportCounts, setSportCounts] = useState<Partial<Record<SportTab, number>>>({});
  const sportGenRefs = useRef<Record<SportTab, number>>({ football: 0, basketball: 0, tennis: 0, baseball: 0, nfl: 0, mma: 0 });

  const fetchLive = useCallback(async (sport: SportTab, silent = false) => {
    const gen = ++sportGenRefs.current[sport];
    const alive = () => sportGenRefs.current[sport] === gen;

    if (!silent) { setLoading(true); setLiveMatches([]); setError(null); }
    else setRefreshing(true);

    try {
      const all  = await fetchAllForSport(sport);
      if (!alive()) return;
      const live = all.filter((m) => LIVE_STATUSES.has(m.status ?? ''));
      setLiveMatches(live);
      setLastUpdated(new Date());
      setSportCounts((prev) => ({ ...prev, [sport]: live.length }));
    } catch (err) {
      if (alive() && !silent) setError((err as Error).message ?? 'Failed to load live matches');
    } finally {
      if (alive()) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  const handleSportChange = (sport: SportTab) => {
    setActiveSport(sport);
    setTeamFilter('');
    (Object.keys(sportGenRefs.current) as SportTab[]).forEach((s) => { if (s !== sport) sportGenRefs.current[s]++; });
    fetchLive(sport, false);
  };

  useEffect(() => {
    fetchLive(activeSport, false);
    return () => { (Object.keys(sportGenRefs.current) as SportTab[]).forEach((s) => sportGenRefs.current[s]++); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') fetchLive(activeSport, true); };
    const interval = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [activeSport, fetchLive]);

  const filtered = useMemo(() => {
    if (!teamFilter.trim()) return liveMatches;
    const lower = teamFilter.toLowerCase();
    return liveMatches.filter(
      (m) => (m.homeTeam ?? '').toLowerCase().includes(lower) || (m.awayTeam ?? '').toLowerCase().includes(lower),
    );
  }, [liveMatches, teamFilter]);

  // Pass activeSport so groupByLeague can resolve fallback league names per sport
  const grouped  = useMemo(() => groupByLeague(filtered, activeSport), [filtered, activeSport]);
  const showDraw = !TWO_WAY_ODDS_SPORTS.has(activeSport);

  const sportEmoji: Record<SportTab, string> = {
    football: '⚽', basketball: '🏀', tennis: '🎾', baseball: '⚾', nfl: '🏈', mma: '🥊',
  };

  return (
    <div className="px-4 mt-4">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <LiveTvIcon sx={{ fontSize: 18, color: 'var(--live, #22c55e)' }} />
        <h1 className="section-title-text" style={{ fontSize: 16 }}>Live Now</h1>
        {!loading && filtered.length > 0 && (
          <span className="match-status-badge live">
            <FiberManualRecordIcon sx={{ fontSize: 7 }} className="live-dot" />
            {filtered.length}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdated && (
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchLive(activeSport, true)}
            disabled={refreshing}
            className="flex items-center gap-1 text-xs font-medium disabled:opacity-50"
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)' }}
          >
            <RefreshIcon sx={{ fontSize: 14 }} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sport tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {SPORT_TABS.map((tab) => {
          const count = sportCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => handleSportChange(tab.key)}
              className={`sport-tab${activeSport === tab.key ? ' active' : ''}`}
            >
              {tab.icon}{tab.label}
              {count != null && count > 0 && (
                <span style={{
                  marginLeft: 4, padding: '1px 5px', borderRadius: 99, fontSize: 10, fontWeight: 700, lineHeight: 1,
                  background: activeSport === tab.key ? 'rgba(255,255,255,0.25)' : 'rgba(34,197,94,0.15)',
                  color: activeSport === tab.key ? '#fff' : '#22c55e',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4" style={{ position: 'relative' }}>
        <SearchIcon sx={{ fontSize: 15, position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder={`Search ${SPORT_TABS.find((t) => t.key === activeSport)?.label ?? ''} teams…`}
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          style={{
            width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
          <button onClick={() => fetchLive(activeSport, false)} className="mt-3 text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <div style={{ fontSize: 40, marginBottom: 12 }}>{sportEmoji[activeSport]}</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {teamFilter
              ? `No live ${SPORT_TABS.find((t) => t.key === activeSport)?.label} matches for "${teamFilter}"`
              : `No live ${SPORT_TABS.find((t) => t.key === activeSport)?.label} matches right now`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Refreshes every 30 seconds</p>
        </div>
      )}

      {/* Live matches */}
      {!loading && !error && grouped.size > 0 && (
        <section className="mb-6">
          <div className="section-header">
            <h2 className="section-title-text">
              <FiberManualRecordIcon sx={{ fontSize: 8 }} className="live-dot" />
              Live Now
              <span className="section-count">({filtered.length})</span>
            </h2>
          </div>

          {[...grouped.entries()].map(([league, matches]) => (
            <div key={league} className="league-group">
              <div className="league-group-header">
                <span className="league-group-name">{league}</span>
                <span className="league-group-count" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 7 }} className="live-dot" />
                  {matches.length}
                </span>
              </div>
              <div className="match-list-group">
                {matches.map((m, i) => (
                  <MatchCard key={m.id ?? `row-${i}`} match={m} showDraw={showDraw} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
