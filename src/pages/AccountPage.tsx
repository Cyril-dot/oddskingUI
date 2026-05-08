import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { user as userApi, wallet, affiliate, auth, adminUpgrade } from '../utils/api';
import type { UpdateProfileRequest, Transaction } from '../utils/api';

import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircularProgress from '@mui/icons-material/Loop';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import BarChartIcon from '@mui/icons-material/BarChart';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PaymentsIcon from '@mui/icons-material/Payments';
import ChatIcon from '@mui/icons-material/Chat';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number, currency = 'GHS') {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getUserInitials(fullName: string): string {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const CREDIT_KINDS = new Set([
  'DEPOSIT',
  'BET_WIN',
  'REFERRAL_COMMISSION',
  'VIP_CASHBACK',
  'WELCOME_BONUS',
  'WITHDRAWAL_REFUND',
]);

function isCredit(kind: string) {
  return CREDIT_KINDS.has(kind);
}

// ---------------------------------------------------------------------------
// Shared UI Atoms
// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 dark:text-slate-500 flex items-center">{icon}</span>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
          {title}
        </span>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div className={`${h} ${w} bg-slate-200 dark:bg-slate-700/60 rounded-lg animate-pulse`} />
  );
}

function TxKindBadge({ kind }: { kind: string }) {
  const credit = isCredit(kind);
  return (
    <span
      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide ${
        credit
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
      }`}
    >
      {kind.replace(/_/g, ' ')}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <span className="text-sm text-slate-400 dark:text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-right ml-4 truncate max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Upgrade Modal — redesigned, mobile-first
// ---------------------------------------------------------------------------
function AdminUpgradeModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState<'overview' | 'confirm'>('overview');

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await adminUpgrade.initPaystack();
      if (res.success && res.data) {
        const d = res.data as Record<string, unknown>;
        if (typeof d.authorizationUrl === 'string') {
          window.location.href = d.authorizationUrl;
          return;
        }
        if (typeof d.authorization_url === 'string') {
          window.location.href = d.authorization_url;
          return;
        }
      }
      setDone(true);
      showToast('Upgrade request initiated!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to initiate upgrade.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const PERKS = [
    { icon: <BarChartIcon sx={{ fontSize: 16 }} />,     label: 'Analytics Dashboard',    desc: 'Real-time revenue & user stats'     },
    { icon: <PsychologyIcon sx={{ fontSize: 16 }} />,   label: 'AI Predictions Engine',  desc: 'Generate & publish match insights'  },
    { icon: <QrCodeIcon sx={{ fontSize: 16 }} />,       label: 'Booking Code Access',    desc: 'Create & manage booking codes'      },
    { icon: <GroupAddIcon sx={{ fontSize: 16 }} />,     label: 'Affiliate Tools',        desc: 'Referral links & commission tracking'},
    { icon: <PaymentsIcon sx={{ fontSize: 16 }} />,     label: 'Withdrawal Management',  desc: 'Approve & reject user withdrawals'  },
    { icon: <ChatIcon sx={{ fontSize: 16 }} />,         label: 'Upgrade Chat Support',   desc: 'Direct chat with super admins'      },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">

        {/* Gradient accent bar at top */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-emerald-400 shrink-0" />

        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* ── SUCCESS STATE ── */}
        {done ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5 ring-4 ring-emerald-100 dark:ring-emerald-900/40">
              <RocketLaunchIcon className="text-emerald-500" sx={{ fontSize: 36 }} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">You're on your way!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-xs">
              Your upgrade request has been submitted. Our team will review and activate your admin account shortly.
            </p>
            <button
              onClick={onClose}
              className="btn-primary w-full py-3.5 rounded-xl text-sm font-bold"
            >
              Got it, thanks!
            </button>
          </div>
        ) : step === 'overview' ? (

          /* ── OVERVIEW STEP ── */
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                  <AdminPanelSettingsIcon className="text-primary" sx={{ fontSize: 20 }} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Become an Admin
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Unlock the full platform</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 shrink-0 mt-0.5"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            {/* Hero banner */}
            <div className="mx-5 mb-4 rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-5 text-white relative overflow-hidden shrink-0">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-2">
                  <AutoAwesomeIcon sx={{ fontSize: 14 }} className="text-yellow-300" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Admin Access</span>
                </div>
                <p className="text-2xl font-black leading-tight mb-1">Run your own<br />betting platform</p>
                <p className="text-xs text-white/70 leading-relaxed">
                  One-time upgrade. Manage matches, users, payouts & more.
                </p>
              </div>
            </div>

            {/* Perks list — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Everything included
              </p>
              <div className="space-y-2">
                {PERKS.map((perk) => (
                  <div
                    key={perk.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                      {perk.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        {perk.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{perk.desc}</p>
                    </div>
                    <CheckCircleIcon className="text-emerald-500 shrink-0" sx={{ fontSize: 16 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-5 pt-3 pb-6 shrink-0 border-t border-slate-100 dark:border-slate-800 mt-2">
              <p className="text-[11px] text-slate-400 text-center mb-3 leading-relaxed">
                A one-time upgrade fee applies. Payment is processed securely via Paystack.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 btn-primary py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
                >
                  Continue
                  <KeyboardArrowRightIcon fontSize="small" />
                </button>
              </div>
            </div>
          </>

        ) : (

          /* ── CONFIRM STEP ── */
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3 shrink-0">
              <button
                onClick={() => setStep('overview')}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
              >
                <KeyboardArrowRightIcon fontSize="small" className="rotate-180" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Confirm Upgrade</h3>
                <p className="text-xs text-slate-400">Review before proceeding</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
              {/* Summary card */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <AdminPanelSettingsIcon sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Admin Account Upgrade</p>
                    <p className="text-xs text-slate-500">One-time payment via Paystack</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    'Full admin dashboard access',
                    'Manage all platform features',
                    'Affiliate commission earnings',
                    'Priority support via upgrade chat',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CheckCircleIcon className="text-primary shrink-0" sx={{ fontSize: 14 }} />
                      <span className="text-xs">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notice */}
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-3.5 flex gap-2.5">
                <ShieldIcon className="text-amber-500 shrink-0 mt-0.5" sx={{ fontSize: 16 }} />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  You'll be redirected to Paystack's secure payment page. After payment, your account will be reviewed and upgraded within 24 hours.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pt-3 pb-6 shrink-0 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold disabled:opacity-60 mb-3"
              >
                {loading ? (
                  <>
                    <CircularProgress fontSize="small" className="animate-spin" />
                    Redirecting to Paystack…
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon fontSize="small" />
                    Proceed to Payment
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type TabId = 'overview' | 'profile' | 'security' | 'preferences';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',     icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
  { id: 'profile',     label: 'Profile',      icon: <PersonIcon sx={{ fontSize: 20 }} /> },
  { id: 'security',    label: 'Security',     icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
  { id: 'preferences', label: 'More',         icon: <SettingsIcon sx={{ fontSize: 20 }} /> },
];

// ---------------------------------------------------------------------------
// Password field sub-component
// ---------------------------------------------------------------------------
function PwField({
  label,
  field,
  form,
  setForm,
  show,
  setShow,
  disabled,
}: {
  label: string;
  field: 'current' | 'next' | 'confirm';
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<{ current: string; next: string; confirm: string }>>;
  show: Record<string, boolean>;
  setShow: React.Dispatch<React.SetStateAction<{ current: boolean; next: boolean; confirm: boolean }>>;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show[field] ? 'text' : 'password'}
          value={form[field]}
          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          className="input-field pr-11"
          disabled={disabled}
          placeholder="••••••••"
          autoComplete={field === 'current' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={() => setShow(p => ({ ...p, [field]: !p[field] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          tabIndex={-1}
        >
          {show[field] ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
      }`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className={`inline-block w-[18px] h-[18px] rounded-full bg-white shadow-md transform transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main AccountPage
// ---------------------------------------------------------------------------
export default function AccountPage() {
  const { user, logout, setAdminModalOpen, showToast, login } = useAppStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Data state
  const [profileData, setProfileData]   = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [walletData, setWalletData]     = useState<Record<string, unknown> | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [affiliateBalance, setAffiliateBalance] = useState<{
    balance: number;
    currency: string;
  } | null>(null);

  // Profile edit state
  const [editMode, setEditMode]     = useState(false);
  const [editForm, setEditForm]     = useState({ firstName: '', lastName: '', phone: '', country: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Password state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Preferences state
  const [notifications, setNotifications] = useState({ push: true, sms: false, email: true });
  const [depositLimit, setDepositLimit]   = useState('');
  const [sessionLimit, setSessionLimit]   = useState('');

  // Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await userApi.me();
      if (res.success && res.data) {
        setProfileData(res.data);
        const d = res.data as Record<string, unknown>;
        setEditForm({
          firstName: (d.firstName as string) ?? '',
          lastName:  (d.lastName  as string) ?? '',
          phone:     (d.phone     as string) ?? '',
          country:   (d.country   as string) ?? '',
        });
      }
    } catch {
      /* silently fall back */
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const [walletRes, txRes, affRes] = await Promise.all([
        wallet.getWallet(),
        wallet.getTransactions(0, 5),
        affiliate.getBalance(),
      ]);
      if (walletRes.success) setWalletData(walletRes.data);
      if (txRes.success) setTransactions(txRes.data.content);
      if (affRes.success) {
        const d = affRes.data as Record<string, unknown>;
        if (typeof d.balance === 'number' && typeof d.currency === 'string')
          setAffiliateBalance({ balance: d.balance, currency: d.currency });
      }
    } catch {
      /* silently fail */
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchWallet();
  }, [user, fetchProfile, fetchWallet]);

  if (!user) return null;

  // Derived values
  const apiFirstName = (profileData?.firstName as string) ?? '';
  const apiLastName  = (profileData?.lastName  as string) ?? '';
  const apiEmail     = (profileData?.email     as string) ?? user.email;
  const apiPhone     = (profileData?.phone     as string) ?? user.phone ?? '';
  const apiCountry   = (profileData?.country   as string) ?? '';
  const apiRole      = (profileData?.role      as string) ?? user.role;
  const displayName  = [apiFirstName, apiLastName].filter(Boolean).join(' ') || user.fullName;

  const walletBalance =
    typeof walletData?.balance === 'number'
      ? (walletData.balance as number)
      : typeof walletData?.availableBalance === 'number'
      ? (walletData.availableBalance as number)
      : null;
  const walletCurrency = (walletData?.currency as string) ?? 'GHS';

  const roleLabel = apiRole.replace('_', ' ');
  const roleBadgeClass =
    apiRole === 'SUPER_ADMIN'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      : apiRole === 'ADMIN'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

  // Handlers
  const saveProfile = async () => {
    setEditLoading(true);
    try {
      const body: UpdateProfileRequest = {
        firstName: editForm.firstName.trim() || undefined,
        lastName:  editForm.lastName.trim()  || undefined,
        phone:     editForm.phone.trim()     || undefined,
        country:   editForm.country.trim()   || undefined,
      };
      const res = await userApi.update(body);
      if (res.success) {
        const newName =
          [res.data.firstName, res.data.lastName].filter(Boolean).join(' ') || user.fullName;
        login({ ...user, fullName: newName, phone: res.data.phone ?? user.phone });
        await fetchProfile();
        setEditMode(false);
        showToast('Profile updated!', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const changePassword = async () => {
    setPwError(null);
    setPwSuccess(false);
    if (!pwForm.current.trim())        { setPwError('Enter your current password.');           return; }
    if (pwForm.next.length < 8)        { setPwError('New password must be at least 8 chars.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.');                return; }

    setPwLoading(true);
    try {
      await auth.resetPassword({ oldPassword: pwForm.current, newPassword: pwForm.next });
      setPwForm({ current: '', next: '', confirm: '' });
      setPwSuccess(true);
      showToast('Password updated successfully!', 'success');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    logout();
    navigate('/');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">

      {/* ═══ HERO HEADER ═══ */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-lg mx-auto">

          {/* Profile identity row */}
          <div className="flex items-center gap-3.5 px-4 pt-5 pb-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-lg font-bold select-none shadow-md">
                {getUserInitials(displayName)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </div>

            {/* Name / email */}
            <div className="flex-1 min-w-0">
              {profileLoading ? (
                <div className="space-y-2">
                  <SkeletonLine w="w-32" h="h-5" />
                  <SkeletonLine w="w-44" h="h-3.5" />
                </div>
              ) : (
                <>
                  <h1 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                    {displayName}
                  </h1>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{apiEmail}</p>
                </>
              )}
            </div>

            {/* Role badge */}
            <span
              className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${roleBadgeClass}`}
            >
              {roleLabel}
            </span>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <>
            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Wallet card */}
              <Link
                to="/wallet"
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:border-primary/30 active:scale-[0.97] transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <AccountBalanceWalletIcon className="text-primary" sx={{ fontSize: 15 }} />
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>
                {walletLoading ? (
                  <SkeletonLine h="h-6" />
                ) : (
                  <p className="font-bold text-sm tabular-nums text-slate-900 dark:text-white leading-tight">
                    {walletBalance !== null
                      ? formatCurrency(walletBalance, walletCurrency)
                      : '—'}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Main Wallet</p>
              </Link>

              {/* Affiliate card */}
              <Link
                to="/affiliate"
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:border-emerald-400/40 active:scale-[0.97] transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <GroupAddIcon className="text-emerald-600" sx={{ fontSize: 15 }} />
                  </div>
                  <OpenInNewIcon
                    sx={{ fontSize: 13 }}
                    className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors"
                  />
                </div>
                {walletLoading ? (
                  <SkeletonLine h="h-6" />
                ) : (
                  <p className="font-bold text-sm tabular-nums text-emerald-600 dark:text-emerald-400 leading-tight">
                    {affiliateBalance !== null
                      ? formatCurrency(affiliateBalance.balance, affiliateBalance.currency)
                      : '—'}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Affiliate</p>
              </Link>
            </div>

            {/* Recent transactions */}
            <Card>
              <CardHeader
                icon={<AccountBalanceWalletIcon sx={{ fontSize: 15 }} />}
                title="Recent Transactions"
                action={
                  <div className="flex items-center gap-1">
                    <button
                      onClick={fetchWallet}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
                      title="Refresh"
                    >
                      <RefreshIcon sx={{ fontSize: 15 }} />
                    </button>
                    <Link
                      to="/wallet"
                      className="text-[11px] text-primary font-bold hover:underline px-1"
                    >
                      View all
                    </Link>
                  </div>
                }
              />

              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {walletLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center px-4 py-3.5 gap-3">
                      <div className="space-y-2 flex-1">
                        <SkeletonLine w="w-24" h="h-4" />
                        <SkeletonLine w="w-16" h="h-3" />
                      </div>
                      <SkeletonLine w="w-20" h="h-5" />
                    </div>
                  ))
                ) : transactions.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <AccountBalanceWalletIcon
                      className="text-slate-300 dark:text-slate-600 mb-2"
                      sx={{ fontSize: 30 }}
                    />
                    <p className="text-sm text-slate-500">No transactions yet.</p>
                  </div>
                ) : (
                  transactions.map(tx => {
                    const credit = isCredit(tx.kind);
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-4 py-3.5 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <TxKindBadge kind={tx.kind} />
                          <p className="text-[11px] text-slate-400 mt-1">{formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-bold tabular-nums ${
                              credit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                            }`}
                          >
                            {credit ? '+' : '-'}
                            {formatCurrency(tx.amount, walletCurrency)}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Bal: {formatCurrency(tx.balanceAfter, walletCurrency)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* KYC Verification */}
            <Card>
              <CardHeader
                icon={<VerifiedUserIcon sx={{ fontSize: 15 }} />}
                title="KYC Verification"
              />
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Identity Verification
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {user.kycStatus === 'verified'
                      ? 'Your identity has been verified.'
                      : user.kycStatus === 'pending'
                      ? 'Verification is in progress.'
                      : 'Verify your identity to unlock all features.'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                      user.kycStatus === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : user.kycStatus === 'pending'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1)}
                  </span>
                  {user.kycStatus === 'unverified' && (
                    <button className="btn-primary text-xs px-3 py-1.5 rounded-lg font-semibold">
                      Start KYC
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* Admin / Upgrade CTA */}
            {user.role === 'admin' && (
              <button
                onClick={() => setAdminModalOpen(true)}
                className="btn-primary w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm"
              >
                <AdminPanelSettingsIcon fontSize="small" />
                Open Admin Panel
              </button>
            )}
            {user.role === 'user' && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full py-3.5 text-sm font-bold text-primary border-2 border-primary/20 rounded-2xl hover:bg-primary/5 active:bg-primary/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <ArrowUpwardIcon fontSize="small" />
                Upgrade to Admin Account
                <KeyboardArrowRightIcon fontSize="small" className="ml-auto opacity-40" />
              </button>
            )}
          </>
        )}

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader
              icon={<PersonIcon sx={{ fontSize: 15 }} />}
              title="Personal Info"
              action={
                !editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <EditIcon sx={{ fontSize: 13 }} />
                    Edit
                  </button>
                )
              }
            />

            {editMode ? (
              <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(['firstName', 'lastName'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        {field === 'firstName' ? 'First Name' : 'Last Name'}
                      </label>
                      <input
                        type="text"
                        value={editForm[field]}
                        onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                        className="input-field"
                        disabled={editLoading}
                        placeholder={field === 'firstName' ? 'First' : 'Last'}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    className="input-field"
                    disabled={editLoading}
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={e => setEditForm(p => ({ ...p, country: e.target.value }))}
                    className="input-field"
                    disabled={editLoading}
                    placeholder="e.g. Ghana"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setEditMode(false)}
                    disabled={editLoading}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CloseIcon fontSize="small" />
                    Cancel
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={editLoading}
                    className="flex-1 btn-primary py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60 text-sm font-semibold"
                  >
                    {editLoading ? (
                      <>
                        <CircularProgress fontSize="small" className="animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <SaveIcon fontSize="small" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {profileLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex justify-between items-center px-4 py-3.5">
                      <SkeletonLine w="w-20" h="h-3.5" />
                      <SkeletonLine w="w-28" h="h-3.5" />
                    </div>
                  ))
                ) : (
                  <>
                    <InfoRow label="Full Name" value={displayName || '—'} />
                    <InfoRow label="Email"     value={apiEmail || '—'} />
                    <InfoRow label="Phone"     value={apiPhone || '—'} />
                    <InfoRow label="Country"   value={apiCountry || '—'} />
                    <InfoRow label="Role"      value={roleLabel} />
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        {/* ─── SECURITY TAB ─── */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader icon={<ShieldIcon sx={{ fontSize: 15 }} />} title="Change Password" />
            <div className="px-4 py-4 space-y-4">

              {pwError && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm">
                  <CloseIcon sx={{ fontSize: 16 }} className="shrink-0 mt-0.5" />
                  <span>{pwError}</span>
                </div>
              )}

              {pwSuccess && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
                  <CheckCircleIcon sx={{ fontSize: 16 }} className="shrink-0 mt-0.5" />
                  <span>Password updated successfully.</span>
                </div>
              )}

              <PwField label="Current Password"     field="current" form={pwForm} setForm={setPwForm} show={showPw} setShow={setShowPw} disabled={pwLoading} />
              <PwField label="New Password"         field="next"    form={pwForm} setForm={setPwForm} show={showPw} setShow={setShowPw} disabled={pwLoading} />
              <PwField label="Confirm New Password" field="confirm" form={pwForm} setForm={setPwForm} show={showPw} setShow={setShowPw} disabled={pwLoading} />

              {pwForm.next.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(lvl => {
                      const strength =
                        pwForm.next.length >= 12 ? 4
                        : pwForm.next.length >= 10 ? 3
                        : pwForm.next.length >= 8 ? 2
                        : 1;
                      return (
                        <div
                          key={lvl}
                          className={`flex-1 h-1 rounded-full transition-colors ${
                            lvl <= strength
                              ? strength >= 4 ? 'bg-emerald-500'
                                : strength >= 3 ? 'bg-yellow-400'
                                : 'bg-rose-400'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {pwForm.next.length >= 12 ? 'Strong password'
                      : pwForm.next.length >= 10 ? 'Good password'
                      : 'Minimum 8 characters required'}
                  </p>
                </div>
              )}

              <button
                onClick={changePassword}
                disabled={pwLoading}
                className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 text-sm font-semibold"
              >
                {pwLoading ? (
                  <>
                    <CircularProgress fontSize="small" className="animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </Card>
        )}

        {/* ─── PREFERENCES TAB ─── */}
        {activeTab === 'preferences' && (
          <>
            <Card>
              <CardHeader icon={<NotificationsIcon sx={{ fontSize: 15 }} />} title="Notifications" />
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {(
                  [
                    { key: 'push',  label: 'Push Notifications',  sub: 'In-app alerts & updates'       },
                    { key: 'sms',   label: 'SMS Alerts',          sub: 'Text messages to your phone'   },
                    { key: 'email', label: 'Email Notifications', sub: 'Updates sent to your inbox'    },
                  ] as const
                ).map(({ key, label, sub }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                    </div>
                    <Toggle
                      checked={notifications[key]}
                      onChange={() => setNotifications(p => ({ ...p, [key]: !p[key] }))}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader icon={<VerifiedUserIcon sx={{ fontSize: 15 }} />} title="Responsible Gambling" />
              <div className="px-4 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Daily Deposit Limit (GH₵)
                  </label>
                  <input
                    type="number"
                    value={depositLimit}
                    onChange={e => setDepositLimit(e.target.value)}
                    placeholder="No limit set"
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Session Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={sessionLimit}
                    onChange={e => setSessionLimit(e.target.value)}
                    placeholder="No limit set"
                    className="input-field"
                    min="0"
                  />
                </div>
                <button className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">
                  Save Limits
                </button>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button className="w-full py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors">
                    Self-Exclusion
                  </button>
                </div>
              </div>
            </Card>

            <button
              onClick={handleLogout}
              className="w-full py-3.5 text-sm font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <LogoutIcon fontSize="small" />
              Sign Out
            </button>
          </>
        )}
      </div>

      {/* Admin upgrade modal */}
      {showUpgradeModal && <AdminUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  );
}