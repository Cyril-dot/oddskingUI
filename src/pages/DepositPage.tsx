import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { wallet as walletApi } from '../utils/api';
import AddCardIcon from '@mui/icons-material/AddCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RefreshIcon from '@mui/icons-material/Refresh';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'form' | 'otp' | 'awaiting' | 'success' | 'error';

interface MoolreChannel {
  id: string;   // "13" | "6" | "7"
  name: string;
  short: string;
  color: string;
}

const CHANNELS: MoolreChannel[] = [
  { id: '13', name: 'MTN MoMo',     short: 'MTN',     color: '#FFCC00' },
  { id: '6',  name: 'Telecel Cash', short: 'Telecel', color: '#E2001A' },
  { id: '7',  name: 'AT Money',     short: 'AT',      color: '#0072BC' },
];

const MIN_GHS = 300;

/**
 * Moolre OTP-required response codes.
 * "OTP_REQ" is the documented code; "TP14" is the code observed in production.
 * Both mean: OTP has been sent to the customer's phone — show the OTP input screen.
 */
const OTP_REQUIRED_CODES = new Set(['OTP_REQ', 'TP14']);

/**
 * Moolre txstatus codes returned by the /verify endpoint.
 *  0 = pending
 *  1 = success
 *  2 = failed / cancelled
 *  3 = transaction not found (OTP not completed or payment never initiated)
 */
const TX_SUCCESS   = 1;
const TX_FAILED    = 2;
const TX_NOT_FOUND = 3;

// ── Inline Moolre API calls ───────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function moolreInit(body: {
  amount: string;
  phone: string;
  channel: string;
  otpcode?: string;
  externalref?: string; // send back on OTP resubmission to reuse the same transaction
}): Promise<Record<string, unknown>> {
  const res = await fetch(
    'https://futballbackend-production-aefb.up.railway.app/api/wallet/deposit/moolre/init',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      credentials: 'include',
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json;
}

async function moolreVerify(externalref: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    'https://futballbackend-production-aefb.up.railway.app/api/wallet/deposit/moolre/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      credentials: 'include',
      body: JSON.stringify({ externalref }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtGHS(n: number): string {
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency', currency: 'GHS', maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `GHS ${n.toFixed(2)}`;
  }
}

function fmtQuick(n: number): string {
  if (n >= 1000) return `${n / 1000}k`;
  return String(n);
}

const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

// ── Sub-components ────────────────────────────────────────────────────────────

function BtnPrimary({
  children, onClick, disabled = false, loading = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
      onMouseEnter={e => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : children}
    </button>
  );
}

function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
      style={{ backgroundColor: 'var(--card-alt)', border: '1px solid var(--border-light)', color: 'var(--text-main)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.96)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
    >
      {children}
    </button>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm ${className}`}
      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
      {children}
    </label>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate   = useNavigate();
  const { user: currentUser } = useAppStore();

  // form state
  const [amount,      setAmount]      = useState('');
  const [phone,       setPhone]       = useState('');
  const [channel,     setChannel]     = useState<MoolreChannel>(CHANNELS[0]);
  const [otp,         setOtp]         = useState('');

  // flow state
  const [step,          setStep]          = useState<Step>('form');
  const [loading,       setLoading]       = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');

  /**
   * externalRef is set on the FIRST init call and must be sent back on every
   * subsequent call (OTP resubmission, verify). This is the fix for the
   * infinite OTP loop — without reusing the same ref, Moolre treats each
   * submission as a brand-new transaction and fires a new OTP every time.
   */
  const [externalRef,   setExternalRef]   = useState('');
  const [verifyMsg,     setVerifyMsg]     = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/deposit' } });
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    walletApi.getWallet()
      .then(res => {
        const bal = (res.data as { balance?: number }).balance ?? null;
        if (bal !== null) setWalletBalance(bal);
      })
      .catch(() => {});
  }, [currentUser]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const parsedAmount = parseFloat(amount);
  const amountValid  = !isNaN(parsedAmount) && parsedAmount >= MIN_GHS;
  const phoneValid   = phone.replace(/\D/g, '').length >= 9;

  // ── Step 1: Init deposit — first call, no OTP yet ─────────────────────────

  const handleInit = async () => {
    if (!amountValid || !phoneValid) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const body: Parameters<typeof moolreInit>[0] = {
        amount:  parsedAmount.toString(),
        phone:   phone.trim(),
        channel: channel.id,
        // No externalref on the first call — backend generates a new one
      };

      const res   = await moolreInit(body);
      const inner = (res?.data ?? res) as Record<string, unknown>;
      const code  = (inner?.code  ?? res?.code  ?? '') as string;
      const ref   = (inner?.externalref ?? res?.externalref ?? '') as string;

      // Save the ref — it MUST be sent back on OTP resubmission and /verify.
      if (ref) setExternalRef(ref);

      if (OTP_REQUIRED_CODES.has(code)) {
        // Moolre sent OTP to phone — show OTP entry screen
        setStep('otp');
      } else {
        // USSD prompt sent directly — customer just needs to approve on phone
        setStep('awaiting');
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to initiate payment. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Submit OTP ─────────────────────────────────────────────────────
  //
  // KEY FIX: we send back the SAME externalref from the first call.
  // Without this, every OTP submission creates a brand-new transaction on
  // Moolre's side, which responds with another TP14 — causing the infinite loop.

  const handleSubmitOtp = async () => {
    if (!otp.trim() || !externalRef) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const body: Parameters<typeof moolreInit>[0] = {
        amount:      parsedAmount.toString(),
        phone:       phone.trim(),
        channel:     channel.id,
        otpcode:     otp.trim(),
        externalref: externalRef, // ← reuse the SAME ref, don't generate new
      };

      const res   = await moolreInit(body);
      const inner = (res?.data ?? res) as Record<string, unknown>;
      const code  = (inner?.code ?? res?.code ?? '') as string;

      if (OTP_REQUIRED_CODES.has(code)) {
        // Moolre rejected the OTP (wrong code) — stay on OTP screen with error
        setOtp('');
        setErrorMsg('Incorrect OTP. Please check the code sent to your phone and try again.');
      } else {
        // OTP accepted — USSD prompt now sent to phone for final approval
        setStep('awaiting');
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to submit OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Verify payment ─────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!externalRef) return;
    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const res   = await moolreVerify(externalRef);
      const inner = (res?.data ?? res) as Record<string, unknown>;
      const credited = inner?.credited as boolean | undefined;
      const txStatus = inner?.txstatus as number | undefined;
      const message  = (inner?.message ?? '') as string;

      if (credited === true || txStatus === TX_SUCCESS) {
        setStep('success');
      } else if (txStatus === TX_FAILED) {
        setErrorMsg('Payment failed or was cancelled.');
        setStep('error');
      } else if (txStatus === TX_NOT_FOUND) {
        // txstatus=3: OTP step was not completed — guide user back to OTP screen
        setVerifyMsg(
          message ||
          'Payment not found. Please complete the OTP verification first, then approve the USSD prompt on your phone.'
        );
      } else {
        // txstatus=0 (still pending) or anything else
        setVerifyMsg(
          message || 'Payment is still pending. Please approve the USSD prompt on your phone, then tap Check Again.'
        );
      }
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : 'Could not verify payment. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetAll = () => {
    setStep('form');
    setAmount('');
    setOtp('');
    setExternalRef('');  // clear the ref so the next deposit gets a fresh one
    setErrorMsg('');
    setVerifyMsg('');
  };

  // ── OTP screen ─────────────────────────────────────────────────────────────

  if (step === 'otp') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-sm w-full mx-auto p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
            <PhoneAndroidIcon style={{ color: 'var(--primary)', fontSize: 28 }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Enter OTP</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Moolre sent a one-time PIN to <strong style={{ color: 'var(--text-main)' }}>{phone}</strong>. Enter it below to proceed.
          </p>
        </div>

        {/* Show OTP error inline on the OTP screen */}
        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-xs text-left"
            style={{ backgroundColor: 'color-mix(in srgb, #e11d48 8%, var(--card-alt))', border: '1px solid color-mix(in srgb, #e11d48 25%, var(--border-light))', color: '#e11d48' }}>
            {errorMsg}
          </div>
        )}

        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{ border: '1.5px solid var(--border-light)', backgroundColor: 'var(--card-bg)' }}
        >
          <div className="px-4 h-14 flex items-center shrink-0 text-xs font-bold"
            style={{ backgroundColor: 'var(--card-alt)', borderRight: '1.5px solid var(--border-light)', color: 'var(--text-muted)', minWidth: 64 }}>
            OTP
          </div>
          <input
            type="number"
            value={otp}
            onChange={e => { setOtp(e.target.value); setErrorMsg(''); }}
            placeholder="e.g. 123456"
            className="flex-1 h-14 px-4 text-xl font-bold outline-none bg-transparent"
            style={{ color: 'var(--text-main)', caretColor: 'var(--primary)' } as React.CSSProperties}
            autoFocus
          />
        </div>

        <BtnPrimary onClick={handleSubmitOtp} disabled={!otp.trim()} loading={loading}>
          Submit OTP
        </BtnPrimary>
        <BtnSecondary onClick={resetAll}>Cancel</BtnSecondary>
      </div>
    </div>
  );

  // ── Awaiting approval screen ───────────────────────────────────────────────

  if (step === 'awaiting') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-sm w-full mx-auto p-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-pulse"
          style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
          <PhoneAndroidIcon style={{ color: 'var(--primary)', fontSize: 32 }} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Approve on your phone</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            A USSD prompt has been sent to <strong style={{ color: 'var(--text-main)' }}>{phone}</strong>.
            Approve <strong style={{ color: 'var(--text-main)' }}>{fmtGHS(parsedAmount)}</strong> via {channel.name}, then tap <em>Check Payment</em> below.
          </p>
        </div>

        {verifyMsg && (
          <div className="px-4 py-3 rounded-xl text-xs text-left"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, var(--card-alt))', border: '1px solid color-mix(in srgb, var(--primary) 20%, var(--border-light))', color: 'var(--text-muted)' }}>
            {verifyMsg}
          </div>
        )}

        <BtnPrimary onClick={handleVerify} loading={verifyLoading}>
          <RefreshIcon fontSize="small" /> Check Payment
        </BtnPrimary>
        <BtnSecondary onClick={resetAll}>Cancel</BtnSecondary>
      </div>
    </div>
  );

  // ── Success ────────────────────────────────────────────────────────────────

  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-sm w-full mx-auto p-6 text-center space-y-4">
        <CheckCircleIcon style={{ color: '#10b981', fontSize: 64 }} />
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#10b981' }}>Deposit Confirmed</h2>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--text-main)' }}>
            {fmtGHS(parsedAmount)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Your wallet has been credited.
          </p>
          {externalRef && (
            <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
              Ref: {externalRef}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <BtnPrimary onClick={() => navigate('/wallet')}>
            <AccountBalanceWalletIcon fontSize="small" /> Go to Wallet
          </BtnPrimary>
          <BtnSecondary onClick={resetAll}>Make Another Deposit</BtnSecondary>
        </div>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────

  if (step === 'error') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-sm w-full mx-auto p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: 'color-mix(in srgb, #f43f5e 12%, transparent)' }}>
          <span className="text-2xl font-bold" style={{ color: '#e11d48' }}>✕</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#e11d48' }}>Failed</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {errorMsg || 'Something went wrong. Please try again.'}
          </p>
        </div>
        <BtnPrimary onClick={resetAll}>Try Again</BtnPrimary>
      </div>
    </div>
  );

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: 'var(--card-alt)' }}>
      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <AddCardIcon style={{ color: 'var(--primary)' }} />
            Deposit
          </h1>
          {walletBalance !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 13 }} />
              <span style={{ color: 'var(--text-main)' }}>{fmtGHS(walletBalance)}</span>
            </div>
          )}
        </div>

        {/* Network selector */}
        <Card>
          <Label>Mobile Money Network</Label>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map(ch => {
              const active = ch.id === channel.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: active ? 'color-mix(in srgb, var(--primary) 10%, var(--card-alt))' : 'var(--card-alt)',
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                    boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent)' : 'none',
                  }}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.color }} />
                  <span className="text-xs font-bold" style={{ color: active ? 'var(--primary)' : 'var(--text-main)' }}>
                    {ch.short}
                  </span>
                  <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
                    {ch.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Phone number */}
        <Card>
          <Label>MoMo Phone Number</Label>
          <div
            className="flex items-center rounded-xl overflow-hidden transition-all"
            style={{ border: `1.5px solid ${phone && !phoneValid ? '#e11d48' : 'var(--border-light)'}`, backgroundColor: 'var(--card-bg)' }}
          >
            <div className="px-4 h-14 flex items-center shrink-0"
              style={{ backgroundColor: 'var(--card-alt)', borderRight: '1.5px solid var(--border-light)', minWidth: 56 }}>
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>🇬🇭</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0244 000 000"
              className="flex-1 h-14 px-4 text-base font-semibold outline-none bg-transparent"
              style={{ color: 'var(--text-main)', caretColor: 'var(--primary)' }}
            />
          </div>
          {phone && !phoneValid && (
            <p className="text-xs mt-1.5" style={{ color: '#e11d48' }}>Enter a valid phone number</p>
          )}
        </Card>

        {/* Amount */}
        <Card>
          <Label>Amount (GHS)</Label>
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{
              border: `1.5px solid ${amount && !amountValid ? '#e11d48' : 'var(--border-light)'}`,
              backgroundColor: 'var(--card-bg)',
            }}
          >
            <div className="px-4 h-14 flex items-center shrink-0"
              style={{ backgroundColor: 'var(--card-alt)', borderRight: `1.5px solid var(--border-light)`, minWidth: 72 }}>
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>GHS</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Min ${fmtGHS(MIN_GHS)}`}
              min={MIN_GHS}
              step="1"
              className="flex-1 h-14 px-4 text-xl font-bold outline-none bg-transparent"
              style={{
                color: amount && !amountValid ? '#e11d48' : 'var(--text-main)',
                caretColor: 'var(--primary)',
                MozAppearance: 'textfield',
              } as React.CSSProperties}
            />
          </div>

          <div className="mt-1.5">
            {amount && !amountValid ? (
              <p className="text-xs" style={{ color: '#e11d48' }}>Minimum deposit is {fmtGHS(MIN_GHS)}</p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Minimum: {fmtGHS(MIN_GHS)}</p>
            )}
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-6 gap-2 mt-3">
            {QUICK_AMOUNTS.map(qa => {
              const active = amount === qa.toString();
              return (
                <button
                  key={qa}
                  type="button"
                  onClick={() => setAmount(qa.toString())}
                  className="py-2 text-xs font-semibold rounded-lg transition-all active:scale-[0.95]"
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--card-alt)',
                    color: active ? '#fff' : 'var(--text-main)',
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
                >
                  {fmtQuick(qa)}
                </button>
              );
            })}
          </div>
        </Card>

        {/* CTA */}
        <BtnPrimary
          onClick={handleInit}
          disabled={!amountValid || !phoneValid}
          loading={loading}
        >
          {!amount
            ? `Enter amount (min ${fmtGHS(MIN_GHS)})`
            : !amountValid
              ? `Minimum is ${fmtGHS(MIN_GHS)}`
              : !phone
                ? 'Enter your MoMo number'
                : !phoneValid
                  ? 'Enter a valid phone number'
                  : `Pay ${fmtGHS(parsedAmount)} via ${channel.name}`}
        </BtnPrimary>

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          🔒 Minimum GHS {MIN_GHS} · Secured by Moolre · MTN · Telecel · AT
        </p>

      </div>
    </div>
  );
}
