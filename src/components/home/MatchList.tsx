// ---------------------------------------------------------------------------
// updated match list — old logic + new UI from v2
// CHANGES IN THIS VERSION:
//   • Top-6 league tab: BOTH home and away team must belong to the league
//   • Countdown timer: smaller, muted, subtle (not bold/visible)
//   • RecentWinnersBar: no avatar icon, shows masked phone number + amount won
//   • Carousel speed slowed from 55s → 90s
//   • League tab fallback: if a specific league tab has no matches, falls back
//     to showing all available matches (with a subtle notice)
//   • RecentWinnersBar: now uses same CSS variables as match cards for
//     full light/dark mode parity — no more hardcoded palette
//   • FIX 6: Regular matches that share a home+away team fingerprint with any
//     admin match are suppressed from the main Live/Today/Upcoming/Results
//     sections so the same game never appears in both "Special Games" and the
//     regular list.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import api from '../../utils/api';
import type { Match } from '../../utils/api';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

// ---------------------------------------------------------------------------
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ADMIN LOGO POOLS — paste your 10 URLs here                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const HOME_LOGO_POOL: string[] = [
  'https://static.vecteezy.com/system/resources/thumbnails/011/049/345/small_2x/soccer-football-badge-logo-sport-team-identity-illustrations-isolated-on-white-background-vector.jpg',
  'https://marketplace.canva.com/EAGXHkfvP0k/2/0/1600w/canva-white-and-black-professional-design-football-club-logo-_0PEzCBc5Ao.jpg',
  'https://img.magnific.com/premium-vector/soccer-football-badge-logo-design-templates-sport-team-identity-vector-illustrations_683941-173.jpg',
  'https://marketplace.canva.com/EAFnwIBf4dU/2/0/1600w/canva-black-white-yellow-elegant-modern-football-club-logo-8HTQhmXBF18.jpg',
  'https://static.vecteezy.com/system/resources/previews/035/358/256/non_2x/football-club-logo-vector.jpg',
];

const AWAY_LOGO_POOL: string[] = [
  'https://marketplace.canva.com/EAF9gkRs2dU/2/0/1600w/canva-white-black-gold-circle-modern-football-club-logo-8y4rT2SOMu0.jpg',
  'https://logowik.com/content/uploads/images/football-club2744.logowik.com.webp',
  'https://img.freepik.com/free-vector/football-soccer-tournament-vector-logo-design_47987-24746.jpg?semt=ais_hybrid&w=740&q=80',
  'https://static.vecteezy.com/system/resources/thumbnails/012/995/442/small/football-championship-or-football-club-logo-vector.jpg',
  'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/logo-design-template-b588de7cc0b07e82392c3b2ea4ea7b73_screen.jpg?ts=1702915331',
];

// ---------------------------------------------------------------------------
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  RECENT WINNERS — 30 hardcoded entries                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
interface Winner {
  phone: string;
  amount: string;
  currency: 'GHS' | 'NGN' | 'USD';
  timeAgo: string;
}

const RECENT_WINNERS: Winner[] = [
  { phone: '0244****12', amount: '23,500',    currency: 'GHS', timeAgo: '2m'  },
  { phone: '0557****78', amount: '47,200',    currency: 'GHS', timeAgo: '5m'  },
  { phone: '0201****34', amount: '88,000',    currency: 'GHS', timeAgo: '9m'  },
  { phone: '0302****56', amount: '31,750',    currency: 'GHS', timeAgo: '14m' },
  { phone: '0249****90', amount: '65,400',    currency: 'GHS', timeAgo: '18m' },
  { phone: '0540****23', amount: '99,000',    currency: 'GHS', timeAgo: '22m' },
  { phone: '0268****67', amount: '54,800',    currency: 'GHS', timeAgo: '27m' },
  { phone: '0598****11', amount: '20,500',    currency: 'GHS', timeAgo: '31m' },
  { phone: '0241****45', amount: '76,300',    currency: 'GHS', timeAgo: '35m' },
  { phone: '0277****88', amount: '43,100',    currency: 'GHS', timeAgo: '40m' },
  { phone: '0803****21', amount: '4,200,000',  currency: 'NGN', timeAgo: '3m'  },
  { phone: '0816****54', amount: '850,000',    currency: 'NGN', timeAgo: '7m'  },
  { phone: '0705****77', amount: '22,500,000', currency: 'NGN', timeAgo: '11m' },
  { phone: '0901****32', amount: '1,700,000',  currency: 'NGN', timeAgo: '16m' },
  { phone: '0808****65', amount: '49,800,000', currency: 'NGN', timeAgo: '20m' },
  { phone: '0703****98', amount: '380,000',    currency: 'NGN', timeAgo: '24m' },
  { phone: '0812****43', amount: '7,600,000',  currency: 'NGN', timeAgo: '29m' },
  { phone: '0907****76', amount: '14,300,000', currency: 'NGN', timeAgo: '33m' },
  { phone: '0802****19', amount: '600,000',    currency: 'NGN', timeAgo: '37m' },
  { phone: '0818****52', amount: '33,000,000', currency: 'NGN', timeAgo: '42m' },
  { phone: '+1 (***) ***-3812', amount: '3,800',  currency: 'USD', timeAgo: '1m'  },
  { phone: '+1 (***) ***-7491', amount: '47,500', currency: 'USD', timeAgo: '6m'  },
  { phone: '+44 ****-***-220',  amount: '12,200', currency: 'USD', timeAgo: '10m' },
  { phone: '+1 (***) ***-6603', amount: '28,750', currency: 'USD', timeAgo: '15m' },
  { phone: '+1 (***) ***-5514', amount: '5,400',  currency: 'USD', timeAgo: '19m' },
  { phone: '+49 ****-***-881',  amount: '49,000', currency: 'USD', timeAgo: '23m' },
  { phone: '+1 (***) ***-9927', amount: '8,600',  currency: 'USD', timeAgo: '28m' },
  { phone: '+91 ****-***-334',  amount: '2,300',  currency: 'USD', timeAgo: '32m' },
  { phone: '+1 (***) ***-1158', amount: '19,900', currency: 'USD', timeAgo: '36m' },
  { phone: '+81 ****-***-762',  amount: '36,500', currency: 'USD', timeAgo: '41m' },
];

const CURRENCY_SYMBOL: Record<Winner['currency'], string> = {
  GHS: 'GHS',
  NGN: '₦',
  USD: '$',
};

// ---------------------------------------------------------------------------
// RecentWinnersBar
// ---------------------------------------------------------------------------
function RecentWinnersBar() {
  const doubled = useMemo(() => [...RECENT_WINNERS, ...RECENT_WINNERS], []);

  return (
    <div style={{ overflow: 'hidden', marginBottom: 14, position: 'relative' }}>
      <div style={{ overflow: 'hidden', padding: '2px 0 6px' }}>
        <div style={{
          display: 'flex',
          gap: 8,
          animation: 'winnersScroll 90s linear infinite',
          width: 'max-content',
        }}>
          {doubled.map((w, i) => (
            <div key={i} className="wc-card">
              <div className="wc-shimmer" />
              <span className="wc-dot" />
              <div style={{ lineHeight: 1 }}>
                <div className="wc-phone">{w.phone}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
                  <span className="wc-symbol">{CURRENCY_SYMBOL[w.currency]}</span>
                  <span className="wc-amount">{w.amount}</span>
                </div>
              </div>
              <div className="wc-time">{w.timeAgo}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="wc-fade-left" />
      <div className="wc-fade-right" />

      <style>{`
        .wc-card {
          flex-shrink: 0;
          background: var(--bg-card, rgba(255,255,255,0.6));
          border-radius: 12px;
          padding: 11px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid var(--border-card, rgba(0,0,0,0.08));
          min-width: 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .wc-shimmer {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, var(--primary, #f5a623) 50%, transparent 100%);
          opacity: 0.25;
        }
        .wc-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--live-green, #22c55e);
          box-shadow: 0 0 5px var(--live-green, #22c55e);
          display: inline-block;
          flex-shrink: 0;
          animation: winnerPulse 1.6s ease-in-out infinite;
        }
        .wc-phone {
          font-size: 12px; font-weight: 600;
          color: var(--text-muted, #64748b);
          white-space: nowrap; margin-bottom: 6px;
          font-family: system-ui, sans-serif; letter-spacing: 0.03em;
        }
        .wc-symbol {
          font-size: 10px; font-weight: 700;
          color: var(--primary, #f5a623);
          background: color-mix(in srgb, var(--primary, #f5a623) 12%, transparent);
          border-radius: 4px; padding: 2px 6px; letter-spacing: 0.06em;
          font-family: system-ui, sans-serif;
        }
        .wc-amount {
          font-size: 15px; font-weight: 800;
          color: var(--text-main, #0f172a);
          letter-spacing: -0.01em; font-family: system-ui, sans-serif;
        }
        .wc-time {
          font-size: 10px; font-weight: 600;
          color: var(--text-faint, #94a3b8);
          white-space: nowrap; align-self: flex-start; margin-top: 1px;
          font-family: system-ui, sans-serif; letter-spacing: 0.04em;
        }
        .wc-fade-left {
          position: absolute; top: 0; left: 0; bottom: 0; width: 28px;
          background: linear-gradient(90deg, var(--bg-page, #ffffff) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        .wc-fade-right {
          position: absolute; top: 0; right: 0; bottom: 0; width: 28px;
          background: linear-gradient(270deg, var(--bg-page, #ffffff) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        @keyframes winnersScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes winnerPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FloatingBetSlipButton
// ---------------------------------------------------------------------------
function FloatingBetSlipButton() {
  const navigate = useNavigate();
  const { betSlip } = useAppStore() as { betSlip: { matchId: string }[] };
  const count = betSlip?.length ?? 0;

  return (
    <button
      onClick={() => navigate('/betslip')}
      aria-label="Open bet slip"
      style={{
        position: 'fixed', bottom: 80, right: 16, zIndex: 1000,
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
        border: '1px solid rgba(96,165,250,0.3)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(37,99,235,0.5)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(37,99,235,0.7)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(37,99,235,0.5)';
      }}
    >
      <ReceiptLongIcon sx={{ fontSize: 24, color: '#e2e8f0' }} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -2, right: -2,
          background: '#1e3a5f', color: '#93c5fd', borderRadius: '50%',
          width: 18, height: 18, fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #0d1117', lineHeight: 1,
        }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SportTab = 'football' | 'basketball' | 'tennis' | 'baseball' | 'nfl' | 'mma';
type FootballLeagueTab = 'all' | 'premier_league' | 'la_liga' | 'bundesliga' | 'serie_a' | 'ligue_1' | 'other';
type MatchCategory = 'live' | 'today' | 'upcoming' | 'finished';

interface OddsMap { home: number; draw: number; away: number; }
interface EnrichedMatch extends Match {
  oddsMap?: OddsMap;
  adminHomeLogo?: string;
  adminAwayLogo?: string;
}

interface BetSlipEntry {
  matchId: string;
  matchName: string;
  market: string;
  selection: string;
  odd: number;
}

// ---------------------------------------------------------------------------
// BLOB URL GUARD
// ---------------------------------------------------------------------------
function sanitizeLogo(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('blob:')) return '';
  return trimmed;
}

function assignAdminLogos(matches: EnrichedMatch[]): EnrichedMatch[] {
  const poolSize = Math.max(HOME_LOGO_POOL.length, AWAY_LOGO_POOL.length, 1);
  return matches.map((m, idx) => {
    const hardHome = sanitizeLogo((m as unknown as Record<string, string>).hardcodedHomeLogo);
    const hardAway = sanitizeLogo((m as unknown as Record<string, string>).hardcodedAwayLogo);
    const homeUrl = hardHome || sanitizeLogo(HOME_LOGO_POOL[idx % poolSize]) || '';
    const awayUrl = hardAway || sanitizeLogo(AWAY_LOGO_POOL[idx % poolSize]) || '';
    return { ...m, adminHomeLogo: homeUrl, adminAwayLogo: awayUrl };
  });
}

// ---------------------------------------------------------------------------
// FIX 6: Build + test admin team fingerprints
// Fingerprint = `${homeTeamLower}|${awayTeamLower}` (no date — admin matches
// may not share the exact kickoffAt of the live-feed entry for the same game).
// ---------------------------------------------------------------------------
function buildAdminTeamFingerprints(adminMatches: EnrichedMatch[]): Set<string> {
  const fps = new Set<string>();
  for (const m of adminMatches) {
    const home = (m.homeTeam ?? '').toLowerCase().trim();
    const away = (m.awayTeam ?? '').toLowerCase().trim();
    if (home && away) fps.add(`${home}|${away}`);
  }
  return fps;
}

function isMatchInAdminSet(match: EnrichedMatch, adminFps: Set<string>): boolean {
  const home = (match.homeTeam ?? '').toLowerCase().trim();
  const away = (match.awayTeam ?? '').toLowerCase().trim();
  return adminFps.has(`${home}|${away}`);
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const HIDDEN_ADMIN_IDS_KEY = 'hidden_finished_admin_match_ids';
function loadHiddenAdminIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_ADMIN_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch { /* ignore */ }
  return new Set();
}
function saveHiddenAdminIds(ids: Set<string>): void {
  try { localStorage.setItem(HIDDEN_ADMIN_IDS_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
}
function addHiddenAdminId(id: string): void {
  const ids = loadHiddenAdminIds();
  ids.add(id);
  saveHiddenAdminIds(ids);
}

// ---------------------------------------------------------------------------
// Hardcoded league → teams mappings
// ---------------------------------------------------------------------------
const LEAGUE_TEAMS: Record<Exclude<FootballLeagueTab, 'all' | 'other'>, { leagueNames: string[]; teams: string[] }> = {
  premier_league: {
    leagueNames: ['Premier League', 'English Premier League', 'EPL'],
    teams: [
      'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Brighton & Hove Albion',
      'Chelsea','Crystal Palace','Everton','Fulham','Ipswich','Ipswich Town',
      'Leicester','Leicester City','Liverpool','Manchester City','Manchester United',
      'Newcastle','Newcastle United','Nottingham Forest','Nottm Forest','Southampton',
      'Tottenham','Tottenham Hotspur','West Ham','West Ham United','Wolves','Wolverhampton',
      'Wolverhampton Wanderers','Sunderland','Leeds United','Leeds','Burnley','AFC Bournemouth',
    ],
  },
  la_liga: {
    leagueNames: ['La Liga','LaLiga','La Liga EA Sports','Primera División','Primera Division'],
    teams: [
      'Athletic Club','Athletic Bilbao','Atlético Madrid','Atletico Madrid','Atlético de Madrid',
      'Barcelona','FC Barcelona','Celta Vigo','Deportivo Alavés','Deportivo Alaves',
      'Espanyol','RCD Espanyol','Getafe','Girona','Las Palmas','UD Las Palmas',
      'Leganés','Leganes','CD Leganés','Mallorca','RCD Mallorca','Osasuna','CA Osasuna',
      'Rayo Vallecano','Real Betis','Real Madrid','Real Sociedad','Real Valladolid',
      'Sevilla','Sevilla FC','Valencia','Valencia CF','Villarreal','Villarreal CF',
      'Alavés','Alaves','Levante','Elche','Real Oviedo',
    ],
  },
  bundesliga: {
    leagueNames: ['Bundesliga','1. Bundesliga','German Bundesliga','Fußball-Bundesliga'],
    teams: [
      'Augsburg','FC Augsburg','Bayer Leverkusen','Bayern Munich','FC Bayern München',
      'FC Bayern Munich','Borussia Dortmund','BVB','Borussia Mönchengladbach',
      'Borussia Monchengladbach','Eintracht Frankfurt','Freiburg','SC Freiburg',
      'Hamburg','Hamburger SV','Hamburg SV','Heidenheim','1. FC Heidenheim','1. FC Heidenheim 1846',
      'Hoffenheim','TSG Hoffenheim','Holstein Kiel','Mainz','Mainz 05','1. FSV Mainz 05',
      'RB Leipzig','Red Bull Leipzig','St. Pauli','FC St. Pauli','Stuttgart','VfB Stuttgart',
      'Union Berlin','1. FC Union Berlin','Werder Bremen','SV Werder Bremen','Wolfsburg',
      'VfL Wolfsburg','FC Cologne','1. FC Köln','Cologne',
    ],
  },
  serie_a: {
    leagueNames: ['Serie A','Italian Serie A','Serie A TIM'],
    teams: [
      'AC Milan','Milan','Atalanta','Atalanta BC','Bologna','Bologna FC',
      'Cagliari','Cagliari Calcio','Como','Como 1907','Empoli','Fiorentina','ACF Fiorentina',
      'Genoa','Genoa CFC','Hellas Verona','Inter','Inter Milan','FC Internazionale',
      'Internazionale','Juventus','Juve','Lazio','SS Lazio','Lecce','US Lecce',
      'Monza','AC Monza','Napoli','SSC Napoli','Parma','Parma Calcio','Roma','AS Roma',
      'Torino','Torino FC','Udinese','Udinese Calcio','Venezia','Venezia FC',
      'Cremonese','Pisa','Sassuolo',
    ],
  },
  ligue_1: {
    leagueNames: ['Ligue 1','Ligue 1 Uber Eats','French Ligue 1',"Ligue 1 McDonald's"],
    teams: [
      'Angers','SCO Angers','Auxerre','AJ Auxerre','Brest','Stade Brestois',
      'Stade Brestois 29','Le Havre','Le Havre AC','HAC','Lens','RC Lens','Lille','LOSC Lille',
      'Lyon','Olympique Lyonnais','OL','Marseille','Olympique de Marseille','OM',
      'Monaco','AS Monaco','Montpellier','Montpellier HSC','Nantes','FC Nantes',
      'Nice','OGC Nice','Paris Saint-Germain','PSG','Paris SG','Paris FC',
      'Reims','Stade de Reims','Rennes','Stade Rennais','Saint-Étienne','Saint-Etienne',
      'AS Saint-Étienne','Strasbourg','RC Strasbourg','Toulouse','Toulouse FC',
      'Metz','Lorient',
    ],
  },
};

const TEAM_TO_LEAGUE_TAB = new Map<string, Exclude<FootballLeagueTab, 'all' | 'other'>>();
const LEAGUE_NAME_TO_TAB = new Map<string, Exclude<FootballLeagueTab, 'all' | 'other'>>();

for (const [tab, { leagueNames, teams }] of Object.entries(LEAGUE_TEAMS) as [Exclude<FootballLeagueTab, 'all' | 'other'>, typeof LEAGUE_TEAMS[keyof typeof LEAGUE_TEAMS]][]) {
  for (const name of leagueNames) LEAGUE_NAME_TO_TAB.set(name.toLowerCase(), tab);
  for (const team of teams) TEAM_TO_LEAGUE_TAB.set(team.toLowerCase(), tab);
}

function matchBelongsToLeagueTab(match: Match, tab: Exclude<FootballLeagueTab, 'all' | 'other'>): boolean {
  if (LEAGUE_NAME_TO_TAB.get((match.league ?? '').toLowerCase()) === tab) return true;
  const homeTab = TEAM_TO_LEAGUE_TAB.get((match.homeTeam ?? '').toLowerCase());
  const awayTab = TEAM_TO_LEAGUE_TAB.get((match.awayTeam ?? '').toLowerCase());
  return homeTab === tab && awayTab === tab;
}

function inferLeagueFromTeams(homeTeam: string, awayTeam: string): string {
  const h = homeTeam.toLowerCase();
  const a = awayTeam.toLowerCase();
  for (const [, { leagueNames, teams }] of Object.entries(LEAGUE_TEAMS) as [Exclude<FootballLeagueTab, 'all' | 'other'>, typeof LEAGUE_TEAMS[keyof typeof LEAGUE_TEAMS]][]) {
    const teamSet = new Set(teams.map((t) => t.toLowerCase()));
    if (teamSet.has(h) && teamSet.has(a)) return leagueNames[0];
  }
  return '';
}

const SPORT_TABS: { key: SportTab; label: string; icon: React.ReactNode }[] = [
  { key: 'football',   label: 'Football',   icon: <SportsSoccerIcon sx={{ fontSize: 15 }} /> },
  { key: 'basketball', label: 'Basketball', icon: <SportsBasketballIcon sx={{ fontSize: 15 }} /> },
  { key: 'tennis',     label: 'Tennis',     icon: <SportsTennisIcon sx={{ fontSize: 15 }} /> },
  { key: 'baseball',   label: 'Baseball',   icon: <SportsBaseballIcon sx={{ fontSize: 15 }} /> },
  { key: 'nfl',        label: 'NFL',        icon: <SportsFootballIcon sx={{ fontSize: 15 }} /> },
  { key: 'mma',        label: 'MMA',        icon: <SportsMmaIcon sx={{ fontSize: 15 }} /> },
];

const FOOTBALL_LEAGUE_TABS: { key: FootballLeagueTab; label: string }[] = [
  { key: 'all',            label: 'All'            },
  { key: 'premier_league', label: 'Premier League' },
  { key: 'la_liga',        label: 'La Liga'        },
  { key: 'bundesliga',     label: 'Bundesliga'     },
  { key: 'serie_a',        label: 'Serie A'        },
  { key: 'ligue_1',        label: 'Ligue 1'        },
  { key: 'other',          label: 'Other'          },
];

const TWO_WAY_ODDS_SPORTS = new Set<SportTab>(['baseball','basketball','nfl','mma']);

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

function finishedLabel(status?: string): string {
  const s = status ?? '';
  if (['FINISHED','finished','FULL_TIME','full_time','FT','ft','AWARDED','awarded','ENDED','ended',
       'COMPLETED','completed','COMPLETE','complete','STATUS_FINAL','STATUS_FULL_TIME'].includes(s)) return 'FT';
  if (['AFTER_EXTRA_TIME','after_extra_time','AET','aet'].includes(s)) return 'AET';
  if (['AFTER_PENALTIES','after_penalties','AP','ap'].includes(s)) return 'PEN';
  if (['POSTPONED','postponed','STATUS_POSTPONED'].includes(s)) return 'PPD';
  if (['CANCELLED','cancelled','CANCELED','canceled','STATUS_CANCELED'].includes(s)) return 'CANC';
  if (['ABANDONED','abandoned','STATUS_ABANDONED'].includes(s)) return 'ABD';
  if (['VOID','void'].includes(s)) return 'VOID';
  if (['WALKOVER','walkover'].includes(s)) return 'WO';
  if (['INTERRUPTED','interrupted','STATUS_SUSPENDED'].includes(s)) return 'INT';
  return 'FT';
}

const TOP_6_LEAGUE_DISPLAY_NAMES = ['Premier League','La Liga','Bundesliga','Serie A','Ligue 1'];
const TOP_6_LABELS  = new Set<string>(TOP_6_LEAGUE_DISPLAY_NAMES);
const CUPS_LABELS   = new Set<string>([
  'FA Cup','EFL Cup / Carabao Cup','Copa del Rey','DFB Pokal','Coppa Italia',
  'Coupe de France','UEFA Champions League','UEFA Europa League',
  'UEFA Conference League','UEFA Nations League','UEFA Euros',
  'Copa Libertadores','Copa América','CONCACAF Champions Cup',
  'AFC Champions League','CAF Champions League','Africa Cup of Nations',
  'FIFA World Cup',"Women's World Cup",'FIFA Club World Cup',
]);

function leagueSortKey(league: string): string {
  if (!league) return '99_zzz_unknown';
  for (let i = 0; i < TOP_6_LEAGUE_DISPLAY_NAMES.length; i++) {
    if (league === TOP_6_LEAGUE_DISPLAY_NAMES[i]) return `00_${String(i).padStart(2,'0')}_${league}`;
  }
  if (CUPS_LABELS.has(league)) return `01_${league.toLowerCase()}`;
  return `02_${league.toLowerCase()}`;
}

function categorise(match: Match): MatchCategory {
  const status = match.status ?? '';
  if (FINISHED_STATUSES.has(status)) return 'finished';
  if (LIVE_STATUSES.has(status)) return 'live';
  if (match.kickoffAt) {
    const kickoff = new Date(match.kickoffAt);
    const now = new Date();
    if (kickoff.toISOString().slice(0,10) === now.toISOString().slice(0,10)) return 'today';
    if (kickoff > now) return 'upcoming';
    return 'today';
  }
  return 'upcoming';
}

function formatKickoff(kickoffAt?: string): string {
  if (!kickoffAt) return '--:--';
  return new Date(kickoffAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(kickoffAt?: string): string {
  if (!kickoffAt) return '';
  return new Date(kickoffAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatCountdown(kickoffAt?: string): string {
  if (!kickoffAt) return '';
  const diff = new Date(kickoffAt).getTime() - Date.now();
  if (diff <= 0) return 'Starting soon';
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getTeamInitials(name: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const stopwords = new Set(['fc','sc','ac','bc','rc','if','bk','sk','nk','fk','hk','vfb','vfl','afc','rcd','ssv','tsv','bv','sv','cf','us','as','ss','ud','og']);
  const meaningful = words.filter((w) => !stopwords.has(w.toLowerCase().replace(/[^a-z]/g, '')));
  const src = meaningful.length >= 2 ? meaningful : words;
  return (src[0][0] + (src[1]?.[0] ?? '')).toUpperCase();
}

function teamColour(name: string): string {
  const PALETTE = [
    '#1a6b3c','#c0392b','#2471a3','#6c3483','#d35400',
    '#117a65','#1f618d','#784212','#1a5276','#4a235a',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function TeamLogo({ logo, name, size = 32 }: { logo?: string; name?: string; size?: number }) {
  const cleanLogo = sanitizeLogo(logo);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [cleanLogo]);
  const teamName = name ?? '';
  if (cleanLogo && !failed) {
    return (
      <img src={cleanLogo} alt={teamName}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }}
        onError={() => setFailed(true)} />
    );
  }
  const initials = getTeamInitials(teamName);
  const bg = teamColour(teamName);
  return (
    <div style={{ width: size, height: size, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', flexShrink: 0, fontSize: size * 0.28, fontWeight: 700, color: '#fff',
      letterSpacing: '0.02em', userSelect: 'none' }} aria-label={teamName}>
      {initials}
    </div>
  );
}

function TeamLogoAdmin({ poolUrl, name, size = 32 }: { poolUrl?: string; name?: string; size?: number }) {
  const cleanUrl = sanitizeLogo(poolUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [cleanUrl]);
  const teamName = name ?? '';
  if (cleanUrl && !failed) {
    return (
      <img src={cleanUrl} alt={teamName}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }}
        onError={() => setFailed(true)} />
    );
  }
  const initials = getTeamInitials(teamName);
  const bg = teamColour(teamName);
  return (
    <div style={{ width: size, height: size, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', flexShrink: 0, fontSize: size * 0.28, fontWeight: 700, color: '#fff',
      letterSpacing: '0.02em', userSelect: 'none' }} aria-label={teamName}>
      {initials}
    </div>
  );
}

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
    if (sel === 'home') { if (home === 0) home = val; }
    else if (sel === 'away') { if (away === 0) away = val; }
    else if (sel === 'draw' || sel === 'x') { if (draw === 0) draw = val; }
    else if (matchesTeam(sel, normHome)) { if (home === 0) home = val; }
    else if (matchesTeam(sel, normAway)) { if (away === 0) away = val; }
  }
  if (home === 0 && draw === 0 && away === 0) {
    const vals = pool.map(parseOdd).filter((v) => v > 1 && v < 50);
    if (vals.length >= 2) {
      return vals.length >= 3
        ? { home: vals[0], draw: vals[1], away: vals[2] }
        : { home: vals[0], draw: 0, away: vals[1] };
    }
    return undefined;
  }
  return { home, draw, away };
}

function extractAdminOdds(raw: Record<string, unknown>, homeTeam: string, awayTeam: string): OddsMap | undefined {
  const flatHome = parseFloat(String(raw.homeOdds ?? raw.home_odds ?? raw.oddHome ?? raw.odd_home ?? '0'));
  const flatDraw = parseFloat(String(raw.drawOdds ?? raw.draw_odds ?? raw.oddDraw ?? raw.odd_draw ?? '0'));
  const flatAway = parseFloat(String(raw.awayOdds ?? raw.away_odds ?? raw.oddAway ?? raw.odd_away ?? '0'));
  if (flatHome > 0 || flatDraw > 0 || flatAway > 0) return { home: flatHome, draw: flatDraw, away: flatAway };
  if (raw.odds && typeof raw.odds === 'object' && !Array.isArray(raw.odds)) {
    const o = raw.odds as Record<string, unknown>;
    const h = parseFloat(String(o.home ?? o.homeOdds ?? o['1'] ?? '0'));
    const d = parseFloat(String(o.draw ?? o.drawOdds ?? o['x'] ?? o['X'] ?? '0'));
    const a = parseFloat(String(o.away ?? o.awayOdds ?? o['2'] ?? '0'));
    if (h > 0 || d > 0 || a > 0) return { home: h, draw: d, away: a };
  }
  const ARRAY_FIELDS = ['odds', 'match_result', 'markets', 'selections', 'outcomes', 'bookmakers'] as const;
  let oddsArr: unknown[] = [];
  for (const field of ARRAY_FIELDS) {
    const val = raw[field];
    if (Array.isArray(val) && val.length > 0) { oddsArr = val; break; }
  }
  if (oddsArr.length > 0) {
    const first = oddsArr[0] as Record<string, unknown>;
    if (Array.isArray(first?.outcomes)) oddsArr = (oddsArr as Record<string, unknown>[]).flatMap((b) => (b.outcomes as unknown[]) ?? []);
    else if (Array.isArray(first?.selections)) oddsArr = (oddsArr as Record<string, unknown>[]).flatMap((b) => (b.selections as unknown[]) ?? []);
    return extractOddsMap(oddsArr, homeTeam, awayTeam);
  }
  return undefined;
}

void extractAdminOdds;

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
      Array.isArray(i.odds) ? i.odds :
      Array.isArray(i.markets) ? i.markets : [];
    items.push({ match, odds });
  };
  const processArray = (arr: unknown[]) => arr.forEach(processItem);
  const data = obj.data;
  if (Array.isArray(data)) { processArray(data); }
  else if (data && typeof data === 'object') {
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val)) processArray(val);
    }
  }
  return items;
}

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
  const competitorsArr = Array.isArray(r.competitors) ? r.competitors as Record<string, unknown>[] : null;
  const competitionsArr = Array.isArray(r.competitions) ? r.competitions as Record<string, unknown>[] : null;
  const firstComp = competitionsArr?.[0] as Record<string, unknown> | undefined;
  const nestedCompetitors = Array.isArray(firstComp?.competitors)
    ? firstComp!.competitors as Record<string, unknown>[] : null;

  const resolveCompetitors = (arr: Record<string, unknown>[]) => {
    for (const c of arr) {
      const side = String(c.homeAway ?? c.type ?? '').toLowerCase();
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

  const getLogoFromObj = (obj: Record<string, unknown> | null): string => {
    if (!obj) return '';
    if (Array.isArray(obj.logos) && obj.logos.length > 0) {
      const first = obj.logos[0] as Record<string, unknown>;
      return String(first.href ?? first.url ?? '');
    }
    return String(obj.logo ?? obj.logoUrl ?? obj.crest ?? obj.image ?? obj.photo ?? obj.img ?? '');
  };

  let homeTeam = String(
    r.homeTeam ?? r.home_team ?? r.homeName ?? r.home_name ??
    homeObj?.name ?? homeObj?.displayName ?? homeObj?.teamName ?? ''
  ).trim();
  let awayTeam = String(
    r.awayTeam ?? r.away_team ?? r.awayName ?? r.away_name ??
    awayObj?.name ?? awayObj?.displayName ?? awayObj?.teamName ?? ''
  ).trim();

  if ((!homeTeam || !awayTeam) && typeof r.name === 'string') {
    const name = r.name as string;
    const atMatch = name.match(/^(.+?)\s+at\s+(.+)$/i);
    const vsMatch = name.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    if (atMatch) { if (!awayTeam) awayTeam = atMatch[1].trim(); if (!homeTeam) homeTeam = atMatch[2].trim(); }
    else if (vsMatch) { if (!homeTeam) homeTeam = vsMatch[1].trim(); if (!awayTeam) awayTeam = vsMatch[2].trim(); }
  }
  if (!homeTeam && !awayTeam) return null;

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
  } else { status = String(rawStatus ?? ''); }

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

  const kickoffAt = String(
    r.kickoffAt ?? r.kickoff_at ?? r.startTime ?? r.start_time ?? r.date ?? r.scheduledAt ?? r.datetime ??
    firstComp?.date ?? ''
  );
  const rawHomeLogo = String(
    r.homeLogo ?? r.home_logo ?? r.homeCrest ?? r.homeTeamLogo ?? r.home_team_logo ??
    r.homeImage ?? r.home_image ?? r.homePhoto ?? r.home_photo ??
    homeObj?.logo ?? homeObj?.logoUrl ?? homeObj?.crest ?? homeObj?.image ?? homeObj?.photo ?? ''
  ).trim() || getLogoFromObj(homeObj);
  const rawAwayLogo = String(
    r.awayLogo ?? r.away_logo ?? r.awayCrest ?? r.awayTeamLogo ?? r.away_team_logo ??
    r.awayImage ?? r.away_image ?? r.awayPhoto ?? r.away_photo ??
    awayObj?.logo ?? awayObj?.logoUrl ?? awayObj?.crest ?? awayObj?.image ?? awayObj?.photo ?? ''
  ).trim() || getLogoFromObj(awayObj);

  const homeLogo = sanitizeLogo(rawHomeLogo);
  const awayLogo = sanitizeLogo(rawAwayLogo);

  let minutePlayed: number | undefined;
  if (r.minutePlayed != null) minutePlayed = Number(r.minutePlayed);
  else if (r.minute_played != null) minutePlayed = Number(r.minute_played);
  else if (rawStatus && typeof rawStatus === 'object') {
    const so = rawStatus as Record<string, unknown>;
    const clock = so.displayClock ?? so.clock;
    if (clock) { const mins = parseInt(String(clock), 10); if (!isNaN(mins)) minutePlayed = mins; }
  }

  return {
    id, source: (r.source as Match['source']) ?? 'ESPN',
    homeTeam, awayTeam, league: leagueName, status, kickoffAt,
    scoreHome, scoreAway, homeLogo, awayLogo, leagueLogo, minutePlayed,
    sport: String(r.sport ?? 'FOOTBALL'),
    createdAt: String(r.createdAt ?? r.created_at ?? ''),
  } as Match;
}

function normalizeAdminMatch(raw: unknown): Match | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r.matchId ?? r.match_id ?? '');
  if (!id || id === 'undefined') return null;
  const homeTeam = String(r.homeTeam ?? r.home_team ?? r.homeName ?? r.home_name ?? '').trim();
  const awayTeam = String(r.awayTeam ?? r.away_team ?? r.awayName ?? r.away_name ?? '').trim();
  let leagueName = '';
  let leagueLogo = '';
  const rawLeague = r.league ?? r.leagueName ?? r.league_name ?? r.competition ?? r.competitionName;
  if (rawLeague && typeof rawLeague === 'object') {
    const lo = rawLeague as Record<string, unknown>;
    leagueName = String(lo.name ?? lo.displayName ?? lo.shortName ?? '');
    leagueLogo = String(lo.logo ?? lo.logoUrl ?? lo.logo_url ?? '');
  } else if (typeof rawLeague === 'string' && rawLeague.trim()) {
    leagueName = rawLeague.trim();
  }
  if (!leagueLogo) leagueLogo = String(r.leagueLogo ?? r.league_logo ?? r.competitionLogo ?? r.competition_logo ?? '');
  leagueLogo = sanitizeLogo(leagueLogo);
  if (!leagueName && homeTeam && awayTeam) leagueName = inferLeagueFromTeams(homeTeam, awayTeam);
  const status = String(r.status ?? r.matchStatus ?? r.match_status ?? '');
  const scoreHome = r.scoreHome != null ? Number(r.scoreHome)
    : r.score_home != null ? Number(r.score_home)
    : r.homeScore != null ? Number(r.homeScore)
    : undefined;
  const scoreAway = r.scoreAway != null ? Number(r.scoreAway)
    : r.score_away != null ? Number(r.score_away)
    : r.awayScore != null ? Number(r.awayScore)
    : undefined;
  const kickoffAt = String(r.kickoffAt ?? r.kickoff_at ?? r.startTime ?? r.start_time ?? r.date ?? r.scheduledAt ?? '');
  const minutePlayed = r.minutePlayed != null ? Number(r.minutePlayed) : r.minute_played != null ? Number(r.minute_played) : undefined;
  const hardcodedHomeLogo = sanitizeLogo(String(r.hardcodedHomeLogo ?? r.hardcoded_home_logo ?? r.homeLogo ?? r.home_logo ?? '').trim());
  const hardcodedAwayLogo = sanitizeLogo(String(r.hardcodedAwayLogo ?? r.hardcoded_away_logo ?? r.awayLogo ?? r.away_logo ?? '').trim());
  return {
    id, source: 'ADMIN_CREATED' as Match['source'],
    homeTeam: homeTeam || 'Home Team',
    awayTeam: awayTeam || 'Away Team',
    league: leagueName, status, kickoffAt, scoreHome, scoreAway,
    homeLogo: hardcodedHomeLogo, awayLogo: hardcodedAwayLogo, leagueLogo, minutePlayed,
    sport: String(r.sport ?? 'FOOTBALL'),
    createdAt: String(r.createdAt ?? r.created_at ?? ''),
  } as Match;
}

function safeUnwrapList(raw: unknown): Match[] {
  if (!raw) return [];
  const normalize = (arr: unknown[]): Match[] =>
    arr.map(normalizeMatch).filter((m): m is Match => m !== null);
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

function dedup(matches: Match[]): EnrichedMatch[] {
  const seen = new Set<string>();
  return matches
    .filter(({ id }) => { if (seen.has(id)) return false; seen.add(id); return true; })
    .map((m) => ({ ...m }));
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

function unwrapAdminMatches(raw: unknown): Match[] {
  if (!raw) return [];
  const obj = raw as Record<string, unknown>;
  if (!obj.success) return [];
  const data = obj.data;
  if (!Array.isArray(data)) return [];
  return (data as unknown[]).reduce<Match[]>((acc, item) => {
    const match = normalizeAdminMatch(item);
    if (match?.id) acc.push(match);
    return acc;
  }, []);
}

async function fetchAdminMatchOdds(matchId: string): Promise<unknown[]> {
  try {
    const raw = await fetch(
      `https://futballbackend-production-aefb.up.railway.app/api/public/admin-matches/${matchId}/odds`
    ).then((r) => r.json());
    return safeUnwrapOddsArray(raw);
  } catch { return []; }
}

function mergeOddsById(oddsById: Map<string, unknown[]>, entries: Array<{ match: Match; odds: unknown[] }>): void {
  for (const { match, odds } of entries) {
    if (odds.length === 0) continue;
    const existing = oddsById.get(match.id);
    if (!existing || odds.length > existing.length) oddsById.set(match.id, odds);
  }
}

function hasValidOdds(match: EnrichedMatch): boolean {
  if (FINISHED_STATUSES.has(match.status ?? '')) return true;
  const o = match.oddsMap;
  if (!o) return false;
  return o.home > 0 && o.away > 0;
}

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

  const oddsById = new Map<string, unknown[]>();
  const withOddsItems     = withOddsRes.status  === 'fulfilled' ? unwrapWithAllOdds(withOddsRes.value)   : [];
  const fromUpcomingItems = upcomingRes.status   === 'fulfilled' ? unwrapWithAllOdds(upcomingRes.value)   : [];
  const fromTodayItems    = todayRes.status      === 'fulfilled' ? unwrapWithAllOdds(todayRes.value)      : [];

  mergeOddsById(oddsById, withOddsItems);
  mergeOddsById(oddsById, fromUpcomingItems);
  mergeOddsById(oddsById, fromTodayItems);
  if (liveRes.status === 'fulfilled') mergeOddsById(oddsById, unwrapWithAllOdds(liveRes.value));

  const oddsByFingerprint = new Map<string, unknown[]>();
  const makeFingerprint = (home: string, away: string, kickoff: string) =>
    `${home.toLowerCase().trim()}|${away.toLowerCase().trim()}|${kickoff.slice(0, 10)}`;

  for (const [matchId, odds] of oddsById.entries()) {
    const sourceMatch = [...withOddsItems, ...fromUpcomingItems, ...fromTodayItems].find(({ match }) => match.id === matchId)?.match;
    if (sourceMatch?.homeTeam && sourceMatch?.awayTeam && sourceMatch?.kickoffAt) {
      const fp = makeFingerprint(sourceMatch.homeTeam, sourceMatch.awayTeam, sourceMatch.kickoffAt);
      if (!oddsByFingerprint.has(fp)) oddsByFingerprint.set(fp, odds);
    }
  }

  const fromWithOdds = withOddsItems.map(({ match }) => match);
  const fromLive     = liveRes.status === 'fulfilled' ? safeUnwrapList(liveRes.value) : [];
  const fromUpcoming = fromUpcomingItems.map(({ match }) => match);
  const fromToday    = fromTodayItems.map(({ match }) => match);
  const fromResults  = resultsRes.status === 'fulfilled' ? safeUnwrapList(resultsRes.value) : [];
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
    const fp = `${(m.homeTeam ?? '').toLowerCase()}|${(m.awayTeam ?? '').toLowerCase()}|${(m.kickoffAt ?? '').slice(0,16)}`;
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
      api.publicFootball.odds(m.id).then((r) => ({ matchId: m.id, data: r })).catch(() => ({ matchId: m.id, data: null }))
    )
  );

  const individualOddsMap = new Map<string, unknown[]>();
  individualOddsResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.data) {
      const arr = safeUnwrapOddsArray(result.value.data);
      if (arr.length > 0) individualOddsMap.set(result.value.matchId, arr);
    }
  });

  const enriched = enrichedPass1.map(({ _needsOdds, ...match }) => {
    if (!_needsOdds || match.oddsMap) return match as EnrichedMatch;
    const indOdds = individualOddsMap.get(match.id) ?? [];
    if (indOdds.length === 0) return match as EnrichedMatch;
    const oddsMap = extractOddsMap(indOdds, match.homeTeam ?? '', match.awayTeam ?? '');
    return { ...match, oddsMap } as EnrichedMatch;
  });

  return enriched.filter(hasValidOdds);
}

function filterByLeagueTab(
  matches: EnrichedMatch[],
  tab: FootballLeagueTab,
): { matches: EnrichedMatch[]; isFallback: boolean } {
  if (tab === 'all') return { matches, isFallback: false };

  if (tab === 'other') {
    const filtered = matches.filter((m) => {
      for (const leagueTab of Object.keys(LEAGUE_TEAMS) as Exclude<FootballLeagueTab, 'all' | 'other'>[]) {
        if (matchBelongsToLeagueTab(m, leagueTab)) return false;
      }
      return true;
    });
    if (filtered.length === 0) return { matches, isFallback: true };
    return { matches: filtered, isFallback: false };
  }

  const filtered = matches.filter((m) => matchBelongsToLeagueTab(m, tab));
  if (filtered.length === 0) return { matches, isFallback: true };
  return { matches: filtered, isFallback: false };
}

async function fetchBasketballMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicBasketball.live(), api.publicBasketball.upcoming(), api.publicBasketball.results(),
  ]);
  const allItems = [
    ...(live.status === 'fulfilled' ? unwrapWithAllOdds(live.value) : []),
    ...(upcoming.status === 'fulfilled' ? unwrapWithAllOdds(upcoming.value) : []),
    ...(results.status === 'fulfilled' ? unwrapWithAllOdds(results.value) : []),
  ];
  const seen = new Set<string>();
  const enriched = allItems.filter(({ match }) => {
    if (!match?.id || seen.has(match.id)) return false;
    seen.add(match.id); return true;
  }).map(({ match, odds }) => ({
    ...match,
    oddsMap: extractOddsMap(odds, match.homeTeam ?? '', match.awayTeam ?? ''),
  }));
  return enriched.filter(hasValidOdds);
}

async function fetchTennisMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicTennis.live(), api.publicTennis.upcoming(), api.publicTennis.results(),
  ]);
  const enriched = dedup([
    ...(live.status === 'fulfilled' ? safeUnwrapList(live.value) : []),
    ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []),
    ...(results.status === 'fulfilled' ? safeUnwrapList(results.value) : []),
  ]);
  return enriched.filter(hasValidOdds);
}

async function fetchBaseballMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, today] = await Promise.allSettled([
    api.publicBaseball.live(), api.publicBaseball.upcoming(), api.publicBaseball.today(),
  ]);
  const allItems = [
    ...(live.status === 'fulfilled' ? unwrapWithAllOdds(live.value) : []),
    ...(upcoming.status === 'fulfilled' ? unwrapWithAllOdds(upcoming.value) : []),
    ...(today.status === 'fulfilled' ? unwrapWithAllOdds(today.value) : []),
  ];
  const seen = new Set<string>();
  const deduped = allItems.filter(({ match }) => {
    if (!match?.id || seen.has(match.id)) return false;
    seen.add(match.id); return true;
  });
  const needsOdds = deduped.filter(({ odds }) => odds.length === 0).slice(0, 20);
  const oddsResponses = await Promise.allSettled(needsOdds.map(({ match }) => api.publicBaseball.odds(match.id).catch(() => null)));
  const oddsById = new Map<string, unknown[]>();
  needsOdds.forEach(({ match }, idx) => {
    const result = oddsResponses[idx];
    if (result.status === 'fulfilled' && result.value != null) {
      const parsed = safeUnwrapOddsArray(result.value);
      if (parsed.length > 0) oddsById.set(match.id, parsed);
    }
  });
  const enriched = deduped.map(({ match, odds }) => ({
    ...match,
    oddsMap: extractOddsMap(odds.length > 0 ? odds : (oddsById.get(match.id) ?? []), match.homeTeam ?? '', match.awayTeam ?? ''),
  }));
  return enriched.filter(hasValidOdds);
}

async function fetchNflMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicNfl.live(), api.publicNfl.upcoming(), api.publicNfl.results(),
  ]);
  const enriched = dedup([
    ...(live.status === 'fulfilled' ? safeUnwrapList(live.value) : []),
    ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []),
    ...(results.status === 'fulfilled' ? safeUnwrapList(results.value) : []),
  ]);
  return enriched.filter(hasValidOdds);
}

async function fetchMmaMatches(): Promise<EnrichedMatch[]> {
  const [live, upcoming, results] = await Promise.allSettled([
    api.publicMma.live(), api.publicMma.upcoming(), api.publicMma.results(),
  ]);
  const enriched = dedup([
    ...(live.status === 'fulfilled' ? safeUnwrapList(live.value) : []),
    ...(upcoming.status === 'fulfilled' ? safeUnwrapList(upcoming.value) : []),
    ...(results.status === 'fulfilled' ? safeUnwrapList(results.value) : []),
  ]);
  return enriched.filter(hasValidOdds);
}

function useLiveTimer(match: EnrichedMatch): string {
  const status = match.status ?? '';
  const isLive = LIVE_STATUSES.has(status);
  const getElapsedMins = useCallback((): number => {
    if (match.kickoffAt) {
      const elapsed = Date.now() - new Date(match.kickoffAt).getTime();
      if (elapsed >= 0) return Math.floor(elapsed / 60_000);
    }
    return match.minutePlayed ?? 0;
  }, [match.kickoffAt, match.minutePlayed]);
  const [elapsed, setElapsed] = useState<number>(getElapsedMins);
  useEffect(() => {
    if (!isLive) return;
    setElapsed(getElapsedMins());
    const id = setInterval(() => setElapsed(getElapsedMins()), 30_000);
    return () => clearInterval(id);
  }, [isLive, getElapsedMins]);
  if (!isLive) return '';
  if (HALFTIME_STATUSES.has(status)) return 'HT';
  if (PENALTY_STATUSES.has(status)) return 'PEN';
  if (EXTRA_TIME_STATUSES.has(status)) return `${Math.min(elapsed, 120)}' ET`;
  return `${match.minutePlayed != null ? match.minutePlayed : Math.min(elapsed, 90)}'`;
}

const ADMIN_FINISHED_LINGER_MS = 10_000;

function MatchCard({
  match, hasDraw = true, onClick, isAdmin = false,
}: {
  match: EnrichedMatch; hasDraw?: boolean; onClick?: () => void; isAdmin?: boolean;
}) {
  const { betSlip, addToBetSlip, showToast } = useAppStore() as {
    betSlip: BetSlipEntry[];
    addToBetSlip: (entry: BetSlipEntry) => void;
    showToast: (message: string, type: string) => void;
  };
  const status     = match.status ?? '';
  const isLive     = LIVE_STATUSES.has(status);
  const isFinished = FINISHED_STATUSES.has(status);
  const isUpcoming = !isLive && !isFinished;
  const timerStr  = useLiveTimer(match);
  const homeScore = match.scoreHome ?? 0;
  const awayScore = match.scoreAway ?? 0;
  const homeWon   = isFinished && homeScore > awayScore;
  const awayWon   = isFinished && awayScore > homeScore;
  const odds = match.oddsMap;
  const isSel = (sel: string) =>
    (betSlip as BetSlipEntry[]).some((s) => s.matchId === match.id && s.market === '1X2' && s.selection === sel);
  const pick = (sel: string, odd: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFinished || !odd || odd <= 0) return;
    addToBetSlip({ matchId: match.id, matchName: `${match.homeTeam} vs ${match.awayTeam}`, market: '1X2', selection: sel, odd });
    showToast('Added to bet slip', 'success');
  };
  const stateClass = isLive ? 'live' : isFinished ? 'finished' : 'upcoming';
  const oddsSlots = hasDraw
    ? [
        { key: '1', label: 'Home', val: odds?.home ?? 0 },
        { key: 'X', label: 'Draw', val: odds?.draw ?? 0 },
        { key: '2', label: 'Away', val: odds?.away ?? 0 },
      ]
    : [
        { key: '1', label: 'Home', val: odds?.home ?? 0 },
        { key: '2', label: 'Away', val: odds?.away ?? 0 },
      ];
  const renderHomeLogo = (size: number) => isAdmin
    ? <TeamLogoAdmin poolUrl={match.adminHomeLogo} name={match.homeTeam} size={size} />
    : <TeamLogo logo={match.homeLogo} name={match.homeTeam} size={size} />;
  const renderAwayLogo = (size: number) => isAdmin
    ? <TeamLogoAdmin poolUrl={match.adminAwayLogo} name={match.awayTeam} size={size} />
    : <TeamLogo logo={match.awayLogo} name={match.awayTeam} size={size} />;

  return (
    <div className={`match-card ${stateClass}`} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}>
      <div className="match-card-topbar">
        {match.leagueLogo && (
          <img src={match.leagueLogo} alt="" className="match-card-league-logo"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        )}
        <span className="match-card-league">
          {match.league || (match.source === 'ADMIN_CREATED' ? 'Special Game' : '')}
        </span>
        {isLive && (
          <span className="match-status-badge live">
            <FiberManualRecordIcon sx={{ fontSize: 7 }} className="live-dot" />
            {timerStr || 'LIVE'}
          </span>
        )}
        {isFinished && (
          <span className="match-status-badge finished">{finishedLabel(status)}</span>
        )}
        {isUpcoming && match.kickoffAt && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 400, color: 'var(--text-faint, #475569)', letterSpacing: '0.02em',
          }}>
            <ScheduleIcon sx={{ fontSize: 10, opacity: 0.5 }} />
            {`${formatDate(match.kickoffAt)} · ${formatKickoff(match.kickoffAt)}`}
            <span style={{ opacity: 0.55, marginLeft: 2 }}>({formatCountdown(match.kickoffAt)})</span>
          </span>
        )}
      </div>
      <div className="match-card-body">
        <div className="match-team-row">
          {renderHomeLogo(32)}
          <span className={`match-team-name${isFinished ? (homeWon ? ' winner' : ' loser') : ''}`}>{match.homeTeam}</span>
          {(isLive || isFinished) && (
            <span className={`match-score${isFinished ? (homeWon ? ' winner' : ' loser') : ''}`}>{homeScore}</span>
          )}
          {isUpcoming && match.kickoffAt && (
            <span style={{
              marginLeft: 'auto', fontSize: 9, fontWeight: 400,
              color: 'var(--text-faint, #475569)', opacity: 0.7, whiteSpace: 'nowrap',
            }}>
              {formatCountdown(match.kickoffAt)}
            </span>
          )}
        </div>
        <div className="match-vs-separator" />
        <div className="match-team-row">
          {renderAwayLogo(32)}
          <span className={`match-team-name${isFinished ? (awayWon ? ' winner' : ' loser') : ''}`}>{match.awayTeam}</span>
          {(isLive || isFinished) && (
            <span className={`match-score${isFinished ? (awayWon ? ' winner' : ' loser') : ''}`}>{awayScore}</span>
          )}
        </div>
      </div>
      {isFinished && (
        <div className="match-result-strip">
          <span className="match-result-label">Full time</span>
          <div className="match-result-score-block">
            <span style={{ color: homeWon ? 'var(--text-main)' : 'var(--text-muted)' }}>{homeScore}</span>
            <span className="sep">–</span>
            <span style={{ color: awayWon ? 'var(--text-main)' : 'var(--text-muted)' }}>{awayScore}</span>
          </div>
          <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-faint)' }}>
            Details <ChevronRightIcon sx={{ fontSize: 13 }} />
          </span>
        </div>
      )}
      {(isLive || isUpcoming) && (
        <>
          <div className="match-odds-row">
            {oddsSlots.map(({ key, label, val }) => (
              <button key={key}
                className={`match-odds-btn${val <= 0 ? ' empty' : isSel(key) ? ' selected' : ''}`}
                onClick={(e) => val > 0 && pick(key, val, e)}
                disabled={val <= 0}>
                <span className="match-odds-label" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 1, color: 'var(--text-main, #ffffff)' }}>
                  {label}
                </span>
                <span className="match-odds-value" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary, #f5a623)' }}>
                  {val > 0 ? val.toFixed(2) : '—'}
                </span>
              </button>
            ))}
          </div>
          <div className="match-more-odds" onClick={onClick}>
            More markets <ChevronRightIcon sx={{ fontSize: 12 }} />
          </div>
        </>
      )}
    </div>
  );
}

function LeagueCard({ league, matches, leagueLogo, showDraw }: { league: string; matches: EnrichedMatch[]; leagueLogo?: string; showDraw: boolean }) {
  const navigate = useNavigate();
  const isTop6   = TOP_6_LABELS.has(league);
  const isCup    = CUPS_LABELS.has(league);
  return (
    <div className="league-group">
      <div className="league-group-header">
        {(isTop6 || isCup) && leagueLogo && (
          <img src={leagueLogo} alt="" className="league-group-header-logo"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        )}
        <span className="league-group-name">{league || '—'}</span>
        <span className="league-group-count">{matches.length}</span>
      </div>
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} hasDraw={showDraw} onClick={() => navigate(`/match/${m.id}`)} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpecialGamesSection — FIX 6: accepts onAdminFingerprintsChange callback
// ---------------------------------------------------------------------------
function SpecialGamesSection({
  onAdminFingerprintsChange,
}: {
  onAdminFingerprintsChange: (fps: Set<string>) => void;
}) {
  const navigate = useNavigate();
  const permanentlyHiddenRef = useRef<Set<string>>(loadHiddenAdminIds());
  const finishedAtRef = useRef<Map<string, number>>(new Map());
  const [sessionHiddenIds, setSessionHiddenIds] = useState<Set<string>>(new Set());
  const [adminMatches, setAdminMatches] = useState<EnrichedMatch[]>([]);
  const genRef = useRef(0);

  useEffect(() => {
    const myGen = ++genRef.current;
    const alive = () => myGen === genRef.current;
    async function load() {
      try {
        const raw = await fetch(
          'https://futballbackend-production-aefb.up.railway.app/api/public/admin-matches?ngrok-skip-browser-warning=true',
        ).then((r) => r.json());
        if (!alive()) return;
        const matches = unwrapAdminMatches(raw);
        if (matches.length === 0) {
          setAdminMatches([]);
          // FIX 6: clear fingerprints when there are no admin matches
          onAdminFingerprintsChange(new Set());
          return;
        }
        const oddsResults = await Promise.allSettled(matches.map((m) => fetchAdminMatchOdds(m.id)));
        if (!alive()) return;
        const enriched: EnrichedMatch[] = matches.map((match, idx) => {
          const oddsArr = oddsResults[idx].status === 'fulfilled' ? oddsResults[idx].value : [];
          const oddsMap = extractOddsMap(oddsArr, match.homeTeam ?? '', match.awayTeam ?? '');
          return { ...match, oddsMap };
        });
        const withOdds = enriched.filter(hasValidOdds);
        const withLogos = assignAdminLogos(withOdds);
        const now = Date.now();
        for (const m of withLogos) {
          const isFinished = FINISHED_STATUSES.has(m.status ?? '');
          if (isFinished && !finishedAtRef.current.has(m.id) && !permanentlyHiddenRef.current.has(m.id)) {
            finishedAtRef.current.set(m.id, now);
          }
        }
        setAdminMatches(withLogos);
        // FIX 6: publish fingerprints of ALL admin matches (not just visible ones)
        // so the regular list suppresses them immediately.
        onAdminFingerprintsChange(buildAdminTeamFingerprints(withLogos));
      } catch { /* silent */ }
    }
    load();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { genRef.current++; clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [id, finishedAt] of finishedAtRef.current.entries()) {
      if (permanentlyHiddenRef.current.has(id)) continue;
      if (sessionHiddenIds.has(id)) continue;
      const remaining = ADMIN_FINISHED_LINGER_MS - (Date.now() - finishedAt);
      const hide = () => { addHiddenAdminId(id); permanentlyHiddenRef.current.add(id); setSessionHiddenIds((prev) => new Set([...prev, id])); };
      if (remaining <= 0) hide();
      else timers.push(setTimeout(hide, remaining));
    }
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminMatches]);

  const visibleMatches = useMemo(() =>
    adminMatches.filter((m) => {
      if (permanentlyHiddenRef.current.has(m.id)) return false;
      if (FINISHED_STATUSES.has(m.status ?? '')) return finishedAtRef.current.has(m.id);
      return true;
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [adminMatches, sessionHiddenIds]);

  if (visibleMatches.length === 0) return null;
  const liveCount = visibleMatches.filter((m) => LIVE_STATUSES.has(m.status ?? '')).length;

  return (
    <section className="mb-6">
      <div className="section-header">
        <h2 className="section-title-text">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--accent)' }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Special Games
          <span className="section-count">({visibleMatches.length})</span>
        </h2>
        {liveCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold ml-2" style={{ color: 'var(--live-green)' }}>
            <FiberManualRecordIcon sx={{ fontSize: 7 }} className="live-dot" />
            {liveCount} Live
          </span>
        )}
      </div>
      <div className="space-y-0">
        {visibleMatches.map((m) => {
          const isLingering = FINISHED_STATUSES.has(m.status ?? '') && finishedAtRef.current.has(m.id);
          if (isLingering) {
            const finishedAt = finishedAtRef.current.get(m.id) ?? Date.now();
            const pct = Math.max(0, ((ADMIN_FINISHED_LINGER_MS - (Date.now() - finishedAt)) / ADMIN_FINISHED_LINGER_MS) * 100);
            return (
              <div key={m.id} className="relative">
                <MatchCard match={m} hasDraw isAdmin onClick={() => navigate(`/match/${m.id}`)} />
                <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-1000 ease-linear rounded-b"
                  style={{ width: `${pct}%`, background: 'var(--accent)', opacity: 0.4 }} />
              </div>
            );
          }
          return <MatchCard key={m.id} match={m} hasDraw isAdmin onClick={() => navigate(`/match/${m.id}`)} />;
        })}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="match-card upcoming" style={{ cursor: 'default', pointerEvents: 'none' }}>
      <div className="match-card-topbar">
        <div className="skeleton-block" style={{ width: 14, height: 14, borderRadius: 3 }} />
        <div className="skeleton-block" style={{ width: 80, height: 10, borderRadius: 4 }} />
      </div>
      <div className="match-card-body">
        <div className="match-team-row">
          <div className="match-team-logo-placeholder skeleton-block" />
          <div className="skeleton-block flex-1" style={{ height: 14, borderRadius: 4 }} />
        </div>
        <div className="match-vs-separator" />
        <div className="match-team-row">
          <div className="match-team-logo-placeholder skeleton-block" />
          <div className="skeleton-block flex-1" style={{ height: 14, borderRadius: 4, width: '70%' }} />
        </div>
      </div>
      <div className="match-odds-row">
        {[0, 1, 2].map((i) => <div key={i} className="match-odds-btn empty skeleton-block" />)}
      </div>
    </div>
  );
}

function SectionHeader({ title, count, isLive, isFinished, showToggle, expanded, onToggle }: {
  title: string; count: number; isLive?: boolean; isFinished?: boolean;
  showToggle?: boolean; expanded?: boolean; onToggle?: () => void;
}) {
  return (
    <div className="section-header mb-3">
      <h2 className="section-title-text">
        {isLive && <FiberManualRecordIcon sx={{ fontSize: 8 }} className="text-green-500 live-dot" />}
        {isFinished && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
            <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
          </svg>
        )}
        {title}
        <span className="section-count">({count})</span>
      </h2>
      {showToggle && (
        <button onClick={onToggle} className="ml-auto text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
          {expanded ? 'Hide' : 'Show'}
        </button>
      )}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="league-divider">
      <div className="league-divider-line" />
      <span className="league-divider-label">{label}</span>
      <div className="league-divider-line" />
    </div>
  );
}

function FallbackNotice({ tabLabel }: { tabLabel: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 12px', marginBottom: 12, borderRadius: 8,
      background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)',
    }}>
      <span style={{ fontSize: 13 }}>ℹ️</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', fontFamily: 'system-ui, sans-serif' }}>
        No <strong style={{ color: 'var(--text-main, #cbd5e1)', fontWeight: 700 }}>{tabLabel}</strong> matches right now — showing all available games.
      </span>
    </div>
  );
}

function groupByLeague(matches: EnrichedMatch[], sorted = false): Map<string, EnrichedMatch[]> {
  const map = new Map<string, EnrichedMatch[]>();
  for (const m of matches) {
    const key = m.league || '(no league)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  if (!sorted) return map;
  return new Map([...map.entries()].sort(([a], [b]) => leagueSortKey(a).localeCompare(leagueSortKey(b))));
}

// ---------------------------------------------------------------------------
// Main MatchList Component
// ---------------------------------------------------------------------------
export default function MatchList() {
  const [activeSport, setActiveSport]         = useState<SportTab>('football');
  const [activeLeagueTab, setActiveLeagueTab] = useState<FootballLeagueTab>('all');
  const [showFinished, setShowFinished]       = useState(true);

  const [allFootballMatches, setAllFootballMatches] = useState<EnrichedMatch[]>([]);
  const [footballLoading, setFootballLoading]       = useState(false);

  const [sportMatches, setSportMatches] = useState<Record<SportTab, EnrichedMatch[]>>({
    football: [], basketball: [], tennis: [], baseball: [], nfl: [], mma: [],
  });
  const [sportLoading, setSportLoading] = useState<Record<SportTab, boolean>>({
    football: false, basketball: false, tennis: false, baseball: false, nfl: false, mma: false,
  });

  const [error, setError] = useState<string | null>(null);

  // FIX 6: fingerprint set from admin matches — used to suppress duplicates
  const [adminFingerprints, setAdminFingerprints] = useState<Set<string>>(new Set());

  const footballGenRef = useRef(0);
  const sportGenRefs   = useRef<Record<SportTab, number>>({ football: 0, basketball: 0, tennis: 0, baseball: 0, nfl: 0, mma: 0 });
  const loadedSports   = useRef<Set<SportTab>>(new Set());
  const abortControllersRef = useRef<AbortController[]>([]);

  const showDraw = !TWO_WAY_ODDS_SPORTS.has(activeSport);

  const fetchFootball = useCallback(async (background = false) => {
    const gen = ++footballGenRef.current;
    const alive = () => footballGenRef.current === gen;
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current = [];
    if (!background) { setFootballLoading(true); setError(null); }
    try {
      const matches = await fetchAllFootballMatches();
      if (!alive()) return;
      setAllFootballMatches(matches);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (alive() && !background) setError((err as Error).message ?? 'Failed to load matches');
    } finally {
      if (alive()) setFootballLoading(false);
    }
  }, []);

  const fetchSport = useCallback(async (sport: SportTab, background = false) => {
    if (sport === 'football') return;
    const gen = ++sportGenRefs.current[sport];
    const alive = () => sportGenRefs.current[sport] === gen;
    if (!background) { setSportLoading((prev) => ({ ...prev, [sport]: true })); setError(null); }
    try {
      let matches: EnrichedMatch[] = [];
      switch (sport) {
        case 'basketball': matches = await fetchBasketballMatches(); break;
        case 'tennis':     matches = await fetchTennisMatches();     break;
        case 'baseball':   matches = await fetchBaseballMatches();   break;
        case 'nfl':        matches = await fetchNflMatches();        break;
        case 'mma':        matches = await fetchMmaMatches();        break;
      }
      if (!alive()) return;
      setSportMatches((prev) => ({ ...prev, [sport]: matches }));
      loadedSports.current.add(sport);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (alive() && !background) setError((err as Error).message ?? 'Failed to load matches');
    } finally {
      if (alive()) setSportLoading((prev) => ({ ...prev, [sport]: false }));
    }
  }, []);

  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach((c) => c.abort());
      footballGenRef.current++;
      (Object.keys(sportGenRefs.current) as SportTab[]).forEach((s) => sportGenRefs.current[s]++);
    };
  }, []);

  useEffect(() => { fetchFootball(false); }, [fetchFootball]);
  useEffect(() => { if (activeSport !== 'football') fetchSport(activeSport, false); }, [activeSport, fetchSport]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeSport === 'football') fetchFootball(true);
      else fetchSport(activeSport, true);
    };
    const interval = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [activeSport, fetchFootball, fetchSport]);

  // FIX 6: strip admin-match games from the regular list before categorising
  const { allMatches, isFallback } = useMemo((): { allMatches: EnrichedMatch[]; isFallback: boolean } => {
    if (activeSport === 'football') {
      const result = filterByLeagueTab(allFootballMatches, activeLeagueTab);
      // Remove any match whose team-pair fingerprint belongs to an admin game
      const filtered = adminFingerprints.size > 0
        ? result.matches.filter((m) => !isMatchInAdminSet(m, adminFingerprints))
        : result.matches;
      return { allMatches: filtered, isFallback: result.isFallback };
    }
    return { allMatches: sportMatches[activeSport], isFallback: false };
  }, [activeSport, activeLeagueTab, allFootballMatches, sportMatches, adminFingerprints]);

  const grouped = useMemo(() => {
    const cats: Record<MatchCategory, EnrichedMatch[]> = { live: [], today: [], upcoming: [], finished: [] };
    for (const m of allMatches) cats[categorise(m)].push(m);
    cats.finished.sort((a, b) => {
      const ta = a.kickoffAt ? new Date(a.kickoffAt).getTime() : 0;
      const tb = b.kickoffAt ? new Date(b.kickoffAt).getTime() : 0;
      return tb - ta;
    });
    return cats;
  }, [allMatches]);

  const isLoading = useMemo(() => {
    if (activeSport === 'football') return footballLoading;
    return sportLoading[activeSport];
  }, [activeSport, footballLoading, sportLoading]);

  const isSpecificLeagueTab = activeSport === 'football'
    && activeLeagueTab !== 'all'
    && activeLeagueTab !== 'other'
    && !isFallback;

  const navigate = useNavigate();

  const activeLeagueTabLabel = useMemo(
    () => FOOTBALL_LEAGUE_TABS.find((t) => t.key === activeLeagueTab)?.label ?? activeLeagueTab,
    [activeLeagueTab],
  );

  function renderLeagueGroups(matches: EnrichedMatch[], isFinishedSection: boolean) {
    if (isSpecificLeagueTab) {
      const sorted = [...matches].sort((a, b) => {
        const ta = a.kickoffAt ? new Date(a.kickoffAt).getTime() : 0;
        const tb = b.kickoffAt ? new Date(b.kickoffAt).getTime() : 0;
        return isFinishedSection ? tb - ta : ta - tb;
      });
      return sorted.map((m) => (
        <MatchCard key={m.id} match={m} hasDraw={showDraw} onClick={() => navigate(`/match/${m.id}`)} />
      ));
    }
    if (activeSport === 'football' && (activeLeagueTab === 'all' || activeLeagueTab === 'other' || isFallback)) {
      const top6   = matches.filter((m) => TOP_6_LABELS.has(m.league ?? ''));
      const cups   = matches.filter((m) => !TOP_6_LABELS.has(m.league ?? '') && CUPS_LABELS.has(m.league ?? ''));
      const others = matches.filter((m) => !TOP_6_LABELS.has(m.league ?? '') && !CUPS_LABELS.has(m.league ?? ''));
      return (
        <>
          {[...groupByLeague(top6, true).entries()].map(([league, lm]) => (
            <LeagueCard key={league} league={league} matches={lm} leagueLogo={lm[0]?.leagueLogo} showDraw={showDraw} />
          ))}
          {cups.length > 0 && (
            <>
              {top6.length > 0 && <SectionDivider label="Cups & Competitions" />}
              {[...groupByLeague(cups).entries()].map(([league, lm]) => (
                <LeagueCard key={league} league={league} matches={lm} leagueLogo={lm[0]?.leagueLogo} showDraw={showDraw} />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              {(top6.length > 0 || cups.length > 0) && <SectionDivider label="Other Leagues" />}
              {[...groupByLeague(others, true).entries()].map(([league, lm]) => (
                <LeagueCard key={league} league={league} matches={lm} leagueLogo={lm[0]?.leagueLogo} showDraw={showDraw} />
              ))}
            </>
          )}
        </>
      );
    }
    return [...groupByLeague(matches, true).entries()].map(([league, lm]) => (
      <LeagueCard key={league} league={league} matches={lm} leagueLogo={lm[0]?.leagueLogo} showDraw={showDraw} />
    ));
  }

  function renderSection(title: string, matches: EnrichedMatch[], opts: { isLive?: boolean; isFinished?: boolean } = {}) {
    if (matches.length === 0) return null;
    return (
      <section className="mb-6">
        <SectionHeader title={title} count={matches.length} isLive={opts.isLive} isFinished={opts.isFinished}
          showToggle={opts.isFinished} expanded={showFinished} onToggle={() => setShowFinished((v) => !v)} />
        {(!opts.isFinished || showFinished) && renderLeagueGroups(matches, !!opts.isFinished)}
      </section>
    );
  }

  const handleRetry = () => {
    if (activeSport === 'football') fetchFootball(false);
    else { loadedSports.current.delete(activeSport); fetchSport(activeSport, false); }
  };

  return (
    <div className="px-4 mt-4">

      {/* ── Recent Winners Bar ── */}
      <RecentWinnersBar />

      {/* ── Sport tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {SPORT_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveSport(tab.key)}
            className={`sport-tab${activeSport === tab.key ? ' active' : ''}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Football league sub-tabs ── */}
      {activeSport === 'football' && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {FOOTBALL_LEAGUE_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveLeagueTab(tab.key)}
              className={`league-tab${activeLeagueTab === tab.key ? ' active' : ''}`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Special Games — FIX 6: passes fingerprint updater ── */}
      {activeSport === 'football' && (
        <SpecialGamesSection onAdminFingerprintsChange={setAdminFingerprints} />
      )}

      {/* ── Fallback notice ── */}
      {isFallback && !isLoading && (
        <FallbackNotice tabLabel={activeLeagueTabLabel} />
      )}

      {/* ── Match list ── */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
          <button onClick={handleRetry} className="mt-3 text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <div className="skeleton-block mb-4" style={{ height: 16, width: 80, borderRadius: 4 }} />
          {[0,1,2,3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {renderSection('Live Now',  grouped.live,     { isLive: true })}
          {renderSection('Today',     grouped.today,    {})}
          {renderSection('Upcoming',  grouped.upcoming, {})}
          {renderSection('Results',   grouped.finished, { isFinished: true })}

          {allMatches.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">
                {activeSport === 'football' ? '⚽' : activeSport === 'basketball' ? '🏀' :
                 activeSport === 'tennis' ? '🎾' : activeSport === 'baseball' ? '⚾' :
                 activeSport === 'nfl' ? '🏈' : '🥊'}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No {SPORT_TABS.find((t) => t.key === activeSport)?.label} matches available right now.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Floating Bet Slip Button ── */}
      <FloatingBetSlipButton />
    </div>
  );
}
