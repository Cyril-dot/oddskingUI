import { useState, useEffect, useRef } from "react";

/* ─── Config ──────────────────────────────────────────────────────────────── */
const API_BASE = "https://futballbackend-production-aefb.up.railway.app";
const MIN_DEPOSIT_GHS = 300;
const MIN_DEPOSIT_NGN = 30000;
const QUICK_AMOUNTS_GHS = [300, 500, 1000, 2000, 5000, 10000, 20000, 50000];
const QUICK_AMOUNTS_NGN = [30000, 50000, 100000, 200000, 500000, 1000000];

const NETWORKS_GH = [
  { id: "MTN",       label: "MTN MoMo",        color: "#FFCC00", textColor: "#1a1a1a", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSh1DZpMsH7WfqiU7sB6Pky_rHEQAumb9Tg-A&s" },
  { id: "VODAFONE",  label: "Telecel Cash",     color: "#E00000", textColor: "#fff",    logo: "https://www.telecel.com.gh/img/Telecel-Icon-Red.png" },
  { id: "AIRTELTIGO",label: "AirtelTigo Money", color: "#EF3E2D", textColor: "#fff",    logo: "https://amaghanaonline.com/wp-content/uploads/2022/07/WhatsApp-Image-2022-07-27-at-5.16.26-PM.jpeg" },
];

const BINANCE_ADDRESS = "THHf1TpvjtpZ8QoLnCXXeUgs116pgHwgVq";
const CRYPTO_COINS    = ["USDT", "BTC", "ETH", "BNB", "USDC"];
const CRYPTO_NETWORKS = ["TRC20", "BEP20", "ERC20", "Arbitrum", "Optimism"];

const BANK_NAME   = "MONIEPOINT";
const BANK_ACCT   = "ALIYU ABDULMALIK SANNI";
const BANK_NUMBER = "8051691303";

const COUNTRIES = [
  { id: "GH", name: "Ghana",   flag: "🇬🇭", currency: "GHS", symbol: "GH₵", color: "#006B3F", accent: "#FCD116" },
  { id: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN", symbol: "₦",   color: "#008751", accent: "#ffffff" },
];

const SUPPORT_CHANNELS = [
  { icon: "💬", label: "WhatsApp Support", sub: "Chat with us instantly",    href: "https://wa.me/233000000000", color: "#25D366" },
  { icon: "✉️", label: "Email Support",    sub: "support@zynobet.site",      href: "mailto:support@zynobet.site", color: "#4A90E2" },
  { icon: "📱", label: "Telegram",         sub: "@zynobet",                  href: "https://t.me/zynobet",        color: "#0088cc" },
];

const STEP  = { COUNTRY: -1, METHOD: 0, DETAILS: 1, APPROVE: 2, DONE: 3 };
const SUB   = { SMS: "sms", WAIT: "wait", VERIFY: "verify" };
const BSTEP = { INFO: "binance-info", FORM: "binance-form", SUCCESS: "binance-success" };
const BKSTEP = { INFO: "bank-info", FORM: "bank-form", SUCCESS: "bank-success" };

/* ─── Logger ──────────────────────────────────────────────────────────────── */
const log = {
  _ts: () => new Date().toISOString(),
  info:  (...a) => console.log (`[DEPOSIT ${log._ts()}] ℹ️ `, ...a),
  warn:  (...a) => console.warn(`[DEPOSIT ${log._ts()}] ⚠️ `, ...a),
  error: (...a) => console.error(`[DEPOSIT ${log._ts()}] ❌ `, ...a),
  api:   (method, path, body) => console.log(`[DEPOSIT ${log._ts()}] 🌐 ${method} ${API_BASE}${path}`, body ?? ""),
  res:   (path, status, data) => console.log(`[DEPOSIT ${log._ts()}] ✅ ${path} → ${status}`, data),
  fail:  (path, status, data) => console.error(`[DEPOSIT ${log._ts()}] ❌ ${path} → ${status}`, data),
};

/* ─── Styles injected once ───────────────────────────────────────────────── */
if (!document.getElementById("zyno-styles")) {
  const s = document.createElement("style");
  s.id = "zyno-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Sora',sans-serif;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
    .zcard{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) both;}
    .zbtn{transition:all .18s;}
    .zbtn:hover:not(:disabled){filter:brightness(1.09);transform:translateY(-1px);}
    .zbtn:active:not(:disabled){transform:translateY(0);}
    .zmethod:hover{border-color:#6366f1!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(99,102,241,.18);}
    .zcountry:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(0,0,0,.22)!important;}
    .zcopy:hover{background:#e0e7ff!important;}
    input:focus,textarea:focus,select:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.14);outline:none;}
  `;
  document.head.appendChild(s);
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="zcopy" onClick={() => { navigator.clipboard.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
      style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:6, cursor:"pointer", border:"none", background:copied?"#d1fae5":"#eef2ff", color:copied?"#065f46":"#6366f1", transition:"all .2s", fontFamily:"'Sora',sans-serif" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Badge({ label, color="#6366f1" }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, background:color+"22", color, fontFamily:"'Sora',sans-serif", letterSpacing:".3px" }}>
      {label}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
      <span style={{ fontSize:10, fontWeight:800, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"1.2px", fontFamily:"'Sora',sans-serif" }}>{children}</span>
      <div style={{ flex:1, height:1, background:"linear-gradient(to right,#e5e7eb,transparent)" }} />
    </div>
  );
}

function Steps({ current, labels }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:20 }}>
      {labels.map((lbl, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", flex:i<labels.length-1?1:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, flexShrink:0, background:done||active?"#6366f1":"#f3f4f6", color:done||active?"#fff":"#9ca3af", border:active?"3px solid #c7d2fe":"3px solid transparent", transition:"all .3s" }}>
                {done ? "✓" : i+1}
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:active?"#6366f1":done?"#6366f1":"#9ca3af", whiteSpace:"nowrap", fontFamily:"'Sora',sans-serif" }}>{lbl}</span>
            </div>
            {i < labels.length-1 && <div style={{ flex:1, height:2, background:done?"#6366f1":"#e5e7eb", margin:"0 8px", minWidth:16, borderRadius:2, transition:"background .3s" }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function DepositPage() {
  /* auth guard */
  useEffect(() => {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    log.info("Auth check — token present:", !!token);
    if (!token) { log.warn("No token found, redirecting to /login"); window.location.href = "/login"; }
  }, []);

  const tok = () => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

  /* ── state ── */
  const [country,  setCountry]  = useState(null);
  const [step,     setStep]     = useState(STEP.COUNTRY);
  const [sub,      setSub]      = useState(SUB.WAIT);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [showSupport, setShowSupport] = useState(false);
  const timerRef = useRef(null);

  /* momo */
  const [amount,        setAmount]        = useState("");
  const [phone,         setPhone]         = useState("");
  const [network,       setNetwork]       = useState("MTN");
  const [externalRef,   setRef]           = useState("");
  const [countdown,     setCount]         = useState(120);
  const [actionRequired,setActionRequired]= useState(false);
  const [smsCode,       setSmsCode]       = useState("");

  /* crypto (Binance) — frontend-specific field names */
  const [bStep,          setBStep]          = useState(BSTEP.INFO);
  const [cryptoTxHash,   setCryptoTxHash]   = useState("");   // maps → txid
  const [cryptoCoin,     setCryptoCoin]     = useState("USDT");
  const [cryptoNet,      setCryptoNet]      = useState("TRC20");
  const [cryptoAmtSent,  setCryptoAmtSent]  = useState("");   // maps → cryptoAmount
  const [cryptoExpected, setCryptoExpected] = useState("");   // maps → expectedGhsAmount
  const [cryptoWallet,   setCryptoWallet]   = useState("");   // maps → senderAddress
  const [cryptoNote,     setCryptoNote]     = useState("");   // maps → userNote
  const [cryptoErrors,   setCryptoErrors]   = useState({});

  /* bank transfer — frontend-specific field names */
  const [bkStep,       setBkStep]       = useState(BKSTEP.INFO);
  const [bankRef,      setBankRef]      = useState("");      // maps → txid
  const [bankAmtSent,  setBankAmtSent]  = useState("");      // maps → cryptoAmount
  const [bankExpected, setBankExpected] = useState("");      // maps → expectedGhsAmount
  const [bankSender,   setBankSender]   = useState("");      // maps → senderAddress
  const [bankNote,     setBankNote]     = useState("");      // maps → userNote
  const [bankScreenshot, setBankScreenshot] = useState(null);
  const [bankScreenB64,  setBankScreenB64]  = useState("");
  const [bankErrors,   setBankErrors]   = useState({});

  /* ── countdown ── */
  useEffect(() => {
    if (step === STEP.APPROVE && sub === SUB.WAIT) {
      setCount(120);
      timerRef.current = setInterval(() => setCount(p => { if(p<=1){ clearInterval(timerRef.current); return 0; } return p-1; }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step, sub]);

  /* ── helpers ── */
  const fmt        = sc => `${String(Math.floor(sc/60)).padStart(2,"0")}:${String(sc%60).padStart(2,"0")}`;
  const networkLabel = NETWORKS_GH.find(n=>n.id===network)?.label ?? network;
  const countryObj   = COUNTRIES.find(c=>c.id===country);
  const currSymbol   = countryObj?.symbol ?? "GH₵";
  const minDeposit   = country === "NG" ? MIN_DEPOSIT_NGN : MIN_DEPOSIT_GHS;
  const quickAmounts = country === "NG" ? QUICK_AMOUNTS_NGN : QUICK_AMOUNTS_GHS;

  /* ── API helper with full logging ── */
  const post = async (path, body) => {
    log.api("POST", path, body);
    let res, data;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      });
      data = await res.json();
    } catch (networkErr) {
      log.error("Network/parse error on", path, networkErr);
      throw new Error("Network error — please check your connection and try again.");
    }
    if (!res.ok) {
      log.fail(path, res.status, data);
      const msg = data?.message || data?.error || data?.detail || `Server error (${res.status})`;
      throw new Error(msg);
    }
    log.res(path, res.status, data);
    return data;
  };

  /* ── MoMo handlers ── */
  const handleInit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < minDeposit) return setError(`Minimum deposit is ${currSymbol}${minDeposit.toLocaleString()}`);
    if (!phone.trim()) return setError("MoMo phone number is required.");
    if (!/^0\d{9}$/.test(phone.trim())) return setError("Enter a valid 10-digit number starting with 0.");
    setLoading(true);
    log.info("Initiating MoMo deposit", { amount: amt, phone: phone.trim(), network });
    try {
      const data = await post("/api/wallet/deposit/moolre/init", { amount: amt, phone: phone.trim(), network });
      log.info("MoMo init success", data);
      setRef(data?.data?.externalref || "");
      const isAR = data?.data?.actionRequired === true;
      setActionRequired(isAR);
      setSub(isAR ? SUB.SMS : SUB.WAIT);
      setStep(STEP.APPROVE);
    } catch(e) {
      log.error("MoMo init failed", e);
      setError(e.message || "Deposit initiation failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleSmsSubmit = async () => {
    setError("");
    if (!smsCode.trim()) return setError("Please enter the SMS code.");
    setLoading(true);
    log.info("Submitting SMS OTP", { externalref: externalRef });
    try {
      await post("/api/wallet/deposit/moolre/otp", { externalref: externalRef, otp: smsCode.trim() });
      log.info("OTP accepted");
      setSmsCode(""); setSub(SUB.WAIT);
    } catch(e) {
      log.error("OTP failed", e);
      setError(e.message || "Code verification failed.");
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setError(""); setInfo("");
    setLoading(true);
    log.info("Verifying MoMo payment", { externalref: externalRef });
    try {
      const data = await post("/api/wallet/deposit/moolre/verify", { externalref: externalRef });
      const r = data?.data;
      log.info("Verify response", r);
      if      (r?.credited)      setStep(STEP.DONE);
      else if (r?.txstatus === 0) setInfo("Still pending — please approve the prompt on your phone.");
      else if (r?.txstatus === 2) setError("Payment cancelled or failed. Please try again.");
      else                        setInfo(r?.message || "Status unclear. Please try verifying again.");
    } catch(e) {
      log.error("Verify failed", e);
      setError(e.message || "Verification failed.");
    } finally { setLoading(false); }
  };

  const restart = () => {
    log.info("Restarting MoMo flow");
    setStep(STEP.DETAILS); setError(""); setInfo(""); setRef(""); setSmsCode(""); setSub(SUB.WAIT);
    clearInterval(timerRef.current);
  };

  /* ── Crypto (Binance) handler — maps frontend fields → API fields ── */
  const validateCrypto = () => {
    const errs = {};
    if (!cryptoTxHash.trim() || cryptoTxHash.trim().length < 10) errs.cryptoTxHash = "A valid Transaction Hash is required";
    if (!cryptoAmtSent || isNaN(+cryptoAmtSent) || +cryptoAmtSent <= 0) errs.cryptoAmtSent = "Enter the amount you sent";
    if (!cryptoExpected || isNaN(+cryptoExpected) || +cryptoExpected < 1) errs.cryptoExpected = "Enter the expected credit amount";
    setCryptoErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCryptoSubmit = async () => {
    if (!validateCrypto()) return;
    setLoading(true); setError("");
    /* Map descriptive frontend names → API field names */
    const payload = {
      txid:             cryptoTxHash.trim(),
      cryptoAmount:     parseFloat(cryptoAmtSent),
      coin:             cryptoCoin,
      network:          cryptoNet,
      expectedGhsAmount: parseFloat(cryptoExpected),
      senderAddress:    cryptoWallet.trim() || undefined,
      userNote:         cryptoNote.trim()   || undefined,
    };
    log.info("Submitting crypto deposit proof", payload);
    try {
      await post("/api/wallet/deposit/binance/submit", payload);
      log.info("Crypto proof submitted successfully");
      setBStep(BSTEP.SUCCESS);
    } catch(e) {
      log.error("Crypto submission failed", e);
      setError(e.message || "Submission failed. Please try again.");
    } finally { setLoading(false); }
  };

  /* ── Bank Transfer handler — maps frontend fields → same API fields ── */
  const handleScreenshotChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    log.info("Screenshot selected", { name: file.name, size: file.size, type: file.type });
    setBankScreenshot(file);
    const r = new FileReader();
    r.onload = ev => setBankScreenB64(ev.target.result.split(",")[1]);
    r.readAsDataURL(file);
  };

  const validateBank = () => {
    const errs = {};
    if (!bankRef.trim() || bankRef.trim().length < 3) errs.bankRef = "Transfer reference / narration is required";
    const amt = parseFloat(bankAmtSent);
    if (!amt || isNaN(amt) || amt <= 0)    errs.bankAmtSent = "Enter the amount you transferred";
    else if (amt < MIN_DEPOSIT_NGN)        errs.bankAmtSent = `Minimum deposit is ₦${MIN_DEPOSIT_NGN.toLocaleString()}`;
    if (!bankExpected || isNaN(+bankExpected) || +bankExpected < 1) errs.bankExpected = "Enter expected wallet credit";
    if (!bankScreenB64) errs.bankScreenshot = "A payment screenshot is required";
    setBankErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBankSubmit = async () => {
    if (!validateBank()) return;
    setLoading(true); setError("");
    /* Map descriptive frontend names → API field names (same endpoint as crypto) */
    const payload = {
      txid:              bankRef.trim(),
      cryptoAmount:      parseFloat(bankAmtSent),
      coin:              "NGN",
      network:           "BANK_TRANSFER",
      expectedGhsAmount: parseFloat(bankExpected),
      senderAddress:     bankSender.trim() || undefined,
      userNote:          (bankNote.trim() || "") + (bankScreenB64 ? ` [Screenshot:base64:${bankScreenB64}]` : ""),
    };
    log.info("Submitting bank transfer proof (via binance endpoint)", { ...payload, userNote: payload.userNote?.slice(0,80)+"…" });
    try {
      await post("/api/wallet/deposit/binance/submit", payload);
      log.info("Bank proof submitted successfully");
      setBkStep(BKSTEP.SUCCESS);
    } catch(e) {
      log.error("Bank submission failed", e);
      setError(e.message || "Submission failed. Please try again.");
    } finally { setLoading(false); }
  };

  /* ── Reset helpers ── */
  const resetAll = () => {
    log.info("Resetting deposit flow to method selection");
    setStep(STEP.METHOD); setError(""); setInfo("");
    setAmount(""); setPhone(""); setNetwork("MTN"); setRef(""); setSmsCode(""); setSub(SUB.WAIT);
    setCryptoTxHash(""); setCryptoAmtSent(""); setCryptoCoin("USDT"); setCryptoNet("TRC20");
    setCryptoExpected(""); setCryptoWallet(""); setCryptoNote(""); setCryptoErrors({}); setBStep(BSTEP.INFO);
    setBkStep(BKSTEP.INFO); setBankRef(""); setBankAmtSent(""); setBankExpected("");
    setBankSender(""); setBankNote(""); setBankScreenshot(null); setBankScreenB64(""); setBankErrors({});
    clearInterval(timerRef.current);
  };

  const backToCountry = () => { resetAll(); setCountry(null); setStep(STEP.COUNTRY); };

  /* ─────────────────────────── Colours / Style tokens ──────────────────── */
  const C = {
    bg:           "#0f0f13",
    card:         "#1a1a22",
    cardBorder:   "#2d2d3d",
    surface:      "#252530",
    surfaceBorder:"#333344",
    accent:       "#6366f1",
    accentLight:  "#818cf8",
    green:        "#10b981",
    yellow:       "#f59e0b",
    red:          "#ef4444",
    textPrimary:  "#f1f5f9",
    textSecondary:"#94a3b8",
    textMuted:    "#64748b",
  };

  const inp = (hasErr) => ({
    width:"100%", padding:"13px 16px", background:"#1e1e2a",
    border:`1.5px solid ${hasErr ? C.red+"88" : C.surfaceBorder}`,
    borderRadius:10, color:C.textPrimary, fontSize:14, fontFamily:"'Sora',sans-serif",
    outline:"none", transition:"border-color .2s, box-shadow .2s",
  });

  const btn = (variant="primary", disabled=false) => {
    const base = { width:"100%", padding:"14px 20px", borderRadius:11, fontSize:14, fontWeight:700, cursor:disabled?"not-allowed":"pointer", border:"none", fontFamily:"'Sora',sans-serif", transition:"all .2s", marginBottom:10 };
    if (disabled)         return { ...base, background:"#2d2d3d", color:"#4a4a5a" };
    if (variant==="primary") return { ...base, background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff", boxShadow:"0 4px 18px rgba(99,102,241,.35)" };
    if (variant==="secondary") return { ...base, background:"#252530", border:"1.5px solid #333344", color:"#94a3b8" };
    if (variant==="ghost")   return { ...base, background:"transparent", color:"#64748b", width:"auto", padding:"8px 0" };
    if (variant==="green")   return { ...base, background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", boxShadow:"0 4px 18px rgba(16,185,129,.3)" };
    return base;
  };

  const lbl = { display:"block", fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".8px", marginBottom:7, fontFamily:"'Sora',sans-serif" };
  const errMsg = (msg) => msg ? <div style={{ fontSize:11, color:C.red, marginTop:5, fontFamily:"'Sora',sans-serif" }}>⚠ {msg}</div> : null;

  /* ─────────────────────────── Shared Header ────────────────────────────── */
  const Header = ({ title, subtitle, onBack, backLabel="← Back" }) => (
    <div style={{ padding:"24px 24px 20px", borderBottom:`1px solid ${C.cardBorder}` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:onBack||subtitle?14:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:16 }}>⚡</span>
          </div>
          <span style={{ fontSize:12, fontWeight:800, color:C.textMuted, letterSpacing:"1px", textTransform:"uppercase", fontFamily:"'Sora',sans-serif" }}>ZYNOBET</span>
        </div>
        <button onClick={() => setShowSupport(true)} style={{ display:"flex", alignItems:"center", gap:6, background:"#252530", border:`1px solid ${C.surfaceBorder}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", color:C.textSecondary, fontSize:11, fontWeight:700, fontFamily:"'Sora',sans-serif" }}>
          🎧 Support
        </button>
      </div>
      {onBack && (
        <button onClick={onBack} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:12, padding:0, marginBottom:10, display:"flex", alignItems:"center", gap:5, fontFamily:"'Sora',sans-serif", fontWeight:600 }}>
          ← {backLabel}
        </button>
      )}
      {title    && <div style={{ fontSize:20, fontWeight:800, color:C.textPrimary, fontFamily:"'Sora',sans-serif", letterSpacing:"-.3px" }}>{title}</div>}
      {subtitle && <div style={{ fontSize:12, color:C.textMuted, marginTop:3, fontFamily:"'Sora',sans-serif" }}>{subtitle}</div>}
    </div>
  );

  /* Support modal */
  const SupportModal = () => !showSupport ? null : (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000, backdropFilter:"blur(4px)" }} onClick={()=>setShowSupport(false)}>
      <div onClick={e=>e.stopPropagation()} className="zcard" style={{ width:"100%", maxWidth:440, background:C.card, borderRadius:"20px 20px 0 0", padding:24, border:`1px solid ${C.cardBorder}`, borderBottom:"none" }}>
        <div style={{ width:36, height:4, background:"#333", borderRadius:2, margin:"0 auto 20px" }} />
        <div style={{ fontSize:16, fontWeight:800, color:C.textPrimary, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>Need Help?</div>
        <div style={{ fontSize:12, color:C.textMuted, marginBottom:20, fontFamily:"'Sora',sans-serif" }}>Our support team is available 24/7</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
          {SUPPORT_CHANNELS.map(ch => (
            <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1px solid ${C.surfaceBorder}`, borderRadius:12, padding:"14px 16px", textDecoration:"none" }}>
              <div style={{ width:40, height:40, borderRadius:10, background:ch.color+"22", border:`1px solid ${ch.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{ch.icon}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>{ch.label}</div>
                <div style={{ fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif", marginTop:2 }}>{ch.sub}</div>
              </div>
              <div style={{ marginLeft:"auto", color:C.textMuted, fontSize:14 }}>→</div>
            </a>
          ))}
        </div>
        <div style={{ background:"#1a2a1a", border:"1px solid #10b98133", borderRadius:10, padding:"11px 14px", fontSize:11, color:"#6ee7b7", fontFamily:"'Sora',sans-serif", lineHeight:1.6, marginBottom:16 }}>
          💡 For faster support, include your <strong>username</strong> and <strong>transaction details</strong> when reaching out.
        </div>
        <button onClick={()=>setShowSupport(false)} style={{ ...btn("secondary"), marginBottom:0 }}>Close</button>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Country Selection
  ══════════════════════════════════════════════════════════════ */
  const renderCountrySelect = () => (
    <>
      <Header title="Add Funds" subtitle="Select your country to get started" />
      <div style={{ padding:24 }}>
        <SectionLabel>Select Country</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
          {COUNTRIES.map(c => (
            <button key={c.id} className="zcountry zbtn"
              onClick={() => { log.info("Country selected:", c.id); setCountry(c.id); setStep(STEP.METHOD); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:16, background:C.surface, border:`1.5px solid ${C.surfaceBorder}`, borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", transition:"all .25s", boxShadow:"0 2px 12px rgba(0,0,0,.2)" }}>
              {/* Big flag */}
              <div style={{ width:56, height:56, borderRadius:14, background:`${c.color}22`, border:`1.5px solid ${c.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, flexShrink:0 }}>
                {c.flag}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:17, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>{c.name}</div>
                <div style={{ fontSize:12, color:C.textMuted, marginTop:3, fontFamily:"'Sora',sans-serif" }}>{c.currency} · {c.symbol} · Deposits Available</div>
                {/* mini payment method chips */}
                <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                  {c.id === "GH" && (
                    <>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#FFCC0022", color:"#FFCC00", fontWeight:700, fontFamily:"'Sora',sans-serif" }}>📱 MoMo</span>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#f59e0b22", color:"#f59e0b", fontWeight:700, fontFamily:"'Sora',sans-serif" }}>₿ Crypto</span>
                    </>
                  )}
                  {c.id === "NG" && (
                    <>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#10b98122", color:"#10b981", fontWeight:700, fontFamily:"'Sora',sans-serif" }}>🏦 Bank Transfer</span>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#f59e0b22", color:"#f59e0b", fontWeight:700, fontFamily:"'Sora',sans-serif" }}>₿ Crypto</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`${C.accent}22`, border:`1.5px solid ${C.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", color:C.accentLight, fontSize:14 }}>→</div>
            </button>
          ))}
        </div>
        <div style={{ background:"#1a1a2e", border:`1px solid ${C.cardBorder}`, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>🔒</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textSecondary, fontFamily:"'Sora',sans-serif" }}>Secured by Zynobet</div>
            <div style={{ fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>256-bit SSL · All deposits encrypted · Fast processing</div>
          </div>
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Payment Method
  ══════════════════════════════════════════════════════════════ */
  const renderMethod = () => (
    <>
      <Header title={`${countryObj?.flag} Deposit · ${countryObj?.currency}`} subtitle={`${countryObj?.name} — Choose your payment method`} onBack={backToCountry} backLabel="Change Country" />
      <div style={{ padding:24 }}>
        <SectionLabel>Payment Method</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          {/* Ghana: Mobile Money */}
          {country === "GH" && (
            <button className="zmethod zbtn" onClick={() => { log.info("Method: MoMo"); setStep(STEP.DETAILS); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1.5px solid ${C.surfaceBorder}`, borderRadius:14, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all .25s" }}>
              <div style={{ width:46, height:46, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:22 }}>📱</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>Mobile Money</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2, fontFamily:"'Sora',sans-serif" }}>MTN MoMo · Telecel Cash · AirtelTigo</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                <Badge label="⚡ Instant" color="#10b981" />
                <span style={{ color:C.textMuted, fontSize:14 }}>→</span>
              </div>
            </button>
          )}

          {/* Nigeria: Bank Transfer */}
          {country === "NG" && (
            <button className="zmethod zbtn" onClick={() => { log.info("Method: Bank Transfer"); setBkStep(BKSTEP.INFO); setStep(98); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1.5px solid ${C.surfaceBorder}`, borderRadius:14, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all .25s" }}>
              <div style={{ width:46, height:46, borderRadius:12, background:"linear-gradient(135deg,#10b981,#059669)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:22 }}>🏦</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>Bank Transfer</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2, fontFamily:"'Sora',sans-serif" }}>Moniepoint · Direct Bank Transfer</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                <Badge label="5–10 min" color="#10b981" />
                <span style={{ color:C.textMuted, fontSize:14 }}>→</span>
              </div>
            </button>
          )}

          {/* Both countries: Crypto */}
          <button className="zmethod zbtn" onClick={() => { log.info("Method: Crypto"); setBStep(BSTEP.INFO); setStep(99); }}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:14, background:"#1c1810", border:"1.5px solid #3d3318", borderRadius:14, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all .25s" }}>
            <div style={{ width:46, height:46, borderRadius:12, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:22 }}>₿</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:15, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>Crypto · Binance</div>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:2, fontFamily:"'Sora',sans-serif" }}>USDT (TRC20) · BTC · ETH · BNB</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
              <Badge label="1–5 min" color="#f59e0b" />
              <span style={{ color:C.textMuted, fontSize:14 }}>→</span>
            </div>
          </button>
        </div>

        {/* Min deposit info */}
        <div style={{ marginTop:14, background:"#1a2a1a", border:"1px solid #10b98133", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#6ee7b7", fontFamily:"'Sora',sans-serif" }}>
          {countryObj?.flag} Minimum deposit: <strong>{currSymbol}{minDeposit.toLocaleString()}</strong>
        </div>

        <div style={{ marginTop:12, background:"#191924", border:`1px solid ${C.cardBorder}`, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22 }}>🎧</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textSecondary, fontFamily:"'Sora',sans-serif" }}>Need help with your deposit?</div>
            <div style={{ fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>Our team is online 24/7</div>
          </div>
          <button onClick={()=>setShowSupport(true)} style={{ background:`${C.accent}22`, border:`1px solid ${C.accent}44`, borderRadius:8, padding:"6px 12px", color:C.accentLight, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>Chat</button>
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: MoMo Details
  ══════════════════════════════════════════════════════════════ */
  const renderDetails = () => (
    <>
      <Header title="📱 Mobile Money" subtitle={`${countryObj?.flag} ${countryObj?.currency} · USSD Direct Charge`} onBack={() => setStep(STEP.METHOD)} />
      <div style={{ padding:"16px 24px 8px" }}>
        <Steps current={0} labels={["Details","Approve","Done"]} />
      </div>
      <div style={{ padding:"0 24px 24px" }}>
        {error && <div style={{ background:"#2a1515", border:`1px solid ${C.red}44`, borderRadius:10, padding:"11px 14px", color:C.red, fontSize:13, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>⚠ {error}</div>}

        {/* Amount */}
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Amount ({countryObj?.currency})</label>
          <div style={{ display:"flex", alignItems:"center", background:"#1e1e2a", border:`1.5px solid ${C.surfaceBorder}`, borderRadius:10, overflow:"hidden", marginBottom:10 }}>
            <span style={{ padding:"13px 14px", color:C.textMuted, fontSize:13, fontWeight:700, borderRight:`1px solid ${C.surfaceBorder}`, background:"#252530", fontFamily:"'Sora',sans-serif" }}>{countryObj?.symbol}</span>
            <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}
              style={{ flex:1, background:"none", border:"none", outline:"none", color:C.textPrimary, fontSize:20, fontWeight:800, padding:"13px 14px", fontFamily:"'Sora',sans-serif" }} />
          </div>
          <div style={{ fontSize:11, color:C.textMuted, marginBottom:10, fontFamily:"'Sora',sans-serif" }}>Min: {currSymbol}{minDeposit.toLocaleString()}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
            {quickAmounts.map(q => (
              <button key={q} onClick={()=>setAmount(String(q))} style={{ background:parseFloat(amount)===q?"#6366f122":"#252530", border:`1.5px solid ${parseFloat(amount)===q?C.accent:C.surfaceBorder}`, borderRadius:8, padding:"8px 0", color:parseFloat(amount)===q?C.accentLight:C.textMuted, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Sora',sans-serif", transition:"all .2s" }}>
                {q>=1000?`${q/1000}k`:q}
              </button>
            ))}
          </div>
        </div>

        {/* Phone */}
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>MoMo Phone Number</label>
          <input type="tel" placeholder="0244123456" value={phone} maxLength={10} onChange={e=>setPhone(e.target.value)} style={inp()} />
          <div style={{ fontSize:11, color:C.textMuted, marginTop:5, fontFamily:"'Sora',sans-serif" }}>Format: 0XXXXXXXXX (10 digits)</div>
        </div>

        {/* Network */}
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Network</label>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {NETWORKS_GH.map(n => (
              <button key={n.id} onClick={()=>setNetwork(n.id)} style={{ display:"flex", alignItems:"center", gap:12, background:network===n.id?"#1e1e35":"#252530", border:`1.5px solid ${network===n.id?C.accent:C.surfaceBorder}`, borderRadius:10, padding:"11px 14px", cursor:"pointer", transition:"all .2s" }}>
                <img src={n.logo} alt={n.label} style={{ width:28, height:28, borderRadius:6, objectFit:"contain", background:"#fff", padding:2 }} onError={e=>{e.target.style.display="none";}} />
                <span style={{ color:network===n.id?C.accentLight:C.textSecondary, fontSize:14, fontWeight:700, flex:1, textAlign:"left", fontFamily:"'Sora',sans-serif" }}>{n.label}</span>
                {network===n.id && <div style={{ width:20, height:20, borderRadius:"50%", background:C.accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900 }}>✓</div>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:"#1a1e2a", border:`1px solid ${C.accent}33`, borderRadius:10, padding:"11px 14px", fontSize:12, color:"#a5b4fc", marginBottom:18, lineHeight:1.6, fontFamily:"'Sora',sans-serif" }}>
          📲 A USSD prompt will appear on <strong>{phone||"your phone"}</strong>. Approve within 2 minutes.
        </div>

        <button className="zbtn" onClick={handleInit} disabled={loading||!amount||!phone} style={btn("primary", loading||!amount||!phone)}>
          {loading ? "⏳ Initiating…" : `Send Prompt · ${currSymbol}${parseFloat(amount)||"0.00"}`}
        </button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: MoMo Approve
  ══════════════════════════════════════════════════════════════ */
  const renderApprove = () => (
    <>
      <Header title="Approve Payment" subtitle={`${currSymbol}${parseFloat(amount).toFixed(2)} via ${networkLabel}`} />
      <div style={{ padding:"16px 24px 8px" }}>
        <Steps current={1} labels={["Details","Approve","Done"]} />
      </div>
      <div style={{ padding:"0 24px 24px" }}>
        {error && <div style={{ background:"#2a1515", border:`1px solid ${C.red}44`, borderRadius:10, padding:"11px 14px", color:C.red, fontSize:13, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>⚠ {error}</div>}

        {/* SMS step */}
        {sub === SUB.SMS && (
          <>
            <div style={{ background:"#1c1a10", border:"1px solid #3d350a", borderRadius:12, padding:18, marginBottom:18, textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
              <div style={{ fontWeight:800, fontSize:14, color:"#fcd34d", marginBottom:6, fontFamily:"'Sora',sans-serif" }}>Check your SMS</div>
              <div style={{ fontSize:12, color:"#b45309", lineHeight:1.7, fontFamily:"'Sora',sans-serif" }}>MTN sent a code to <strong style={{color:"#fcd34d"}}>{phone}</strong>.<br/>Enter it below to trigger the USSD prompt.</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>SMS Verification Code</label>
              <input type="text" inputMode="numeric" placeholder="······" value={smsCode} maxLength={8} autoFocus onChange={e=>setSmsCode(e.target.value.replace(/\D/g,""))}
                style={{ ...inp(), fontSize:28, fontWeight:800, letterSpacing:12, textAlign:"center", padding:16, fontFamily:"'DM Mono',monospace" }} />
            </div>
            <button className="zbtn" onClick={handleSmsSubmit} disabled={loading||smsCode.length<4} style={btn("primary", loading||smsCode.length<4)}>
              {loading?"Verifying…":"Submit Code & Send USSD Prompt →"}
            </button>
            <button className="zbtn" onClick={restart} style={btn("secondary")}>← Start Over</button>
          </>
        )}

        {/* Wait for approval */}
        {sub === SUB.WAIT && (
          <>
            <div style={{ background:"#1c1a10", border:"1px solid #3d350a", borderRadius:14, padding:20, marginBottom:16, textAlign:"center" }}>
              <div style={{ fontSize:44, marginBottom:10 }}>📳</div>
              <div style={{ fontWeight:800, fontSize:15, color:"#fcd34d", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>Approve the USSD Prompt</div>
              <div style={{ fontSize:12, color:"#b45309", lineHeight:1.8, fontFamily:"'Sora',sans-serif" }}>
                A prompt was sent to <strong style={{color:"#fcd34d"}}>{phone}</strong>.<br/>
                Approve <strong style={{color:"#fcd34d"}}>{currSymbol}{parseFloat(amount).toFixed(2)}</strong> on {networkLabel}.
              </div>
              <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:8, background:"#2a2010", border:"1px solid #4a3a10", borderRadius:20, padding:"6px 14px" }}>
                <span style={{ fontSize:12, color:countdown>30?"#fcd34d":"#ef4444", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmt(countdown)}</span>
                <span style={{ fontSize:11, color:"#78716c", fontFamily:"'Sora',sans-serif" }}>{countdown>0?"remaining":"expired"}</span>
              </div>
            </div>
            <button className="zbtn" onClick={()=>{ setSub(SUB.VERIFY); setError(""); setInfo(""); }} style={btn("primary")}>
              ✅ I've Approved — Verify Payment
            </button>
            <button className="zbtn" onClick={restart} style={btn("secondary")}>← Start Over</button>
          </>
        )}

        {/* Verify */}
        {sub === SUB.VERIFY && (
          <>
            {info && <div style={{ background:"#1a2030", border:`1px solid ${C.accent}44`, borderRadius:10, padding:"11px 14px", color:"#a5b4fc", fontSize:13, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>ℹ {info}</div>}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
              <div style={{ fontWeight:800, fontSize:16, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>Checking Payment…</div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:4, fontFamily:"'Sora',sans-serif" }}>{currSymbol}{parseFloat(amount).toFixed(2)} · {networkLabel}</div>
            </div>
            <button className="zbtn" onClick={handleVerify} disabled={loading} style={btn("primary",loading)}>
              {loading?"🔄 Verifying…":"Verify Payment"}
            </button>
            <button className="zbtn" onClick={()=>{ setSub(SUB.WAIT); setError(""); setInfo(""); }} style={btn("secondary")}>← Still Waiting</button>
            <button className="zbtn" onClick={restart} style={btn("ghost")}>Start Over</button>
          </>
        )}
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: MoMo Done
  ══════════════════════════════════════════════════════════════ */
  const renderDone = () => (
    <>
      <div style={{ background:"linear-gradient(135deg,#065f46,#047857)", padding:"24px 24px 20px", borderBottom:`1px solid ${C.cardBorder}` }}>
        <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.5)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>ZYNOBET</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>✅ Deposit Successful</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginTop:3, fontFamily:"'Sora',sans-serif" }}>Funds added to your wallet</div>
      </div>
      <div style={{ padding:"16px 24px 8px" }}><Steps current={2} labels={["Details","Approve","Done"]} /></div>
      <div style={{ padding:"0 24px 24px", textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"#10b98122", border:"2px solid #10b98166", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>✅</div>
        <div style={{ fontWeight:900, fontSize:28, color:C.green, fontFamily:"'Sora',sans-serif", marginBottom:4 }}>{currSymbol}{parseFloat(amount).toFixed(2)}</div>
        <div style={{ fontSize:13, color:C.textMuted, marginBottom:24, fontFamily:"'Sora',sans-serif" }}>successfully added to your wallet</div>
        <div style={{ background:C.surface, border:`1px solid ${C.surfaceBorder}`, borderRadius:12, padding:"14px 16px", marginBottom:20, textAlign:"left" }}>
          {[["Amount",`${currSymbol} ${parseFloat(amount).toFixed(2)}`],["Network",networkLabel],["Phone",phone],["Status","✅ Credited"]].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:k==="Status"?0:10 }}>
              <span style={{ color:C.textMuted, fontSize:12, fontFamily:"'Sora',sans-serif" }}>{k}</span>
              <span style={{ color:k==="Status"?C.green:C.textPrimary, fontSize:12, fontWeight:700, fontFamily:"'Sora',sans-serif" }}>{v}</span>
            </div>
          ))}
        </div>
        <button className="zbtn" onClick={()=>window.location.href="/"} style={btn("primary")}>Back to Home</button>
        <button className="zbtn" onClick={()=>{ setStep(STEP.DETAILS); setAmount(""); setPhone(""); setNetwork("MTN"); setError(""); setInfo(""); setRef(""); setSmsCode(""); setSub(SUB.WAIT); }} style={btn("secondary")}>Make Another Deposit</button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Bank Transfer — Info
  ══════════════════════════════════════════════════════════════ */
  const renderBankInfo = () => (
    <>
      <Header title="🇳🇬 Bank Transfer" subtitle="Moniepoint · Nigeria" onBack={resetAll} />
      <div style={{ padding:24 }}>
        {error && <div style={{ background:"#2a1515", border:`1px solid ${C.red}44`, borderRadius:10, padding:"11px 14px", color:C.red, fontSize:13, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>⚠ {error}</div>}

        <div style={{ background:"#1a2a1a", border:"1px solid #10b98133", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#6ee7b7", fontFamily:"'Sora',sans-serif" }}>
          💡 Minimum deposit: <strong>₦{MIN_DEPOSIT_NGN.toLocaleString()}</strong>
        </div>

        <div style={{ background:"#101a12", border:"1px solid #10b98133", borderRadius:14, padding:18, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"#10b98122", border:"1px solid #10b98144", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🏦</div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>Transfer to this account</div>
              <div style={{ fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>Then submit your payment proof below</div>
            </div>
          </div>
          {[["Bank Name",BANK_NAME],["Account Name",BANK_ACCT],["Account Number",BANK_NUMBER]].map(([fieldLbl, val]) => (
            <div key={fieldLbl} style={{ background:"#1a2a1c", border:"1px solid #10b98133", borderRadius:10, padding:"11px 14px", marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:5, fontFamily:"'Sora',sans-serif" }}>{fieldLbl}</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                <span style={{ fontFamily:fieldLbl==="Account Number"?"'DM Mono',monospace":"'Sora',sans-serif", fontSize:fieldLbl==="Account Number"?20:14, fontWeight:800, color:C.textPrimary, wordBreak:"break-all" }}>{val}</span>
                <CopyButton text={val} />
              </div>
            </div>
          ))}
          <div style={{ background:"#1c1810", border:"1px solid #3d350a", borderRadius:8, padding:"10px 12px", fontSize:11, color:"#b45309", lineHeight:1.6, fontFamily:"'Sora',sans-serif" }}>
            ⚠ Always include your <strong style={{color:"#fcd34d"}}>username or phone number</strong> in the transfer narration so we can identify your payment.
          </div>
        </div>
        <button className="zbtn" onClick={()=>setBkStep(BKSTEP.FORM)} style={btn("green")}>I've Sent the Money → Submit Proof</button>
        <div style={{ textAlign:"center", fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>📸 Screenshot required · Verified within 5–10 minutes</div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Bank Transfer — Proof Form
     (Frontend field names differ from API field names)
  ══════════════════════════════════════════════════════════════ */
  const renderBankForm = () => (
    <>
      <Header title="Payment Proof" subtitle="🇳🇬 Bank Transfer — submit your details" onBack={()=>setBkStep(BKSTEP.INFO)} />
      <div style={{ padding:24 }}>
        {error && <div style={{ background:"#2a1515", border:`1px solid ${C.red}44`, borderRadius:10, padding:"11px 14px", color:C.red, fontSize:13, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>⚠ {error}</div>}

        {/* bankRef → txid */}
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Transfer Reference / Narration <span style={{color:C.red}}>*</span></label>
          <input type="text" value={bankRef} onChange={e=>{ setBankRef(e.target.value); setBankErrors(p=>({...p,bankRef:""})); }}
            placeholder="Your name, username, or receipt reference" style={inp(bankErrors.bankRef)} />
          {errMsg(bankErrors.bankRef)}
          <div style={{ fontSize:11, color:C.textMuted, marginTop:4, fontFamily:"'Sora',sans-serif" }}>Use the exact narration you entered during the transfer.</div>
        </div>

        {/* bankAmtSent + bankExpected */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <label style={lbl}>Amount Sent (₦) <span style={{color:C.red}}>*</span></label>
            <input type="number" value={bankAmtSent} placeholder={`Min ₦${MIN_DEPOSIT_NGN.toLocaleString()}`}
              onChange={e=>{ setBankAmtSent(e.target.value); setBankErrors(p=>({...p,bankAmtSent:""})); }} style={inp(bankErrors.bankAmtSent)} />
            {errMsg(bankErrors.bankAmtSent)}
          </div>
          <div>
            <label style={lbl}>Expected ₦ Credit <span style={{color:C.red}}>*</span></label>
            <input type="number" value={bankExpected} placeholder="0.00"
              onChange={e=>{ setBankExpected(e.target.value); setBankErrors(p=>({...p,bankExpected:""})); }} style={inp(bankErrors.bankExpected)} />
            {errMsg(bankErrors.bankExpected)}
          </div>
        </div>

        {/* bankSender → senderAddress */}
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Sender Account Name</label>
          <input type="text" value={bankSender} placeholder="Name on your bank account (optional)" onChange={e=>setBankSender(e.target.value)} style={inp()} />
        </div>

        {/* Screenshot upload */}
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Payment Screenshot <span style={{color:C.red}}>*</span></label>
          <label htmlFor="bk-screenshot" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, padding:20, borderRadius:10, cursor:"pointer", background:bankErrors.bankScreenshot?"#2a1515":"#1e1e2a", border:`2px dashed ${bankErrors.bankScreenshot?C.red+"66":bankScreenshot?C.accent:C.surfaceBorder}`, transition:"all .2s" }}>
            {bankScreenshot
              ? (<><div style={{fontSize:28}}>🖼️</div><div style={{fontSize:13,fontWeight:700,color:C.green,fontFamily:"'Sora',sans-serif"}}>{bankScreenshot.name}</div><div style={{fontSize:11,color:C.textMuted,fontFamily:"'Sora',sans-serif"}}>Tap to change</div></>)
              : (<><div style={{fontSize:28}}>📸</div><div style={{fontSize:13,fontWeight:700,color:C.accentLight,fontFamily:"'Sora',sans-serif"}}>Upload Screenshot</div><div style={{fontSize:11,color:C.textMuted,fontFamily:"'Sora',sans-serif"}}>JPG · PNG · PDF</div></>)
            }
            <input id="bk-screenshot" type="file" accept="image/*,application/pdf" onChange={handleScreenshotChange} style={{display:"none"}} />
          </label>
          {errMsg(bankErrors.bankScreenshot)}
        </div>

        {/* bankNote → userNote */}
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Note to Admin</label>
          <textarea value={bankNote} onChange={e=>setBankNote(e.target.value)} placeholder="Any additional info (optional)" rows={3} style={{ ...inp(), resize:"vertical", lineHeight:1.6 }} />
        </div>

        <button className="zbtn" onClick={handleBankSubmit} disabled={loading} style={btn("green",loading)}>
          {loading ? "Submitting…" : "Submit Transfer Proof"}
        </button>
        <div style={{ textAlign:"center", fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>🔍 Reviewed & credited within 5–10 minutes</div>
      </div>
    </>
  );

  const renderBankSuccess = () => (
    <>
      <div style={{ background:"linear-gradient(135deg,#065f46,#047857)", padding:24, borderBottom:`1px solid ${C.cardBorder}` }}>
        <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.5)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>ZYNOBET</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>🇳🇬 Proof Submitted!</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginTop:3, fontFamily:"'Sora',sans-serif" }}>Under admin review · Bank Transfer</div>
      </div>
      <div style={{ padding:"32px 24px 24px", textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"#fef3c722", border:"2px solid #f59e0b66", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>⏳</div>
        <div style={{ fontWeight:800, fontSize:20, color:C.textPrimary, fontFamily:"'Sora',sans-serif", marginBottom:8 }}>Pending Review</div>
        <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.8, marginBottom:24, fontFamily:"'Sora',sans-serif" }}>Your bank transfer is under review.<br/>An admin will verify and credit your wallet within <strong style={{color:C.textPrimary}}>5–10 minutes</strong>.</div>
        <button className="zbtn" onClick={resetAll} style={btn("primary")}>Back to Deposit</button>
        <button className="zbtn" onClick={()=>window.location.href="/"} style={btn("secondary")}>Go to Home</button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Crypto (Binance) — Info
  ══════════════════════════════════════════════════════════════ */
  const renderBinanceInfo = () => (
    <>
      <Header title="₿ Crypto Deposit" subtitle="Send USDT · TRC20 Network" onBack={resetAll} />
      <div style={{ padding:24 }}>
        {error && <div style={{ background:"#2a1515", border:`1px solid ${C.red}44`, borderRadius:10, padding:"11px 14px", color:C.red, fontSize:13, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>⚠ {error}</div>}

        <div style={{ background:"#1c1810", border:"1px solid #3d350a", borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#fcd34d", fontFamily:"'Sora',sans-serif" }}>New to Binance?</div>
            <div style={{ fontSize:12, color:"#b45309", marginTop:3, lineHeight:1.5, fontFamily:"'Sora',sans-serif" }}>Create a free account to buy & send crypto.</div>
          </div>
          <a href="https://www.binance.com/en/register" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:800, padding:"8px 14px", borderRadius:8, background:"#f59e0b", color:"#fff", textDecoration:"none", flexShrink:0, fontFamily:"'Sora',sans-serif" }}>Sign Up ↗</a>
        </div>

        <div style={{ background:"#1a1830", border:`1px solid ${C.accent}33`, borderRadius:14, padding:18, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${C.accent}22`, border:`1px solid ${C.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", color:C.accentLight, fontWeight:900, fontSize:18 }}>₮</div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>Send USDT to this address</div>
              <div style={{ fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>Network: <strong style={{color:C.accentLight}}>TRC20 (TRON)</strong></div>
            </div>
          </div>

          <div style={{ background:"#252540", border:`1px solid ${C.surfaceBorder}`, borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:6, fontFamily:"'Sora',sans-serif" }}>Wallet Address</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.textPrimary, wordBreak:"break-all", lineHeight:1.6, marginBottom:10 }}>{BINANCE_ADDRESS}</div>
            <CopyButton text={BINANCE_ADDRESS} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[["Network","TRC20"],["Coin","USDT"],["Min.","$25 USDT"]].map(([fieldLbl,val]) => (
              <div key={fieldLbl} style={{ background:"#252540", border:`1px solid ${C.surfaceBorder}`, borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:C.textMuted, marginBottom:2, fontFamily:"'Sora',sans-serif" }}>{fieldLbl}</div>
                <div style={{ fontSize:12, fontWeight:800, color:C.textPrimary, fontFamily:"'Sora',sans-serif" }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ background:"#1c1810", border:"1px solid #3d350a", borderRadius:8, padding:"10px 12px", fontSize:11, color:"#b45309", lineHeight:1.6, fontFamily:"'Sora',sans-serif" }}>
            ⚠ Only send <strong style={{color:"#fcd34d"}}>USDT via TRC20</strong>. Wrong network = <strong>permanent loss of funds</strong>.
          </div>
        </div>

        <button className="zbtn" onClick={()=>setBStep(BSTEP.FORM)} style={btn("primary")}>I've Sent the Payment → Submit Proof</button>
        <div style={{ textAlign:"center", fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>🔍 Credited after admin verification (1–5 mins)</div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Crypto (Binance) — Proof Form
     (Frontend field names differ from API field names)
  ══════════════════════════════════════════════════════════════ */
  const renderBinanceForm = () => (
    <>
      <Header title="Payment Proof" subtitle="₿ Crypto Deposit — submit your details" onBack={()=>setBStep(BSTEP.INFO)} />
      <div style={{ padding:24 }}>
        {error && <div style={{ background:"#2a1515", border:`1px solid ${C.red}44`, borderRadius:10, padding:"11px 14px", color:C.red, fontSize:13, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>⚠ {error}</div>}

        {/* cryptoTxHash → txid */}
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Transaction Hash (TXID) <span style={{color:C.red}}>*</span></label>
          <input type="text" value={cryptoTxHash} onChange={e=>{ setCryptoTxHash(e.target.value); setCryptoErrors(p=>({...p,cryptoTxHash:""})); }}
            placeholder="Paste your blockchain transaction hash" style={inp(cryptoErrors.cryptoTxHash)} />
          {errMsg(cryptoErrors.cryptoTxHash)}
          <div style={{ fontSize:11, color:C.textMuted, marginTop:4, fontFamily:"'Sora',sans-serif" }}>Find in Binance withdrawal history or a blockchain explorer.</div>
        </div>

        {/* cryptoCoin + cryptoNet */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <label style={lbl}>Coin <span style={{color:C.red}}>*</span></label>
            <select value={cryptoCoin} onChange={e=>setCryptoCoin(e.target.value)} style={inp()}>
              {CRYPTO_COINS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Network <span style={{color:C.red}}>*</span></label>
            <select value={cryptoNet} onChange={e=>setCryptoNet(e.target.value)} style={inp()}>
              {CRYPTO_NETWORKS.map(n=><option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* cryptoAmtSent + cryptoExpected */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <label style={lbl}>Amount Sent ({cryptoCoin}) <span style={{color:C.red}}>*</span></label>
            <input type="number" value={cryptoAmtSent} placeholder="0.00"
              onChange={e=>{ setCryptoAmtSent(e.target.value); setCryptoErrors(p=>({...p,cryptoAmtSent:""})); }} style={inp(cryptoErrors.cryptoAmtSent)} />
            {errMsg(cryptoErrors.cryptoAmtSent)}
          </div>
          <div>
            <label style={lbl}>Expected {countryObj?.currency ?? ""} Credit <span style={{color:C.red}}>*</span></label>
            <input type="number" value={cryptoExpected} placeholder="0.00"
              onChange={e=>{ setCryptoExpected(e.target.value); setCryptoErrors(p=>({...p,cryptoExpected:""})); }} style={inp(cryptoErrors.cryptoExpected)} />
            {errMsg(cryptoErrors.cryptoExpected)}
          </div>
        </div>

        {/* cryptoWallet → senderAddress */}
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Sender Wallet Address</label>
          <input type="text" value={cryptoWallet} placeholder="Address you sent from (optional)" onChange={e=>setCryptoWallet(e.target.value)} style={inp()} />
        </div>

        {/* cryptoNote → userNote */}
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Note to Admin</label>
          <textarea value={cryptoNote} onChange={e=>setCryptoNote(e.target.value)} placeholder="Any additional info (optional)" rows={3} style={{ ...inp(), resize:"vertical", lineHeight:1.6 }} />
        </div>

        <button className="zbtn" onClick={handleCryptoSubmit} disabled={loading} style={btn("primary",loading)}>
          {loading ? "Submitting…" : "Submit Deposit Proof"}
        </button>
        <div style={{ textAlign:"center", fontSize:11, color:C.textMuted, fontFamily:"'Sora',sans-serif" }}>🔍 Reviewed & credited within 1–5 minutes</div>
      </div>
    </>
  );

  const renderBinanceSuccess = () => (
    <>
      <div style={{ background:"linear-gradient(135deg,#1e3a5f,#1a2a4f)", padding:24, borderBottom:`1px solid ${C.cardBorder}` }}>
        <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.5)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>ZYNOBET</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>₿ Proof Submitted!</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginTop:3, fontFamily:"'Sora',sans-serif" }}>Under admin review · Crypto Deposit</div>
      </div>
      <div style={{ padding:"32px 24px 24px", textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"#1e3a5f", border:`2px solid ${C.accent}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>⏳</div>
        <div style={{ fontWeight:800, fontSize:20, color:C.textPrimary, fontFamily:"'Sora',sans-serif", marginBottom:8 }}>Pending Review</div>
        <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.8, marginBottom:24, fontFamily:"'Sora',sans-serif" }}>Your crypto deposit is under review.<br/>An admin will verify and credit your wallet within <strong style={{color:C.textPrimary}}>1–5 minutes</strong>.</div>
        <button className="zbtn" onClick={resetAll} style={btn("primary")}>Back to Deposit</button>
        <button className="zbtn" onClick={()=>window.location.href="/"} style={btn("secondary")}>Go to Home</button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     ROOT RENDER
  ══════════════════════════════════════════════════════════════ */
  const renderContent = () => {
    if (step === 98) {
      if (bkStep === BKSTEP.INFO)    return renderBankInfo();
      if (bkStep === BKSTEP.FORM)    return renderBankForm();
      if (bkStep === BKSTEP.SUCCESS) return renderBankSuccess();
    }
    if (step === 99) {
      if (bStep === BSTEP.INFO)    return renderBinanceInfo();
      if (bStep === BSTEP.FORM)    return renderBinanceForm();
      if (bStep === BSTEP.SUCCESS) return renderBinanceSuccess();
    }
    if (step === STEP.COUNTRY) return renderCountrySelect();
    if (step === STEP.METHOD)  return renderMethod();
    if (step === STEP.DETAILS) return renderDetails();
    if (step === STEP.APPROVE) return renderApprove();
    if (step === STEP.DONE)    return renderDone();
    return null;
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a10", backgroundImage:"radial-gradient(ellipse at 20% 50%,#1a1040 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,#0d1a30 0%,transparent 50%)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px 48px", fontFamily:"'Sora',sans-serif" }}>
      <SupportModal />
      <div style={{ width:"100%", maxWidth:440 }}>
        <div className="zcard" style={{ background:C.card, borderRadius:20, boxShadow:"0 20px 60px rgba(0,0,0,.5),0 4px 20px rgba(0,0,0,.3)", overflow:"hidden", border:`1px solid ${C.cardBorder}` }}>
          {renderContent()}
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#334155", fontFamily:"'Sora',sans-serif" }}>
          © 2025 Zynobet · <a href="https://www.zynobet.site" style={{ color:"#475569", textDecoration:"none" }}>zynobet.site</a>
        </div>
      </div>
    </div>
  );
}
