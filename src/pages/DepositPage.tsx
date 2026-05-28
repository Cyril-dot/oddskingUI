import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { wallet as walletApi } from '../utils/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type Step    = 'amount' | 'awaiting' | 'success' | 'error';
type Network = 'MTN' | 'VODAFONE' | 'AIRTELTIGO';

const MIN_GHS       = 1;
const QUICK_AMOUNTS = [1, 500, 1000, 2000, 5000, 10000];
const TX_SUCCESS    = 1;
const TX_FAILED     = 2;
const API_BASE      = 'https://futballbackend-production-aefb.up.railway.app';

// Poll every 5 s while on the awaiting screen
const POLL_INTERVAL_MS = 5000;

// ── API helpers ────────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Initiates a Moolre USSD direct charge.
 * No hosted page — USSD prompt goes straight to the customer's phone.
 */
async function moolreInit(
  amount: string,
  phone: string,
  network: Network,
): Promise<{ externalref: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/wallet/deposit/moolre/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    credentials: 'include',
    body: JSON.stringify({ amount, phone, network }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  const inner       = (json?.data ?? json) as Record<string, unknown>;
  const externalref = (inner?.externalref ?? '') as string;
  if (!externalref) throw new Error('No transaction reference returned. Please try again.');
  return {
    externalref,
    message: (inner?.message as string) ?? 'Please approve the USSD prompt on your phone.',
  };
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
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes fadeUp   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn    { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.03); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes breathe  { 0%,100% { box-shadow: 0 0 0 0 rgba(34,211,116,0.3); } 50% { box-shadow: 0 0 0 12px rgba(34,211,116,0); } }
  @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }

  .dr * { box-sizing: border-box; font-family: 'Sora', sans-serif; }
  .dr input[type=number]::-webkit-inner-spin-button,
  .dr input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  .dr input[type=number] { -moz-appearance: textfield; }

  .dr .screen { animation: fadeUp 0.26s ease both; }

  /* ── Layout ── */
  .dr .page-inner {
    max-width: 420px; margin: 0 auto; padding: 0 16px 60px;
  }

  /* ── Top bar ── */
  .dr .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0 24px;
  }
  .dr .topbar-title {
    font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #fff;
  }
  .dr .balance-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 100px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.55);
  }
  .dr .balance-dot { width: 6px; height: 6px; border-radius: 50%; background: #22d374; }

  /* ── Progress bar ── */
  .dr .progress-track {
    height: 2px; border-radius: 1px; background: rgba(255,255,255,0.07);
    margin-bottom: 28px; overflow: hidden;
  }
  .dr .progress-fill {
    height: 100%; border-radius: 1px;
    background: linear-gradient(90deg, #1a56ff, #22d374);
    transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Section label ── */
  .dr .section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.28);
    margin-bottom: 8px;
  }

  /* ── Amount display ── */
  .dr .amount-display-wrap {
    border-radius: 20px; padding: 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 10px;
  }
  .dr .amount-row {
    display: flex; align-items: center;
    border-radius: 12px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.08);
    overflow: hidden; transition: border-color 0.15s;
  }
  .dr .amount-row:focus-within { border-color: rgba(26,86,255,0.6); }
  .dr .amount-row.err { border-color: rgba(239,68,68,0.5); }
  .dr .amount-currency {
    padding: 0 14px; height: 64px;
    display: flex; align-items: center;
    border-right: 1px solid rgba(255,255,255,0.07);
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    color: rgba(255,255,255,0.3); flex-shrink: 0;
  }
  .dr .amount-input {
    flex: 1; height: 64px; padding: 0 16px;
    background: transparent; border: none; outline: none;
    font-size: 30px; font-weight: 800; color: #fff;
    font-family: 'JetBrains Mono', monospace; letter-spacing: -0.02em;
  }
  .dr .amount-input::placeholder { color: rgba(255,255,255,0.15); }
  .dr .amount-hint {
    font-size: 11px; font-weight: 500; margin-top: 8px;
    transition: color 0.15s;
  }

  /* ── Quick amounts ── */
  .dr .quick-grid {
    display: grid; grid-template-columns: repeat(6,1fr); gap: 6px; margin-top: 14px;
  }
  .dr .quick-chip {
    padding: 7px 4px; border-radius: 8px; text-align: center;
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.025);
    font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5);
    cursor: pointer; transition: all 0.12s;
  }
  .dr .quick-chip:hover { border-color: rgba(26,86,255,0.35); color: rgba(255,255,255,0.8); }
  .dr .quick-chip.on {
    border-color: rgba(26,86,255,0.6); background: rgba(26,86,255,0.12); color: #fff;
  }

  /* ── Phone input ── */
  .dr .phone-wrap {
    border-radius: 20px; padding: 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 10px;
  }
  .dr .phone-row {
    display: flex; align-items: center;
    border-radius: 12px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.08);
    overflow: hidden; transition: border-color 0.15s;
  }
  .dr .phone-row:focus-within { border-color: rgba(26,86,255,0.6); }
  .dr .phone-row.err { border-color: rgba(239,68,68,0.5); }
  .dr .phone-prefix {
    padding: 0 14px; height: 54px;
    display: flex; align-items: center;
    border-right: 1px solid rgba(255,255,255,0.07);
    font-size: 13px; font-weight: 700;
    color: rgba(255,255,255,0.4); flex-shrink: 0;
    font-family: 'JetBrains Mono', monospace;
  }
  .dr .phone-input {
    flex: 1; height: 54px; padding: 0 16px;
    background: transparent; border: none; outline: none;
    font-size: 18px; font-weight: 700; color: #fff;
    font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em;
  }
  .dr .phone-input::placeholder { color: rgba(255,255,255,0.15); }

  /* ── Network selector ── */
  .dr .net-grid {
    display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 14px;
  }
  .dr .net-card {
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    padding: 14px 8px; border-radius: 14px;
    border: 1.5px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.025);
    cursor: pointer; transition: all 0.15s;
  }
  .dr .net-card:hover { border-color: rgba(255,255,255,0.15); }
  .dr .net-card.on { border-color: var(--net-color); background: rgba(var(--net-rgb),0.08); }
  .dr .net-logo {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800;
  }
  .dr .net-name {
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
    text-align: center; line-height: 1.3;
  }

  /* ── Tip box ── */
  .dr .tip {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 11px 13px; border-radius: 12px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    font-size: 11.5px; color: rgba(255,255,255,0.38); line-height: 1.7;
    margin-bottom: 10px;
  }

  /* ── Error / info boxes ── */
  .dr .box-err  { padding: 11px 14px; border-radius: 12px; background: rgba(239,68,68,0.07);  border: 1px solid rgba(239,68,68,0.2);  font-size: 12px; color: #f87171; line-height: 1.55; }
  .dr .box-info { padding: 11px 14px; border-radius: 12px; background: rgba(26,86,255,0.07);  border: 1px solid rgba(26,86,255,0.18); font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.55; }
  .dr .box-ok   { padding: 11px 14px; border-radius: 12px; background: rgba(34,211,116,0.07); border: 1px solid rgba(34,211,116,0.2); font-size: 12px; color: #22d374; line-height: 1.55; }

  /* ── Buttons ── */
  .dr .btn-primary {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 15px 20px; border-radius: 14px; border: none;
    background: linear-gradient(135deg, #1a56ff 0%, #0f3fd6 100%);
    color: #fff; font-size: 14px; font-weight: 800; letter-spacing: 0.01em;
    cursor: pointer; transition: opacity 0.15s, transform 0.12s;
    box-shadow: 0 6px 20px rgba(26,86,255,0.3);
  }
  .dr .btn-primary:hover:not(:disabled) { opacity: 0.91; transform: translateY(-1px); }
  .dr .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .dr .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

  .dr .btn-ghost {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 13px 20px; border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: transparent; color: rgba(255,255,255,0.35);
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .dr .btn-ghost:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }

  .dr .spinner {
    width: 17px; height: 17px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff;
    animation: spin 0.65s linear infinite; flex-shrink: 0;
  }

  /* ── Awaiting card ── */
  .dr .await-card {
    border-radius: 24px; padding: 32px 24px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex; flex-direction: column; align-items: center; gap: 22px;
    animation: popIn 0.3s ease both;
  }
  .dr .pulse-wrap { position: relative; width: 80px; height: 80px; }
  .dr .pulse-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 2px solid rgba(34,211,116,0.4);
    animation: pulse-ring 1.8s ease-out infinite;
  }
  .dr .pulse-ring2 {
    position: absolute; inset: 0; border-radius: 50%;
    border: 2px solid rgba(34,211,116,0.25);
    animation: pulse-ring 1.8s ease-out 0.6s infinite;
  }
  .dr .await-icon {
    position: relative;
    width: 80px; height: 80px; border-radius: 50%;
    background: rgba(34,211,116,0.08);
    border: 2px solid rgba(34,211,116,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px; z-index: 1;
    animation: breathe 2.4s ease-in-out infinite;
  }

  /* ── Poll dots ── */
  .dr .poll-dots { display: flex; gap: 5px; align-items: center; }
  .dr .poll-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,0.25);
    animation: blink 1.4s ease-in-out infinite;
  }
  .dr .poll-dot:nth-child(2) { animation-delay: 0.2s; }
  .dr .poll-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }

  /* ── Result cards ── */
  .dr .result-card {
    border-radius: 24px; padding: 32px 24px;
    display: flex; flex-direction: column; align-items: center; gap: 20px;
    animation: popIn 0.3s ease both;
  }
  .dr .result-icon {
    width: 68px; height: 68px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 30px;
  }

  .dr .security-note {
    text-align: center; font-size: 11px; color: rgba(255,255,255,0.18);
  }

  /* ── Step indicator ── */
  .dr .step-indicator {
    display: flex; align-items: center; gap: 0; margin-bottom: 6px;
  }
  .dr .step-dot {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; flex-shrink: 0; transition: all 0.25s;
  }
  .dr .step-dot.done   { background: #1a56ff; color: #fff; }
  .dr .step-dot.active { background: #fff; color: #0d1325; }
  .dr .step-dot.idle   { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.3); }
  .dr .step-line {
    flex: 1; height: 2px; background: rgba(255,255,255,0.07); transition: background 0.25s;
  }
  .dr .step-line.done { background: #1a56ff; }
  .dr .step-label-row {
    display: flex; justify-content: space-between; margin-top: 6px; margin-bottom: 24px;
  }
  .dr .step-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    text-align: center; flex: 1;
  }
`;

// ── Networks ───────────────────────────────────────────────────────────────────

const NETWORKS: { id: Network; label: string; sub: string; color: string; rgb: string; emoji: string }[] = [
  { id: 'MTN',        label: 'MTN',        sub: 'MoMo',   color: '#FFCC00', rgb: '255,204,0',   emoji: '🟡' },
  { id: 'VODAFONE',   label: 'Telecel',    sub: 'Cash',   color: '#E2001A', rgb: '226,0,26',    emoji: '🔴' },
  { id: 'AIRTELTIGO', label: 'AirtelTigo', sub: 'Money',  color: '#0072BC', rgb: '0,114,188',   emoji: '🔵' },
];

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const idx    = { amount: 0, awaiting: 1, success: 2, error: 2 }[step];
  const labels = ['Details', 'Approve', 'Done'];
  return (
    <>
      <div className="step-indicator">
        {[0, 1, 2].map(i => (
          <>
            <div key={`dot-${i}`} className={`step-dot ${i < idx ? 'done' : i === idx ? 'active' : 'idle'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            {i < 2 && <div key={`line-${i}`} className={`step-line ${i < idx ? 'done' : ''}`} />}
          </>
        ))}
      </div>
      <div className="step-label-row">
        {labels.map((l, i) => (
          <div key={l} className="step-label" style={{
            color: i === idx ? '#fff' : i < idx ? '#1a56ff' : 'rgba(255,255,255,0.25)',
          }}>{l}</div>
        ))}
      </div>
    </>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children, step }: { children: React.ReactNode; step: Step }) {
  const progress = { amount: 33, awaiting: 66, success: 100, error: 100 }[step];
  return (
    <div className="dr" style={{
      minHeight: '100vh',
      background: 'linear-gradient(155deg, #090c18 0%, #0c1122 55%, #080d1c 100%)',
      color: '#fff',
    }}>
      <style>{GLOBAL_CSS}</style>
      <div className="page-inner">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled = false, loading = false }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean;
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

// ── STEP 1: Amount + Phone + Network ──────────────────────────────────────────

function AmountStep({ amount, setAmount, phone, setPhone, network, setNetwork,
  onPay, loading, error, walletBalance, step }: {
  amount: string; setAmount: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  network: Network | ''; setNetwork: (v: Network) => void;
  onPay: () => void; loading: boolean; error: string;
  walletBalance: number | null; step: Step;
}) {
  const parsed      = parseFloat(amount);
  const amountValid = !isNaN(parsed) && parsed >= MIN_GHS;

  // Basic phone validation: 9–12 digits
  const phoneClean = phone.replace(/\D/g, '');
  const phoneValid = phoneClean.length >= 9 && phoneClean.length <= 12;

  const canPay = amountValid && phoneValid && network !== '';

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-title">Add Funds</div>
        {walletBalance !== null && (
          <div className="balance-pill">
            <div className="balance-dot" />
            {fmtGHS(walletBalance)}
          </div>
        )}
      </div>

      <StepIndicator step={step} />

      {/* Amount card */}
      <div className="amount-display-wrap">
        <div className="section-label">Enter Amount</div>
        <div className={`amount-row${amount && !amountValid ? ' err' : ''}`}>
          <div className="amount-currency">GHS</div>
          <input
            className="amount-input"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min={MIN_GHS}
            autoFocus
          />
        </div>
        <div className="amount-hint" style={{
          color: amount && !amountValid ? '#f87171' : 'rgba(255,255,255,0.25)',
        }}>
          {amount && !amountValid
            ? `Minimum deposit is ${fmtGHS(MIN_GHS)}`
            : `Minimum: ${fmtGHS(MIN_GHS)}`}
        </div>

        {/* Quick amounts */}
        <div className="quick-grid">
          {QUICK_AMOUNTS.map(qa => (
            <button
              key={qa}
              className={`quick-chip${amount === qa.toString() ? ' on' : ''}`}
              onClick={() => setAmount(qa.toString())}
            >
              {fmtQuick(qa)}
            </button>
          ))}
        </div>
      </div>

      {/* Phone */}
      <div className="phone-wrap">
        <div className="section-label">MoMo Phone Number</div>
        <div className={`phone-row${phone && !phoneValid ? ' err' : ''}`}>
          <div className="phone-prefix">+233</div>
          <input
            className="phone-input"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="244 123 456"
            inputMode="numeric"
          />
        </div>
        <div style={{ fontSize: 11, color: phone && !phoneValid ? '#f87171' : 'rgba(255,255,255,0.22)', marginTop: 8, fontWeight: 500 }}>
          {phone && !phoneValid ? 'Enter a valid MoMo number' : 'Include country code digits, e.g. 0244123456'}
        </div>

        {/* Network selector */}
        <div className="section-label" style={{ marginTop: 16 }}>Select Network</div>
        <div className="net-grid">
          {NETWORKS.map(n => (
            <div
              key={n.id}
              className={`net-card${network === n.id ? ' on' : ''}`}
              style={{ ['--net-color' as string]: n.color, ['--net-rgb' as string]: n.rgb }}
              onClick={() => setNetwork(n.id)}
            >
              <div className="net-logo" style={{
                background: `${n.color}18`,
                border: `1.5px solid ${n.color}35`,
              }}>
                {n.emoji}
              </div>
              <div className="net-name" style={{ color: network === n.id ? n.color : 'rgba(255,255,255,0.45)' }}>
                {n.label}<br />{n.sub}
              </div>
              {network === n.id && (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: n.color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 9, color: '#000', fontWeight: 800,
                }}>✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="tip">
        <span style={{ fontSize: 14, flexShrink: 0 }}>📲</span>
        <span>
          A <strong style={{ color: 'rgba(255,255,255,0.7)' }}>USSD prompt</strong> will be
          sent directly to your MoMo phone. Approve it to complete your deposit — no redirect needed.
        </span>
      </div>

      {error && <div className="box-err">{error}</div>}

      <PrimaryBtn onClick={onPay} disabled={!canPay} loading={loading}>
        {!loading && (canPay
          ? `Send USSD Prompt · ${fmtGHS(parsed)}`
          : 'Fill in amount, phone & network')}
      </PrimaryBtn>

      <div className="security-note">🔒 Secured by Moolre · USSD Direct Charge</div>
    </div>
  );
}

// ── STEP 2: Awaiting USSD approval ────────────────────────────────────────────

function AwaitingStep({ amount, phone, network, verifyMsg, verifyLoading,
  pollCount, onVerify, onCancel, step }: {
  amount: number; phone: string; network: Network | '';
  verifyMsg: string; verifyLoading: boolean; pollCount: number;
  onVerify: () => void; onCancel: () => void; step: Step;
}) {
  const net = NETWORKS.find(n => n.id === network);
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>

      <div className="topbar">
        <div className="topbar-title">Add Funds</div>
        <div style={{
          padding: '5px 12px', borderRadius: 100,
          background: 'rgba(26,86,255,0.1)', border: '1px solid rgba(26,86,255,0.25)',
          fontSize: 12, fontWeight: 700, color: '#6b9aff',
          fontFamily: 'JetBrains Mono, monospace',
        }}>{fmtGHS(amount)}</div>
      </div>

      <StepIndicator step={step} />

      <div className="await-card">

        {/* Pulsing icon */}
        <div className="pulse-wrap">
          <div className="pulse-ring" />
          <div className="pulse-ring2" />
          <div className="await-icon">📲</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
            Awaiting Approval
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono, monospace' }}>
            {fmtGHS(amount)}
          </div>

          {/* Phone + network summary */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 12, padding: '8px 16px', borderRadius: 100,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          }}>
            {net && <span style={{ color: net.color }}>{net.emoji}</span>}
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>+233 {phone.replace(/^0/, '')}</span>
          </div>

          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 12, lineHeight: 1.65 }}>
            Check your phone for a <strong style={{ color: 'rgba(255,255,255,0.65)' }}>USSD prompt</strong> and
            approve the payment.
          </div>
        </div>

        {/* Auto-polling indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          <div className="poll-dots">
            <div className="poll-dot" /><div className="poll-dot" /><div className="poll-dot" />
          </div>
          Checking automatically ({pollCount})
        </div>

        {verifyMsg && (
          <div className={`${verifyMsg.toLowerCase().includes('fail') || verifyMsg.toLowerCase().includes('cancel') ? 'box-err' : 'box-info'}`}
            style={{ width: '100%' }}>
            {verifyMsg}
          </div>
        )}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PrimaryBtn onClick={onVerify} loading={verifyLoading}>
            {!verifyLoading && '🔄 Check Now'}
          </PrimaryBtn>
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3a: Success ───────────────────────────────────────────────────────────

function SuccessStep({ amount, externalRef, onWallet, onAgain, step }: {
  amount: number; externalRef: string; onWallet: () => void; onAgain: () => void; step: Step;
}) {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="topbar"><div className="topbar-title">Add Funds</div></div>
      <StepIndicator step={step} />

      <div className="result-card" style={{ background: 'rgba(34,211,116,0.04)', border: '1px solid rgba(34,211,116,0.18)' }}>
        <div className="result-icon" style={{ background: 'rgba(34,211,116,0.1)' }}>✅</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#22d374', marginBottom: 6 }}>Payment Confirmed</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono, monospace' }}>
            {fmtGHS(amount)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>
            Your wallet has been credited.
          </div>
          {externalRef && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace', marginTop: 10, wordBreak: 'break-all' }}>
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

function ErrorStep({ msg, onRetry, step }: { msg: string; onRetry: () => void; step: Step }) {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="topbar"><div className="topbar-title">Add Funds</div></div>
      <StepIndicator step={step} />

      <div className="result-card" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="result-icon" style={{ background: 'rgba(239,68,68,0.1)', fontSize: 26 }}>✕</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Payment Failed</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>
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
  const [phone,         setPhone]         = useState('');
  const [network,       setNetwork]       = useState<Network | ''>('');
  const [externalRef,   setExternalRef]   = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [initLoading,   setInitLoading]   = useState(false);
  const [initError,     setInitError]     = useState('');
  const [verifyMsg,     setVerifyMsg]     = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pollCount,     setPollCount]     = useState(0);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Resume in-progress payment on page reload
  useEffect(() => {
    const savedRef     = localStorage.getItem('moolre_externalref');
    const savedAmount  = localStorage.getItem('moolre_amount');
    const savedPhone   = localStorage.getItem('moolre_phone');
    const savedNetwork = localStorage.getItem('moolre_network') as Network | null;
    if (savedRef && savedAmount) {
      setExternalRef(savedRef);
      setAmount(savedAmount);
      if (savedPhone)   setPhone(savedPhone);
      if (savedNetwork) setNetwork(savedNetwork);
      setStep('awaiting');
    }
  }, []);

  // Auto-poll while on awaiting screen
  useEffect(() => {
    if (step !== 'awaiting' || !externalRef) return;

    const poll = async () => {
      setPollCount(c => c + 1);
      try {
        const { credited, txstatus, message } = await moolreVerify(externalRef);
        if (credited || txstatus === TX_SUCCESS) {
          clearLocalStorage();
          setStep('success');
        } else if (txstatus === TX_FAILED) {
          clearLocalStorage();
          setErrorMsg('Payment failed or was cancelled.');
          setStep('error');
        } else {
          // still pending — schedule next poll
          pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        // network error — still retry
        pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [step, externalRef]);

  const parsedAmount = parseFloat(amount);

  const clearLocalStorage = () => {
    localStorage.removeItem('moolre_externalref');
    localStorage.removeItem('moolre_amount');
    localStorage.removeItem('moolre_phone');
    localStorage.removeItem('moolre_network');
  };

  const handlePay = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < MIN_GHS || !phone || !network) return;
    setInitLoading(true);
    setInitError('');
    try {
      const { externalref, message } = await moolreInit(amount, phone, network as Network);
      localStorage.setItem('moolre_externalref', externalref);
      localStorage.setItem('moolre_amount',      amount);
      localStorage.setItem('moolre_phone',       phone);
      localStorage.setItem('moolre_network',     network);
      setExternalRef(externalref);
      setVerifyMsg(message);
      setStep('awaiting');
    } catch (e: unknown) {
      setInitError(e instanceof Error ? e.message : 'Could not start payment. Please try again.');
    } finally {
      setInitLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!externalRef) return;
    // Stop auto-poll so we don't double-fire
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const { credited, txstatus, message } = await moolreVerify(externalRef);
      if (credited || txstatus === TX_SUCCESS) {
        clearLocalStorage();
        setStep('success');
      } else if (txstatus === TX_FAILED) {
        clearLocalStorage();
        setErrorMsg('Payment failed or was cancelled.');
        setStep('error');
      } else {
        setVerifyMsg(message || 'Payment still pending. Please approve the USSD prompt on your phone.');
        // Resume auto-poll
        pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL_MS);
      }
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : 'Could not verify. Please try again.');
      pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL_MS);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleAutoPoll = async () => {
    if (!externalRef) return;
    setPollCount(c => c + 1);
    try {
      const { credited, txstatus } = await moolreVerify(externalRef);
      if (credited || txstatus === TX_SUCCESS) {
        clearLocalStorage();
        setStep('success');
      } else if (txstatus === TX_FAILED) {
        clearLocalStorage();
        setErrorMsg('Payment failed or was cancelled.');
        setStep('error');
      } else {
        pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL_MS);
      }
    } catch {
      pollTimer.current = setTimeout(handleAutoPoll, POLL_INTERVAL_MS);
    }
  };

  const resetAll = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    clearLocalStorage();
    setStep('amount'); setAmount(''); setPhone(''); setNetwork('');
    setExternalRef(''); setErrorMsg(''); setVerifyMsg(''); setInitError('');
    setPollCount(0);
  };

  return (
    <Shell step={step}>
      {step === 'amount' && (
        <AmountStep
          amount={amount} setAmount={setAmount}
          phone={phone} setPhone={setPhone}
          network={network} setNetwork={setNetwork}
          onPay={handlePay} loading={initLoading} error={initError}
          walletBalance={walletBalance} step={step}
        />
      )}
      {step === 'awaiting' && (
        <AwaitingStep
          amount={parsedAmount || parseFloat(localStorage.getItem('moolre_amount') ?? '0')}
          phone={phone || localStorage.getItem('moolre_phone') || ''}
          network={(network || localStorage.getItem('moolre_network') || '') as Network | ''}
          verifyMsg={verifyMsg} verifyLoading={verifyLoading}
          pollCount={pollCount}
          onVerify={handleVerify} onCancel={resetAll} step={step}
        />
      )}
      {step === 'success' && (
        <SuccessStep
          amount={parsedAmount} externalRef={externalRef}
          onWallet={() => navigate('/wallet')} onAgain={resetAll} step={step}
        />
      )}
      {step === 'error' && (
        <ErrorStep msg={errorMsg} onRetry={resetAll} step={step} />
      )}
    </Shell>
  );
}
