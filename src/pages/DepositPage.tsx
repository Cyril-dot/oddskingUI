import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils';
import { useAppStore } from '../store';
import { deposits, wallet as walletApi } from '../utils/api';
import AddCardIcon from '@mui/icons-material/AddCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_AMOUNT    = 350;
const QUICK_AMOUNTS = [350, 500, 1000, 2000, 5000];

const BINANCE_ADDRESS = 'TCjR7rNtqPygDcVm98qTimwhGCiCBFExTE';
const BINANCE_NETWORK = 'TRC20';
const BINANCE_COIN    = 'USDT';

const COINS    = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'];
const NETWORKS = ['TRC20', 'BEP20', 'ERC20', 'Arbitrum', 'Optimism'];

type Method = 'paystack' | 'binance';
type Step   = 'method' | 'form' | 'binance-info' | 'binance-form' | 'processing' | 'success' | 'binance-success' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-slate-700/60 text-slate-300 border border-slate-600 hover:bg-slate-600/60'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ── Main DepositPage ──────────────────────────────────────────────────────────

export default function DepositPage() {
  const navigate   = useNavigate();
  const { user: currentUser } = useAppStore();

  // Paystack state
  const [amount, setAmount]           = useState('');
  const [paystackRef, setPaystackRef] = useState('');

  // Binance form state
  const [txid, setTxid]                           = useState('');
  const [cryptoAmount, setCryptoAmount]           = useState('');
  const [coin, setCoin]                           = useState('USDT');
  const [network, setNetwork]                     = useState('TRC20');
  const [expectedGhs, setExpectedGhs]             = useState('');
  const [senderAddress, setSenderAddress]         = useState('');
  const [screenshot, setScreenshot]               = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [userNote, setUserNote]                   = useState('');
  const [binanceRef, setBinanceRef]               = useState('');
  const [binanceErrors, setBinanceErrors]         = useState<Record<string, string>>({});

  // Shared state
  const [step, setStep]         = useState<Step>('method');
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true, state: { from: '/deposit' } });
    }
  }, [currentUser, navigate]);

  // ── Wallet balance ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    walletApi.getWallet()
      .then(res => setWalletBalance((res.data as { balance?: number }).balance ?? null))
      .catch(() => {});
  }, [currentUser]);

  // ── Paystack validation ───────────────────────────────────────────────────
  const parsedAmount = parseFloat(amount);
  const amountValid  = !isNaN(parsedAmount) && parsedAmount >= MIN_AMOUNT;

  // ── Paystack submit ───────────────────────────────────────────────────────
  // FIX 1: Open the popup SYNCHRONOUSLY inside the click handler BEFORE any
  //         async work so browsers treat it as a direct user-gesture response.
  // FIX 2: Guard immediately if the popup was blocked — show an error instead
  //         of silently hanging.
  // FIX 3: Unwrap Paystack's nested response shape:
  //         { status, data: { authorization_url, reference } }
  const handlePaystackDeposit = async () => {
    if (!amountValid) return;

    // ✅ FIX 1 & 2 — Open popup synchronously, guard if blocked
    const popup = window.open('', 'paystack', 'width=600,height=700,scrollbars=yes');

    if (!popup || popup.closed) {
      setErrorMsg(
        'Your browser blocked the payment popup. Please allow popups for this site in your browser settings and try again.'
      );
      setStep('error');
      return;
    }

    // Show a friendly loading page in the popup while we fetch the URL
    popup.document.write(`
      <html><head><title>Redirecting to Paystack…</title>
      <style>
        body { margin:0; display:flex; align-items:center; justify-content:center;
               min-height:100vh; font-family:sans-serif; background:#0f172a; color:#94a3b8; }
        .spinner { width:40px; height:40px; border:3px solid #334155;
                   border-top-color:#3b82f6; border-radius:50%;
                   animation:spin 0.8s linear infinite; margin-bottom:16px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .wrap { text-align:center; }
      </style></head>
      <body><div class="wrap">
        <div class="spinner"></div>
        <p>Connecting to Paystack…</p>
      </div></body></html>
    `);

    setLoading(true);
    setErrorMsg('');
    setStep('processing');

    try {
      const res  = await deposits.paystackInit({ amount: parsedAmount, currency: 'GHS', channel: 'mobile_money' });

      // ✅ FIX 3 — Paystack wraps its payload: { status, data: { authorization_url, reference } }
      // Your backend forwards this shape, so unwrap it safely.
      const raw      = res.data as Record<string, unknown>;
      const inner    = (raw?.data ?? raw) as Record<string, unknown>;
      const authUrl  = (inner?.authorization_url ?? inner?.authorizationUrl ?? '') as string;
      const ref      = (inner?.reference ?? raw?.reference ?? '') as string;

      console.log('[Paystack] init response:', res.data); // DEBUG — remove after confirming

      if (!authUrl) {
        popup.close();
        throw new Error(
          'Paystack did not return a payment URL. ' +
          'The backend may have received an error from Paystack — check server logs.'
        );
      }

      setPaystackRef(ref as string);

      if (!popup.closed) {
        // ✅ Redirect the already-open popup to the real Paystack URL
        popup.location.href = authUrl;

        // Wait for the user to close the popup
        await new Promise<void>((resolve) => {
          const timer = setInterval(() => {
            if (popup.closed) { clearInterval(timer); resolve(); }
          }, 500);
        });
      } else {
        // Popup was closed before we could redirect — fall back to same-tab
        window.location.href = authUrl;
      }

      setStep('success');
    } catch (e: unknown) {
      popup?.close();
      // ✅ FIX 4 — Always log so you get visibility even without backend logs
      console.error('[Paystack] deposit error:', e);
      setErrorMsg(
        e instanceof Error
          ? e.message
          : 'Deposit failed. Please check your connection and try again.'
      );
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Binance form validation ───────────────────────────────────────────────
  const validateBinanceForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!txid.trim() || txid.trim().length < 10)
      errs.txid = 'Valid Transaction Hash required (min 10 characters)';
    if (!cryptoAmount || isNaN(+cryptoAmount) || +cryptoAmount <= 0)
      errs.cryptoAmount = 'Enter the amount you sent';
    if (!expectedGhs || isNaN(+expectedGhs) || +expectedGhs < 1)
      errs.expectedGhs = 'Enter the expected GH₵ credit amount';
    setBinanceErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Binance submit ────────────────────────────────────────────────────────
  const handleBinanceSubmit = async () => {
    if (!validateBinanceForm()) return;
    setLoading(true);
    setErrorMsg('');
    setStep('processing');
    try {
      const res = await deposits.binanceSubmit({
        txid:              txid.trim(),
        cryptoAmount:      parseFloat(cryptoAmount),
        coin,
        network,
        expectedGhsAmount: parseFloat(expectedGhs),
        senderAddress:     senderAddress.trim() || undefined,
        userNote:          userNote.trim() || undefined,
      });
      const ref = (res.data as { id?: string }).id ?? '';
      setBinanceRef(ref);
      setStep('binance-success');
    } catch (e: unknown) {
      console.error('[Binance] deposit submission error:', e);
      setErrorMsg(e instanceof Error ? e.message : 'Submission failed. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Screenshot handler ────────────────────────────────────────────────────
  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetAll = () => {
    setStep('method');
    setAmount(''); setPaystackRef('');
    setTxid(''); setCryptoAmount(''); setCoin('USDT'); setNetwork('TRC20');
    setExpectedGhs(''); setSenderAddress(''); setScreenshot(null);
    setScreenshotPreview(''); setUserNote(''); setBinanceRef('');
    setBinanceErrors({}); setErrorMsg('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Processing
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <AddCardIcon className="text-primary" sx={{ fontSize: 32 }} />
        </div>
        <h2 className="font-heading text-xl font-bold mb-2">Processing…</h2>
        <p className="text-sm text-slate-500">Please complete the payment in the popup window.</p>
        <p className="text-xs text-slate-600 mt-2">Do not close this page.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Paystack Success
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <CheckCircleIcon className="text-green-500 mx-auto mb-4" sx={{ fontSize: 64 }} />
        <h2 className="font-heading text-2xl font-bold text-green-600 mb-2">Payment Initiated</h2>
        <p className="text-lg font-semibold mb-1">{formatCurrency(parsedAmount)}</p>
        <p className="text-sm text-slate-500 mb-2">Your wallet will be credited once the payment is confirmed.</p>
        {paystackRef && (
          <p className="text-xs text-slate-400 mb-6">
            Reference: <span className="font-mono">{paystackRef}</span>
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/wallet')} className="btn-primary">Go to Wallet</button>
          <button onClick={resetAll} className="btn-secondary">Make Another Deposit</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Binance Success
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'binance-success') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl font-bold text-amber-400 mb-2">Proof Submitted!</h2>
        <p className="text-sm text-slate-400 mb-1">
          Your crypto deposit is under review. An admin will verify and credit your wallet.
        </p>
        <p className="text-xs text-slate-500 mb-2">This usually takes 1–24 hours.</p>
        {binanceRef && (
          <p className="text-xs text-slate-500 mb-6">
            Submission ID: <span className="font-mono text-slate-400">{binanceRef}</span>
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/wallet')} className="btn-primary">Go to Wallet</button>
          <button onClick={resetAll} className="btn-secondary">Make Another Deposit</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl font-bold">✕</span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-red-600 mb-2">Failed</h2>
        <p className="text-sm text-slate-500 mb-8">{errorMsg || 'Something went wrong. Please try again.'}</p>
        <button onClick={resetAll} className="btn-primary">Try Again</button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Binance — Address Info step
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'binance-info') {
    return (
      <div className="max-w-lg mx-auto p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-slate-400 hover:text-slate-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <span className="text-xl">₿</span> Crypto Deposit
            </h1>
          </div>
          {walletBalance !== null && (
            <span className="text-sm text-slate-500">
              Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(walletBalance)}</strong>
            </span>
          )}
        </div>

        {/* No Binance account? */}
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/8 to-amber-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">New to Binance?</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Create a free account to buy &amp; send crypto in minutes.
              </p>
            </div>
            <a
              href="https://www.binance.com/en/register"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
              Create Account
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Address card */}
        <div className="card p-5 mb-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 text-sm font-bold">₮</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Send USDT to this address</p>
              <p className="text-xs text-slate-500">Network: <span className="text-amber-400 font-semibold">TRC20 (TRON)</span></p>
            </div>
          </div>

          {/* Address */}
          <div className="bg-slate-800/60 rounded-xl p-4 mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Wallet Address</p>
            <p className="font-mono text-sm text-slate-100 break-all leading-relaxed mb-3">
              {BINANCE_ADDRESS}
            </p>
            <CopyButton text={BINANCE_ADDRESS} />
          </div>

          {/* Network + Coin tags */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              ['Network', BINANCE_NETWORK],
              ['Coin',    BINANCE_COIN],
              ['Min.',    '$5 USDT'],
            ].map(([label, val]) => (
              <div key={label} className="rounded-lg p-2.5 text-center bg-slate-800/40 border border-slate-700/50">
                <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                <p className="text-xs font-bold text-slate-200">{val}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
            ⚠ Only send <strong>USDT via TRC20</strong>. Sending other coins or using the wrong network
            may result in <strong>permanent loss of funds</strong>.
          </p>
        </div>

        <button
          onClick={() => setStep('binance-form')}
          className="btn-primary w-full"
        >
          I've Sent the Payment — Submit Proof →
        </button>

        <p className="text-center text-xs text-slate-400 mt-3">
          🔍 Your deposit will be credited after admin verification (1–24 hrs)
        </p>

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Binance — Proof submission form
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'binance-form') {
    const fieldErr = (key: string) =>
      binanceErrors[key]
        ? <p className="text-xs text-red-400 mt-1">{binanceErrors[key]}</p>
        : null;

    const inputCls = (key: string) =>
      `input-field ${binanceErrors[key] ? 'border-red-500 focus:ring-red-500/30' : ''}`;

    return (
      <div className="max-w-lg mx-auto p-4">

        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setStep('binance-info')} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-heading text-2xl font-bold">Payment Proof</h1>
        </div>

        <div className="space-y-4">

          {/* TXID */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Transaction Hash (TXID) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={txid}
              onChange={e => { setTxid(e.target.value); setBinanceErrors(p => ({ ...p, txid: '' })); }}
              placeholder="Paste your blockchain TXID here"
              className={inputCls('txid')}
            />
            {fieldErr('txid')}
            <p className="text-[11px] text-slate-500 mt-1.5">
              Find this in your Binance withdrawal history or blockchain explorer.
            </p>
          </div>

          {/* Coin + Network */}
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Coin <span className="text-red-400">*</span>
                </label>
                <select value={coin} onChange={e => setCoin(e.target.value)} className="input-field">
                  {COINS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Network <span className="text-red-400">*</span>
                </label>
                <select value={network} onChange={e => setNetwork(e.target.value)} className="input-field">
                  {NETWORKS.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Amount Sent ({coin}) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={cryptoAmount}
                  onChange={e => { setCryptoAmount(e.target.value); setBinanceErrors(p => ({ ...p, cryptoAmount: '' })); }}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className={inputCls('cryptoAmount')}
                />
                {fieldErr('cryptoAmount')}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Expected GH₵ Credit <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={expectedGhs}
                  onChange={e => { setExpectedGhs(e.target.value); setBinanceErrors(p => ({ ...p, expectedGhs: '' })); }}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className={inputCls('expectedGhs')}
                />
                {fieldErr('expectedGhs')}
              </div>
            </div>
          </div>

          {/* Sender address */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Sender Wallet Address
            </label>
            <input
              type="text"
              value={senderAddress}
              onChange={e => setSenderAddress(e.target.value)}
              placeholder="Wallet address you sent from (optional)"
              className="input-field"
            />
          </div>

          {/* Screenshot */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Payment Screenshot
            </label>
            {screenshotPreview ? (
              <div className="relative mb-2">
                <img src={screenshotPreview} alt="Screenshot preview" className="w-full rounded-xl max-h-48 object-cover" />
                <button
                  onClick={() => { setScreenshot(null); setScreenshotPreview(''); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-slate-600 dark:border-slate-700 cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all">
                <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate-500">Tap to upload screenshot</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
              </label>
            )}
            <p className="text-[11px] text-slate-500 mt-1.5">
              Upload a screenshot of your Binance payment confirmation (optional but recommended).
            </p>
          </div>

          {/* Note */}
          <div className="card p-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Note to Admin
            </label>
            <textarea
              value={userNote}
              onChange={e => setUserNote(e.target.value)}
              placeholder="Any additional info for the admin (optional)"
              rows={3}
              className="input-field resize-none"
            />
          </div>

        </div>

        {/* Submit */}
        <button
          onClick={handleBinanceSubmit}
          disabled={loading}
          className="btn-primary w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting…' : 'Submit Deposit Proof'}
        </button>

        <p className="text-center text-xs text-slate-400 mt-3">
          🔍 Your deposit will be manually reviewed and credited within 1–24 hours
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Method Selection (default first step)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'method') {
    return (
      <div className="max-w-lg mx-auto p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <AddCardIcon className="text-primary" />
            Deposit
          </h1>
          {walletBalance !== null && (
            <span className="text-sm text-slate-500">
              Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(walletBalance)}</strong>
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 mb-4">Choose your deposit method:</p>

        <div className="space-y-3 mb-6">

          {/* Paystack */}
          <button
            onClick={() => setStep('form')}
            className="w-full card p-5 flex items-center gap-4 text-left hover:border-primary/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100">Mobile Money / Card</p>
              <p className="text-xs text-slate-500 mt-0.5">Pay instantly via Paystack — MTN, Vodafone, AirtelTigo, Visa, Mastercard</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Instant</span>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Binance / Crypto */}
          <button
            onClick={() => setStep('binance-info')}
            className="w-full card p-5 flex items-center gap-4 text-left hover:border-amber-500/40 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
              <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100">Crypto (Binance / USDT)</p>
              <p className="text-xs text-slate-500 mt-0.5">Send USDT via TRC20 · BTC · ETH · BNB — manual review &amp; credit</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">1–24 hrs</span>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render: Paystack amount form
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <AddCardIcon className="text-primary" />
            Mobile Money / Card
          </h1>
        </div>
        {walletBalance !== null && (
          <span className="text-sm text-slate-500">
            Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(walletBalance)}</strong>
          </span>
        )}
      </div>

      {/* Amount card */}
      <div className="card p-5 mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          Amount (GH₵)
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={`Minimum GH₵${MIN_AMOUNT}`}
          className="input-field mb-1"
          min={MIN_AMOUNT}
          step="1"
        />
        {amount && !amountValid && (
          <p className="text-xs text-red-500 mb-3">
            Minimum deposit is {formatCurrency(MIN_AMOUNT)}
          </p>
        )}
        {(!amount || amountValid) && <div className="mb-3" />}

        <div className="grid grid-cols-5 gap-2">
          {QUICK_AMOUNTS.map(qa => (
            <button
              key={qa}
              onClick={() => setAmount(qa.toString())}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                amount === qa.toString()
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {qa >= 1000 ? `${qa / 1000}k` : qa}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handlePaystackDeposit}
        disabled={!amountValid || loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!amount
          ? `Enter an Amount (min GH₵${MIN_AMOUNT})`
          : !amountValid
            ? `Minimum is ${formatCurrency(MIN_AMOUNT)}`
            : `Pay ${formatCurrency(parsedAmount)} via Paystack`}
      </button>

      <p className="text-center text-xs text-slate-400 mt-3">
        🔒 Payments secured by Paystack
      </p>
    </div>
  );
}