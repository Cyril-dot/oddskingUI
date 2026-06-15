import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://futballbackend-production-b0ef.up.railway.app";
const MIN_DEPOSIT_GHS = 300;

/* ─── Ghana MoMo Direct Payment Details ─────────────────────────────────── */
const GH_MOMO_NUMBER   = "0502918371";
const GH_MOMO_NETWORK  = "Telecel";
const GH_MOMO_NAME     = "Ikahs Prempeh";

/* ─── Bank Transfer Details (Nigeria) ───────────────────────────────────── */
const BANK_NAME        = "Moniepoint MFB";
const BANK_ACCT_NAME   = "Linus John";
const BANK_ACCT_NUMBER = "8237276433";
const MIN_DEPOSIT_NGN  = 40000;

/* ─── Types & Data ──────────────────────────────────────────────────────── */
interface Country {
  code: string;
  name: string;
  flag: string;
  flagImg: string;
  currency: string;
  symbol: string;
  gateways: ("bank_gh" | "binance" | "bank_ng")[];
}

const COUNTRIES: Country[] = [
  { code: "GH", name: "Ghana",         flag: "🇬🇭", flagImg: "https://flagcdn.com/w40/gh.png", currency: "GHS", symbol: "GH₵",  gateways: ["bank_gh", "binance"] },
  { code: "NG", name: "Nigeria",        flag: "🇳🇬", flagImg: "https://flagcdn.com/w40/ng.png", currency: "NGN", symbol: "₦",    gateways: ["bank_ng", "binance"] },
  { code: "KE", name: "Kenya",          flag: "🇰🇪", flagImg: "https://flagcdn.com/w40/ke.png", currency: "KES", symbol: "KSh",  gateways: ["binance"] },
  { code: "TZ", name: "Tanzania",       flag: "🇹🇿", flagImg: "https://flagcdn.com/w40/tz.png", currency: "TZS", symbol: "TSh",  gateways: ["binance"] },
  { code: "UG", name: "Uganda",         flag: "🇺🇬", flagImg: "https://flagcdn.com/w40/ug.png", currency: "UGX", symbol: "USh",  gateways: ["binance"] },
  { code: "SN", name: "Senegal",        flag: "🇸🇳", flagImg: "https://flagcdn.com/w40/sn.png", currency: "XOF", symbol: "CFA",  gateways: ["binance"] },
  { code: "CI", name: "Côte d'Ivoire",  flag: "🇨🇮", flagImg: "https://flagcdn.com/w40/ci.png", currency: "XOF", symbol: "CFA",  gateways: ["binance"] },
  { code: "CM", name: "Cameroon",       flag: "🇨🇲", flagImg: "https://flagcdn.com/w40/cm.png", currency: "XAF", symbol: "FCFA", gateways: ["binance"] },
  { code: "ZM", name: "Zambia",         flag: "🇿🇲", flagImg: "https://flagcdn.com/w40/zm.png", currency: "ZMW", symbol: "ZK",   gateways: ["binance"] },
  { code: "ZA", name: "South Africa",   flag: "🇿🇦", flagImg: "https://flagcdn.com/w40/za.png", currency: "ZAR", symbol: "R",    gateways: ["binance"] },
  { code: "US", name: "United States",  flag: "🇺🇸", flagImg: "https://flagcdn.com/w40/us.png", currency: "USD", symbol: "$",    gateways: ["binance"] },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", flagImg: "https://flagcdn.com/w40/gb.png", currency: "GBP", symbol: "£",    gateways: ["binance"] },
  { code: "DE", name: "Germany",        flag: "🇩🇪", flagImg: "https://flagcdn.com/w40/de.png", currency: "EUR", symbol: "€",    gateways: ["binance"] },
  { code: "FR", name: "France",         flag: "🇫🇷", flagImg: "https://flagcdn.com/w40/fr.png", currency: "EUR", symbol: "€",    gateways: ["binance"] },
];

const BINANCE_ADDRESS = "TWXJ98mLBTu4MVBRS8ZqtBdvk8D8Frdb6Y";
const CRYPTO_COINS    = ["USDT", "BTC", "ETH", "BNB", "USDC"];
const CRYPTO_NETWORKS = ["TRC20", "BEP20", "ERC20", "Arbitrum", "Optimism"];

/* ─── Design Tokens — Blue & White ─────────────────────────────────────── */
const T = {
  bg:       "#050c1a",
  surface:  "#0a1628",
  raised:   "#0f1f38",
  border:   "rgba(99,179,237,0.12)",
  blue:     "#2563eb",
  blueBright:"#3b82f6",
  blueLow:  "rgba(37,99,235,0.12)",
  blueMid:  "rgba(37,99,235,0.32)",
  blueGlow: "rgba(59,130,246,0.18)",
  gold:     "#f59e0b",
  goldLow:  "rgba(245,158,11,0.1)",
  green:    "#22c55e",
  greenLow: "rgba(34,197,94,0.1)",
  greenMid: "rgba(34,197,94,0.22)",
  white:    "#f0f6ff",
  dim:      "rgba(224,238,255,0.42)",
  faint:    "rgba(224,238,255,0.05)",
};

/* ─── Stable style objects ──────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: T.raised, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "11px 14px",
  color: T.white, fontSize: 14, outline: "none", fontFamily: "inherit",
  transition: "border 0.15s",
};

const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "13px", border: "none", borderRadius: 10,
  fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  transition: "opacity 0.15s", fontFamily: "inherit",
  boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
};

const btnGreen: React.CSSProperties = {
  ...btnPrimary,
  background: "linear-gradient(135deg,#16a34a,#15803d)",
  boxShadow: "0 4px 16px rgba(34,197,94,0.25)",
};

const btnGhost: React.CSSProperties = {
  width: "100%", padding: "12px",
  background: "transparent", border: `1px solid ${T.border}`,
  borderRadius: 10, color: T.dim, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};

const lbl: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700,
  color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6,
};

/* ─── Small helpers ─────────────────────────────────────────────────────── */
function FlagImg({ country, size = 24 }: { country: Country; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return <span style={{ fontSize: size * 0.9 }}>{country.flag}</span>;
  return <img src={country.flagImg} alt={country.name} width={size} height={size * 0.67} onError={() => setErr(true)} style={{ borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 2000); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 6, cursor: "pointer", border: "none", background: ok ? "rgba(255,255,255,0.12)" : T.blueLow, color: ok ? "#fff" : T.blueBright, transition: "all 0.2s", fontFamily: "inherit" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{ok ? "check_circle" : "content_copy"}</span>
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function Spin() {
  return <span style={{ display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "_spin 0.7s linear infinite" }} />;
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 12, marginBottom: 16, lineHeight: 1.55, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>warning</span>
      {msg}
    </div>
  );
}

function InfoBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.dim, fontSize: 12, marginBottom: 16, lineHeight: 1.55, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>info</span>
      {msg}
    </div>
  );
}

/* ─── Client-side image compressor ─────────────────────────────────────── */
function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image."));
      img.onload = () => {
        const MAX_W = 800;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        resolve(dataUrl.length > 524288 ? canvas.toDataURL("image/jpeg", 0.45) : dataUrl);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   STABLE SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

/* ── Trust Badges ── */
function TrustBadges() {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Trusted Payment Partners</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "MoMo",    matIcon: "phone_android",   desc: "Ghana" },
          { label: "Bank",    matIcon: "account_balance",  desc: "Transfer" },
          { label: "Binance", matIcon: "currency_bitcoin", desc: "Crypto" },
        ].map(b => (
          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6, background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.blueBright }}>{b.matIcon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{b.label}</div>
              <div style={{ fontSize: 9, color: T.dim }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Country Dropdown ── */
interface CountryDropdownProps {
  country: Country | null;
  ipDetecting: boolean;
  onSelect: (c: Country) => void;
}
function CountryDropdown({ country, ipDetecting, onSelect }: CountryDropdownProps) {
  const [dropOpen, setDropOpen] = useState(false);
  const [search,   setSearch]   = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.currency.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropRef} style={{ position: "relative", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>1</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Select your country</span>
        {ipDetecting && <span style={{ fontSize: 10, color: T.dim, display: "flex", alignItems: "center", gap: 4 }}><Spin /> detecting…</span>}
        {!ipDetecting && country && <span style={{ fontSize: 10, color: T.green, display: "flex", alignItems: "center", gap: 3 }}><span className="material-symbols-outlined" style={{ fontSize: 13 }}>my_location</span>auto-detected</span>}
      </div>
      <button onClick={() => setDropOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: T.raised, border: `1px solid ${dropOpen ? T.blue : T.border}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", fontFamily: "inherit", transition: "border 0.15s" }}>
        {country ? (
          <><FlagImg country={country} size={24} /><span style={{ flex: 1, textAlign: "left", color: T.white, fontSize: 14, fontWeight: 600 }}>{country.name}</span><span style={{ fontSize: 11, color: T.dim, marginRight: 6 }}>{country.currency}</span></>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: T.dim, fontSize: 13 }}>Choose a country…</span>
        )}
        <span className="material-symbols-outlined" style={{ color: T.dim, fontSize: 18, transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>expand_more</span>
      </button>

      {dropOpen && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.dim }}>search</span>
            <input autoFocus type="text" placeholder="Search country or currency…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp, padding: "6px 0", fontSize: 13, marginBottom: 0, background: "none", border: "none", flex: 1 }} />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.map(c => {
              const hasMomo   = c.gateways.includes("bank_gh");
              const hasBank   = c.gateways.includes("bank_ng");
              const badge = hasMomo ? { label: "MOMO",   bg: T.blueLow,  color: T.blueBright, border: T.blueMid }
                          : hasBank ? { label: "BANK",   bg: T.greenLow, color: T.green,      border: T.greenMid }
                          :           { label: "CRYPTO", bg: T.goldLow,  color: T.gold,       border: "rgba(245,158,11,0.3)" };
              return (
                <button key={c.code} onClick={() => { onSelect(c); setDropOpen(false); setSearch(""); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: country?.code === c.code ? T.blueLow : "none", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s" }}>
                  <FlagImg country={c} size={22} />
                  <span style={{ flex: 1, textAlign: "left", color: T.white, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: T.dim, marginRight: 8 }}>{c.currency}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em", background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Gateway Tabs ── */
interface GatewayTabsProps {
  country: Country;
  gateway: "bank_gh" | "binance" | "bank_ng" | null;
  onSelect: (gw: "bank_gh" | "binance" | "bank_ng") => void;
}
function GatewayTabs({ country, gateway, onSelect }: GatewayTabsProps) {
  if (!country || country.gateways.length <= 1) return null;

  type TabDef = { id: "bank_gh" | "binance" | "bank_ng"; matIcon: string; label: string; sub: string };
  const allTabs: TabDef[] = [
    { id: "bank_gh", matIcon: "phone_android",   label: "Mobile Money",  sub: "Telecel · Ghana MoMo" },
    { id: "bank_ng", matIcon: "account_balance",  label: "Bank Transfer", sub: "Moniepoint · Nigeria" },
    { id: "binance", matIcon: "currency_bitcoin", label: "Crypto",        sub: "USDT · BTC · ETH · BNB" },
  ];
  const tabs = allTabs.filter(t => country.gateways.includes(t.id));

  return (
    <div style={{ marginBottom: 22 }}>
      <label style={lbl}>Payment method</label>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 8 }}>
        {tabs.map(t => {
          const active    = gateway === t.id;
          const isCrypto  = t.id === "binance";
          const isBank    = t.id === "bank_ng";
          const accentClr = isCrypto ? T.gold : isBank ? T.green : T.blueBright;
          const accentBg  = isCrypto ? T.goldLow : isBank ? T.greenLow : T.blueLow;
          const accentBd  = isCrypto ? "rgba(245,158,11,0.5)" : isBank ? T.greenMid : T.blue;
          return (
            <button key={t.id} onClick={() => onSelect(t.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "13px 14px", background: active ? accentBg : T.raised, border: `1.5px solid ${active ? accentBd : T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: active ? accentClr : T.dim }}>{t.matIcon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.white, lineHeight: 1.2 }}>{t.label}</span>
              <span style={{ fontSize: 9, color: T.dim, lineHeight: 1.4 }}>{t.sub}</span>
              {active && (
                <span style={{ fontSize: 9, fontWeight: 800, color: accentClr, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>check_circle</span>SELECTED
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Support Panel ── */
function SupportPanel() {
  const [supportOpen, setSupportOpen] = useState(false);
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", marginTop: 16, animation: "_fadeUp 0.3s ease" }}>
      <button onClick={() => setSupportOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.greenLow, border: `1px solid ${T.greenMid}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.green }}>support_agent</span>
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Need help? Contact Support</div>
          <div style={{ fontSize: 11, color: T.dim }}>We're online 24/7 — response in under 5 mins</div>
        </div>
        <span className="material-symbols-outlined" style={{ color: T.dim, fontSize: 18, transform: supportOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>expand_more</span>
      </button>
      {supportOpen && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { matIcon: "chat",  label: "Live Chat",     desc: "Chat with us on WhatsApp", href: "https://wa.me/233000000000", color: "#25D366" },
              { matIcon: "mail",  label: "Email Support", desc: "zynobet.support@gmail.com",  href: "mailto:zynobet.support@gmail.com", color: "#60a5fa" },
              { matIcon: "send",  label: "Telegram",      desc: "@ZynobetSupport",            href: "https://t.me/ZynobetSupport",  color: "#2AABEE" },
            ].map(ch => (
              <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 13px", textDecoration: "none", transition: "border 0.15s" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: ch.color, flexShrink: 0 }}>{ch.matIcon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>{ch.label}</div>
                  <div style={{ fontSize: 11, color: T.dim }}>{ch.desc}</div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: ch.color }}>arrow_forward</span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 14, background: T.greenLow, border: `1px solid ${T.greenMid}`, borderRadius: 9, padding: "10px 13px", fontSize: 11, color: T.dim, lineHeight: 1.6, display: "flex", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: T.green, flexShrink: 0, marginTop: 1 }}>schedule</span>
            <span><strong style={{ color: T.white }}>Support hours:</strong> 24 hours, 7 days a week.<br />For deposit issues, have your <strong style={{ color: T.white }}>phone number / reference</strong> ready.</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Binance Info ── */
interface BinanceInfoProps { error: string; onNext: () => void; }
function BinanceInfo({ error, onNext }: BinanceInfoProps) {
  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.blueLow, border: `1px solid ${T.blueMid}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: T.blueBright, fontSize: 18 }}>currency_bitcoin</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.white }}>Send USDT to this address</div>
            <div style={{ fontSize: 11, color: T.dim }}>Network: <strong style={{ color: T.blueBright }}>TRC20 (TRON)</strong></div>
          </div>
        </div>
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Wallet Address</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.white, wordBreak: "break-all", lineHeight: 1.7, marginBottom: 10 }}>{BINANCE_ADDRESS}</div>
          <CopyBtn text={BINANCE_ADDRESS} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[["Network", "TRC20"], ["Coin", "USDT"], ["Min.", "≈ GH₵200"]].map(([l, v]) => (
            <div key={l} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 5px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, padding: "8px 11px", fontSize: 11, color: "#f87171", lineHeight: 1.55, display: "flex", gap: 7 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
          Only send <strong>USDT via TRC20</strong>. Wrong network = <strong>permanent loss of funds</strong>.
        </div>
      </div>
      <div style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Also Accepted</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CRYPTO_COINS.map(c => (
            <span key={c} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: T.goldLow, color: T.gold, border: "1px solid rgba(245,158,11,0.25)" }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ background: T.goldLow, border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: T.gold, flexShrink: 0 }}>account_balance_wallet</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: T.gold }}>New to Binance?</div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2, lineHeight: 1.4 }}>Create a free account to buy &amp; send crypto in minutes.</div>
        </div>
        <a href="https://www.binance.com/en/register" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 800, padding: "7px 13px", borderRadius: 8, background: T.gold, color: "#0a0a0a", textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          Sign Up <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
        </a>
      </div>
      <button onClick={onNext} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>I've Sent — Submit Proof
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>manage_search</span>
        Reviewed &amp; credited within 1–5 mins
      </div>
    </div>
  );
}

/* ── Binance Proof ── */
interface BinanceProofProps {
  error: string;
  txid: string; setTxid: (v: string) => void;
  cryptoAmt: string; setCryptoAmt: (v: string) => void;
  coin: string; setCoin: (v: string) => void;
  cryptoNet: string; setCryptoNet: (v: string) => void;
  expectedGhs: string; setExpectedGhs: (v: string) => void;
  senderAddr: string; setSenderAddr: (v: string) => void;
  userNote: string; setUserNote: (v: string) => void;
  bErrs: Record<string, string>; setBErrs: (fn: (p: Record<string, string>) => Record<string, string>) => void;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}
function BinanceProof({ error, txid, setTxid, cryptoAmt, setCryptoAmt, coin, setCoin, cryptoNet, setCryptoNet, expectedGhs, setExpectedGhs, senderAddr, setSenderAddr, userNote, setUserNote, bErrs, setBErrs, loading, onSubmit, onBack }: BinanceProofProps) {
  const fe = (k: string) => bErrs[k] ? <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{bErrs[k]}</div> : null;
  const fi = (k: string): React.CSSProperties => ({ ...inp, border: `1px solid ${bErrs[k] ? "rgba(239,68,68,0.5)" : T.border}` });
  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Transaction Hash (TXID) <span style={{ color: "#f87171" }}>*</span></label>
        <input type="text" value={txid} onChange={e => { setTxid(e.target.value); setBErrs(p => ({ ...p, txid: "" })); }} placeholder="Paste blockchain TXID" style={fi("txid")} />
        {fe("txid")}
        <div style={{ fontSize: 11, color: T.dim, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>Find in your Binance withdrawal history.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Coin <span style={{ color: "#f87171" }}>*</span></label>
          <select value={coin} onChange={e => setCoin(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
            {CRYPTO_COINS.map(c => <option key={c} style={{ background: "#0a1628" }}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Network <span style={{ color: "#f87171" }}>*</span></label>
          <select value={cryptoNet} onChange={e => setCryptoNet(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
            {CRYPTO_NETWORKS.map(n => <option key={n} style={{ background: "#0a1628" }}>{n}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Amount Sent ({coin}) <span style={{ color: "#f87171" }}>*</span></label>
          <input type="number" value={cryptoAmt} placeholder="0.00" min="0" step="any"
            onChange={e => { setCryptoAmt(e.target.value); setBErrs(p => ({ ...p, cryptoAmt: "" })); }} style={fi("cryptoAmt")} />
          {fe("cryptoAmt")}
        </div>
        <div>
          <label style={lbl}>Expected GH₵ Credit <span style={{ color: "#f87171" }}>*</span></label>
          <input type="number" value={expectedGhs} placeholder="0.00" min="0" step="any"
            onChange={e => { setExpectedGhs(e.target.value); setBErrs(p => ({ ...p, expectedGhs: "" })); }} style={fi("expectedGhs")} />
          {fe("expectedGhs")}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Sender Wallet <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <input type="text" value={senderAddr} placeholder="Address you sent from" onChange={e => setSenderAddr(e.target.value)} style={inp} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Note to Admin <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <textarea value={userNote} onChange={e => setUserNote(e.target.value)} placeholder="Any extra info" rows={3}
          style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
      </div>
      <button onClick={onSubmit} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.38 : 1, marginBottom: 8 }}>
        {loading ? <><Spin /> Submitting…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>Submit Deposit Proof</>}
      </button>
      <button onClick={onBack} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Back
      </button>
    </div>
  );
}

/* ── Ghana MoMo Info ── */
interface GhMomoInfoProps { error: string; onNext: () => void; }
function GhMomoInfo({ error, onNext }: GhMomoInfoProps) {
  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ background: T.blueLow, border: `1px solid ${T.blueMid}`, borderRadius: 9, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: T.blueBright, lineHeight: 1.55, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>info</span>
        Minimum deposit: <strong>GH₵{MIN_DEPOSIT_GHS.toLocaleString()}</strong>
      </div>
      <div style={{ background: T.raised, border: `1px solid ${T.blueMid}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.blueLow, border: `1px solid ${T.blueMid}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: T.blueBright, fontSize: 18 }}>phone_android</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.white }}>Send MoMo to this number</div>
            <div style={{ fontSize: 11, color: T.dim }}>Then submit your payment proof</div>
          </div>
        </div>
        {[
          { icon: "corporate_fare", label: "Network",        value: GH_MOMO_NETWORK,  mono: false },
          { icon: "person",         label: "Account Name",   value: GH_MOMO_NAME,     mono: false },
          { icon: "phone",          label: "Phone Number",   value: GH_MOMO_NUMBER,   mono: true  },
        ].map(row => (
          <div key={row.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "11px 13px", marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{row.icon}</span>{row.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: row.mono ? "'DM Mono', monospace" : "inherit", fontSize: row.mono ? 22 : 13, fontWeight: 700, color: T.white, letterSpacing: row.mono ? 3 : 0 }}>{row.value}</span>
              <CopyBtn text={row.value} />
            </div>
          </div>
        ))}
        <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: T.gold, lineHeight: 1.6, display: "flex", gap: 7 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
          Always include your <strong>username or phone number</strong> in the MoMo reference/note so we can identify your payment.
        </div>
      </div>
      <button onClick={onNext} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>I've Sent — Submit Proof
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>manage_search</span>
        Verified within 5–15 minutes
      </div>
    </div>
  );
}

/* ── Ghana MoMo Proof Form (reuses bank-deposits endpoint & field names) ── */
interface GhMomoFormProps {
  error: string;
  bankRef: string; setBankRef: (v: string) => void;
  bankAmtSent: string; setBankAmtSent: (v: string) => void;
  bankExpected: string; setBankExpected: (v: string) => void;
  bankSender: string; setBankSender: (v: string) => void;
  bankNote: string; setBankNote: (v: string) => void;
  bankScreenshot: string; setBankScreenshot: (v: string) => void;
  bankCompressing: boolean;
  bankErrs: Record<string, string>; setBankErrs: (fn: (p: Record<string, string>) => Record<string, string>) => void;
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onBack: () => void;
}
function GhMomoForm({ error, bankRef, setBankRef, bankAmtSent, setBankAmtSent, bankExpected, setBankExpected, bankSender, setBankSender, bankNote, setBankNote, bankScreenshot, setBankScreenshot, bankCompressing, bankErrs, setBankErrs, loading, onFileChange, onSubmit, onBack }: GhMomoFormProps) {
  const fe = (k: string) => bankErrs[k]
    ? <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{bankErrs[k]}</div>
    : null;
  const fi = (k: string): React.CSSProperties => ({ ...inp, border: `1px solid ${bankErrs[k] ? "rgba(239,68,68,0.5)" : T.border}` });
  const QUICK_GHS = [300, 500, 1000, 2000, 5000, 10000];

  return (
    <div>
      {error && <ErrBox msg={error} />}

      {/* Sender phone number (maps to senderAccountName field) */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Your MoMo Number <span style={{ color: "#f87171" }}>*</span></label>
        <div style={{ display: "flex", alignItems: "center", background: T.raised, border: `1px solid ${bankErrs.sender ? "rgba(239,68,68,0.5)" : T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.dim, padding: "0 12px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", height: "100%" }}>phone</span>
          <input type="tel" value={bankSender}
            onChange={e => { setBankSender(e.target.value); setBankErrs(p => ({ ...p, sender: "" })); }}
            placeholder="e.g. 0244123456"
            maxLength={15}
            style={{ ...inp, border: "none", borderRadius: 0, background: "none" }} />
        </div>
        {bankErrs.sender
          ? <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{bankErrs.sender}</div>
          : <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>The MoMo number you're sending from.</div>
        }
      </div>

      {/* Reference / narration (maps to transferReference) */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>MoMo Reference / Note <span style={{ color: "#f87171" }}>*</span></label>
        <div style={{ display: "flex", alignItems: "center", background: T.raised, border: `1px solid ${bankErrs.ref ? "rgba(239,68,68,0.5)" : T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.dim, padding: "0 12px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", height: "100%" }}>tag</span>
          <input type="text" value={bankRef}
            onChange={e => { setBankRef(e.target.value); setBankErrs(p => ({ ...p, ref: "" })); }}
            placeholder="Your username or reference you used"
            style={{ ...inp, border: "none", borderRadius: 0, background: "none" }} />
        </div>
        {fe("ref")}
        <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Enter the reference or note you included in the MoMo send.</div>
      </div>

      {/* Amount fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Amount Sent (GH₵) <span style={{ color: "#f87171" }}>*</span></label>
          <input type="number" value={bankAmtSent} placeholder={`Min GH₵${MIN_DEPOSIT_GHS}`}
            onChange={e => { setBankAmtSent(e.target.value); setBankErrs(p => ({ ...p, amt: "" })); }}
            style={fi("amt")} />
          {fe("amt")}
        </div>
        <div>
          <label style={lbl}>Expected GH₵ Credit <span style={{ color: "#f87171" }}>*</span></label>
          <input type="number" value={bankExpected} placeholder="0.00"
            onChange={e => { setBankExpected(e.target.value); setBankErrs(p => ({ ...p, exp: "" })); }}
            style={fi("exp")} />
          {fe("exp")}
        </div>
      </div>

      {/* Quick fill */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7 }}>Quick fill</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {QUICK_GHS.map(q => (
            <button key={q} onClick={() => { setBankAmtSent(String(q)); setBankExpected(String(q)); setBankErrs(p => ({ ...p, amt: "", exp: "" })); }}
              style={{ background: bankAmtSent === String(q) ? T.blueLow : T.faint, border: `1px solid ${bankAmtSent === String(q) ? T.blue : T.border}`, borderRadius: 8, padding: "7px 0", color: bankAmtSent === String(q) ? T.blueBright : T.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit" }}>
              {q >= 1000 ? `${q / 1000}k` : q}
            </button>
          ))}
        </div>
      </div>

      {/* Screenshot */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Payment Screenshot <span style={{ color: "#f87171" }}>*</span></label>
        {bankScreenshot ? (
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.blueMid}`, background: T.bg }}>
            <img src={bankScreenshot} alt="Payment screenshot" style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block" }} />
            {bankCompressing && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div>
            )}
            {!bankCompressing && (
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, cursor: "pointer", background: "rgba(0,0,0,0.7)", color: T.dim, fontFamily: "inherit" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>upload</span>Change
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
                </label>
                <button onClick={() => setBankScreenshot("")}
                  style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: "none", background: "rgba(239,68,68,0.7)", color: "#fff", fontFamily: "inherit" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>Remove
                </button>
              </div>
            )}
            {!bankCompressing && (
              <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 20, background: "rgba(34,197,94,0.85)", color: "#fff", display: "flex", alignItems: "center", gap: 3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>check_circle</span>Ready
              </div>
            )}
          </div>
        ) : (
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: 100, border: `2px dashed ${bankErrs.screenshot ? "rgba(239,68,68,0.5)" : T.border}`,
            borderRadius: 10, cursor: bankCompressing ? "wait" : "pointer",
            background: T.faint, transition: "all 0.2s",
          }}>
            {bankCompressing
              ? <><Spin /><span style={{ fontSize: 11, color: T.dim, marginTop: 8 }}>Processing…</span></>
              : <>
                  <span className="material-symbols-outlined" style={{ fontSize: 30, color: T.dim, marginBottom: 6 }}>add_photo_alternate</span>
                  <span style={{ fontSize: 12, color: T.dim, fontWeight: 600 }}>Tap or drag screenshot here</span>
                  <span style={{ fontSize: 10, color: "rgba(224,238,255,0.2)", marginTop: 3 }}>JPG · PNG · WEBP · Max 8 MB</span>
                </>
            }
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
          </label>
        )}
        {fe("screenshot")}
        {!bankErrs.screenshot && !bankScreenshot && (
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Upload a screenshot of your MoMo transaction confirmation.</div>
        )}
        {!bankErrs.screenshot && bankScreenshot && (
          <div style={{ fontSize: 11, color: T.green, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
            Screenshot attached — will be sent with your deposit proof
          </div>
        )}
      </div>

      {/* Note */}
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Note to Admin <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <textarea value={bankNote} onChange={e => setBankNote(e.target.value)} placeholder="Any extra info" rows={3}
          style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
      </div>

      <button onClick={onSubmit} disabled={loading || bankCompressing}
        style={{ ...btnPrimary, opacity: loading || bankCompressing ? 0.38 : 1, marginBottom: 8 }}>
        {loading ? <><Spin /> Submitting…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>Submit MoMo Proof</>}
      </button>
      <button onClick={onBack} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Back
      </button>
    </div>
  );
}

/* ── Bank NG Info ── */
interface BankNgInfoProps { error: string; onNext: () => void; }
function BankNgInfo({ error, onNext }: BankNgInfoProps) {
  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ background: T.greenLow, border: `1px solid ${T.greenMid}`, borderRadius: 9, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: T.green, lineHeight: 1.55, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>info</span>
        Minimum deposit: <strong>₦{MIN_DEPOSIT_NGN.toLocaleString()}</strong>
      </div>
      <div style={{ background: T.raised, border: `1px solid ${T.greenMid}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.greenLow, border: `1px solid ${T.greenMid}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: T.green, fontSize: 18 }}>account_balance</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.white }}>Transfer to this account</div>
            <div style={{ fontSize: 11, color: T.dim }}>Then submit your payment proof</div>
          </div>
        </div>
        {[
          { icon: "corporate_fare", label: "Bank Name",      value: BANK_NAME,        mono: false },
          { icon: "person",         label: "Account Name",   value: BANK_ACCT_NAME,   mono: false },
          { icon: "tag",            label: "Account Number", value: BANK_ACCT_NUMBER, mono: true  },
        ].map(row => (
          <div key={row.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "11px 13px", marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{row.icon}</span>{row.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: row.mono ? "'DM Mono', monospace" : "inherit", fontSize: row.mono ? 22 : 13, fontWeight: 700, color: T.white, letterSpacing: row.mono ? 3 : 0 }}>{row.value}</span>
              <CopyBtn text={row.value} />
            </div>
          </div>
        ))}
        <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: T.gold, lineHeight: 1.6, display: "flex", gap: 7 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
          Always include your <strong>username or phone number</strong> in the transfer narration so we can identify your payment.
        </div>
      </div>
      <button onClick={onNext} style={{ ...btnGreen, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>I've Sent the Money — Submit Proof
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: T.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>manage_search</span>
        Verified within 5–10 minutes
      </div>
    </div>
  );
}

/* ── Bank NG Form ── */
interface BankNgFormProps {
  error: string;
  bankRef: string; setBankRef: (v: string) => void;
  bankAmtSent: string; setBankAmtSent: (v: string) => void;
  bankExpected: string; setBankExpected: (v: string) => void;
  bankSender: string; setBankSender: (v: string) => void;
  bankNote: string; setBankNote: (v: string) => void;
  bankScreenshot: string; setBankScreenshot: (v: string) => void;
  bankCompressing: boolean;
  bankErrs: Record<string, string>; setBankErrs: (fn: (p: Record<string, string>) => Record<string, string>) => void;
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onBack: () => void;
}
function BankNgForm({ error, bankRef, setBankRef, bankAmtSent, setBankAmtSent, bankExpected, setBankExpected, bankSender, setBankSender, bankNote, setBankNote, bankScreenshot, setBankScreenshot, bankCompressing, bankErrs, setBankErrs, loading, onFileChange, onSubmit, onBack }: BankNgFormProps) {
  const fe = (k: string) => bankErrs[k]
    ? <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{bankErrs[k]}</div>
    : null;
  const fi = (k: string): React.CSSProperties => ({ ...inp, border: `1px solid ${bankErrs[k] ? "rgba(239,68,68,0.5)" : T.border}` });
  const QUICK_NGN = [5000, 10000, 20000, 50000, 100000, 200000];

  return (
    <div>
      {error && <ErrBox msg={error} />}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Transfer Reference / Narration <span style={{ color: "#f87171" }}>*</span></label>
        <div style={{ display: "flex", alignItems: "center", background: T.raised, border: `1px solid ${bankErrs.ref ? "rgba(239,68,68,0.5)" : T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.dim, padding: "0 12px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", height: "100%" }}>tag</span>
          <input type="text" value={bankRef}
            onChange={e => { setBankRef(e.target.value); setBankErrs(p => ({ ...p, ref: "" })); }}
            placeholder="Your name, username, or receipt reference"
            style={{ ...inp, border: "none", borderRadius: 0, background: "none" }} />
        </div>
        {fe("ref")}
        <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Use the exact narration you entered during the transfer.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Amount Sent (₦) <span style={{ color: "#f87171" }}>*</span></label>
          <input type="number" value={bankAmtSent} placeholder={`Min ₦${MIN_DEPOSIT_NGN.toLocaleString()}`}
            onChange={e => { setBankAmtSent(e.target.value); setBankErrs(p => ({ ...p, amt: "" })); }}
            style={fi("amt")} />
          {fe("amt")}
        </div>
        <div>
          <label style={lbl}>Expected ₦ Credit <span style={{ color: "#f87171" }}>*</span></label>
          <input type="number" value={bankExpected} placeholder="0.00"
            onChange={e => { setBankExpected(e.target.value); setBankErrs(p => ({ ...p, exp: "" })); }}
            style={fi("exp")} />
          {fe("exp")}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7 }}>Quick fill</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {QUICK_NGN.map(q => (
            <button key={q} onClick={() => { setBankAmtSent(String(q)); setBankExpected(String(q)); setBankErrs(p => ({ ...p, amt: "", exp: "" })); }}
              style={{ background: bankAmtSent === String(q) ? T.greenLow : T.faint, border: `1px solid ${bankAmtSent === String(q) ? T.green : T.border}`, borderRadius: 8, padding: "7px 0", color: bankAmtSent === String(q) ? T.green : T.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit" }}>
              {q >= 1000000 ? `${q / 1000000}M` : q >= 1000 ? `${q / 1000}k` : q}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Sender Account Name <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <input type="text" value={bankSender} placeholder="Name on your bank account"
          onChange={e => setBankSender(e.target.value)} style={inp} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Payment Screenshot <span style={{ color: "#f87171" }}>*</span></label>
        {bankScreenshot ? (
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.greenMid}`, background: T.bg }}>
            <img src={bankScreenshot} alt="Payment screenshot" style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block" }} />
            {bankCompressing && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div>
            )}
            {!bankCompressing && (
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, cursor: "pointer", background: "rgba(0,0,0,0.7)", color: T.dim, fontFamily: "inherit" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>upload</span>Change
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
                </label>
                <button onClick={() => setBankScreenshot("")}
                  style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: "none", background: "rgba(239,68,68,0.7)", color: "#fff", fontFamily: "inherit" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>Remove
                </button>
              </div>
            )}
            {!bankCompressing && (
              <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 20, background: "rgba(34,197,94,0.85)", color: "#fff", display: "flex", alignItems: "center", gap: 3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>check_circle</span>Ready
              </div>
            )}
          </div>
        ) : (
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: 100, border: `2px dashed ${bankErrs.screenshot ? "rgba(239,68,68,0.5)" : T.border}`,
            borderRadius: 10, cursor: bankCompressing ? "wait" : "pointer",
            background: T.faint, transition: "all 0.2s",
          }}>
            {bankCompressing
              ? <><Spin /><span style={{ fontSize: 11, color: T.dim, marginTop: 8 }}>Processing…</span></>
              : <>
                  <span className="material-symbols-outlined" style={{ fontSize: 30, color: T.dim, marginBottom: 6 }}>add_photo_alternate</span>
                  <span style={{ fontSize: 12, color: T.dim, fontWeight: 600 }}>Tap or drag screenshot here</span>
                  <span style={{ fontSize: 10, color: "rgba(224,238,255,0.2)", marginTop: 3 }}>JPG · PNG · WEBP · Max 8 MB</span>
                </>
            }
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
          </label>
        )}
        {fe("screenshot")}
        {!bankErrs.screenshot && !bankScreenshot && (
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Upload a photo of your payment receipt or confirmation screen.</div>
        )}
        {!bankErrs.screenshot && bankScreenshot && (
          <div style={{ fontSize: 11, color: T.green, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
            Screenshot attached — will be sent with your deposit proof
          </div>
        )}
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Note to Admin <span style={{ color: T.dim, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <textarea value={bankNote} onChange={e => setBankNote(e.target.value)} placeholder="Any extra info" rows={3}
          style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
      </div>
      <button onClick={onSubmit} disabled={loading || bankCompressing}
        style={{ ...btnGreen, opacity: loading || bankCompressing ? 0.38 : 1, marginBottom: 8 }}>
        {loading ? <><Spin /> Submitting…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>Submit Transfer Proof</>}
      </button>
      <button onClick={onBack} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Back
      </button>
    </div>
  );
}

/* ── Shared Success (pending review) ── */
interface PendingSuccessProps { label: string; mins: string; onHome: () => void; onReset: () => void; }
function PendingSuccess({ label, mins, onHome, onReset }: PendingSuccessProps) {
  return (
    <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: T.greenLow, border: `2px solid ${T.greenMid}` }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: T.green }}>hourglass_top</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 20, color: T.white, marginBottom: 6 }}>Proof Submitted!</div>
      <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.7, marginBottom: 22 }}>
        Your {label} is under review.<br />
        Admin will verify and credit your wallet within <strong style={{ color: T.white }}>{mins}</strong>.
      </div>
      <button onClick={onHome} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>Back to Home
      </button>
      <button onClick={onReset} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>Make Another Deposit
      </button>
    </div>
  );
}

/* ── Crypto Success ── */
interface CryptoSuccessProps { onHome: () => void; onReset: () => void; }
function CryptoSuccess({ onHome, onReset }: CryptoSuccessProps) {
  return (
    <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: T.goldLow, border: "2px solid rgba(245,158,11,0.35)" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: T.gold }}>hourglass_top</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 20, color: T.white, marginBottom: 6 }}>Proof Submitted</div>
      <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.65, marginBottom: 20 }}>
        Your crypto deposit is under review.<br />
        Admin will credit your Zynobet wallet within <strong style={{ color: T.white }}>1–5 minutes</strong>.
      </div>
      <button onClick={onHome} style={{ ...btnPrimary, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>Back to Home
      </button>
      <button onClick={onReset} style={btnGhost}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>Make Another Deposit
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function DepositPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (!t) navigate("/login", { replace: true });
  }, [navigate]);

  const tok = () => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

  /* ── country / gateway ── */
  const [country,     setCountry]     = useState<Country | null>(null);
  const [gateway,     setGateway]     = useState<"bank_gh" | "binance" | "bank_ng" | null>(null);
  const [ipDetecting, setIpDetecting] = useState(true);
  const [rates,       setRates]       = useState<Record<string, number>>({});

  useEffect(() => {
    const detect = async () => {
      try {
        const res  = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        const code = data?.country_code as string;
        const found = COUNTRIES.find(c => c.code === code);
        if (found) {
          setCountry(found);
          if (found.gateways.length === 1) setGateway(found.gateways[0]);
        }
      } catch { /* silent */ }
      finally { setIpDetecting(false); }
    };
    detect();
  }, []);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/GHS")
      .then(r => r.json()).then(d => { if (d?.rates) setRates(d.rates); }).catch(() => {});
  }, []);

  const rateFor    = useCallback((cur: string) => cur === "GHS" ? 1 : (rates[cur] ?? 1), [rates]);
  const minLocal   = useCallback((cur: string) => +(MIN_DEPOSIT_GHS * rateFor(cur)).toFixed(2), [rateFor]);
  const localToGhs = useCallback((amt: number, cur: string) => cur === "GHS" ? amt : amt / rateFor(cur), [rateFor]);

  /* ── shared state ── */
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* ── step per gateway ── */
  const [step, setStep] = useState<
    "form"
    | "proof" | "success"             // crypto
    | "gh_info" | "gh_form" | "gh_success"  // Ghana MoMo
    | "bank_info" | "bank_form" | "bank_success"  // Nigeria bank
  >("form");

  /* ── binance state ── */
  const [txid,        setTxid]        = useState("");
  const [cryptoAmt,   setCryptoAmt]   = useState("");
  const [coin,        setCoin]        = useState("USDT");
  const [cryptoNet,   setCryptoNet]   = useState("TRC20");
  const [expectedGhs, setExpectedGhs] = useState("");
  const [senderAddr,  setSenderAddr]  = useState("");
  const [userNote,    setUserNote]    = useState("");
  const [bErrs,       setBErrs]       = useState<Record<string, string>>({});

  /* ── shared bank / momo form state ── */
  const [bankRef,         setBankRef]         = useState("");
  const [bankAmtSent,     setBankAmtSent]     = useState("");
  const [bankExpected,    setBankExpected]    = useState("");
  const [bankSender,      setBankSender]      = useState("");
  const [bankNote,        setBankNote]        = useState("");
  const [bankScreenshot,  setBankScreenshot]  = useState("");
  const [bankCompressing, setBankCompressing] = useState(false);
  const [bankErrs,        setBankErrs]        = useState<Record<string, string>>({});

  const post = async (path: string, body: object) => {
  const res = await fetch(`https://futballbackend-production-b0ef.up.railway.app${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  if (!res.ok) throw new Error(data?.message || data?.error || `Server error ${res.status}`);
  return data;
};

  const handleSelectCountry = useCallback((c: Country) => {
    setCountry(c); setGateway(null); setError(""); setStep("form");
    if (c.gateways.length === 1) {
      const gw = c.gateways[0];
      setGateway(gw);
      if (gw === "bank_gh") setStep("gh_info");
      else if (gw === "bank_ng") setStep("bank_info");
    }
  }, []);

  const selectGateway = useCallback((gw: "bank_gh" | "binance" | "bank_ng") => {
    setGateway(gw); setError("");
    if (gw === "bank_gh") setStep("gh_info");
    else if (gw === "bank_ng") setStep("bank_info");
    else setStep("form");
  }, []);

  /* ── binance handlers ── */
  const validateBinance = () => {
    const e: Record<string, string> = {};
    if (!txid.trim() || txid.trim().length < 10) e.txid = "Valid TXID required (min 10 chars)";
    if (!cryptoAmt || isNaN(+cryptoAmt) || +cryptoAmt <= 0) e.cryptoAmt = "Enter the amount you sent";
    if (!expectedGhs || isNaN(+expectedGhs) || +expectedGhs < 1) e.expectedGhs = "Enter expected GH₵ credit";
    setBErrs(e); return Object.keys(e).length === 0;
  };

  const handleBinanceSubmit = async () => {
    if (!validateBinance()) return;
    setLoading(true); setError("");
    try {
      await post("/api/wallet/deposit/binance/submit", {
        txid: txid.trim(), cryptoAmount: parseFloat(cryptoAmt), coin, network: cryptoNet,
        expectedGhsAmount: parseFloat(expectedGhs),
        senderAddress: senderAddr.trim() || undefined,
        userNote: userNote.trim() || undefined,
      });
      setStep("success");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  /* ── screenshot handler (shared) ── */
  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankCompressing(true);
    try {
      const dataUrl = await compressImageToBase64(file);
      setBankScreenshot(dataUrl);
      setBankErrs(p => ({ ...p, screenshot: "" }));
    } catch { setBankErrs(p => ({ ...p, screenshot: "Could not process image. Try another file." })); }
    finally { setBankCompressing(false); }
  };

  /* ── Ghana MoMo validation & submit (uses /api/wallet/bank-deposits) ── */
  const validateGhMomo = () => {
    const e: Record<string, string> = {};
    if (!bankSender.trim() || bankSender.trim().length < 9) e.sender = "Enter your MoMo phone number";
    if (!bankRef.trim() || bankRef.trim().length < 2) e.ref = "Enter your MoMo reference or note";
    const amt = parseFloat(bankAmtSent);
    if (!amt || isNaN(amt) || amt <= 0)       e.amt = "Enter the amount you sent";
    else if (amt < MIN_DEPOSIT_GHS)           e.amt = `Minimum deposit is GH₵${MIN_DEPOSIT_GHS}`;
    if (!bankExpected || isNaN(+bankExpected) || +bankExpected < 1) e.exp = "Enter expected wallet credit";
    if (!bankScreenshot) e.screenshot = "A payment screenshot is required";
    setBankErrs(e); return Object.keys(e).length === 0;
  };

  const handleGhMomoSubmit = async () => {
    if (!validateGhMomo()) return;
    setLoading(true); setError("");
    try {
      // Same endpoint & field names as Nigerian bank deposit
      await post("/api/wallet/bank-deposits", {
        transferReference:  bankRef.trim(),
        ngnAmountSent:      parseFloat(bankAmtSent),
        expectedNgnCredit:  parseFloat(bankExpected),
        senderAccountName:  bankSender.trim(),
        screenshotUrl:      bankScreenshot,
        userNote:           bankNote.trim() || undefined,
      });
      setStep("gh_success");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  /* ── Nigeria bank validation & submit ── */
  const validateBank = () => {
    const e: Record<string, string> = {};
    if (!bankRef.trim() || bankRef.trim().length < 3) e.ref = "Transfer reference / narration is required";
    const amt = parseFloat(bankAmtSent);
    if (!amt || isNaN(amt) || amt <= 0)  e.amt = "Enter the amount you transferred";
    else if (amt < MIN_DEPOSIT_NGN)      e.amt = `Minimum deposit is ₦${MIN_DEPOSIT_NGN.toLocaleString()}`;
    if (!bankExpected || isNaN(+bankExpected) || +bankExpected < 1) e.exp = "Enter expected wallet credit";
    if (!bankScreenshot) e.screenshot = "A payment screenshot is required";
    setBankErrs(e); return Object.keys(e).length === 0;
  };

  const handleBankSubmit = async () => {
    if (!validateBank()) return;
    setLoading(true); setError("");
    try {
      await post("/api/wallet/bank-deposits", {
        transferReference: bankRef.trim(),
        ngnAmountSent:     parseFloat(bankAmtSent),
        expectedNgnCredit: parseFloat(bankExpected),
        senderAccountName: bankSender.trim() || undefined,
        screenshotUrl:     bankScreenshot,
        userNote:          bankNote.trim() || undefined,
      });
      setStep("bank_success");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  /* ── reset bank/momo form state ── */
  const resetBankState = useCallback(() => {
    setBankRef(""); setBankAmtSent(""); setBankExpected(""); setBankSender("");
    setBankNote(""); setBankScreenshot(""); setBankErrs({});
  }, []);

  /* ── full reset ── */
  const reset = useCallback(() => {
    setCountry(null); setGateway(null); setError("");
    setTxid(""); setCryptoAmt(""); setCoin("USDT"); setCryptoNet("TRC20");
    setExpectedGhs(""); setSenderAddr(""); setUserNote(""); setBErrs({});
    resetBankState();
    setStep("form");
  }, [resetBankState]);

  /* ── panel title ── */
  const panelTitle = () => {
    if (!gateway) return null;
    if (gateway === "bank_gh") {
      if (step === "gh_form")    return "Payment Proof";
      if (step === "gh_success") return "Under Review";
      return "Ghana MoMo";
    }
    if (gateway === "binance") {
      if (step === "proof")   return "Payment Proof";
      if (step === "success") return "Under Review";
      return "Crypto Deposit";
    }
    if (gateway === "bank_ng") {
      if (step === "bank_form")    return "Payment Proof";
      if (step === "bank_success") return "Under Review";
      return "Bank Transfer · NG";
    }
    return null;
  };

  /* ── panel router ── */
  const renderPanel = () => {
    if (!country || !gateway) return null;

    /* ── Ghana MoMo ── */
    if (gateway === "bank_gh") {
      if (step === "gh_info") return (
        <GhMomoInfo error={error} onNext={() => { resetBankState(); setStep("gh_form"); }} />
      );
      if (step === "gh_form") return (
        <GhMomoForm
          error={error}
          bankRef={bankRef} setBankRef={setBankRef}
          bankAmtSent={bankAmtSent} setBankAmtSent={setBankAmtSent}
          bankExpected={bankExpected} setBankExpected={setBankExpected}
          bankSender={bankSender} setBankSender={setBankSender}
          bankNote={bankNote} setBankNote={setBankNote}
          bankScreenshot={bankScreenshot} setBankScreenshot={setBankScreenshot}
          bankCompressing={bankCompressing}
          bankErrs={bankErrs} setBankErrs={setBankErrs}
          loading={loading}
          onFileChange={handleScreenshot}
          onSubmit={handleGhMomoSubmit}
          onBack={() => setStep("gh_info")}
        />
      );
      if (step === "gh_success") return (
        <PendingSuccess label="MoMo payment" mins="5–15 minutes" onHome={() => window.location.href = "/"} onReset={reset} />
      );
    }

    /* ── Crypto ── */
    if (gateway === "binance") {
      if (step === "proof") return (
        <BinanceProof
          error={error}
          txid={txid} setTxid={setTxid}
          cryptoAmt={cryptoAmt} setCryptoAmt={setCryptoAmt}
          coin={coin} setCoin={setCoin}
          cryptoNet={cryptoNet} setCryptoNet={setCryptoNet}
          expectedGhs={expectedGhs} setExpectedGhs={setExpectedGhs}
          senderAddr={senderAddr} setSenderAddr={setSenderAddr}
          userNote={userNote} setUserNote={setUserNote}
          bErrs={bErrs} setBErrs={setBErrs}
          loading={loading}
          onSubmit={handleBinanceSubmit}
          onBack={() => setStep("form")}
        />
      );
      if (step === "success") return (
        <CryptoSuccess onHome={() => window.location.href = "/"} onReset={reset} />
      );
      return <BinanceInfo error={error} onNext={() => setStep("proof")} />;
    }

    /* ── Nigeria Bank ── */
    if (gateway === "bank_ng") {
      if (step === "bank_form") return (
        <BankNgForm
          error={error}
          bankRef={bankRef} setBankRef={setBankRef}
          bankAmtSent={bankAmtSent} setBankAmtSent={setBankAmtSent}
          bankExpected={bankExpected} setBankExpected={setBankExpected}
          bankSender={bankSender} setBankSender={setBankSender}
          bankNote={bankNote} setBankNote={setBankNote}
          bankScreenshot={bankScreenshot} setBankScreenshot={setBankScreenshot}
          bankCompressing={bankCompressing}
          bankErrs={bankErrs} setBankErrs={setBankErrs}
          loading={loading}
          onFileChange={handleScreenshot}
          onSubmit={handleBankSubmit}
          onBack={() => setStep("bank_info")}
        />
      );
      if (step === "bank_success") return (
        <PendingSuccess label="bank transfer" mins="5–10 minutes" onHome={() => window.location.href = "/"} onReset={reset} />
      );
      return <BankNgInfo error={error} onNext={() => { resetBankState(); setStep("bank_form"); }} />;
    }

    return null;
  };

  /* ── root render ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; font-family:'Material Symbols Outlined'; font-style:normal; font-weight:normal; line-height:1; display:inline-block; text-transform:none; letter-spacing:normal; word-wrap:normal; white-space:nowrap; direction:ltr; vertical-align:middle; user-select:none; }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{margin:0;background:#050c1a;}
        @keyframes _spin{to{transform:rotate(360deg);}}
        @keyframes _fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input::placeholder,textarea::placeholder{color:rgba(224,238,255,0.18);}
        select option{background:#0a1628;color:#f0f6ff;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(99,179,237,0.18);border-radius:2px;}
        a:hover{opacity:0.85;}
        button:hover:not(:disabled){opacity:0.88;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#050c1a 0%,#071224 60%,#050c1a 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px 60px", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Header */}
          <div style={{ marginBottom: 20, animation: "_fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.blueBright }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: T.blueBright, textTransform: "uppercase", letterSpacing: "1.2px" }}>Zynobet · Secure Deposit</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.white, letterSpacing: "-0.5px", lineHeight: 1.1 }}>Fund your<br />account</h1>
            <div style={{ marginTop: 6, fontSize: 12, color: T.dim }}>
              Min: <span style={{ color: T.white, fontWeight: 600 }}>GH₵{MIN_DEPOSIT_GHS}</span>
              {country && country.currency !== "GHS" && rates[country.currency]
                ? <> ≈ <span style={{ color: T.white, fontWeight: 600 }}>{country.symbol}{(MIN_DEPOSIT_GHS * rateFor(country.currency)).toFixed(2)}</span> {country.currency}</>
                : " — converted to your currency"
              }
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ animation: "_fadeUp 0.45s ease" }}>
            <TrustBadges />
          </div>

          {/* Main card */}
          <div style={{ background: T.surface, borderRadius: 16, overflow: "visible", border: `1px solid ${T.border}`, boxShadow: "0 20px 60px rgba(0,8,30,0.6), 0 0 0 1px rgba(99,179,237,0.04)", animation: "_fadeUp 0.5s ease" }}>
            <div style={{ padding: "20px 20px 24px" }}>

              <CountryDropdown country={country} ipDetecting={ipDetecting} onSelect={handleSelectCountry} />

              {country && country.gateways.length > 1 && (
                <GatewayTabs country={country} gateway={gateway} onSelect={selectGateway} />
              )}

              {country && gateway && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.7px" }}>{panelTitle()}</span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                  </div>
                </div>
              )}

              {renderPanel()}

              {country && !gateway && country.gateways.length <= 1 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: T.dim, fontSize: 13 }}>Loading payment options…</div>
              )}

              {!country && (
                <div style={{ textAlign: "center", padding: "28px 0 8px", color: T.dim, fontSize: 13, lineHeight: 1.7 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, display: "block", marginBottom: 10, opacity: 0.35, color: T.blueBright }}>public</span>
                  {ipDetecting ? <><Spin /> &nbsp;Detecting your location…</> : <>Select your country above to see<br />available payment methods.</>}
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(224,238,255,0.2)", display: "flex", alignItems: "center", gap: 5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                256-bit encrypted · Zynobet
              </span>
              <span style={{ fontSize: 10, color: "rgba(224,238,255,0.14)" }}>MoMo · Bank · Crypto</span>
            </div>
          </div>

          {/* Support */}
          <SupportPanel />

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "rgba(224,238,255,0.16)", lineHeight: 1.7, animation: "_fadeUp 0.6s ease" }}>
            By depositing you agree to Zynobet's<br />
            <a href="/terms" style={{ color: "rgba(224,238,255,0.3)", textDecoration: "underline" }}>Terms of Service</a>
            {" · "}
            <a href="/privacy" style={{ color: "rgba(224,238,255,0.3)", textDecoration: "underline" }}>Privacy Policy</a>
          </div>

        </div>
      </div>
    </>
  );
}
