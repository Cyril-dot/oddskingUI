import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { wallet as walletApi } from '../utils/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 'amount' | 'awaiting' | 'success' | 'error';

const MIN_GHS       = 300;
const QUICK_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];
const TX_SUCCESS    = 1;
const TX_FAILED     = 2;
const API_BASE      = 'https://futballbackend-production-aefb.up.railway.app';

// ── API helpers ────────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Calls /init — returns { authorizationUrl, externalref }
 * Then opens the Moolre hosted POS in a new tab.
 * The user approves on Moolre's page, then comes back here and clicks "Check Payment".
 */
async function moolreInit(amount: string): Promise<{ authorizationUrl: string; externalref: string }> {
  const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    credentials: 'include',
    body: JSON.stringify({ amount }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  const inner = (json?.data ?? json) as Record<string, unknown>;
  const authorizationUrl = (inner?.authorizationUrl ?? '') as string;
  const externalref      = (inner?.externalref ?? '') as string;
  if (!authorizationUrl) throw new Error('No payment URL returned. Please try again.');
  if (!externalref)      throw new Error('No transaction reference returned. Please try again.');
  return { authorizationUrl, externalref };
}

async function moolreVerify(externalref: string): Promise<{
  credited: boolean; txstatus: number; message: string;
}> {
  const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    credentials: 'include',
    body: JSON.stringify({ externalref }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  const inner = (json?.data ?? json) as Record<string, unknown>;
  return {
    credited: Boolean(inner?.credited),
    txstatus: Number(inner?.txstatus ?? -1),
    message:  String(inner?.message  ?? ''),
  };
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtGHS(n: number): string {
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency', currency: 'GHS', maximumFractionDigits: 2,
    }).format(n);
  } catch { return `GHS ${n.toFixed(2)}`; }
}

function fmtQuick(n: number): string {
  return n >= 1000 ? `${n / 1000}k` : String(n);
}

// ── CSS ────────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn   { 0% { transform: scale(0.88); opacity: 0; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes pulse   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.75; transform:scale(1.06); } }

  .deposit-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
  .deposit-root input[type=number]::-webkit-inner-spin-button,
  .deposit-root input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .deposit-root input[type=number] { -moz-appearance: textfield; }

  .deposit-root .btn-primary {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 15px 20px; border-radius: 14px; border: none;
    background: linear-gradient(135deg, #1a56ff 0%, #0f3fd6 100%);
    color: #fff; font-size: 14px; font-weight: 800; letter-spacing: 0.01em;
    cursor: pointer; transition: opacity 0.15s, transform 0.12s;
    box-shadow: 0 4px 18px rgba(26,86,255,0.32);
  }
  .deposit-root .btn-primary:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.93; }
  .deposit-root .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .deposit-root .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .deposit-root .btn-ghost {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 13px 20px; border-radius: 14px;
    border: 1.5px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.45);
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .deposit-root .btn-ghost:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.65); }

  .deposit-root .card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; padding: 18px;
  }

  .deposit-root .field-label {
    font-size: 10px; font-weight: 800; letter-spacing: 0.1em;
    text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 10px;
  }

  .deposit-root .spinner {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
    animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0;
  }

  .deposit-root .step-screen { animation: fadeUp 0.28s ease both; }

  .deposit-root .quick-btn {
    padding: 8px 4px; border-radius: 10px;
    border: 1.5px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.12s; text-align: center;
  }
  .deposit-root .quick-btn:hover { border-color: rgba(26,86,255,0.4); color: #fff; }
  .deposit-root .quick-btn.active {
    border-color: #1a56ff; background: rgba(26,86,255,0.15); color: #fff;
  }

  .deposit-root .amount-input {
    flex: 1; height: 60px; padding: 0 16px;
    font-size: 28px; font-weight: 900;
    background: transparent; border: none; outline: none; color: #fff;
    font-family: 'DM Mono', monospace;
  }
  .deposit-root .amount-input::placeholder { color: rgba(255,255,255,0.2); }

  .deposit-root .input-row {
    display: flex; align-items: center;
    border-radius: 12px; overflow: hidden;
    border: 1.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    transition: border-color 0.15s;
  }
  .deposit-root .input-row:focus-within { border-color: rgba(26,86,255,0.5); }
  .deposit-root .input-row.error { border-color: rgba(239,68,68,0.5); }

  .deposit-root .input-prefix {
    padding: 0 14px; height: 60px; display: flex; align-items: center;
    border-right: 1px solid rgba(255,255,255,0.08);
    font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
    color: rgba(255,255,255,0.35); flex-shrink: 0;
  }

  .deposit-root .tip-box {
    padding: 12px 14px; border-radius: 12px;
    background: rgba(251,146,60,0.07); border: 1px solid rgba(251,146,60,0.18);
    display: flex; gap: 10px; align-items: flex-start;
    font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.65;
  }

  .deposit-root .err-box {
    padding: 11px 14px; border-radius: 12px;
    background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2);
    font-size: 12px; color: #f87171; line-height: 1.55;
  }

  .deposit-root .info-box {
    padding: 11px 14px; border-radius: 12px;
    background: rgba(26,86,255,0.07); border: 1px solid rgba(26,86,255,0.18);
    font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.55;
  }

  .deposit-root .step-pills { display: flex; align-items: center; gap: 6px; }
  .deposit-root .step-pill  { height: 3px; border-radius: 2px; transition: all 0.25s; }
`;

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepPills({ step }: { step: Step }) {
  const map: Record<Step, number> = { amount: 1, awaiting: 2, success: 3, error: 3 };
  const current = map[step];
  return (
    <div className="step-pills">
      {[1, 2, 3].map(i => (
        <div key={i} className="step-pill" style={{
          width: i === current ? 20 : 12,
          background: i <= current ? '#1a56ff' : 'rgba(255,255,255,0.12)',
        }} />
      ))}
    </div>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="deposit-root" style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0b0e1a 0%, #0d1325 60%, #0a0f20 100%)',
      color: '#fff',
    }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px 48px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared buttons ─────────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled = false, loading = false }: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; loading?: boolean;
}) {
  return (
    <button className="btn-primary" onClick={onClick} disabled={disabled || loading}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button className="btn-ghost" onClick={onClick}>{children}</button>;
}

// ── STEP 1: Amount ─────────────────────────────────────────────────────────────

function AmountStep({
  amount, setAmount, onPay, loading, error, walletBalance, step,
}: {
  amount: string; setAmount: (v: string) => void;
  onPay: () => void; loading: boolean; error: string;
  walletBalance: number | null; step: Step;
}) {
  const parsed      = parseFloat(amount);
  const amountValid = !isNaN(parsed) && parsed >= MIN_GHS;

  const ctaLabel = !amount
    ? `Enter amount (min ${fmtGHS(MIN_GHS)})`
    : !amountValid
      ? `Minimum is ${fmtGHS(MIN_GHS)}`
      : `Pay with MoMo · ${fmtGHS(parsed)}`;

  return (
    <div className="step-screen" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 16px' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>Deposit</div>
          <StepPills step={step} />
        </div>
        {walletBalance !== null && (
          <div style={{
            padding: '6px 12px', borderRadius: 100,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
          }}>
            💳 {fmtGHS(walletBalance)}
          </div>
        )}
      </div>

      {/* Amount input */}
      <div className="card">
        <div className="field-label">Amount (GHS)</div>
        <div className={`input-row${amount && !amountValid ? ' error' : ''}`}>
          <div className="input-prefix">GHS</div>
          <input
            className="amount-input"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Min ${MIN_GHS}`}
            min={MIN_GHS}
          />
        </div>
        <div style={{
          fontSize: 11, marginTop: 6, fontWeight: 500,
          color: amount && !amountValid ? '#f87171' : 'rgba(255,255,255,0.3)',
        }}>
          {amount && !amountValid ? `Minimum deposit is ${fmtGHS(MIN_GHS)}` : `Min: ${fmtGHS(MIN_GHS)}`}
        </div>

        {/* Quick amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginTop: 12 }}>
          {QUICK_AMOUNTS.map(qa => (
            <button
              key={qa}
              className={`quick-btn${amount === qa.toString() ? ' active' : ''}`}
              onClick={() => setAmount(qa.toString())}
            >
              {fmtQuick(qa)}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="tip-box">
        <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
        <span>
          Tap <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Pay with MoMo</strong> to open the
          Moolre payment page in a new tab. Complete your payment there, then come back and tap{' '}
          <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Check Payment</strong>.
        </span>
      </div>

      {/* Supported networks */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {[
          { label: 'MTN MoMo',   color: '#FFCC00' },
          { label: 'Telecel',    color: '#E2001A' },
          { label: 'AirtelTigo', color: '#0072BC' },
        ].map(n => (
          <div key={n.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 100,
            background: `${n.color}14`, border: `1px solid ${n.color}44`,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: n.color }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: n.color }}>{n.label}</span>
          </div>
        ))}
      </div>

      {error && <div className="err-box">{error}</div>}

      <PrimaryBtn onClick={onPay} disabled={!amountValid} loading={loading}>
        Open Moolre Payment Page · {amountValid ? fmtGHS(parsed) : ''}
      </PrimaryBtn>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
        🔒 Secured by Moolre
      </div>
    </div>
  );
}

// ── STEP 2: Awaiting ───────────────────────────────────────────────────────────

function AwaitingStep({
  amount, authUrl, verifyMsg, verifyLoading, onVerify, onCancel,
}: {
  amount: number; authUrl: string;
  verifyMsg: string; verifyLoading: boolean;
  onVerify: () => void; onCancel: () => void;
}) {
  return (
    <div className="step-screen" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'popIn 0.35s ease both',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(26,86,255,0.12)',
          border: '2px solid rgba(26,86,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 2.2s ease-in-out infinite', fontSize: 28,
        }}>
          📲
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
            Complete Payment
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#1a56ff', letterSpacing: '-0.02em' }}>
            {fmtGHS(amount)}
          </div>
        </div>

        {/* Re-open Moolre page button */}
        <a
          href={authUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 20px', borderRadius: 14,
            background: 'rgba(26,86,255,0.12)', border: '1.5px solid rgba(26,86,255,0.3)',
            color: '#6b9aff', fontSize: 13, fontWeight: 800, textDecoration: 'none',
            transition: 'all 0.15s',
          }}
        >
          🔗 Re-open Moolre Payment Page
        </a>

        <div className="tip-box" style={{ width: '100%' }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
          <span>
            Complete your payment on the Moolre page that opened.
            Once you approve, come back here and tap{' '}
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Check Payment</strong>.
          </span>
        </div>

        {verifyMsg && (
          <div className="info-box" style={{ width: '100%' }}>{verifyMsg}</div>
        )}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PrimaryBtn onClick={onVerify} loading={verifyLoading}>
            🔄 Check Payment
          </PrimaryBtn>
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3a: Success ───────────────────────────────────────────────────────────

function SuccessStep({
  amount, externalRef, onWallet, onAgain,
}: {
  amount: number; externalRef: string; onWallet: () => void; onAgain: () => void;
}) {
  return (
    <div className="step-screen" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)',
        borderRadius: 24, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'popIn 0.35s ease both',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(16,185,129,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
        }}>✅</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>Deposit Confirmed</div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em' }}>{fmtGHS(amount)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>Your wallet has been credited.</div>
          {externalRef && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Mono, monospace', marginTop: 10, wordBreak: 'break-all' }}>
              Ref: {externalRef}
            </div>
          )}
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PrimaryBtn onClick={onWallet}>💳 Go to Wallet</PrimaryBtn>
          <GhostBtn onClick={onAgain}>Make Another Deposit</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3b: Error ─────────────────────────────────────────────────────────────

function ErrorStep({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="step-screen" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)',
        borderRadius: 24, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'popIn 0.35s ease both',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>✕</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Payment Failed</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            {msg || 'Something went wrong. Please try again.'}
          </div>
        </div>
        <PrimaryBtn onClick={onRetry}>Try Again</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppStore();

  const [step,          setStep]          = useState<Step>('amount');
  const [amount,        setAmount]        = useState('');
  const [externalRef,   setExternalRef]   = useState('');
  const [authUrl,       setAuthUrl]       = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [initLoading,   setInitLoading]   = useState(false);
  const [initError,     setInitError]     = useState('');
  const [verifyMsg,     setVerifyMsg]     = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Auth guard
  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true, state: { from: '/deposit' } });
  }, [currentUser, navigate]);

  // Load wallet balance
  useEffect(() => {
    if (!currentUser) return;
    walletApi.getWallet()
      .then(res => {
        const bal = (res.data as { balance?: number }).balance ?? null;
        if (bal !== null) setWalletBalance(bal);
      })
      .catch(() => {});
  }, [currentUser]);

  // Resume in-progress payment on page reload
  useEffect(() => {
    const savedRef    = localStorage.getItem('moolre_externalref');
    const savedAmount = localStorage.getItem('moolre_amount');
    const savedUrl    = localStorage.getItem('moolre_authurl');
    if (savedRef && savedAmount && savedUrl) {
      setExternalRef(savedRef);
      setAmount(savedAmount);
      setAuthUrl(savedUrl);
      setStep('awaiting');
    }
  }, []);

  const parsedAmount = parseFloat(amount);

  // Step 1 → call /init, open Moolre page, go to awaiting
  const handlePay = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < MIN_GHS) return;
    setInitLoading(true);
    setInitError('');
    try {
      const { authorizationUrl, externalref } = await moolreInit(amount);
      // Persist so the user can resume if they reload
      localStorage.setItem('moolre_externalref', externalref);
      localStorage.setItem('moolre_amount',      amount);
      localStorage.setItem('moolre_authurl',     authorizationUrl);
      setExternalRef(externalref);
      setAuthUrl(authorizationUrl);
      setStep('awaiting');
      // Open Moolre hosted payment page in a new tab
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setInitError(e instanceof Error ? e.message : 'Could not start payment. Please try again.');
    } finally {
      setInitLoading(false);
    }
  };

  // Step 2 → verify
  const handleVerify = async () => {
    if (!externalRef) return;
    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const { credited, txstatus, message } = await moolreVerify(externalRef);
      if (credited || txstatus === TX_SUCCESS) {
        localStorage.removeItem('moolre_externalref');
        localStorage.removeItem('moolre_amount');
        localStorage.removeItem('moolre_authurl');
        setStep('success');
      } else if (txstatus === TX_FAILED) {
        localStorage.removeItem('moolre_externalref');
        localStorage.removeItem('moolre_amount');
        localStorage.removeItem('moolre_authurl');
        setErrorMsg('Payment failed or was cancelled.');
        setStep('error');
      } else {
        setVerifyMsg(message || 'Payment still pending. Complete payment on the Moolre page, then tap Check Payment.');
      }
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : 'Could not verify. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetAll = () => {
    localStorage.removeItem('moolre_externalref');
    localStorage.removeItem('moolre_amount');
    localStorage.removeItem('moolre_authurl');
    setStep('amount'); setAmount(''); setExternalRef(''); setAuthUrl('');
    setErrorMsg(''); setVerifyMsg(''); setInitError('');
  };

  return (
    <Shell>
      {step === 'amount' && (
        <AmountStep
          amount={amount}
          setAmount={setAmount}
          onPay={handlePay}
          loading={initLoading}
          error={initError}
          walletBalance={walletBalance}
          step={step}
        />
      )}
      {step === 'awaiting' && (
        <AwaitingStep
          amount={parsedAmount || parseFloat(localStorage.getItem('moolre_amount') ?? '0')}
          authUrl={authUrl || localStorage.getItem('moolre_authurl') || ''}
          verifyMsg={verifyMsg}
          verifyLoading={verifyLoading}
          onVerify={handleVerify}
          onCancel={resetAll}
        />
      )}
      {step === 'success' && (
        <SuccessStep
          amount={parsedAmount}
          externalRef={externalRef}
          onWallet={() => navigate('/wallet')}
          onAgain={resetAll}
        />
      )}
      {step === 'error' && (
        <ErrorStep msg={errorMsg} onRetry={resetAll} />
      )}
    </Shell>
  );
}
