import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { auth } from '../utils/api';
import { saveSession } from './LoginPage';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CircularProgress from '@mui/icons-material/Loop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// ---------------------------------------------------------------------------
// Country data  — Nigeria, Ghana + 4 African + 4 European + US
// ---------------------------------------------------------------------------
interface Country {
  name: string;
  code: string;
  dial: string;
  flag: string;
  phonePlaceholder: string;
}

const COUNTRIES: Country[] = [
  { name: 'Nigeria',        code: 'NG', dial: '+234', flag: '🇳🇬', phonePlaceholder: '080 1234 5678'  },
  { name: 'Ghana',          code: 'GH', dial: '+233', flag: '🇬🇭', phonePlaceholder: '024 123 4567'   },
  { name: 'Kenya',          code: 'KE', dial: '+254', flag: '🇰🇪', phonePlaceholder: '0712 345 678'   },
  { name: 'South Africa',   code: 'ZA', dial: '+27',  flag: '🇿🇦', phonePlaceholder: '071 234 5678'   },
  { name: 'Senegal',        code: 'SN', dial: '+221', flag: '🇸🇳', phonePlaceholder: '77 123 45 67'   },
  { name: 'Ethiopia',       code: 'ET', dial: '+251', flag: '🇪🇹', phonePlaceholder: '091 123 4567'   },
  { name: 'United Kingdom', code: 'GB', dial: '+44',  flag: '🇬🇧', phonePlaceholder: '07911 123456'   },
  { name: 'France',         code: 'FR', dial: '+33',  flag: '🇫🇷', phonePlaceholder: '06 12 34 56 78' },
  { name: 'Germany',        code: 'DE', dial: '+49',  flag: '🇩🇪', phonePlaceholder: '0151 1234 5678' },
  { name: 'Spain',          code: 'ES', dial: '+34',  flag: '🇪🇸', phonePlaceholder: '612 345 678'    },
  { name: 'United States',  code: 'US', dial: '+1',   flag: '🇺🇸', phonePlaceholder: '201 555 0123'   },
].sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Name placeholders per country
// ---------------------------------------------------------------------------
const NAME_PLACEHOLDERS: Record<string, [string, string]> = {
  US: ['Jordan',   'Smith'],
  NG: ['Chidi',    'Okonkwo'],
  GH: ['Kwame',    'Mensah'],
  KE: ['Aisha',    'Wambua'],
  ZA: ['Thabo',    'Dlamini'],
  SN: ['Fatou',    'Diallo'],
  ET: ['Biruk',    'Tesfaye'],
  GB: ['Oliver',   'Williams'],
  FR: ['Léa',      'Dubois'],
  DE: ['Lukas',    'Müller'],
  ES: ['Sofía',    'García'],
};

function getNamePlaceholders(countryCode: string): [string, string] {
  return NAME_PLACEHOLDERS[countryCode] ?? ['Jordan', 'Smith'];
}

// ---------------------------------------------------------------------------
// ZynoBetLogo — same as Header
// ---------------------------------------------------------------------------
function ZynoBetLogo() {
  return (
    <div className="flex items-center gap-0 select-none" aria-label="ZynoBet">
      <svg
        width="28"
        height="28"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ marginRight: 6, flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="zb-grad-reg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <polygon points="32,4 18,28 27,28 24,52 38,28 29,28" fill="url(#zb-grad-reg)" />
      </svg>

      <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Zyno
        </span>
        <span
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            color: 'var(--text-main)',
          }}
        >
          Bet
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ZynoBetLogoLarge — large variant for left panel
// ---------------------------------------------------------------------------
function ZynoBetLogoLarge() {
  return (
    <div className="flex flex-col items-center gap-3 select-none" aria-label="ZynoBet">
      <svg
        width="72"
        height="72"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="zb-grad-reg-lg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <polygon points="32,4 18,28 27,28 24,52 38,28 29,28" fill="url(#zb-grad-reg-lg)" />
      </svg>

      <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '2.5rem',
            letterSpacing: '-0.02em',
            color: '#38bdf8',
          }}
        >
          Zyno
        </span>
        <span
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '2.5rem',
            letterSpacing: '-0.02em',
            color: '#ffffff',
          }}
        >
          Bet
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Country selector dropdown
// ---------------------------------------------------------------------------
function CountrySelector({
  value,
  onChange,
  disabled,
}: {
  value: Country;
  onChange: (c: Country) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = COUNTRIES.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all flex items-center gap-2.5 touch-manipulation"
        style={{
          backgroundColor: 'var(--card-alt)',
          border: open
            ? '1.5px solid var(--primary)'
            : '1.5px solid var(--border-light)',
          color: 'var(--text-main)',
          boxShadow: open
            ? '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)'
            : 'none',
        }}
      >
        <span className="text-xl leading-none">{value.flag}</span>
        <span className="flex-1 text-left truncate">{value.name}</span>
        <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
          {value.dial}
        </span>
        <KeyboardArrowDownIcon
          fontSize="small"
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card-alt)',
            border: '1.5px solid var(--border-light)',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="p-2 shrink-0" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="relative">
              <SearchIcon
                fontSize="small"
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country…"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-page)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>
                No results
              </p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:opacity-80"
                  style={{
                    backgroundColor:
                      c.code === value.code
                        ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                        : 'transparent',
                    color: 'var(--text-main)',
                  }}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {c.dial}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mapRole(apiRole: string): 'user' | 'admin' {
  if (apiRole === 'ADMIN' || apiRole === 'admin') return 'admin';
  if (apiRole === 'SUPER_ADMIN' || apiRole === 'super_admin') return 'admin';
  return 'user';
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { score: 1, label: 'Weak',   color: '#ef4444' },
    { score: 2, label: 'Fair',   color: '#f97316' },
    { score: 3, label: 'Good',   color: '#eab308' },
    { score: 4, label: 'Strong', color: '#22c55e' },
  ];
  return map[score - 1] ?? { score: 0, label: '', color: '' };
}

function StyledInput({
  type = 'text', placeholder, value, onChange, autoComplete,
  inputMode, disabled, required, className = '', children,
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        required={required}
        className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all touch-manipulation ${className}`}
        style={{ backgroundColor: 'var(--card-alt)', border: '1.5px solid var(--border-light)', color: 'var(--text-main)' }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border-light)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Default country → France
// ---------------------------------------------------------------------------
const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'GH')!;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, showToast } = useAppStore();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);

  const [form, setForm] = useState({
    firstName:       '',
    lastName:        '',
    phoneLocal:      '',
    email:           '',
    password:        '',
    confirmPassword: '',
    referralCode:    searchParams.get('ref') ?? '',
  });
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [terms,   setTerms]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setForm(p => ({ ...p, referralCode: ref }));
  }, [searchParams]);

  const update = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const pwStrength = getPasswordStrength(form.password);
  const pwMatch    = form.confirmPassword && form.password === form.confirmPassword;

  const fullPhone = form.phoneLocal.trim()
    ? `${country.dial}${form.phoneLocal.trim().replace(/^0/, '')}`
    : '';

  const [firstPlaceholder, lastPlaceholder] = getNamePlaceholders(country.code);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!pwMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (!terms) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.register({
        email:     form.email.trim(),
        password:  form.password,
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        phone:     fullPhone || undefined,
        country:   country.code,
        ref:       form.referralCode.trim() || undefined,
      });

      if (!res.success || !res.data?.accessToken) {
        throw new Error(res.message ?? 'Registration failed. Please try again.');
      }

      const { user: apiUser } = res.data;
      saveSession(res.data, false);

      login({
        id:           apiUser.id,
        fullName:
          [apiUser.firstName, apiUser.lastName].filter(Boolean).join(' ') ||
          apiUser.email,
        phone:        apiUser.phone ?? '',
        email:        apiUser.email,
        role:         mapRole(apiUser.role),
        kycStatus:    'unverified',
        referralCode: '',
      });

      showToast('Welcome to ZynoBet! ⚡', 'success');

      if (res.data.mustSetup2fa) {
        navigate('/setup-2fa');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col md:flex-row"
      style={{ minHeight: 'calc(100vh - 4rem)', backgroundColor: 'var(--bg-page)' }}
    >
      {/* ═══ LEFT PANEL ═══ */}
      <aside
        className="hidden md:flex md:w-2/5 lg:w-[38%] xl:w-1/3 shrink-0 flex-col items-center justify-center p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #6366f1 0%, #1e40af 100%)',
          position:   'sticky',
          top:        '4rem',
          height:     'calc(100vh - 4rem)',
          alignSelf:  'flex-start',
        }}
      >
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="absolute -bottom-28 -right-16 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />

        <div className="relative text-white text-center w-full max-w-xs">
          {/* ZynoBet logo — large */}
          <div className="mb-6">
            <ZynoBetLogoLarge />
          </div>

          <p className="text-xs font-semibold tracking-[3px] uppercase mb-6" style={{ opacity: 0.6 }}>
            Join Today
          </p>

          <div
            className="rounded-2xl p-5 mb-7 text-left"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ opacity: 0.7 }}>
              Welcome Bonus
            </p>
            <p className="text-2xl font-black">100% up to GH₵1,000</p>
            <p className="text-xs mt-1" style={{ opacity: 0.7 }}>On your first deposit</p>
          </div>

          <div className="space-y-3 text-left">
            {['Create your account', 'Make your first deposit', 'Start betting & winning!'].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  {i + 1}
                </div>
                <p className="text-sm font-medium" style={{ opacity: 0.9 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ═══ MOBILE BANNER ═══ */}
      <div
        className="md:hidden px-5 py-5 text-white"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #1e40af 100%)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* Lightning bolt icon — small for mobile banner */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="zb-grad-reg-mob" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>
            <polygon points="32,4 18,28 27,28 24,52 38,28 29,28" fill="url(#zb-grad-reg-mob)" />
          </svg>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
              <span
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                  color: '#38bdf8',
                }}
              >
                Zyno
              </span>
              <span
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                Bet
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ opacity: 0.7 }}>Sports Betting</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <p className="text-sm font-bold">🎁 100% First Deposit Bonus up to GH₵1,000</p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — FORM ═══ */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex justify-center px-5 sm:px-10 py-8">
          <div className="w-full max-w-lg">

            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight mb-1" style={{ color: 'var(--text-main)' }}>
                Create Account
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Fill in your details to get started.
              </p>
            </div>

            {error && (
              <div
                className="mb-5 px-4 py-3 rounded-2xl text-sm flex items-start gap-2"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
              >
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Country */}
              <div>
                <FieldLabel>Country <span style={{ color: 'var(--primary)' }}>*</span></FieldLabel>
                <CountrySelector value={country} onChange={c => { setCountry(c); update('phoneLocal', ''); }} disabled={loading} />
              </div>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>First Name <span style={{ color: 'var(--primary)' }}>*</span></FieldLabel>
                  <StyledInput
                    placeholder={firstPlaceholder}
                    value={form.firstName}
                    onChange={e => update('firstName', e.target.value)}
                    autoComplete="given-name"
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <FieldLabel>Last Name <span style={{ color: 'var(--primary)' }}>*</span></FieldLabel>
                  <StyledInput
                    placeholder={lastPlaceholder}
                    value={form.lastName}
                    onChange={e => update('lastName', e.target.value)}
                    autoComplete="family-name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <FieldLabel>
                  Phone Number{' '}
                  <span className="normal-case font-normal" style={{ color: 'var(--text-muted)', letterSpacing: 0 }}>
                    (optional)
                  </span>
                </FieldLabel>
                <div className="flex gap-2">
                  <div
                    className="flex items-center gap-1.5 px-3 py-3 rounded-2xl text-sm font-semibold shrink-0 select-none"
                    style={{ backgroundColor: 'var(--card-alt)', border: '1.5px solid var(--border-light)', color: 'var(--text-main)', minWidth: '76px' }}
                  >
                    <span className="text-base leading-none">{country.flag}</span>
                    <span>{country.dial}</span>
                  </div>
                  <StyledInput
                    type="tel"
                    placeholder={country.phonePlaceholder}
                    value={form.phoneLocal}
                    onChange={e => update('phoneLocal', e.target.value)}
                    autoComplete="tel-national"
                    inputMode="tel"
                    disabled={loading}
                    className="flex-1"
                  />
                </div>
                {fullPhone && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
                    Full number: <span style={{ color: 'var(--text-main)' }}>{fullPhone}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <FieldLabel>Email <span style={{ color: 'var(--primary)' }}>*</span></FieldLabel>
                <StyledInput
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <FieldLabel>Password <span style={{ color: 'var(--primary)' }}>*</span></FieldLabel>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-2xl text-sm font-medium outline-none transition-all"
                    style={{ backgroundColor: 'var(--card-alt)', border: '1.5px solid var(--border-light)', color: 'var(--text-main)' }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors touch-manipulation"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-main)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </button>
                </div>

                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 h-1.5 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="flex-1 rounded-full transition-all duration-300"
                          style={{ backgroundColor: i <= pwStrength.score ? pwStrength.color : 'var(--border-light)' }}
                        />
                      ))}
                    </div>
                    {pwStrength.label && (
                      <p className="text-xs font-semibold" style={{ color: pwStrength.color }}>
                        {pwStrength.label} password
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <FieldLabel>Confirm Password <span style={{ color: 'var(--primary)' }}>*</span></FieldLabel>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={e => update('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                    className="w-full px-4 py-3 pr-14 rounded-2xl text-sm font-medium outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      border: form.confirmPassword
                        ? `1.5px solid ${pwMatch ? '#22c55e' : '#ef4444'}`
                        : '1.5px solid var(--border-light)',
                      color: 'var(--text-main)',
                    }}
                    onFocus={e => {
                      if (!form.confirmPassword) {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)';
                      }
                    }}
                    onBlur={e => {
                      if (!form.confirmPassword) {
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {form.confirmPassword && (
                      <CheckCircleIcon fontSize="small" style={{ color: pwMatch ? '#22c55e' : '#ef4444' }} />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      tabIndex={-1}
                      className="p-1 rounded-lg transition-colors touch-manipulation"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-main)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </button>
                  </div>
                </div>
                {form.confirmPassword && !pwMatch && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Passwords don't match</p>
                )}
              </div>

              {/* Referral code */}
              <div>
                <FieldLabel>
                  Referral Code{' '}
                  <span className="normal-case font-normal" style={{ color: 'var(--text-muted)', letterSpacing: 0 }}>
                    (optional)
                  </span>
                </FieldLabel>
                <StyledInput
                  placeholder="e.g. REF123ABC"
                  value={form.referralCode}
                  onChange={e => update('referralCode', e.target.value.toUpperCase())}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <div
                  className="relative w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: terms ? 'var(--primary)' : 'var(--card-alt)',
                    border: `1.5px solid ${terms ? 'var(--primary)' : 'var(--border-light)'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    disabled={loading}
                  />
                  {terms && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>
                  I agree to the{' '}
                  <Link to="/terms" className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !terms}
                className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--primary)', color: '#fff', minHeight: '52px' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                {loading ? (
                  <><CircularProgress fontSize="small" className="animate-spin" /> Creating account…</>
                ) : (
                  <><PersonAddIcon fontSize="small" /> Create Account</>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
            </div>

            <p className="text-center text-sm pb-6" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-bold hover:underline" style={{ color: 'var(--primary)' }}>
                Log In
              </Link>
            </p>

          </div>
        </div>
      </main>
    </div>
  );
}
