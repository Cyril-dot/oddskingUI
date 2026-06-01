// ---------------------------------------------------------------------------
// super bet match details  — updated to match reference UI
// --------------------------------------------------------------------------

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import api from '../utils/api';
import type { Match } from '../utils/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SportsIcon from '@mui/icons-material/Sports';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WifiIcon from '@mui/icons-material/Wifi';

// ---------------------------------------------------------------------------
// Fallback lower-division league names (shown when no league name provided)
// ---------------------------------------------------------------------------
const FALLBACK_LEAGUES = [
  'Northern Premier League Division One',
  'Isthmian League South East',
  'Midland Football League Premier Division',
  'Southern Counties East Football League',
  'Combined Counties League Division One',
  'North West Counties Football League',
  'Eastern Counties League Premier Division',
  'Spartan South Midlands Football League',
  'Hellenic Football League Premier Division',
  'Western League Premier Division',
  'United Counties League Premier Division',
  'Wessex Football League Premier Division',
  'Metropolitan Police League Division Two',
  'Essex Senior League',
  'Kent County Football League',
  'Merseyside Amateur Football Combination',
  'Lancashire Amateur League Division Three',
  'Sheffield & Hallamshire County Senior League',
  'East Riding County Football League',
  'Devon & Exeter Football League',
];

function getFallbackLeague(matchId: string): string {
  // Deterministic pick based on matchId so it's stable per match
  let hash = 0;
  for (let i = 0; i < matchId.length; i++) hash = (hash * 31 + matchId.charCodeAt(i)) >>> 0;
  return FALLBACK_LEAGUES[hash % FALLBACK_LEAGUES.length];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OddsOption { label: string; odd: number; }
interface OddsGroup  { market: string; options: OddsOption[]; }

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
  'BREAK','break','SUSPENDED','suspended',
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
  'WALKOVER','walkover','RETIRED','retired',
  'STATUS_FINAL','STATUS_FULL_TIME','STATUS_POSTPONED',
  'STATUS_CANCELED','STATUS_SUSPENDED','STATUS_ABANDONED',
]);

const HALFTIME_STATUSES = new Set([
  'HALFTIME','halftime','HALF_TIME','half_time','HT','ht','STATUS_HALFTIME',
]);

const EXTRA_TIME_STATUSES = new Set([
  'EXTRA_TIME','extra_time','ET','et','ET1','et1','ET2','et2','STATUS_OVERTIME',
]);

const PENALTY_STATUSES = new Set([
  'PENALTIES','penalties','PEN','pen','SHOOTOUT','shootout',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatKickoff(kickoffAt?: string) {
  if (!kickoffAt) return '--:--';
  return new Date(kickoffAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
function formatDate(kickoffAt?: string) {
  if (!kickoffAt) return '';
  return new Date(kickoffAt).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function finishedLabel(status?: string) {
  const s = status ?? '';
  if (['FINISHED','finished','FULL_TIME','full_time','FT','ft','AWARDED','awarded','ENDED','ended','COMPLETED','completed','COMPLETE','complete','STATUS_FINAL','STATUS_FULL_TIME'].includes(s)) return 'FT';
  if (['AFTER_EXTRA_TIME','after_extra_time','AET','aet'].includes(s)) return 'AET';
  if (['AFTER_PENALTIES','after_penalties','AP','ap'].includes(s)) return 'PEN';
  if (['POSTPONED','postponed','STATUS_POSTPONED'].includes(s)) return 'PPD';
  if (['CANCELLED','cancelled','CANCELED','canceled','STATUS_CANCELED'].includes(s)) return 'CANC';
  if (['ABANDONED','abandoned','STATUS_ABANDONED'].includes(s)) return 'ABD';
  if (['VOID','void'].includes(s)) return 'VOID';
  return 'FT';
}

function norm(s: string) { return s.toLowerCase().replace(/[\s_\-]/g, ''); }

// ---------------------------------------------------------------------------
// Live Timer Hook
// ---------------------------------------------------------------------------
function useLiveTimer(match: Match | null): string {
  const status = match?.status ?? '';
  const isLive = LIVE_STATUSES.has(status);

  const getElapsedMins = useCallback((): number => {
    if (match?.kickoffAt) {
      const kickoffMs = new Date(match.kickoffAt).getTime();
      const elapsedMs = Date.now() - kickoffMs;
      if (elapsedMs >= 0) return Math.floor(elapsedMs / 60_000);
    }
    return match?.minutePlayed ?? 0;
  }, [match?.kickoffAt, match?.minutePlayed]);

  const [elapsed, setElapsed] = useState<number>(getElapsedMins);

  useEffect(() => {
    if (!isLive) return;
    setElapsed(getElapsedMins());
    const id = setInterval(() => setElapsed(getElapsedMins()), 30_000);
    return () => clearInterval(id);
  }, [isLive, getElapsedMins]);

  if (!match || !isLive) return '';
  if (HALFTIME_STATUSES.has(status)) return 'HT';
  if (PENALTY_STATUSES.has(status))  return 'PEN';
  if (EXTRA_TIME_STATUSES.has(status)) return `${Math.min(elapsed, 120)}' ET`;
  const displayMin = match.minutePlayed != null ? match.minutePlayed : Math.min(elapsed, 90);
  return `${displayMin}'`;
}

// ---------------------------------------------------------------------------
// Sport detection
// ---------------------------------------------------------------------------
type SportKind = 'football' | 'basketball' | 'nfl' | 'baseball' | 'mma' | 'tennis' | 'admin';

function detectSport(match: Match): SportKind {
  const sport  = (match.sport ?? match.sportEnum ?? '').toLowerCase();
  const source = (match.source ?? '').toUpperCase();
  if (source === 'ADMIN_CREATED') return 'admin';
  if (sport.includes('basket') || sport === 'basketball') return 'basketball';
  if (sport.includes('american') || sport === 'nfl' || sport === 'american_football') return 'nfl';
  if (sport.includes('baseball')) return 'baseball';
  if (sport === 'mma') return 'mma';
  if (sport === 'tennis') return 'tennis';
  return 'football';
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type TabKey = '1x2' | 'halfTime' | 'correctScore' | 'handicap';
interface TabDef { key: TabKey; label: string; icon: React.ReactNode; }

function getTabsForSport(
  sport: SportKind,
  hasHalfTime: boolean,
  hasCorrectScore: boolean,
  hasHandicap: boolean,
): TabDef[] {
  const base: TabDef[] = [
    { key: '1x2',          label: '1X2',          icon: <SportsIcon fontSize="small" /> },
    { key: 'halfTime',     label: 'Half Time',     icon: <ScheduleIcon fontSize="small" /> },
    { key: 'correctScore', label: 'Correct Score', icon: <SportsIcon fontSize="small" /> },
    { key: 'handicap',     label: 'Handicap',      icon: <SportsIcon fontSize="small" /> },
  ];

  if (sport === 'admin') {
    return base.filter((t) => {
      if (t.key === '1x2')          return true;
      if (t.key === 'halfTime')     return hasHalfTime;
      if (t.key === 'correctScore') return hasCorrectScore;
      if (t.key === 'handicap')     return hasHandicap;
      return false;
    });
  }

  const allowed: Partial<Record<SportKind, TabKey[]>> = {
    football:   ['1x2', 'halfTime', 'correctScore', 'handicap'],
    basketball: ['1x2', 'halfTime', 'handicap'],
    nfl:        ['1x2', 'handicap'],
    baseball:   ['1x2'],
    mma:        ['1x2'],
    tennis:     ['1x2'],
  };

  const keys = allowed[sport] ?? ['1x2'];
  return base
    .filter((t) => keys.includes(t.key))
    .map((t) => {
      if (sport === 'basketball' && t.key === 'halfTime')  return { ...t, label: 'Totals' };
      if (sport === 'basketball' && t.key === 'handicap')  return { ...t, label: 'Spread' };
      if (sport === 'nfl'        && t.key === 'handicap')  return { ...t, label: 'Spread' };
      return t;
    });
}

// ---------------------------------------------------------------------------
// Admin odds classification helpers
// ---------------------------------------------------------------------------
function isScoreLabel(label: string): boolean {
  return /^\d+[\:\-]\d+$/.test(label.trim());
}

const HT_KEYWORDS = ['halftime', 'half-time', 'half time', 'ht ', 'ht/', 'firsthalf', 'first half', '2ndhalf', 'second half'];
function isHalfTimeMarket(market: string): boolean {
  const m = market.toLowerCase();
  return HT_KEYWORDS.some((kw) => m.includes(kw));
}

const HANDICAP_KEYWORDS = ['handicap', 'asian', 'spread', 'ah ', 'ah/'];
function isHandicapMarket(market: string): boolean {
  const m = market.toLowerCase();
  return HANDICAP_KEYWORDS.some((kw) => m.includes(kw));
}

interface AdminOddsClassified {
  odds1x2:          OddsGroup[];
  oddsHalfTime:     OddsGroup[];
  oddsCorrectScore: OddsGroup[];
  oddsHandicap:     OddsGroup[];
}

function classifyAdminOdds(raw: unknown[]): AdminOddsClassified {
  const result: AdminOddsClassified = {
    odds1x2: [], oddsHalfTime: [], oddsCorrectScore: [], oddsHandicap: [],
  };
  if (!raw.length) return result;

  const marketMap = new Map<string, Array<{ selection: string; odd: number; handicap?: string }>>();
  for (const row of raw as Array<Record<string, unknown>>) {
    const market    = String(row.market ?? row.name ?? 'match_result');
    const selection = String(row.selection ?? row.outcome ?? row.label ?? '');
    const odd       = Number(row.value ?? row.odd ?? row.odds ?? row.price ?? 0);
    if (!selection || odd <= 0) continue;
    const handicap  = row.handicap != null ? String(row.handicap) : undefined;
    if (!marketMap.has(market)) marketMap.set(market, []);
    marketMap.get(market)!.push({ selection, odd, handicap });
  }

  for (const [market, entries] of marketMap.entries()) {
    const options: OddsOption[] = entries.map((e) => ({
      label: e.handicap ? `${e.selection} (${e.handicap})` : e.selection,
      odd:   Math.round(e.odd * 100) / 100,
    }));
    const group: OddsGroup = { market, options };

    if (isHandicapMarket(market) || entries.some((e) => e.handicap)) {
      result.oddsHandicap.push(group); continue;
    }
    if (isHalfTimeMarket(market)) {
      result.oddsHalfTime.push(group); continue;
    }
    if (options.length >= 2 && options.every((o) => isScoreLabel(o.label))) {
      result.oddsCorrectScore.push(group); continue;
    }
    const mn = market.toLowerCase();
    if (mn.includes('correct') || mn.includes('exactscore') || mn.includes('exact score') || mn.includes('score')) {
      const selLabels = options.map((o) => norm(o.label));
      const is1x2 = selLabels.some(
        (l) => l === '1' || l === 'home' || l === '2' || l === 'away' || l === 'draw' || l === 'x',
      );
      if (!is1x2) { result.oddsCorrectScore.push(group); continue; }
    }
    result.odds1x2.push(group);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Odds parser
// ---------------------------------------------------------------------------
function parseOddsGroups(raw: unknown, _context: string): OddsGroup[] {
  if (!raw) return [];
  let payload: unknown = raw;
  if (typeof raw === 'object' && raw !== null && 'data' in (raw as Record<string, unknown>)) {
    payload = (raw as Record<string, unknown>).data;
  }
  if (Array.isArray(payload)) {
    const first = payload[0] as Record<string, unknown> | undefined;
    if (first && 'market' in first && 'options' in first) return payload as OddsGroup[];
    const rows = payload as Array<Record<string, unknown>>;
    if (!rows.length) return [];
    const hasHandicap = rows.some((r) => r.handicap != null);
    if (hasHandicap) {
      const lineMap = new Map<string, Map<string, number[]>>();
      const lineOrder: string[] = [];
      for (const o of rows) {
        const handicap = String(o.handicap ?? '');
        const sel      = String(o.selection ?? o.outcome ?? o.label ?? '');
        const odd      = Number(o.value ?? o.odd ?? o.odds ?? o.price ?? 0);
        if (!sel || !handicap || odd <= 0) continue;
        if (!lineMap.has(handicap)) { lineMap.set(handicap, new Map()); lineOrder.push(handicap); }
        const selMap = lineMap.get(handicap)!;
        if (!selMap.has(sel)) selMap.set(sel, []);
        selMap.get(sel)!.push(odd);
      }
      const used = new Set<string>();
      const groups: OddsGroup[] = [];
      const sorted = [...lineOrder].sort((a, b) => parseFloat(a) - parseFloat(b));
      for (const line of sorted) {
        if (used.has(line)) continue;
        const mirrorVal = parseFloat(line) * -1;
        const mirrorKey = lineOrder.find((l) => Math.abs(parseFloat(l) - mirrorVal) < 0.001);
        const options: OddsOption[] = [];
        const addFromMap = (key: string) => {
          const selMap = lineMap.get(key);
          if (!selMap) return;
          for (const [sel, odds] of selMap.entries()) {
            const avg = odds.reduce((a, b) => a + b, 0) / odds.length;
            options.push({ label: `${sel} (${key})`, odd: Math.round(avg * 100) / 100 });
          }
        };
        addFromMap(line);
        if (mirrorKey && mirrorKey !== line) { addFromMap(mirrorKey); used.add(mirrorKey); }
        used.add(line);
        if (options.length > 0) {
          const groupLabel = mirrorKey && mirrorKey !== line ? `${line} / ${mirrorKey}` : line;
          groups.push({ market: groupLabel, options });
        }
      }
      return groups;
    }
    const marketMap = new Map<string, Map<string, number[]>>();
    for (const o of rows) {
      const market = String(o.market ?? o.name ?? o.type ?? 'Other');
      const sel    = String(o.selection ?? o.outcome ?? o.label ?? o.name ?? '');
      const odd    = Number(o.value ?? o.odd ?? o.odds ?? o.price ?? 0);
      if (!sel || odd <= 0) continue;
      if (!marketMap.has(market)) marketMap.set(market, new Map());
      const selMap = marketMap.get(market)!;
      if (!selMap.has(sel)) selMap.set(sel, []);
      selMap.get(sel)!.push(odd);
    }
    const groups: OddsGroup[] = [];
    for (const [market, selMap] of marketMap.entries()) {
      const options: OddsOption[] = [];
      for (const [sel, odds] of selMap.entries()) {
        const avg = odds.reduce((a, b) => a + b, 0) / odds.length;
        options.push({ label: sel, odd: Math.round(avg * 100) / 100 });
      }
      groups.push({ market, options });
    }
    return groups;
  }
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    const groups: OddsGroup[] = [];
    for (const [market, entries] of Object.entries(obj)) {
      if (!Array.isArray(entries)) continue;
      const options = (entries as Array<Record<string, unknown>>)
        .map((e) => ({
          label: String(e.selection ?? e.outcome ?? e.name ?? e.label ?? ''),
          odd:   Number(e.value ?? e.odd ?? e.odds ?? e.price ?? 0),
        }))
        .filter((o) => o.odd > 0 && o.label);
      if (options.length > 0) groups.push({ market, options });
    }
    return groups;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Correct Score helpers
// ---------------------------------------------------------------------------
function parseCorrectScoreGroups(groups: OddsGroup[]) {
  const all = groups.flatMap((g) => g.options);
  const map = new Map<string, number>();
  for (const o of all) {
    const existing = map.get(o.label);
    if (existing === undefined || o.odd < existing) map.set(o.label, o.odd);
  }
  const parseScore = (s: string) => {
    const m = s.match(/(\d+)[:\-](\d+)/);
    return m ? { h: parseInt(m[1]), a: parseInt(m[2]) } : null;
  };
  return [...map.entries()]
    .map(([label, odd]) => ({ label, odd }))
    .sort((a, b) => {
      const am = parseScore(a.label), bm = parseScore(b.label);
      if (!am || !bm) return a.label.localeCompare(b.label);
      const atype = am.h > am.a ? 0 : am.h === am.a ? 1 : 2;
      const btype = bm.h > bm.a ? 0 : bm.h === bm.a ? 1 : 2;
      if (atype !== btype) return atype - btype;
      return (am.h + am.a) - (bm.h + bm.a);
    });
}

// ---------------------------------------------------------------------------
// API fetch helpers
// ---------------------------------------------------------------------------
const ADMIN_ODDS_BASE = 'https://futballbackend-production-aefb.up.railway.app';

async function fetchAdminOddsRaw(id: string): Promise<unknown[]> {
  try {
    const raw = await fetch(
      `${ADMIN_ODDS_BASE}/api/public/admin-matches/${id}/odds`
    ).then((r) => r.json());
    if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)) {
      return (raw as Record<string, unknown>).data as unknown[];
    }
    if (Array.isArray(raw)) return raw;
    return [];
  } catch (err) {
    console.warn(`[AdminOdds] Failed to fetch odds for match ${id}:`, err);
    return [];
  }
}

async function fetchMatchById(id: string, sport: SportKind): Promise<Match> {
  let res: unknown;
  switch (sport) {
    case 'basketball': res = await api.publicBasketball.getById(id); break;
    case 'nfl':        res = await api.publicNfl.getById(id);        break;
    case 'baseball':   res = await api.publicBaseball.getById(id);   break;
    case 'mma':        res = await api.publicMma.getById(id);        break;
    case 'tennis':     res = await api.publicTennis.getById(id);     break;
    case 'admin':      res = await api.publicAdminMatches.getById(id); break;
    default:           res = await api.publicFootball.getById(id);   break;
  }
  return ((res as Record<string, unknown>)?.data as Match) ?? (res as Match);
}

interface AllOddsResult {
  odds1x2:          OddsGroup[];
  oddsHalfTime:     OddsGroup[];
  oddsCorrectScore: OddsGroup[];
  oddsHandicap:     OddsGroup[];
}

async function fetchAllOddsForSport(id: string, sport: SportKind): Promise<AllOddsResult> {
  const empty: AllOddsResult = { odds1x2: [], oddsHalfTime: [], oddsCorrectScore: [], oddsHandicap: [] };

  if (sport === 'admin') {
    const rawOdds = await fetchAdminOddsRaw(id);
    if (!rawOdds.length) return empty;
    return classifyAdminOdds(rawOdds);
  }

  if (sport === 'football') {
    const [r1, r2, r3, r4] = await Promise.allSettled([
      api.publicFootball.odds(id),
      api.publicFootball.oddsHalfTime(id),
      api.publicFootball.oddsCorrectScore(id),
      api.publicFootball.oddsHandicap(id),
    ]);
    if (r1.status === 'fulfilled') empty.odds1x2          = parseOddsGroups(r1.value, 'football:1x2');
    if (r2.status === 'fulfilled') empty.oddsHalfTime     = parseOddsGroups(r2.value, 'football:halfTime');
    if (r3.status === 'fulfilled') empty.oddsCorrectScore = parseOddsGroups(r3.value, 'football:correctScore');
    if (r4.status === 'fulfilled') empty.oddsHandicap     = parseOddsGroups(r4.value, 'football:handicap');
    return empty;
  }

  if (sport === 'basketball') {
    const [r1, r2, r3] = await Promise.allSettled([
      api.publicBasketball.oddsMoneyline(id),
      api.publicBasketball.oddsSpread(id),
      api.publicBasketball.oddsTotal(id),
    ]);
    if (r1.status === 'fulfilled') empty.odds1x2      = parseOddsGroups(r1.value, 'basketball:moneyline');
    if (r2.status === 'fulfilled') empty.oddsHandicap = parseOddsGroups(r2.value, 'basketball:spread');
    if (r3.status === 'fulfilled') empty.oddsHalfTime = parseOddsGroups(r3.value, 'basketball:total');
    return empty;
  }

  if (sport === 'nfl') {
    const [r1] = await Promise.allSettled([api.publicNfl.oddsAll(id)]);
    if (r1.status === 'fulfilled') empty.odds1x2 = parseOddsGroups(r1.value, 'nfl:all');
    return empty;
  }

  if (sport === 'baseball') {
    const [r1] = await Promise.allSettled([api.publicBaseball.odds(id)]);
    if (r1.status === 'fulfilled') empty.odds1x2 = parseOddsGroups(r1.value, 'baseball:1x2');
    return empty;
  }

  if (sport === 'mma') {
    const [r1] = await Promise.allSettled([api.publicMma.oddsAll(id)]);
    if (r1.status === 'fulfilled') empty.odds1x2 = parseOddsGroups(r1.value, 'mma:all');
    return empty;
  }

  if (sport === 'tennis') {
    const [r1] = await Promise.allSettled([api.publicTennis.odds(id)]);
    if (r1.status === 'fulfilled') empty.odds1x2 = parseOddsGroups(r1.value, 'tennis:1x2');
    return empty;
  }

  return empty;
}

// ---------------------------------------------------------------------------
// UI Primitives
// ---------------------------------------------------------------------------
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton-block ${className ?? ''}`} />;
}

// ---------------------------------------------------------------------------
// Reference-style 3-column odds row  (1 · TEAM  |  odd )
// ---------------------------------------------------------------------------
function OddsRow({
  sublabel, label, odd, selected, locked, onClick,
}: {
  sublabel: string; label: string; odd: number;
  selected: boolean; locked?: boolean; onClick: () => void;
}) {
  const disabled = locked || odd <= 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between w-full px-3 py-3 rounded-xl border transition-all
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : selected
            ? 'bg-primary border-primary shadow-md'
            : 'cursor-pointer active:scale-[0.98]'
        }`}
      style={!selected && !disabled ? { background: 'var(--card-alt)', borderColor: 'var(--border-light)' }
           : disabled               ? { background: 'var(--card-alt)', borderColor: 'var(--border-light)' }
           : undefined}
    >
      {/* sublabel e.g. "1", "X", "2" */}
      <span
        className="text-xs font-black w-6 shrink-0 text-left"
        style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
      >
        {sublabel}
      </span>
      {/* team / label */}
      <span
        className="flex-1 text-sm font-semibold text-left px-2 truncate"
        style={{ color: selected ? '#fff' : 'var(--text-main)' }}
      >
        {label}
      </span>
      {/* odd or lock */}
      <span
        className="text-base font-black tabular-nums shrink-0"
        style={{ color: selected ? '#fff' : locked ? 'var(--text-muted)' : 'var(--primary)' }}
      >
        {locked ? <LockIcon sx={{ fontSize: 15 }} /> : odd > 0 ? odd.toFixed(2) : '—'}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Collapsible market section (used for all markets below the main 1X2)
// ---------------------------------------------------------------------------
function CollapsibleMarket({
  title, children, defaultOpen = false,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border-light)', background: 'var(--card)' }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
        style={{ background: open ? 'var(--card-alt)' : 'var(--card)' }}
      >
        <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{title}</span>
        {open
          ? <ExpandLessIcon fontSize="small" style={{ color: 'var(--text-muted)' }} />
          : <ExpandMoreIcon fontSize="small" style={{ color: 'var(--text-muted)' }} />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Locked notice banner (betting closed)
// ---------------------------------------------------------------------------
function BettingClosedBanner({ reason }: { reason: 'live' | 'finished' }) {
  const text = reason === 'live'
    ? 'Betting closed — match has started.'
    : 'Betting closed — match has finished.';
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border"
      style={{
        background: 'rgba(239,68,68,0.07)',
        borderColor: 'rgba(239,68,68,0.25)',
        color: '#ef4444',
      }}
    >
      <LockIcon sx={{ fontSize: 16 }} />
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic OddButton (kept for CorrectScore / Handicap panels)
// ---------------------------------------------------------------------------
function OddButton({
  label, sublabel, odd, selected, locked, onClick,
}: {
  label: string; sublabel?: string; odd: number;
  selected: boolean; locked?: boolean; onClick: () => void;
}) {
  if (locked) {
    return (
      <div
        className="flex flex-col items-center py-2.5 px-2 rounded-xl border-2 border-dashed opacity-50 cursor-not-allowed select-none"
        style={{ borderColor: 'var(--border-light)' }}
      >
        {sublabel && (
          <span className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {sublabel}
          </span>
        )}
        <span className="text-xs font-medium mb-1 text-center leading-tight px-0.5 truncate max-w-full" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <LockIcon sx={{ fontSize: 14 }} />
          <span className="text-sm font-black tabular-nums">{odd > 0 ? odd.toFixed(2) : '—'}</span>
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={odd <= 0}
      className={`flex flex-col items-center py-2.5 px-2 rounded-xl border-2 transition-all select-none
        ${odd <= 0
          ? 'opacity-40 cursor-not-allowed'
          : selected
            ? 'bg-primary text-white border-primary shadow-lg scale-[1.03]'
            : 'cursor-pointer active:scale-95'
        }`}
      style={odd > 0 && !selected ? {
        background: 'var(--card-alt)',
        borderColor: 'var(--border-light)',
      } : odd <= 0 ? {
        background: 'var(--card-alt)',
        borderColor: 'var(--border-light)',
      } : undefined}
    >
      {sublabel && (
        <span
          className="text-[10px] font-black uppercase tracking-widest mb-0.5"
          style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
        >
          {sublabel}
        </span>
      )}
      <span
        className="text-xs font-medium mb-1 text-center leading-tight px-0.5 truncate max-w-full"
        style={{ color: selected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}
      >
        {label}
      </span>
      <span className="text-xl font-black tabular-nums" style={{ color: selected ? '#fff' : 'var(--text-main)' }}>
        {odd > 0 ? odd.toFixed(2) : '—'}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Match 1X2 / Moneyline Panel  — reference style vertical rows
// ---------------------------------------------------------------------------
function Match1x2Panel({ groups, matchId, matchName, homeTeam, awayTeam, locked, sport }: {
  groups: OddsGroup[]; matchId: string; matchName: string;
  homeTeam: string; awayTeam: string; locked: boolean; sport: SportKind;
}) {
  const { betSlip, addToBetSlip, showToast } = useAppStore();
  const isSel = (market: string, sel: string) =>
    betSlip.some((s) => s.matchId === matchId && s.market === market && s.selection === sel);
  const pick = (market: string, sel: string, odd: number) => {
    if (locked) return;
    addToBetSlip({ matchId, matchName, market, selection: sel, odd });
    showToast('Added to bet slip', 'success');
  };

  if (!groups.length) return (
    <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No odds available yet.</p>
  );

  const hasDraw    = sport === 'football' || sport === 'admin';
  const panelTitle = sport === 'basketball' || sport === 'nfl' ? 'MONEYLINE' : 'MATCH RESULT';

  const main = groups.find((g) => {
    const m = norm(g.market);
    return m.includes('1x2') || m.includes('matchresult') || m.includes('matchodds')
      || m === 'fulltime' || m.includes('moneyline') || m.includes('winner') || m === 'matchresult';
  }) ?? groups.find((g) => g.options.length === (hasDraw ? 3 : 2)) ?? groups[0];
  const rest = groups.filter((g) => g !== main);

  const findBy = (kw: string) => main.options.find((o) => { const s = norm(o.label); return s === kw || s.includes(kw); });
  let homeOpt = findBy('1') ?? findBy(norm(homeTeam));
  let drawOpt = hasDraw ? (findBy('draw') ?? findBy('x')) : undefined;
  let awayOpt = findBy('2') ?? findBy(norm(awayTeam));

  if (!homeOpt && !awayOpt) {
    if (hasDraw && main.options.length >= 3) [homeOpt, drawOpt, awayOpt] = main.options;
    else [homeOpt, awayOpt] = main.options;
  }

  const assigned = new Set([homeOpt, drawOpt, awayOpt]);
  const rem = main.options.filter((o) => !assigned.has(o));
  homeOpt ??= rem.shift() ?? { label: '—', odd: 0 };
  if (hasDraw) drawOpt ??= rem.shift() ?? { label: '—', odd: 0 };
  awayOpt ??= rem.shift() ?? { label: '—', odd: 0 };

  const rows = hasDraw
    ? [
        { sublabel: '1', label: homeTeam, opt: homeOpt! },
        { sublabel: 'X', label: 'Draw',   opt: drawOpt! },
        { sublabel: '2', label: awayTeam, opt: awayOpt! },
      ]
    : [
        { sublabel: '1', label: homeTeam, opt: homeOpt! },
        { sublabel: '2', label: awayTeam, opt: awayOpt! },
      ];

  return (
    <div className="space-y-3">
      {/* Main 1X2 card */}
      <div className="card p-4">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          {panelTitle}
        </p>
        <div className="space-y-2">
          {rows.map(({ sublabel, label, opt }) => (
            <OddsRow
              key={sublabel}
              sublabel={sublabel}
              label={label}
              odd={opt.odd}
              selected={isSel(main.market, opt.label)}
              locked={locked}
              onClick={() => opt.odd > 0 && pick(main.market, opt.label, opt.odd)}
            />
          ))}
        </div>
      </div>

      {/* Additional markets as collapsible sections */}
      {rest.map((group, gi) => (
        <CollapsibleMarket key={gi} title={group.market.replace(/_/g, ' ')}>
          <div className="space-y-2">
            {group.options.map((opt, oi) => (
              <OddsRow
                key={oi}
                sublabel={String(oi + 1)}
                label={opt.label}
                odd={opt.odd}
                selected={isSel(group.market, opt.label)}
                locked={locked}
                onClick={() => pick(group.market, opt.label, opt.odd)}
              />
            ))}
          </div>
        </CollapsibleMarket>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Half Time / Totals Panel
// ---------------------------------------------------------------------------
function HalfTimePanel({ groups, matchId, matchName, locked, sport }: {
  groups: OddsGroup[]; matchId: string; matchName: string; locked: boolean; sport: SportKind;
}) {
  const { betSlip, addToBetSlip, showToast } = useAppStore();
  const isSel = (market: string, sel: string) =>
    betSlip.some((s) => s.matchId === matchId && s.market === market && s.selection === sel);
  const pick = (market: string, sel: string, odd: number) => {
    if (locked) return;
    addToBetSlip({ matchId, matchName, market, selection: sel, odd });
    showToast('Added to bet slip', 'success');
  };

  const panelTitle = sport === 'basketball' ? 'Totals (Over/Under)' : 'Half Time Result';

  if (!groups.length) return (
    <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
      {sport === 'basketball' ? 'No totals available.' : 'No half-time odds available.'}
    </p>
  );

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const drawOpt = group.options.find((o) => norm(o.label) === 'draw' || norm(o.label) === 'x');
        const nonDraw = group.options.filter((o) => o !== drawOpt);
        const rows = drawOpt
          ? [
              { sublabel: '1',  opt: nonDraw[0] },
              { sublabel: 'X',  opt: drawOpt },
              { sublabel: '2',  opt: nonDraw[1] },
            ].filter((s) => s.opt)
          : group.options.map((opt, i) => ({
              sublabel: sport === 'basketball' ? (i === 0 ? 'O' : 'U') : String(i + 1),
              opt,
            }));

        return (
          <CollapsibleMarket key={gi} title={group.market.replace(/_/g, ' ') || panelTitle} defaultOpen={gi === 0}>
            <div className="space-y-2">
              {rows.map(({ sublabel, opt }) => (
                <OddsRow
                  key={opt.label}
                  sublabel={sublabel}
                  label={opt.label}
                  odd={opt.odd}
                  selected={isSel(group.market, opt.label)}
                  locked={locked}
                  onClick={() => pick(group.market, opt.label, opt.odd)}
                />
              ))}
            </div>
          </CollapsibleMarket>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Correct Score Panel — reference style: 3-col grid (Home | Draw | Away)
// Each cell: score label left, odd value right, light-green tint bg
// ---------------------------------------------------------------------------
function CorrectScorePanel({ groups, matchId, matchName, homeTeam, awayTeam, locked }: {
  groups: OddsGroup[]; matchId: string; matchName: string;
  homeTeam: string; awayTeam: string; locked: boolean;
}) {
  const { betSlip, addToBetSlip, showToast } = useAppStore();
  const isSel = (market: string, sel: string) =>
    betSlip.some((s) => s.matchId === matchId && s.market === market && s.selection === sel);
  const pick = (market: string, sel: string, odd: number) => {
    if (locked) return;
    addToBetSlip({ matchId, matchName, market, selection: sel, odd });
    showToast('Added to bet slip', 'success');
  };

  const scores = parseCorrectScoreGroups(groups);
  const market = groups[0]?.market ?? 'correct_score';

  if (!scores.length) return (
    <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No correct score odds available.</p>
  );

  const parseScore = (s: string) => {
    const m = s.match(/(\d+)[:\-](\d+)/);
    return m ? { h: parseInt(m[1]), a: parseInt(m[2]) } : null;
  };

  const homeWins: typeof scores = [];
  const draws:    typeof scores = [];
  const awayWins: typeof scores = [];
  const other:    typeof scores = [];

  for (const s of scores) {
    const p = parseScore(s.label);
    if (!p) { other.push(s); continue; }
    if (p.h > p.a)      homeWins.push(s);
    else if (p.h === p.a) draws.push(s);
    else                  awayWins.push(s);
  }

  // Normalise label to always use colon separator e.g. "1:0"
  const normLabel = (l: string) => l.replace('-', ':');

  // Max rows across the three columns — used to render a unified row grid
  const maxRows = Math.max(homeWins.length, draws.length, awayWins.length);

  // Colour helpers — selected = primary, normal = soft green tint
  const cellBg    = 'rgba(134,239,172,0.13)'; // light green tint matching reference
  const cellBgSel = 'var(--primary)';

  const ScoreCell = ({
    item, colMarket,
  }: {
    item: (typeof scores)[number] | undefined;
    colMarket: string;
  }) => {
    if (!item) return <div style={{ background: 'transparent' }} className="rounded-lg" />;
    const sel = isSel(colMarket, item.label);
    return (
      <button
        onClick={() => !locked && pick(colMarket, item.label, item.odd)}
        disabled={locked || item.odd <= 0}
        className={`flex items-center justify-between px-2 py-2.5 rounded-lg w-full transition-all
          ${locked
            ? 'opacity-60 cursor-not-allowed'
            : sel
              ? 'shadow-md scale-[1.02]'
              : 'cursor-pointer active:scale-[0.97]'
          }`}
        style={{
          background: sel ? cellBgSel : cellBg,
          border: sel ? '1.5px solid var(--primary)' : '1.5px solid transparent',
        }}
      >
        {/* Score */}
        <span
          className="text-sm font-semibold tabular-nums shrink-0"
          style={{ color: sel ? '#fff' : 'var(--text-muted)' }}
        >
          {normLabel(item.label)}
        </span>
        {/* Odd or lock */}
        <span
          className="text-sm font-black tabular-nums ml-1"
          style={{ color: sel ? '#fff' : 'var(--text-main)' }}
        >
          {locked
            ? <LockIcon sx={{ fontSize: 12 }} style={{ color: 'var(--text-muted)' }} />
            : item.odd.toFixed(2)
          }
        </span>
      </button>
    );
  };

  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-3 gap-1 mb-1 px-0.5">
        {[homeTeam, 'Draw', awayTeam].map((h) => (
          <div key={h} className="text-center text-xs font-bold truncate px-1" style={{ color: 'var(--text-muted)' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Score grid rows */}
      <div className="space-y-1">
        {Array.from({ length: maxRows }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-1">
            <ScoreCell item={homeWins[i]} colMarket={market} />
            <ScoreCell item={draws[i]}    colMarket={market} />
            <ScoreCell item={awayWins[i]} colMarket={market} />
          </div>
        ))}
      </div>

      {/* "Other" row — reference shows a full-width Other cell at the bottom */}
      {other.length > 0 && (
        <div className="mt-2 space-y-1">
          {other.map((item) => {
            const sel = isSel(market, item.label);
            return (
              <button
                key={item.label}
                onClick={() => !locked && pick(market, item.label, item.odd)}
                disabled={locked}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all
                  ${locked ? 'opacity-60 cursor-not-allowed' : sel ? 'shadow-md' : 'cursor-pointer active:scale-[0.98]'}`}
                style={{
                  background: sel ? cellBgSel : cellBg,
                  border: sel ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                }}
              >
                <span className="text-sm font-semibold" style={{ color: sel ? '#fff' : 'var(--text-muted)' }}>
                  Other
                </span>
                <span className="text-sm font-black tabular-nums" style={{ color: sel ? '#fff' : 'var(--text-main)' }}>
                  {locked ? <LockIcon sx={{ fontSize: 12 }} /> : item.odd.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Handicap / Spread Panel
// ---------------------------------------------------------------------------
function HandicapPanel({ groups, matchId, matchName, locked, sport }: {
  groups: OddsGroup[]; matchId: string; matchName: string; locked: boolean; sport: SportKind;
}) {
  const { betSlip, addToBetSlip, showToast } = useAppStore();
  const isSel = (market: string, sel: string) =>
    betSlip.some((s) => s.matchId === matchId && s.market === market && s.selection === sel);
  const pick = (market: string, sel: string, odd: number) => {
    if (locked) return;
    addToBetSlip({ matchId, matchName, market, selection: sel, odd });
    showToast('Added to bet slip', 'success');
  };

  const panelLabel = sport === 'basketball' || sport === 'nfl' ? 'Point Spread' : 'Asian Handicap';

  if (!groups.length) return (
    <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
      No {panelLabel.toLowerCase()} odds available.
    </p>
  );

  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-between px-4 py-2 rounded-xl"
        style={{ background: 'var(--card-alt)' }}
      >
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {panelLabel}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{groups.length} line(s)</span>
      </div>
      {groups.map((group, gi) => {
        const isPushLine = group.options.some((o) => o.label.toLowerCase().includes('push') || o.label.toLowerCase().includes('refund'));
        const mainOpts   = group.options.filter((o) => !o.label.toLowerCase().includes('push') && !o.label.toLowerCase().includes('refund'));
        const pushOpt    = group.options.find((o) => o.label.toLowerCase().includes('push') || o.label.toLowerCase().includes('refund'));

        return (
          <div key={gi} className="card overflow-hidden">
            <div
              className="flex items-center gap-2 px-4 py-2 border-b"
              style={{ background: 'var(--card-alt)', borderColor: 'var(--border-light)' }}
            >
              <span className="text-xs font-black tabular-nums" style={{ color: 'var(--primary)' }}>{group.market}</span>
              {isPushLine && <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>includes push/refund</span>}
            </div>
            <div className={`p-3 grid gap-2 ${mainOpts.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {mainOpts.map((opt) => {
                const mtch     = opt.label.match(/^(.+?)\s*\(([^)]+)\)$/);
                const teamName = mtch ? mtch[1] : opt.label;
                const handicap = mtch ? mtch[2] : '';
                const selKey   = `${opt.label}|${gi}`;
                const sel      = isSel('asian_handicap', selKey);
                return (
                  <button
                    key={opt.label}
                    disabled={locked}
                    onClick={() => !locked && pick('asian_handicap', selKey, opt.odd)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all
                      ${locked
                        ? 'opacity-50 cursor-not-allowed border-dashed'
                        : sel
                          ? 'bg-primary text-white border-primary shadow-lg'
                          : 'cursor-pointer active:scale-95'
                      }`}
                    style={!sel && !locked ? { background: 'var(--card-alt)', borderColor: 'var(--border-light)' }
                         : locked          ? { borderColor: 'var(--border-light)' }
                         : undefined}
                  >
                    <div className="flex flex-col items-start min-w-0">
                      <span
                        className="text-sm font-bold truncate"
                        style={{ color: locked ? 'var(--text-muted)' : sel ? '#fff' : 'var(--text-main)' }}
                      >
                        {teamName}
                      </span>
                      {handicap && (
                        <span
                          className="text-[11px] font-black tabular-nums"
                          style={{ color: locked ? 'var(--text-muted)' : sel ? 'rgba(255,255,255,0.7)' : 'var(--primary)' }}
                        >
                          {handicap}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-lg font-black tabular-nums ml-2 shrink-0"
                      style={{ color: locked ? 'var(--text-muted)' : sel ? '#fff' : 'var(--text-main)' }}
                    >
                      {locked ? <LockIcon sx={{ fontSize: 16 }} /> : opt.odd.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
            {pushOpt && !locked && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => pick('asian_handicap', `${pushOpt.label}|${gi}`, pushOpt.odd)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all active:scale-95"
                  style={{
                    background: isSel('asian_handicap', `${pushOpt.label}|${gi}`) ? 'var(--text-muted)' : 'var(--card-alt)',
                    borderColor: 'var(--border-light)',
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Push / Refund</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                    {pushOpt.odd.toFixed(2)}
                  </span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// All-markets page — reference layout with collapsible sections
// ---------------------------------------------------------------------------
function AllMarketsView({
  odds1x2, oddsHalfTime, oddsCorrectScore, oddsHandicap,
  matchId, matchName, homeTeam, awayTeam, locked, sport,
}: {
  odds1x2: OddsGroup[]; oddsHalfTime: OddsGroup[];
  oddsCorrectScore: OddsGroup[]; oddsHandicap: OddsGroup[];
  matchId: string; matchName: string;
  homeTeam: string; awayTeam: string;
  locked: boolean; sport: SportKind;
}) {
  const { betSlip, addToBetSlip, showToast } = useAppStore();
  const isSel = (market: string, sel: string) =>
    betSlip.some((s) => s.matchId === matchId && s.market === market && s.selection === sel);
  const pick = (market: string, sel: string, odd: number) => {
    if (locked) return;
    addToBetSlip({ matchId, matchName, market, selection: sel, odd });
    showToast('Added to bet slip', 'success');
  };

  const hasDraw = sport === 'football' || sport === 'admin';

  // ── Main 1X2 card (always visible, not collapsible) ─────────────────────
  const main1x2 = odds1x2.find((g) => {
    const m = norm(g.market);
    return m.includes('1x2') || m.includes('matchresult') || m.includes('matchodds')
      || m === 'fulltime' || m.includes('moneyline') || m.includes('winner') || m === 'matchresult';
  }) ?? odds1x2.find((g) => g.options.length === (hasDraw ? 3 : 2)) ?? odds1x2[0];

  const rest1x2 = odds1x2.filter((g) => g !== main1x2);

  let homeOpt: OddsOption | undefined;
  let drawOpt: OddsOption | undefined;
  let awayOpt: OddsOption | undefined;

  if (main1x2) {
    const findBy = (kw: string) => main1x2.options.find((o) => { const s = norm(o.label); return s === kw || s.includes(kw); });
    homeOpt = findBy('1') ?? findBy(norm(homeTeam));
    drawOpt = hasDraw ? (findBy('draw') ?? findBy('x')) : undefined;
    awayOpt = findBy('2') ?? findBy(norm(awayTeam));
    if (!homeOpt && !awayOpt) {
      if (hasDraw && main1x2.options.length >= 3) [homeOpt, drawOpt, awayOpt] = main1x2.options;
      else [homeOpt, awayOpt] = main1x2.options;
    }
    const assigned = new Set([homeOpt, drawOpt, awayOpt]);
    const rem = main1x2.options.filter((o) => !assigned.has(o));
    homeOpt ??= rem.shift() ?? { label: '—', odd: 0 };
    if (hasDraw) drawOpt ??= rem.shift() ?? { label: '—', odd: 0 };
    awayOpt ??= rem.shift() ?? { label: '—', odd: 0 };
  }

  const mainRows = main1x2
    ? (hasDraw
        ? [
            { sublabel: '1', label: homeTeam, opt: homeOpt! },
            { sublabel: 'X', label: 'Draw',   opt: drawOpt! },
            { sublabel: '2', label: awayTeam, opt: awayOpt! },
          ]
        : [
            { sublabel: '1', label: homeTeam, opt: homeOpt! },
            { sublabel: '2', label: awayTeam, opt: awayOpt! },
          ])
    : [];

  const panelTitle = sport === 'basketball' || sport === 'nfl' ? 'MONEYLINE' : 'MATCH RESULT';

  // ── Build additional collapsible markets ────────────────────────────────
  // Determine Over/Under markets from half-time (they often contain over/under labels)
  const ouGroups = oddsHalfTime.filter((g) => {
    const m = norm(g.market);
    return m.includes('over') || m.includes('under') || m.includes('total') || m.includes('ou');
  });
  const htGroups = oddsHalfTime.filter((g) => !ouGroups.includes(g));

  // Double Chance derived from 1X2 main options
  const doubleChanceMarket = odds1x2.find((g) => norm(g.market).includes('doublechance'));

  // Both Teams to Score
  const bttsMarket = odds1x2.find((g) => {
    const m = norm(g.market);
    return m.includes('bothteams') || m.includes('btts') || m.includes('goalgoal') || m.includes('gg');
  });

  // Remaining 1X2 markets that aren't double chance / btts
  const extraMarkets = rest1x2.filter((g) => g !== doubleChanceMarket && g !== bttsMarket);

  return (
    <div className="space-y-2.5">
      {/* ── Main 1X2 card ── */}
      {main1x2 && (
        <div className="card p-4">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            {panelTitle}
          </p>
          <div className="space-y-2">
            {mainRows.map(({ sublabel, label, opt }) => (
              <OddsRow
                key={sublabel}
                sublabel={sublabel}
                label={label}
                odd={opt.odd}
                selected={isSel(main1x2.market, opt.label)}
                locked={locked}
                onClick={() => opt.odd > 0 && pick(main1x2.market, opt.label, opt.odd)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Double Chance ── */}
      {doubleChanceMarket && (
        <CollapsibleMarket title="Double Chance">
          <div className="space-y-2">
            {doubleChanceMarket.options.map((opt, oi) => (
              <OddsRow
                key={oi}
                sublabel={['1X', 'X2', '12'][oi] ?? String(oi + 1)}
                label={opt.label}
                odd={opt.odd}
                selected={isSel(doubleChanceMarket.market, opt.label)}
                locked={locked}
                onClick={() => pick(doubleChanceMarket.market, opt.label, opt.odd)}
              />
            ))}
          </div>
        </CollapsibleMarket>
      )}

      {/* ── Over / Under ── */}
      {ouGroups.length > 0 && (
        <CollapsibleMarket title="Over / Under">
          <div className="space-y-2">
            {ouGroups.map((g, gi) => (
              <div key={gi}>
                {ouGroups.length > 1 && (
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                    {g.market.replace(/_/g, ' ')}
                  </p>
                )}
                {g.options.map((opt, oi) => (
                  <OddsRow
                    key={oi}
                    sublabel={oi === 0 ? 'O' : 'U'}
                    label={opt.label}
                    odd={opt.odd}
                    selected={isSel(g.market, opt.label)}
                    locked={locked}
                    onClick={() => pick(g.market, opt.label, opt.odd)}
                  />
                ))}
              </div>
            ))}
          </div>
        </CollapsibleMarket>
      )}

      {/* ── BTTS ── */}
      {bttsMarket && (
        <CollapsibleMarket title="Both Teams to Score">
          <div className="space-y-2">
            {bttsMarket.options.map((opt, oi) => (
              <OddsRow
                key={oi}
                sublabel={oi === 0 ? 'Y' : 'N'}
                label={opt.label}
                odd={opt.odd}
                selected={isSel(bttsMarket.market, opt.label)}
                locked={locked}
                onClick={() => pick(bttsMarket.market, opt.label, opt.odd)}
              />
            ))}
          </div>
        </CollapsibleMarket>
      )}

      {/* ── Correct Score ── */}
      {oddsCorrectScore.length > 0 && (
        <CollapsibleMarket title="Correct Score">
          <CorrectScorePanel
            groups={oddsCorrectScore} matchId={matchId} matchName={matchName}
            homeTeam={homeTeam} awayTeam={awayTeam} locked={locked}
          />
        </CollapsibleMarket>
      )}

      {/* ── Half Time ── */}
      {htGroups.length > 0 && (
        <CollapsibleMarket title="Half Time / Full Time">
          <HalfTimePanel
            groups={htGroups} matchId={matchId} matchName={matchName}
            locked={locked} sport={sport}
          />
        </CollapsibleMarket>
      )}

      {/* ── Asian Handicap ── */}
      {oddsHandicap.length > 0 && (
        <CollapsibleMarket title={sport === 'basketball' || sport === 'nfl' ? 'Point Spread' : 'Asian Handicap'}>
          <HandicapPanel
            groups={oddsHandicap} matchId={matchId} matchName={matchName}
            locked={locked} sport={sport}
          />
        </CollapsibleMarket>
      )}

      {/* ── Extra 1X2-bucket markets ── */}
      {extraMarkets.map((g, gi) => (
        <CollapsibleMarket key={gi} title={g.market.replace(/_/g, ' ')}>
          <div className="space-y-2">
            {g.options.map((opt, oi) => (
              <OddsRow
                key={oi}
                sublabel={String(oi + 1)}
                label={opt.label}
                odd={opt.odd}
                selected={isSel(g.market, opt.label)}
                locked={locked}
                onClick={() => pick(g.market, opt.label, opt.odd)}
              />
            ))}
          </div>
        </CollapsibleMarket>
      ))}

      {!main1x2 && odds1x2.length === 0 && oddsHalfTime.length === 0 && oddsCorrectScore.length === 0 && oddsHandicap.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No odds available yet.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function MatchDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch]               = useState<Match | null>(null);
  const [sport, setSport]               = useState<SportKind>('football');
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [matchError, setMatchError]     = useState<string | null>(null);

  const [odds1x2, setOdds1x2]                   = useState<OddsGroup[]>([]);
  const [oddsHalfTime, setOddsHalfTime]         = useState<OddsGroup[]>([]);
  const [oddsCorrectScore, setOddsCorrectScore] = useState<OddsGroup[]>([]);
  const [oddsHandicap, setOddsHandicap]         = useState<OddsGroup[]>([]);
  const [loadingOdds, setLoadingOdds]           = useState(false);

  const timerStr = useLiveTimer(match);

  const fetchMatch = useCallback(async () => {
    if (!id) return;
    setLoadingMatch(true);
    setMatchError(null);
    try {
      let m: Match;
      try { m = await fetchMatchById(id, 'football'); }
      catch { m = await fetchMatchById(id, 'admin'); }
      const detectedSport = detectSport(m);
      setSport(detectedSport);
      setMatch(m);
    } catch (err) {
      setMatchError((err as Error).message ?? 'Failed to load match');
    } finally {
      setLoadingMatch(false);
    }
  }, [id]);

  const fetchOdds = useCallback(async (sportKind: SportKind) => {
    if (!id) return;
    setLoadingOdds(true);
    try {
      const result = await fetchAllOddsForSport(id, sportKind);
      setOdds1x2(result.odds1x2);
      setOddsHalfTime(result.oddsHalfTime);
      setOddsCorrectScore(result.oddsCorrectScore);
      setOddsHandicap(result.oddsHandicap);
    } finally {
      setLoadingOdds(false);
    }
  }, [id]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);
  useEffect(() => {
    if (!loadingMatch && match) fetchOdds(sport);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, loadingMatch]);

  useEffect(() => {
    if (!match) return;
    const isLive = LIVE_STATUSES.has(match.status ?? '');
    if (!isLive) return;
    const interval = setInterval(() => { fetchMatch(); }, 30_000);
    return () => clearInterval(interval);
  }, [match, fetchMatch]);

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loadingMatch) return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <SkeletonBlock className="h-5 w-20" />
      <div className="card p-6 space-y-4">
        <SkeletonBlock className="h-4 w-32" />
        <div className="flex justify-center gap-6">
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-8 w-20" />
          <SkeletonBlock className="h-8 w-24" />
        </div>
        <SkeletonBlock className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-3">{[0,1,2,3].map((i) => <SkeletonBlock key={i} className="h-14" />)}</div>
    </div>
  );

  if (matchError || !match) return (
    <div className="p-8 text-center">
      <p className="text-red-500 text-sm mb-3">{matchError ?? 'Match not found'}</p>
      <button onClick={() => navigate(-1)} className="text-sm hover:underline" style={{ color: 'var(--primary)' }}>
        Go back
      </button>
    </div>
  );

  const isLive     = LIVE_STATUSES.has(match.status ?? '');
  const isFinished = FINISHED_STATUSES.has(match.status ?? '');

  // ── KEY CHANGE: admin live games lock ALL odds ───────────────────────────
  // For admin matches: lock when finished OR when live
  // For regular matches: lock only when finished
  const oddsLocked = isFinished || (sport === 'admin' && isLive);

  const matchName = `${match.homeTeam} vs ${match.awayTeam}`;

  // League label with fallback
  const leagueLabel = (match.league && match.league.trim() && match.league.toLowerCase() !== 'n/a')
    ? match.league
    : getFallbackLeague(match.id ?? id ?? 'default');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="p-4">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm mb-4 transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowBackIcon fontSize="small" /> Back
        </button>

        {/* ── Match Header — reference style ── */}
        <div className="card p-5 mb-4">

          {/* League row + live badge */}
          <div className="flex items-center gap-2 mb-5">
            {match.leagueLogo && (
              <img
                src={match.leagueLogo} alt={leagueLabel}
                className="w-4 h-4 object-contain shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span
              className="text-xs font-bold uppercase tracking-widest truncate flex-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {leagueLabel}
            </span>

            {/* Refresh */}
            <button
              onClick={() => { fetchMatch(); fetchOdds(sport); }}
              className="shrink-0 transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
              title="Refresh"
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </button>

            {/* Live badge — reference style with wifi icon */}
            {isLive && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide shrink-0"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <WifiIcon sx={{ fontSize: 11 }} />
                LIVE {timerStr}
              </span>
            )}
            {isFinished && (
              <span
                className="text-xs font-bold uppercase tracking-wide shrink-0 px-2 py-0.5 rounded-full"
                style={{ background: 'var(--card-alt)', color: 'var(--text-muted)' }}
              >
                {finishedLabel(match.status)}
              </span>
            )}
            {!isLive && !isFinished && match.kickoffAt && (
              <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                <ScheduleIcon sx={{ fontSize: 12 }} />
                {formatKickoff(match.kickoffAt)}
              </span>
            )}
          </div>

          {/* Teams + score row — reference layout */}
          <div className="flex items-center justify-between gap-2 mb-4">
            {/* Home team */}
            <div className="flex flex-col items-center flex-1 min-w-0 gap-2">
              {match.homeLogo ? (
                <img
                  src={match.homeLogo} alt={match.homeTeam}
                  className="w-14 h-14 object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black"
                  style={{ background: 'var(--card-alt)', color: 'var(--primary)' }}
                >
                  {match.homeTeam?.charAt(0)}
                </div>
              )}
              <h2 className="font-heading text-sm font-bold text-center leading-tight" style={{ color: 'var(--text-main)' }}>
                {match.homeTeam}
              </h2>
            </div>

            {/* Score / kickoff */}
            <div className="flex flex-col items-center shrink-0 px-2">
              {(isLive || isFinished) ? (
                <div
                  className="font-heading text-5xl font-black tabular-nums tracking-tight"
                  style={{ color: 'var(--text-main)' }}
                >
                  {match.scoreHome ?? 0}
                  <span style={{ color: 'var(--border-light)', margin: '0 6px' }}>:</span>
                  {match.scoreAway ?? 0}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-heading text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                    {formatKickoff(match.kickoffAt)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Kick-off
                  </span>
                </div>
              )}
              {match.kickoffAt && (
                <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <CalendarTodayIcon sx={{ fontSize: 11 }} />
                  {formatDate(match.kickoffAt)}
                </div>
              )}
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center flex-1 min-w-0 gap-2">
              {match.awayLogo ? (
                <img
                  src={match.awayLogo} alt={match.awayTeam}
                  className="w-14 h-14 object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black"
                  style={{ background: 'var(--card-alt)', color: 'var(--primary)' }}
                >
                  {match.awayTeam?.charAt(0)}
                </div>
              )}
              <h2 className="font-heading text-sm font-bold text-center leading-tight" style={{ color: 'var(--text-main)' }}>
                {match.awayTeam}
              </h2>
            </div>
          </div>

          {/* Betting closed banner — shown inside header card */}
          {oddsLocked && (
            <BettingClosedBanner reason={isFinished ? 'finished' : 'live'} />
          )}
        </div>

        {/* ── Odds: reference-style all-markets view ── */}
        {loadingOdds ? (
          <div className="flex justify-center py-8">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <AllMarketsView
            odds1x2={odds1x2}
            oddsHalfTime={oddsHalfTime}
            oddsCorrectScore={oddsCorrectScore}
            oddsHandicap={oddsHandicap}
            matchId={match.id}
            matchName={matchName}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            locked={oddsLocked}
            sport={sport}
          />
        )}

      </div>
    </div>
  );
}
