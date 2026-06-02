import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE    = "https://futballbackend-production-aefb.up.railway.app";
const MIN_DEPOSIT_GHS = 300;
const MIN_DEPOSIT_NGN = 500;

const QUICK_AMOUNTS_GHS = [300, 500, 1000, 2000, 5000, 10000, 20000, 50000];
const QUICK_AMOUNTS_NGN = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

const NETWORKS_GH = [
  { id: "MTN",        label: "MTN MoMo",         logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSh1DZpMsH7WfqiU7sB6Pky_rHEQAumb9Tg-A&s" },
  { id: "VODAFONE",   label: "Telecel Cash",      logo: "https://www.telecel.com.gh/img/Telecel-Icon-Red.png" },
  { id: "AIRTELTIGO", label: "AirtelTigo Money",  logo: "https://amaghanaonline.com/wp-content/uploads/2022/07/WhatsApp-Image-2022-07-27-at-5.16.26-PM.jpeg" },
];

const BINANCE_ADDRESS = "THHf1TpvjtpZ8QoLnCXXeUgs116pgHwgVq";
const BINANCE_NETWORK = "TRC20";
const BINANCE_COIN    = "USDT";
const CRYPTO_COINS    = ["USDT", "BTC", "ETH", "BNB", "USDC"];
const CRYPTO_NETWORKS = ["TRC20", "BEP20", "ERC20", "Arbitrum", "Optimism"];

// Bank account details for Nigeria
const BANK_NAME    = "MONIEPOINT";
const BANK_ACCT    = "ALIYU ABDULMALIK SANNI";
const BANK_NUMBER  = "8051691303";

const COUNTRIES = [
  { id: "GH", name: "Ghana", flag: "🇬🇭", currency: "GHS", symbol: "GH₵" },
  { id: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN", symbol: "₦"  },
];

const STEP  = { COUNTRY: -1, METHOD: 0, DETAILS: 1, APPROVE: 2, DONE: 3 };
const SUB   = { SMS: "sms", WAIT: "wait", VERIFY: "verify" };
const BSTEP = { INFO: "binance-info", FORM: "binance-form", SUCCESS: "binance-success" };
const BKSTEP = { INFO: "bank-info", FORM: "bank-form", SUCCESS: "bank-success" };

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    background: "#f0f4f9",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "24px 16px 48px",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  wrap: { width: "100%", maxWidth: 440 },
  card: {
    background: "#ffffff",
    borderRadius: 20,
    boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  hdrBand: {
    background: "linear-gradient(135deg,#0f52ba 0%,#1a73e8 100%)",
    padding: "22px 24px 20px",
  },
  hdrTitle: { color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.3px" },
  hdrSub:   { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  tabItem: (active) => ({
    padding: "11px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "default",
    borderBottom: active ? "2px solid #1a73e8" : "2px solid transparent",
    color: active ? "#1a73e8" : "#9baec8",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #1a73e8" : "2px solid transparent",
    transition: "all 0.2s",
  }),
  body: { padding: "24px" },
  err:  { background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  info: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", color: "#2563eb", fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  warn: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", color: "#92400e", fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#6b7c93", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 },
  input: {
    width: "100%", boxSizing: "border-box",
    background: "#f8faff",
    border: "1.5px solid #e2eaf6",
    borderRadius: 10, padding: "13px 14px",
    color: "#0d1e30", fontSize: 14, outline: "none",
    transition: "border-color 0.2s",
  },
  btnPri: {
    width: "100%", padding: "15px", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10,
    background: "linear-gradient(135deg,#1a73e8,#0f52ba)",
    color: "#fff", letterSpacing: "-0.2px",
    boxShadow: "0 4px 14px rgba(26,115,232,0.35)",
    transition: "opacity 0.2s, transform 0.1s",
  },
  btnPriDis: {
    width: "100%", padding: "15px", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 800, cursor: "not-allowed", marginBottom: 10,
    background: "#dde8f8", color: "#94aed4",
  },
  btnSec: {
    width: "100%", padding: "13px",
    background: "#f4f8ff",
    border: "1.5px solid #dde8f8",
    borderRadius: 12, color: "#4a6fa5", fontSize: 13, fontWeight: 700,
    cursor: "pointer", marginBottom: 10, transition: "background 0.2s",
  },
  btnGhost: {
    width: "100%", padding: "11px",
    background: "transparent", border: "none",
    color: "#9baec8", fontSize: 12, cursor: "pointer",
  },
  divider: { height: 1, background: "#eef2f9", margin: "8px 0 16px" },
  sectionHdr: { fontSize: 13, fontWeight: 700, color: "#1a2942", marginBottom: 10 },
};

/* ─── CopyButton ──────────────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 700,
        padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "none",
        background: copied ? "#d1fae5" : "#eff6ff",
        color: copied ? "#065f46" : "#1a73e8",
        transition: "all 0.2s",
      }}
    >
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}

/* ─── Progress Steps ──────────────────────────────────────────────────────── */
function ProgressSteps({ steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
      {steps.map((st, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, flexShrink: 0,
              background: st.done ? "#d1fae5" : st.active ? "#1a73e8" : "#eef2f9",
              color: st.done ? "#065f46" : st.active ? "#fff" : "#9baec8",
            }}>
              {st.done ? "✓" : st.n}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
              color: st.active ? "#1a73e8" : st.done ? "#059669" : "#9baec8",
            }}>{st.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: "#e2eaf6", minWidth: 10 }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main DepositPage ────────────────────────────────────────────────────── */
export default function DepositPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  const tok = () =>
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

  // ── Country ──
  const [country, setCountry] = useState(null); // null = not selected yet

  // ── Momo state ──
  const [amount,         setAmount]         = useState("");
  const [phone,          setPhone]          = useState("");
  const [network,        setNetwork]        = useState("MTN");
  const [step,           setStep]           = useState(STEP.COUNTRY);
  const [sub,            setSub]            = useState(SUB.WAIT);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [info,           setInfo]           = useState("");
  const [externalRef,    setRef]            = useState("");
  const [countdown,      setCount]          = useState(120);
  const [actionRequired, setActionRequired] = useState(false);
  const [smsCode,        setSmsCode]        = useState("");
  const timerRef = useRef(null);

  // ── Binance state ──
  const [bStep,          setBStep]          = useState(BSTEP.INFO);
  const [txid,           setTxid]           = useState("");
  const [cryptoAmount,   setCryptoAmount]   = useState("");
  const [coin,           setCoin]           = useState("USDT");
  const [cryptoNetwork,  setCryptoNetwork]  = useState("TRC20");
  const [expectedLocal,  setExpectedLocal]  = useState("");
  const [senderAddress,  setSenderAddress]  = useState("");
  const [userNote,       setUserNote]       = useState("");
  const [binanceErrors,  setBinanceErrors]  = useState({});

  // ── Bank Transfer state (Nigeria) ──
  const [bkStep,         setBkStep]         = useState(BKSTEP.INFO);
  const [bkTxid,         setBkTxid]         = useState("");        // used as "reference/narration"
  const [bkAmount,       setBkAmount]       = useState("");        // amount sent
  const [bkExpected,     setBkExpected]     = useState("");        // expected NGN credit
  const [bkSender,       setBkSender]       = useState("");        // sender account name
  const [bkNote,         setBkNote]         = useState("");        // note to admin
  const [bkScreenshot,   setBkScreenshot]   = useState(null);      // screenshot file
  const [bkScreenshotB64, setBkScreenshotB64] = useState("");      // base64 screenshot
  const [bkErrors,       setBkErrors]       = useState({});
  const [bkSuccess,      setBkSuccess]      = useState(false);

  // ── Countdown ──
  useEffect(() => {
    if (step === STEP.APPROVE && sub === SUB.WAIT) {
      setCount(120);
      timerRef.current = setInterval(
        () => setCount(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; }),
        1000
      );
    }
    return () => clearInterval(timerRef.current);
  }, [step, sub]);

  const fmt   = sc => `${String(Math.floor(sc / 60)).padStart(2, "0")}:${String(sc % 60).padStart(2, "0")}`;
  const networkLabel = NETWORKS_GH.find(n => n.id === network)?.label ?? network;
  const countryObj   = COUNTRIES.find(c => c.id === country);
  const currSymbol   = countryObj?.symbol ?? "GH₵";
  const minDeposit   = country === "NG" ? MIN_DEPOSIT_NGN : MIN_DEPOSIT_GHS;
  const quickAmounts = country === "NG" ? QUICK_AMOUNTS_NGN : QUICK_AMOUNTS_GHS;

  // ── API helpers ──
  const post = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || data?.error || "Request failed.");
    return data;
  };

  // ── Momo Init ──
  const handleInit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < minDeposit) return setError(`Minimum deposit is ${currSymbol}${minDeposit}.00`);
    if (!phone.trim())            return setError("MoMo phone number is required.");
    if (!/^0\d{9}$/.test(phone.trim())) return setError("Enter a valid 10-digit number starting with 0.");
    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/init", { amount: amt, phone: phone.trim(), network });
      setRef(data?.data?.externalref || "");
      const isActionRequired = data?.data?.actionRequired === true;
      setActionRequired(isActionRequired);
      setSub(isActionRequired ? SUB.SMS : SUB.WAIT);
      setStep(STEP.APPROVE);
    } catch (e) {
      setError(e.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSmsSubmit = async () => {
    setError("");
    if (!smsCode.trim()) return setError("Please enter the code from your SMS.");
    if (!externalRef)    return setError("Missing payment reference. Please start over.");
    setLoading(true);
    try {
      await post("/api/wallet/deposit/moolre/otp", { externalref: externalRef, otp: smsCode.trim() });
      setSmsCode(""); setError(""); setSub(SUB.WAIT);
    } catch (e) {
      setError(e.message || "Code verification failed. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(""); setInfo("");
    if (!externalRef) return setError("Missing reference. Please start over.");
    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/verify", { externalref: externalRef });
      const r = data?.data;
      if (r?.credited)            setStep(STEP.DONE);
      else if (r?.txstatus === 0) setInfo("Payment still pending — approve the prompt on your phone, then verify again.");
      else if (r?.txstatus === 2) setError("Payment was cancelled or failed. Please start a new deposit.");
      else                        setInfo(r?.message || "Status unclear. Try verifying again in a moment.");
    } catch (e) {
      setError(e.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(STEP.DETAILS); setError(""); setInfo("");
    setRef(""); setSmsCode(""); setSub(SUB.WAIT);
    clearInterval(timerRef.current);
  };

  // ── Binance validation ──
  const validateBinance = () => {
    const errs = {};
    if (!txid.trim() || txid.trim().length < 10)            errs.txid          = "Valid Transaction Hash required (min 10 characters)";
    if (!cryptoAmount || isNaN(+cryptoAmount) || +cryptoAmount <= 0) errs.cryptoAmount  = "Enter the amount you sent";
    if (!expectedLocal || isNaN(+expectedLocal) || +expectedLocal < 1) errs.expectedLocal = `Enter the expected ${countryObj?.currency ?? "GHS"} credit amount`;
    setBinanceErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBinanceSubmit = async () => {
    if (!validateBinance()) return;
    setLoading(true); setError("");
    try {
      await post("/api/wallet/deposit/binance/submit", {
        txid: txid.trim(), cryptoAmount: parseFloat(cryptoAmount),
        coin, network: cryptoNetwork,
        expectedGhsAmount: parseFloat(expectedLocal),
        senderAddress: senderAddress.trim() || undefined,
        userNote: userNote.trim() || undefined,
      });
      setBStep(BSTEP.SUCCESS);
    } catch (e) {
      setError(e.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Bank Transfer validation & submit ──
  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBkScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setBkScreenshotB64(ev.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const validateBank = () => {
    const errs = {};
    if (!bkTxid.trim() || bkTxid.trim().length < 3)           errs.bkTxid     = "Transfer reference / narration is required";
    if (!bkAmount || isNaN(+bkAmount) || +bkAmount <= 0)       errs.bkAmount   = "Enter the amount you transferred";
    if (!bkExpected || isNaN(+bkExpected) || +bkExpected < 1)  errs.bkExpected = "Enter the expected ₦ credit amount";
    if (!bkScreenshotB64)                                       errs.bkScreenshot = "Payment screenshot is required";
    setBkErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBankSubmit = async () => {
    if (!validateBank()) return;
    setLoading(true); setError("");
    try {
      // Reuses binance endpoint — adapted field meanings
      await post("/api/wallet/deposit/binance/submit", {
        txid: bkTxid.trim(),           // reference/narration as txid
        cryptoAmount: parseFloat(bkAmount),
        coin: "NGN",                   // bank transfer marker
        network: "BANK_TRANSFER",
        expectedGhsAmount: parseFloat(bkExpected),
        senderAddress: bkSender.trim() || undefined,
        userNote: (bkNote.trim() || "") + (bkScreenshotB64 ? ` [Screenshot attached: base64:${bkScreenshotB64.substring(0, 30)}...]` : ""),
      });
      setBkSuccess(true);
      setBkStep(BKSTEP.SUCCESS);
    } catch (e) {
      setError(e.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep(STEP.METHOD); setError(""); setInfo("");
    setAmount(""); setPhone(""); setNetwork("MTN");
    setRef(""); setSmsCode(""); setSub(SUB.WAIT);
    setTxid(""); setCryptoAmount(""); setCoin("USDT"); setCryptoNetwork("TRC20");
    setExpectedLocal(""); setSenderAddress(""); setUserNote("");
    setBinanceErrors({}); setBStep(BSTEP.INFO);
    setBkStep(BKSTEP.INFO); setBkTxid(""); setBkAmount(""); setBkExpected("");
    setBkSender(""); setBkNote(""); setBkScreenshot(null); setBkScreenshotB64("");
    setBkErrors({}); setBkSuccess(false);
    clearInterval(timerRef.current);
  };

  const backToCountry = () => {
    resetAll();
    setCountry(null);
    setStep(STEP.COUNTRY);
  };

  /* ══════════════════════════════════════════════════════════════════════════
     COUNTRY SELECTION
  ══════════════════════════════════════════════════════════════════════════ */
  const renderCountrySelect = () => (
    <>
      <div style={s.hdrBand}>
        <div style={s.hdrTitle}>Deposit Funds</div>
        <div style={s.hdrSub}>Select your country to continue</div>
      </div>
      <div style={s.body}>
        <p style={{ fontSize: 12, color: "#6b7c93", marginBottom: 16, fontWeight: 600 }}>SELECT COUNTRY</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {COUNTRIES.map(c => (
            <button
              key={c.id}
              onClick={() => { setCountry(c.id); setStep(STEP.METHOD); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 16,
                background: "#f8faff", border: "1.5px solid #dde8f8", borderRadius: 14,
                padding: "18px 20px", cursor: "pointer", textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 38, lineHeight: 1, flexShrink: 0 }}>{c.flag}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0d1e30" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#6b7c93", marginTop: 2 }}>Currency: {c.currency} · {c.symbol}</div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" stroke="#9baec8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#c0cfe0", marginTop: 24 }}>
          🔒 All deposits are encrypted and secure
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════════════════
     METHOD SELECTION
  ══════════════════════════════════════════════════════════════════════════ */
  const renderMethod = () => (
    <>
      <div style={s.hdrBand}>
        <button
          onClick={backToCountry}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}
        >
          ← Change Country
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{countryObj?.flag}</span>
          <div>
            <div style={s.hdrTitle}>Deposit Funds</div>
            <div style={s.hdrSub}>{countryObj?.name} · {countryObj?.currency}</div>
          </div>
        </div>
      </div>
      <div style={s.body}>
        <p style={{ fontSize: 12, color: "#6b7c93", marginBottom: 16, fontWeight: 600 }}>SELECT METHOD</p>

        {/* Ghana: Mobile Money */}
        {country === "GH" && (
          <button
            onClick={() => setStep(STEP.DETAILS)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 16,
              background: "#f8faff", border: "1.5px solid #dde8f8", borderRadius: 14,
              padding: "16px 18px", cursor: "pointer", marginBottom: 12, textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: "linear-gradient(135deg,#1a73e8,#0f52ba)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <rect x="5" y="2" width="14" height="20" rx="3" stroke="#fff" strokeWidth="1.8"/>
                <circle cx="12" cy="17" r="1.2" fill="#fff"/>
                <path d="M9 6h6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0d1e30" }}>Mobile Money</div>
              <div style={{ fontSize: 12, color: "#6b7c93", marginTop: 2 }}>MTN MoMo · Telecel Cash · AirtelTigo</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#d1fae5", color: "#065f46" }}>Instant</span>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="#9baec8" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
          </button>
        )}

        {/* Nigeria: Bank Transfer */}
        {country === "NG" && (
          <button
            onClick={() => { setBkStep(BKSTEP.INFO); setStep(98); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 16,
              background: "#f8faff", border: "1.5px solid #dde8f8", borderRadius: 14,
              padding: "16px 18px", cursor: "pointer", marginBottom: 12, textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: "linear-gradient(135deg,#059669,#047857)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <rect x="3" y="8" width="18" height="13" rx="2" stroke="#fff" strokeWidth="1.8"/>
                <path d="M3 12h18" stroke="#fff" strokeWidth="1.6"/>
                <path d="M7 3h10l2 5H5l2-5z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0d1e30" }}>Bank Transfer</div>
              <div style={{ fontSize: 12, color: "#6b7c93", marginTop: 2 }}>Moniepoint · Direct Bank Transfer</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#d1fae5", color: "#065f46" }}>5–10 mins</span>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="#9baec8" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
          </button>
        )}

        {/* Both countries: Crypto / Binance */}
        <button
          onClick={() => { setBStep(BSTEP.INFO); setStep(99); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 16,
            background: "#fffdf0", border: "1.5px solid #fde68a", borderRadius: 14,
            padding: "16px 18px", cursor: "pointer", marginBottom: 0, textAlign: "left",
            transition: "all 0.2s",
          }}
        >
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/>
              <path d="M9 8h4.5a2.5 2.5 0 010 5H9v3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M9 8v8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0d1e30" }}>Crypto · Binance</div>
            <div style={{ fontSize: 12, color: "#6b7c93", marginTop: 2 }}>USDT (TRC20) · BTC · ETH · BNB</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#fef3c7", color: "#92400e" }}>1–5 mins</span>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="#9baec8" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: "#c0cfe0", marginTop: 20 }}>
          🔒 All deposits are encrypted and secure
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════════════════
     BANK TRANSFER FLOW (Nigeria)
  ══════════════════════════════════════════════════════════════════════════ */
  const renderBankInfo = () => (
    <>
      <div style={s.hdrBand}>
        <button
          onClick={resetAll}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}
        >
          ← Back
        </button>
        <div style={s.hdrTitle}>Bank Transfer</div>
        <div style={s.hdrSub}>🇳🇬 Nigeria · Moniepoint</div>
      </div>
      <div style={s.body}>
        {error && <div style={s.err}>⚠️ {error}</div>}

        {/* Account details card */}
        <div style={{ background: "#f8faff", border: "1.5px solid #dde8f8", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>🏦</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0d1e30" }}>Transfer to this account</div>
              <div style={{ fontSize: 11, color: "#6b7c93" }}>Then submit your payment proof</div>
            </div>
          </div>

          {/* Bank details */}
          {[
            ["Bank Name",       BANK_NAME],
            ["Account Name",    BANK_ACCT],
            ["Account Number",  BANK_NUMBER],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ background: "#fff", border: "1px solid #e2eaf6", borderRadius: 10, padding: "11px 14px", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9baec8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{lbl}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: lbl === "Account Number" ? "monospace" : "inherit", fontSize: lbl === "Account Number" ? 18 : 14, fontWeight: 800, color: "#0d1e30", wordBreak: "break-all" }}>
                  {val}
                </span>
                <CopyButton text={val} />
              </div>
            </div>
          ))}

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: "#78350f", lineHeight: 1.6, marginTop: 4 }}>
            ⚠ Always include your <strong>username or phone number</strong> as the transfer narration/remark so we can identify your payment.
          </div>
        </div>

        <button onClick={() => setBkStep(BKSTEP.FORM)} style={s.btnPri}>
          I've Sent the Money — Submit Proof →
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: "#9baec8" }}>
          📸 Screenshot required · Verified within 5–10 minutes
        </div>
      </div>
    </>
  );

  const renderBankForm = () => {
    const ferr = (k) => bkErrors[k]
      ? <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{bkErrors[k]}</div>
      : null;
    const finput = (k) => ({ ...s.input, border: `1.5px solid ${bkErrors[k] ? "#fca5a5" : "#e2eaf6"}` });

    return (
      <>
        <div style={s.hdrBand}>
          <button
            onClick={() => setBkStep(BKSTEP.INFO)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8 }}
          >
            ← Back
          </button>
          <div style={s.hdrTitle}>Payment Proof</div>
          <div style={s.hdrSub}>Provide your transfer details</div>
        </div>
        <div style={s.body}>
          {error && <div style={s.err}>⚠️ {error}</div>}

          {/* Transfer Reference */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Transfer Reference / Narration <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="text"
              value={bkTxid}
              onChange={e => { setBkTxid(e.target.value); setBkErrors(p => ({ ...p, bkTxid: "" })); }}
              placeholder="e.g. your name, username or receipt ref"
              style={finput("bkTxid")}
            />
            {ferr("bkTxid")}
            <div style={{ fontSize: 11, color: "#9baec8", marginTop: 4 }}>Found on your bank app receipt or transfer confirmation.</div>
          </div>

          {/* Amounts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Amount Sent (₦) <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="number" value={bkAmount} placeholder="0.00" min="0" step="any"
                onChange={e => { setBkAmount(e.target.value); setBkErrors(p => ({ ...p, bkAmount: "" })); }}
                style={finput("bkAmount")}
              />
              {ferr("bkAmount")}
            </div>
            <div>
              <label style={s.label}>Expected ₦ Credit <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="number" value={bkExpected} placeholder="0.00" min="0" step="any"
                onChange={e => { setBkExpected(e.target.value); setBkErrors(p => ({ ...p, bkExpected: "" })); }}
                style={finput("bkExpected")}
              />
              {ferr("bkExpected")}
            </div>
          </div>

          {/* Sender account name */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Sender Account Name</label>
            <input
              type="text" value={bkSender} placeholder="Name on your bank account (optional)"
              onChange={e => setBkSender(e.target.value)}
              style={s.input}
            />
          </div>

          {/* Screenshot upload — COMPULSORY */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>
              Payment Screenshot <span style={{ color: "#dc2626" }}>*</span>{" "}
              <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>(Required)</span>
            </label>
            <label
              htmlFor="bk-screenshot"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "20px 16px", borderRadius: 10, cursor: "pointer",
                background: bkErrors.bkScreenshot ? "#fff5f5" : "#f8faff",
                border: `2px dashed ${bkErrors.bkScreenshot ? "#fca5a5" : bkScreenshot ? "#1a73e8" : "#e2eaf6"}`,
                transition: "all 0.2s",
              }}
            >
              {bkScreenshot ? (
                <>
                  <div style={{ fontSize: 28 }}>🖼️</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>{bkScreenshot.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7c93" }}>Tap to change</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28 }}>📸</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a73e8" }}>Upload Screenshot</div>
                  <div style={{ fontSize: 11, color: "#6b7c93" }}>JPG, PNG, PDF — tap to browse</div>
                </>
              )}
              <input
                id="bk-screenshot"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleScreenshotChange}
                style={{ display: "none" }}
              />
            </label>
            {ferr("bkScreenshot")}
          </div>

          {/* Note */}
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Note to Admin</label>
            <textarea
              value={bkNote}
              onChange={e => setBkNote(e.target.value)}
              placeholder="Any additional info (optional)"
              rows={3}
              style={{ ...s.input, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          <button onClick={handleBankSubmit} disabled={loading} style={loading ? s.btnPriDis : s.btnPri}>
            {loading ? "Submitting…" : "Submit Transfer Proof"}
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: "#9baec8" }}>
            🔍 Manually reviewed & credited within 5–10 minutes
          </div>
        </div>
      </>
    );
  };

  const renderBankSuccess = () => (
    <>
      <div style={{ ...s.hdrBand, background: "linear-gradient(135deg,#059669,#047857)" }}>
        <div style={s.hdrTitle}>Proof Submitted!</div>
        <div style={s.hdrSub}>Under admin review</div>
      </div>
      <div style={{ ...s.body, textAlign: "center", paddingTop: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "#fef3c7", border: "2px solid #fde68a",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, margin: "0 auto 16px",
        }}>⏳</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#0d1e30", marginBottom: 8 }}>Pending Review</div>
        <div style={{ fontSize: 13, color: "#6b7c93", lineHeight: 1.7, marginBottom: 24 }}>
          Your bank transfer is under review.<br />
          An admin will verify and credit your wallet within <strong style={{ color: "#0d1e30" }}>5–10 minutes</strong>.
        </div>
        <button onClick={resetAll} style={s.btnPri}>Back to Deposit</button>
        <button onClick={() => window.location.href = "/"} style={s.btnSec}>Go to Home</button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════════════════
     BINANCE FLOW
  ══════════════════════════════════════════════════════════════════════════ */
  const renderBinanceInfo = () => (
    <>
      <div style={s.hdrBand}>
        <button
          onClick={resetAll}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}
        >
          ← Back
        </button>
        <div style={s.hdrTitle}>Crypto Deposit</div>
        <div style={s.hdrSub}>Send USDT · TRC20 Network</div>
      </div>
      <div style={s.body}>
        {error && <div style={s.err}>⚠️ {error}</div>}

        <div style={{ background: "#fffdf0", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#78350f" }}>New to Binance?</div>
            <div style={{ fontSize: 12, color: "#92400e", marginTop: 3, lineHeight: 1.5 }}>Create a free account to buy &amp; send crypto in minutes.</div>
          </div>
          <a
            href="https://www.binance.com/en/register"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 800,
              padding: "8px 14px", borderRadius: 8,
              background: "#f59e0b", color: "#fff",
              textDecoration: "none", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(245,158,11,0.35)",
            }}
          >
            Sign Up ↗
          </a>
        </div>

        <div style={{ background: "#f8faff", border: "1.5px solid #dde8f8", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>₮</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0d1e30" }}>Send USDT to this address</div>
              <div style={{ fontSize: 11, color: "#6b7c93" }}>Network: <strong style={{ color: "#1a73e8" }}>TRC20 (TRON)</strong></div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2eaf6", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9baec8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Wallet Address</div>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "#0d1e30", wordBreak: "break-all", lineHeight: 1.6, marginBottom: 10 }}>
              {BINANCE_ADDRESS}
            </div>
            <CopyButton text={BINANCE_ADDRESS} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[["Network", BINANCE_NETWORK], ["Coin", BINANCE_COIN], ["Min.", "$25 USDT"]].map(([lbl, val]) => (
              <div key={lbl} style={{ background: "#fff", border: "1px solid #e2eaf6", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#9baec8", marginBottom: 2 }}>{lbl}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0d1e30" }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: "#78350f", lineHeight: 1.6 }}>
            ⚠ Only send <strong>USDT via TRC20</strong>. Wrong network = <strong>permanent loss of funds</strong>.
          </div>
        </div>

        <button onClick={() => setBStep(BSTEP.FORM)} style={s.btnPri}>
          I've Sent the Payment — Submit Proof →
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: "#9baec8" }}>
          🔍 Credited after admin verification (1–5 mins)
        </div>
      </div>
    </>
  );

  const renderBinanceForm = () => {
    const ferr = (k) => binanceErrors[k]
      ? <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{binanceErrors[k]}</div>
      : null;
    const finput = (k) => ({ ...s.input, border: `1.5px solid ${binanceErrors[k] ? "#fca5a5" : "#e2eaf6"}` });

    return (
      <>
        <div style={s.hdrBand}>
          <button
            onClick={() => setBStep(BSTEP.INFO)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8 }}
          >
            ← Back
          </button>
          <div style={s.hdrTitle}>Payment Proof</div>
          <div style={s.hdrSub}>Provide your transaction details</div>
        </div>
        <div style={s.body}>
          {error && <div style={s.err}>⚠️ {error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Transaction Hash (TXID) <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="text"
              value={txid}
              onChange={e => { setTxid(e.target.value); setBinanceErrors(p => ({ ...p, txid: "" })); }}
              placeholder="Paste your blockchain TXID here"
              style={finput("txid")}
            />
            {ferr("txid")}
            <div style={{ fontSize: 11, color: "#9baec8", marginTop: 4 }}>Find in Binance withdrawal history or blockchain explorer.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Coin <span style={{ color: "#dc2626" }}>*</span></label>
              <select value={coin} onChange={e => setCoin(e.target.value)} style={{ ...s.input }}>
                {CRYPTO_COINS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Network <span style={{ color: "#dc2626" }}>*</span></label>
              <select value={cryptoNetwork} onChange={e => setCryptoNetwork(e.target.value)} style={{ ...s.input }}>
                {CRYPTO_NETWORKS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Amount Sent ({coin}) <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="number" value={cryptoAmount} placeholder="0.00" min="0" step="any"
                onChange={e => { setCryptoAmount(e.target.value); setBinanceErrors(p => ({ ...p, cryptoAmount: "" })); }}
                style={finput("cryptoAmount")}
              />
              {ferr("cryptoAmount")}
            </div>
            <div>
              <label style={s.label}>Expected {countryObj?.currency ?? "GHS"} <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="number" value={expectedLocal} placeholder="0.00" min="0" step="any"
                onChange={e => { setExpectedLocal(e.target.value); setBinanceErrors(p => ({ ...p, expectedLocal: "" })); }}
                style={finput("expectedLocal")}
              />
              {ferr("expectedLocal")}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Sender Wallet Address</label>
            <input
              type="text" value={senderAddress} placeholder="Address you sent from (optional)"
              onChange={e => setSenderAddress(e.target.value)}
              style={s.input}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Note to Admin</label>
            <textarea
              value={userNote}
              onChange={e => setUserNote(e.target.value)}
              placeholder="Any additional info (optional)"
              rows={3}
              style={{ ...s.input, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          <button onClick={handleBinanceSubmit} disabled={loading} style={loading ? s.btnPriDis : s.btnPri}>
            {loading ? "Submitting…" : "Submit Deposit Proof"}
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: "#9baec8" }}>
            🔍 Manually reviewed & credited within 1–5 minutes
          </div>
        </div>
      </>
    );
  };

  const renderBinanceSuccess = () => (
    <>
      <div style={s.hdrBand}>
        <div style={s.hdrTitle}>Proof Submitted!</div>
        <div style={s.hdrSub}>Under admin review</div>
      </div>
      <div style={{ ...s.body, textAlign: "center", paddingTop: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "#fef3c7", border: "2px solid #fde68a",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, margin: "0 auto 16px",
        }}>⏳</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#0d1e30", marginBottom: 8 }}>Pending Review</div>
        <div style={{ fontSize: 13, color: "#6b7c93", lineHeight: 1.7, marginBottom: 24 }}>
          Your crypto deposit is under review.<br />
          An admin will verify and credit your wallet within <strong style={{ color: "#0d1e30" }}>1–5 minutes</strong>.
        </div>
        <button onClick={resetAll} style={s.btnPri}>Back to Deposit</button>
        <button onClick={() => window.location.href = "/"} style={s.btnSec}>Go to Home</button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════════════════
     MOMO STEPS
  ══════════════════════════════════════════════════════════════════════════ */
  const renderTabBar = () => {
    const tabs = [{ n: 1, label: "Details" }, { n: 2, label: "Approve" }, { n: 3, label: "Done" }];
    return (
      <div style={{ display: "flex", background: "#f8faff", borderBottom: "1px solid #e8eef8" }}>
        {tabs.map(({ n, label }) => {
          const active = step === n;
          return (
            <div key={n} style={s.tabItem(active)}>
              {n} · {label}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetails = () => (
    <>
      <div style={s.hdrBand}>
        <button
          onClick={() => setStep(STEP.METHOD)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8 }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{countryObj?.flag}</span>
          <div>
            <div style={s.hdrTitle}>Mobile Money Deposit</div>
            <div style={s.hdrSub}>{countryObj?.currency} · USSD Direct Charge</div>
          </div>
        </div>
      </div>
      {renderTabBar()}
      <div style={s.body}>
        {error && <div style={s.err}>⚠️ {error}</div>}

        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>Amount ({countryObj?.currency ?? "GHS"})</label>
          <div style={{ display: "flex", alignItems: "center", background: "#f8faff", border: "1.5px solid #e2eaf6", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
            <span style={{ padding: "13px 14px", color: "#9baec8", fontSize: 13, fontWeight: 700, borderRight: "1px solid #e2eaf6", background: "#f0f5ff" }}>{countryObj?.currency ?? "GHS"}</span>
            <input
              type="number" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#0d1e30", fontSize: 18, fontWeight: 800, padding: "13px 14px" }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#9baec8", marginBottom: 10 }}>Minimum: {currSymbol}{minDeposit}.00</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
            {quickAmounts.map(q => (
              <button key={q} onClick={() => setAmount(String(q))} style={{
                background: parseFloat(amount) === q ? "#eff6ff" : "#f8faff",
                border: `1.5px solid ${parseFloat(amount) === q ? "#1a73e8" : "#e2eaf6"}`,
                borderRadius: 8, padding: "8px 0",
                color: parseFloat(amount) === q ? "#1a73e8" : "#6b7c93",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
                {q >= 1000 ? `${q / 1000}k` : q}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>MoMo Phone Number</label>
          <input
            type="tel" placeholder="0244123456" value={phone} maxLength={10}
            onChange={e => setPhone(e.target.value)}
            style={s.input}
          />
          <div style={{ fontSize: 11, color: "#9baec8", marginTop: 5 }}>Start with 0 — e.g. 0244123456</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>Select Network</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NETWORKS_GH.map(n => (
              <button key={n.id} onClick={() => setNetwork(n.id)} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: network === n.id ? "#eff6ff" : "#f8faff",
                border: `1.5px solid ${network === n.id ? "#1a73e8" : "#e2eaf6"}`,
                borderRadius: 10, padding: "11px 14px", cursor: "pointer",
              }}>
                <img
                  src={n.logo}
                  alt={n.label}
                  style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain", background: "#fff", padding: 2 }}
                  onError={e => { e.target.style.display = "none"; }}
                />
                <span style={{ color: network === n.id ? "#1a73e8" : "#4a6fa5", fontSize: 14, fontWeight: 700, flex: 1, textAlign: "left" }}>
                  {n.label}
                </span>
                {network === n.id && (
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#1a73e8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={s.info}>
          📲 A USSD prompt will be sent to your MoMo phone. Approve it within 2 minutes to complete your deposit.
        </div>

        <button onClick={handleInit} disabled={loading || !amount || !phone} style={loading || !amount || !phone ? s.btnPriDis : s.btnPri}>
          {loading ? "Initiating…" : `Send Prompt · ${currSymbol}${parseFloat(amount) || "0.00"}`}
        </button>

        <div style={{ textAlign: "center", fontSize: 10, color: "#c0cfe0", marginTop: 6 }}>
          🔒 Secured by Moolre · USSD Direct Charge
        </div>
      </div>
    </>
  );

  const renderApprove = () => (
    <>
      <div style={s.hdrBand}>
        <div style={s.hdrTitle}>Approve Payment</div>
        <div style={s.hdrSub}>{currSymbol}{parseFloat(amount).toFixed(2)} via {networkLabel}</div>
      </div>
      {renderTabBar()}
      <div style={s.body}>
        {error && <div style={s.err}>⚠️ {error}</div>}

        {sub === SUB.SMS && (
          <>
            <ProgressSteps steps={[
              { n: "1", label: "SMS Code",   active: true,  done: false },
              { n: "2", label: "Approve",    active: false, done: false },
              { n: "3", label: "Done",       active: false, done: false },
            ]} />
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16, marginBottom: 18, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#78350f", marginBottom: 6 }}>Check your SMS</div>
              <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.65 }}>
                MTN sent a code to <strong>{phone}</strong>.<br />Enter it below to trigger the USSD prompt.
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>SMS Verification Code</label>
              <input
                type="text" inputMode="numeric" placeholder="······" value={smsCode} maxLength={8} autoFocus
                onChange={e => setSmsCode(e.target.value.replace(/\D/g, ""))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#f8faff", border: "1.5px solid #1a73e8",
                  borderRadius: 10, padding: 16, color: "#0d1e30",
                  fontSize: 24, fontWeight: 800, letterSpacing: 8, textAlign: "center", outline: "none",
                }}
              />
              <div style={{ fontSize: 11, color: "#9baec8", marginTop: 5, textAlign: "center" }}>Code is from MTN MoMo</div>
            </div>
            <button onClick={handleSmsSubmit} disabled={loading || smsCode.length < 4} style={loading || smsCode.length < 4 ? s.btnPriDis : s.btnPri}>
              {loading ? "Verifying Code…" : "Submit Code & Send USSD Prompt →"}
            </button>
            <button onClick={restart} style={s.btnSec}>← Start Over</button>
            <div style={{ background: "#f8faff", border: "1px solid #e2eaf6", borderRadius: 8, padding: "10px 12px", color: "#6b7c93", fontSize: 12, lineHeight: 1.5 }}>
              💡 Didn't receive an SMS? Wait 30s then{" "}
              <span onClick={restart} style={{ color: "#1a73e8", cursor: "pointer", textDecoration: "underline" }}>start over</span>.
            </div>
          </>
        )}

        {sub === SUB.WAIT && (
          <>
            <ProgressSteps steps={[
              ...(actionRequired ? [{ n: "1", label: "SMS Code", active: false, done: true }] : []),
              { n: "2", label: "Approve USSD", active: true,  done: false },
              { n: "3", label: "Done",         active: false, done: false },
            ]} />
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 18, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📳</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#78350f", marginBottom: 6 }}>Check your phone</div>
              <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
                A USSD prompt was sent to <strong>{phone}</strong>.<br />
                Approve the <strong style={{ color: "#d97706" }}>{currSymbol}{parseFloat(amount).toFixed(2)}</strong> payment on {networkLabel}.
              </div>
              {countdown > 0 ? (
                <div style={{ marginTop: 10, fontSize: 12, color: "#a16207" }}>
                  Expires in <strong style={{ color: "#d97706" }}>{fmt(countdown)}</strong>
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 12, color: "#dc2626" }}>Prompt may have expired — verify below</div>
              )}
            </div>
            <button onClick={() => { setSub(SUB.VERIFY); setError(""); setInfo(""); }} style={s.btnPri}>
              I've Approved — Verify Payment ✓
            </button>
            <button onClick={restart} style={s.btnSec}>← Start Over</button>
          </>
        )}

        {sub === SUB.VERIFY && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0d1e30", marginBottom: 4 }}>Verify Payment</div>
              <div style={{ fontSize: 12, color: "#6b7c93" }}>Checking {currSymbol}{parseFloat(amount).toFixed(2)} on {networkLabel}</div>
            </div>
            {info && <div style={s.info}>ℹ️ {info}</div>}
            <button onClick={handleVerify} disabled={loading} style={loading ? s.btnPriDis : s.btnPri}>
              {loading ? "Verifying…" : "Verify Payment"}
            </button>
            <button onClick={() => { setSub(SUB.WAIT); setError(""); setInfo(""); }} style={s.btnSec}>
              ← Back (Still Waiting)
            </button>
            <button onClick={restart} style={s.btnGhost}>Start Over</button>
            <div style={{ background: "#f8faff", border: "1px solid #e2eaf6", borderRadius: 8, padding: "10px 12px", color: "#6b7c93", fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
              💡 Still pending? Go back and approve the USSD prompt first.
            </div>
          </>
        )}
      </div>
    </>
  );

  const renderDone = () => (
    <>
      <div style={{ ...s.hdrBand, background: "linear-gradient(135deg,#059669,#047857)" }}>
        <div style={s.hdrTitle}>✅ Deposit Successful</div>
        <div style={s.hdrSub}>Funds added to your wallet</div>
      </div>
      {renderTabBar()}
      <div style={{ ...s.body, textAlign: "center", paddingTop: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "#d1fae5", border: "2px solid #6ee7b7",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, margin: "0 auto 14px",
        }}>✅</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: "#059669", marginBottom: 4 }}>
          {currSymbol}{parseFloat(amount).toFixed(2)}
        </div>
        <div style={{ fontSize: 13, color: "#6b7c93", marginBottom: 24 }}>
          has been added to your wallet
        </div>

        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
          {[["Amount", `${currSymbol} ${parseFloat(amount).toFixed(2)}`], ["Network", networkLabel], ["Phone", phone]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#6b7c93", fontSize: 12 }}>{k}</span>
              <span style={{ color: "#0d1e30", fontSize: 12, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        <button onClick={() => window.location.href = "/"} style={s.btnPri}>Back to Home</button>
        <button onClick={() => {
          setStep(STEP.DETAILS); setAmount(""); setPhone(""); setNetwork("MTN");
          setError(""); setInfo(""); setRef(""); setSmsCode(""); setSub(SUB.WAIT);
        }} style={s.btnSec}>
          Make Another Deposit
        </button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════════════════
     ROOT RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  const renderContent = () => {
    // Bank transfer sub-flow (Nigeria)
    if (step === 98) {
      if (bkStep === BKSTEP.INFO)    return renderBankInfo();
      if (bkStep === BKSTEP.FORM)    return renderBankForm();
      if (bkStep === BKSTEP.SUCCESS) return renderBankSuccess();
    }
    // Binance sub-flow
    if (step === 99) {
      if (bStep === BSTEP.INFO)    return renderBinanceInfo();
      if (bStep === BSTEP.FORM)    return renderBinanceForm();
      if (bStep === BSTEP.SUCCESS) return renderBinanceSuccess();
    }
    if (step === STEP.COUNTRY)  return renderCountrySelect();
    if (step === STEP.METHOD)   return renderMethod();
    if (step === STEP.DETAILS)  return renderDetails();
    if (step === STEP.APPROVE)  return renderApprove();
    if (step === STEP.DONE)     return renderDone();
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.card}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
