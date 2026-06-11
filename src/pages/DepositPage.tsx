import { useState, useEffect, useRef } from "react";

/* ─── Material Icons (loaded once) ──────────────────────────────────────── */
if (!document.getElementById("mat-icons")) {
  const l = document.createElement("link");
  l.id = "mat-icons";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/icon?family=Material+Icons+Round";
  document.head.appendChild(l);
}

/* ─── Fonts ──────────────────────────────────────────────────────────────── */
if (!document.getElementById("zyno-fonts")) {
  const l = document.createElement("link");
  l.id = "zyno-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap";
  document.head.appendChild(l);
}

/* ─── Global styles ──────────────────────────────────────────────────────── */
if (!document.getElementById("zyno-styles")) {
  const s = document.createElement("style");
  s.id = "zyno-styles";
  s.textContent = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Sora',sans-serif;}
    .material-icons-round{font-size:inherit;vertical-align:middle;line-height:1;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
    @keyframes scaleIn{from{opacity:0;transform:scale(.92);}to{opacity:1;transform:scale(1);}}
    @keyframes successPop{0%{transform:scale(0);}60%{transform:scale(1.15);}100%{transform:scale(1);}}
    .zcard{animation:fadeUp .4s cubic-bezier(.22,1,.36,1) both;}
    .zscale{animation:scaleIn .35s cubic-bezier(.22,1,.36,1) both;}
    .zbtn{transition:all .18s cubic-bezier(.22,1,.36,1);}
    .zbtn:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px);}
    .zbtn:active:not(:disabled){transform:scale(.98);}
    .zmethod{transition:all .22s cubic-bezier(.22,1,.36,1);}
    .zmethod:hover{border-color:#6366f1!important;transform:translateY(-2px);box-shadow:0 10px 28px rgba(99,102,241,.2)!important;}
    .zcountry{transition:all .25s cubic-bezier(.22,1,.36,1);}
    .zcountry:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,.3)!important;}
    .zcopy:hover{background:#e0e7ff!important;transform:scale(1.02);}
    input:focus,textarea:focus,select:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.15);outline:none;}
    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#333344;border-radius:4px;}
    .icon{font-family:'Material Icons Round';font-style:normal;font-weight:400;display:inline-block;line-height:1;text-transform:none;letter-spacing:normal;word-wrap:normal;white-space:nowrap;direction:ltr;-webkit-font-feature-settings:'liga';font-feature-settings:'liga';}
    .zupload-zone{transition:all .25s cubic-bezier(.22,1,.36,1);}
    .zupload-zone:hover{border-color:#6366f1!important;background:#0e0e20!important;}
    .zupload-zone.drag-over{border-color:#6366f1!important;background:#0e0e20!important;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
  `;
  document.head.appendChild(s);
}

/* ─── Config ─────────────────────────────────────────────────────────────── */
const API_BASE         = "https://futballbackend-production-b0ef.up.railway.app";
const MIN_GHS          = 300;
const QUICK_GHS        = [300, 500, 1000, 2000, 5000, 10000, 20000, 50000];
const BINANCE_ADDRESS  = "THHf1TpvjtpZ8QoLnCXXeUgs116pgHwgVq";
const CRYPTO_COINS     = ["USDT","BTC","ETH","BNB","USDC"];
const CRYPTO_NETWORKS  = ["TRC20","BEP20","ERC20","Arbitrum","Optimism"];

/* ─── Screenshot size limits ─────────────────────────────────────────────── */
const MAX_IMG_BYTES    = 8 * 1024 * 1024;
const MAX_B64_CHARS    = 512 * 1024;
const COMPRESS_MAX_W   = 800;
const COMPRESS_QUALITY = 0.72;

const NETWORKS_GH = [
  { id:"MTN",        label:"MTN MoMo",        color:"#FFCC00", bg:"#1a1700", border:"#3d3300", logo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSh1DZpMsH7WfqiU7sB6Pky_rHEQAumb9Tg-A&s" },
  { id:"VODAFONE",   label:"Telecel Cash",     color:"#E00000", bg:"#1a0000", border:"#3d0000", logo:"https://www.telecel.com.gh/img/Telecel-Icon-Red.png" },
  { id:"AIRTELTIGO", label:"AirtelTigo Money", color:"#EF3E2D", bg:"#1a0800", border:"#3d1500", logo:"https://amaghanaonline.com/wp-content/uploads/2022/07/WhatsApp-Image-2022-07-27-at-5.16.26-PM.jpeg" },
];

const SUPPORT_CHANNELS = [
  { icon:"chat",  label:"WhatsApp Support", sub:"Chat with us instantly",  href:"https://wa.me/233000000000", color:"#25D366" },
  { icon:"email", label:"Email Support",    sub:"support@zynobet.site",    href:"mailto:support@zynobet.site",color:"#4A90E2" },
  { icon:"send",  label:"Telegram",         sub:"@zynobet",                href:"https://t.me/zynobet",       color:"#0088cc" },
];

const STEP  = { METHOD:0, DETAILS:1, APPROVE:2, DONE:3 };
const SUB   = { SMS:"sms", WAIT:"wait", VERIFY:"verify" };
const BSTEP = { INFO:"bi", FORM:"bf", SUCCESS:"bs" };

/* ─── Colour tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:"#08080f", card:"#111118", cardBorder:"#1e1e2e",
  surface:"#18181f", surfaceBorder:"#26263a",
  accent:"#6366f1", accentLight:"#818cf8", accentDim:"#6366f122",
  green:"#10b981",  greenDim:"#10b98122",
  yellow:"#f59e0b", yellowDim:"#f59e0b22",
  red:"#ef4444",    redDim:"#ef444422",
  blue:"#3b82f6",
  t1:"#f1f5f9", t2:"#94a3b8", t3:"#4a5568",
};

/* ─── Logger ─────────────────────────────────────────────────────────────── */
const log = {
  _ts:  ()    => new Date().toISOString(),
  info: (...a) => console.log(`[DEP ${log._ts()}] ℹ️`, ...a),
  warn: (...a) => console.warn(`[DEP ${log._ts()}] ⚠️`, ...a),
  err:  (...a) => console.error(`[DEP ${log._ts()}] ❌`, ...a),
  api:  (m,p,b)=> console.log(`[DEP ${log._ts()}] 🌐 ${m} ${API_BASE}${p}`, b ?? ""),
  res:  (p,s,d)=> console.log(`[DEP ${log._ts()}] ✅ ${p} → ${s}`, d),
  fail: (p,s,d)=> console.error(`[DEP ${log._ts()}] ❌ ${p} → ${s}`, d),
};

/* ─── Shared style helpers ───────────────────────────────────────────────── */
const inp = (err=false) => ({
  width:"100%", padding:"12px 14px",
  background:"#0e0e18", border:`1.5px solid ${err ? C.red+"88" : C.surfaceBorder}`,
  borderRadius:10, color:C.t1, fontSize:14, fontFamily:"'Sora',sans-serif",
  outline:"none", transition:"border-color .2s, box-shadow .2s",
});

const btn = (variant="primary", disabled=false) => {
  const base = { width:"100%", padding:"13px 18px", borderRadius:11, fontSize:14, fontWeight:700,
    cursor:disabled?"not-allowed":"pointer", border:"none", fontFamily:"'Sora',sans-serif",
    transition:"all .2s", marginBottom:10, display:"flex", alignItems:"center",
    justifyContent:"center", gap:8 };
  if (disabled)             return {...base, background:"#1e1e2e", color:"#3a3a52"};
  if (variant==="primary")  return {...base, background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff", boxShadow:"0 4px 20px rgba(99,102,241,.3)"};
  if (variant==="secondary")return {...base, background:C.surface, border:`1.5px solid ${C.surfaceBorder}`, color:C.t2};
  if (variant==="green")    return {...base, background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", boxShadow:"0 4px 20px rgba(16,185,129,.25)"};
  if (variant==="ghost")    return {...base, background:"transparent", color:C.t3, width:"auto", padding:"8px 0"};
  return base;
};

const lbl = { display:"block", fontSize:10, fontWeight:700, color:C.t3,
  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6, fontFamily:"'Sora',sans-serif" };

/* ─── Sub-components ─────────────────────────────────────────────────────── */
const Icon = ({ name, size=18, color, style={} }) => (
  <span className="icon" style={{ fontSize:size, color:color||"inherit", lineHeight:1, ...style }}>{name}</span>
);

const ErrMsg = ({ msg }) => msg
  ? <div style={{ fontSize:11, color:C.red, marginTop:5, display:"flex", alignItems:"center", gap:4, fontFamily:"'Sora',sans-serif" }}>
      <Icon name="error_outline" size={13}/> {msg}
    </div>
  : null;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="zcopy zbtn" onClick={() => { navigator.clipboard.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false), 2000); }}
      style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700,
        padding:"5px 11px", borderRadius:7, cursor:"pointer", border:"none",
        background:copied?"#d1fae5":"#1e1e35", color:copied?"#065f46":C.accentLight,
        transition:"all .2s", fontFamily:"'Sora',sans-serif", flexShrink:0 }}>
      <Icon name={copied?"check":"content_copy"} size={13}/> {copied?"Copied":"Copy"}
    </button>
  );
}

function Steps({ current, labels, icons }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:22 }}>
      {labels.map((lbl, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", flex:i<labels.length-1?1:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:done?12:10, fontWeight:800, flexShrink:0,
                background:done?"#10b981":active?"#6366f1":"#1e1e2e",
                color:"#fff", border:active?"2px solid #a5b4fc":"2px solid transparent",
                boxShadow:active?"0 0 12px rgba(99,102,241,.5)":"none", transition:"all .3s" }}>
                {done ? <Icon name="check" size={12}/> : icons?.[i]
                  ? <Icon name={icons[i]} size={11}/> : i+1}
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:active?C.accentLight:done?C.green:C.t3,
                whiteSpace:"nowrap", fontFamily:"'Sora',sans-serif" }}>{lbl}</span>
            </div>
            {i < labels.length-1 &&
              <div style={{ flex:1, height:2, background:done?"#10b981":"#1e1e2e", margin:"0 8px",
                minWidth:16, borderRadius:2, transition:"background .4s" }}/>}
          </div>
        );
      })}
    </div>
  );
}

function InfoBox({ icon, children, color=C.accent, bg }) {
  return (
    <div style={{ background:bg||color+"11", border:`1px solid ${color}33`, borderRadius:10,
      padding:"11px 14px", fontSize:12, color, lineHeight:1.65,
      display:"flex", alignItems:"flex-start", gap:9, fontFamily:"'Sora',sans-serif", marginBottom:14 }}>
      <Icon name={icon} size={15} style={{ flexShrink:0, marginTop:1 }}/>
      <div>{children}</div>
    </div>
  );
}

/* ─── Client-side image compressor ──────────────────────────────────────── */
function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image."));
      img.onload = () => {
        try {
          const scale = img.width > COMPRESS_MAX_W ? COMPRESS_MAX_W / img.width : 1;
          const w = Math.round(img.width  * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width  = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", COMPRESS_QUALITY);
          log.info("Screenshot compressed", { origBytes: file.size, b64Len: dataUrl.length, dims:`${w}×${h}` });
          if (dataUrl.length > MAX_B64_CHARS) {
            const dataUrl2 = canvas.toDataURL("image/jpeg", 0.45);
            log.info("Screenshot re-compressed (pass 2)", { b64Len: dataUrl2.length });
            resolve(dataUrl2);
          } else {
            resolve(dataUrl);
          }
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   ScreenshotPicker
══════════════════════════════════════════════════════════════════════════ */
function ScreenshotPicker({ value, onChange, label="Payment Screenshot", required=false, error="" }) {
  const fileRef              = useRef(null);
  const [preview, setPreview]   = useState(value || "");
  const [compressing, setComp]  = useState(false);
  const [compErr, setCompErr]   = useState("");
  const [isDrag, setIsDrag]     = useState(false);

  useEffect(() => { if (value !== undefined) setPreview(value || ""); }, [value]);

  const ACCEPTED = ["image/jpeg","image/jpg","image/png","image/webp","image/gif"];

  const handleFile = async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      const msg = "Only JPG, PNG, WEBP, or GIF images are accepted.";
      setCompErr(msg); onChange && onChange(""); return;
    }
    if (file.size > MAX_IMG_BYTES) {
      const msg = "Image must be under 8 MB.";
      setCompErr(msg); onChange && onChange(""); return;
    }
    setCompErr(""); setComp(true);

    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      const dataUrl = await compressImageToBase64(file);
      setPreview(dataUrl);
      onChange && onChange(dataUrl);
    } catch (err) {
      log.err("Compression failed", err);
      setCompErr("Could not process image. Try a different file.");
      onChange && onChange("");
    } finally {
      setComp(false);
    }
  };

  const onInputChange = e => { const f = e.target.files?.[0]; if (f) handleFile(f); };
  const onDrop = e => { e.preventDefault(); setIsDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };
  const onDragOver  = e => { e.preventDefault(); setIsDrag(true); };
  const onDragLeave = () => setIsDrag(false);
  const clear = () => { setPreview(""); setCompErr(""); onChange && onChange(""); if (fileRef.current) fileRef.current.value = ""; };

  const activeErr = error || compErr;

  return (
    <div style={{ marginBottom:14 }}>
      {label && (
        <label style={lbl}>
          {label} {required && <span style={{color:C.red}}>*</span>}
        </label>
      )}

      {!preview ? (
        <div
          className={`zupload-zone${isDrag?" drag-over":""}`}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => !compressing && fileRef.current?.click()}
          style={{
            border:`2px dashed ${activeErr ? C.red+"88" : isDrag ? C.accent : C.surfaceBorder}`,
            borderRadius:12, padding:"28px 16px", textAlign:"center",
            cursor: compressing ? "wait" : "pointer",
            background: isDrag ? "#0e0e20" : "#0b0b16",
            transition:"all .25s",
          }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onInputChange} style={{ display:"none" }}/>
          {compressing ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <span style={{ width:28, height:28, border:"3px solid rgba(99,102,241,.2)", borderTopColor:C.accent,
                borderRadius:"50%", animation:"spin 1s linear infinite", display:"block" }}/>
              <span style={{ fontSize:12, color:C.t3, fontFamily:"'Sora',sans-serif" }}>Processing image…</span>
            </div>
          ) : (
            <>
              <div style={{ width:46, height:46, borderRadius:12, background:C.accentDim,
                border:`1px solid ${C.accent}44`, display:"flex", alignItems:"center",
                justifyContent:"center", margin:"0 auto 10px" }}>
                <Icon name="add_photo_alternate" size={24} color={C.accentLight}/>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:C.t2, fontFamily:"'Sora',sans-serif", marginBottom:4 }}>
                {isDrag ? "Drop to attach" : "Tap or drag screenshot here"}
              </div>
              <div style={{ fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif" }}>
                JPG · PNG · WEBP · GIF &nbsp;·&nbsp; Max 8 MB
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ position:"relative", borderRadius:12, overflow:"hidden",
          border:`1.5px solid ${C.green}44`, background:"#0b120d" }}>
          <img src={preview} alt="Payment screenshot"
            style={{ width:"100%", maxHeight:220, objectFit:"contain", display:"block", background:"#0b120d" }}
            onError={() => setPreview("")}/>
          {compressing && (
            <div style={{ position:"absolute", inset:0, background:"rgba(8,8,15,.7)",
              display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
              <span style={{ width:28, height:28, border:"3px solid rgba(255,255,255,.2)", borderTopColor:"#fff",
                borderRadius:"50%", animation:"spin 1s linear infinite", display:"block" }}/>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.7)", fontFamily:"'Sora',sans-serif" }}>Processing…</span>
            </div>
          )}
          <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:6 }}>
            <button onClick={e=>{ e.stopPropagation(); fileRef.current?.click(); }}
              style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700,
                padding:"5px 10px", borderRadius:7, cursor:"pointer", border:"none",
                background:"rgba(8,8,15,.85)", color:C.accentLight, fontFamily:"'Sora',sans-serif" }}>
              <Icon name="upload" size={13}/> Change
            </button>
            <button onClick={e=>{ e.stopPropagation(); clear(); }}
              style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, fontWeight:700,
                padding:"5px 10px", borderRadius:7, cursor:"pointer", border:"none",
                background:"rgba(239,68,68,.2)", color:C.red, fontFamily:"'Sora',sans-serif" }}>
              <Icon name="close" size={13}/> Remove
            </button>
          </div>
          <div style={{ position:"absolute", bottom:8, left:8,
            display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700,
            padding:"4px 9px", borderRadius:20, fontFamily:"'Sora',sans-serif",
            background: compressing ? "rgba(99,102,241,.85)" : "rgba(16,185,129,.85)",
            color:"#fff" }}>
            <Icon name={compressing ? "hourglass_top" : "check_circle"} size={11}/>
            {compressing ? "Processing…" : "Ready"}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onInputChange} style={{ display:"none" }}/>
        </div>
      )}

      {activeErr && <ErrMsg msg={activeErr}/>}
      {!activeErr && preview && !compressing && (
        <div style={{ fontSize:11, color:C.green, marginTop:5, display:"flex", alignItems:"center",
          gap:4, fontFamily:"'Sora',sans-serif" }}>
          <Icon name="check_circle" size={12}/> Screenshot attached — will be sent with your deposit proof
        </div>
      )}
      {!activeErr && !preview && !compressing && (
        <div style={{ fontSize:11, color:C.t3, marginTop:5, fontFamily:"'Sora',sans-serif" }}>
          Upload a photo of your payment receipt or confirmation screen.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function DepositPage() {

  /* auth */
  useEffect(() => {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    log.info("Auth check — token present:", !!token);
    if (!token) { log.warn("No token — redirecting"); window.location.href = "/login"; }
  }, []);

  const tok = () => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

  /* ── nav state ── */
  const [step,        setStep]        = useState(STEP.METHOD);
  const [sub,         setSub]         = useState(SUB.WAIT);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [info,        setInfo]        = useState("");
  const [showSupport, setShowSupport] = useState(false);
  const timerRef = useRef(null);

  /* ── momo ── */
  const [amount,         setAmount]         = useState("");
  const [phone,          setPhone]          = useState("");
  const [network,        setNetwork]        = useState("MTN");
  const [externalRef,    setRef]            = useState("");
  const [countdown,      setCount]          = useState(120);
  const [actionRequired, setActionRequired] = useState(false);
  const [smsCode,        setSmsCode]        = useState("");

  /* ── crypto ── */
  const [bStep,            setBStep]            = useState(BSTEP.INFO);
  const [cryptoTxHash,     setCryptoTxHash]     = useState("");
  const [cryptoCoin,       setCryptoCoin]       = useState("USDT");
  const [cryptoNet,        setCryptoNet]        = useState("TRC20");
  const [cryptoAmtSent,    setCryptoAmtSent]    = useState("");
  const [cryptoExpected,   setCryptoExpected]   = useState("");
  const [cryptoWallet,     setCryptoWallet]     = useState("");
  const [cryptoNote,       setCryptoNote]       = useState("");
  const [cryptoErrors,     setCryptoErrors]     = useState({});
  const [cryptoScreenshot, setCryptoScreenshot] = useState("");

  /* ── derived ── */
  const networkObj   = NETWORKS_GH.find(n => n.id === network);

  /* ── momo amount validation ── */
  const momoAmt      = parseFloat(amount) || 0;
  const momoBelowMin = momoAmt > 0 && momoAmt < MIN_GHS;
  const momoSubmitOk = momoAmt >= MIN_GHS && phone.trim().length > 0;

  /* ── countdown ── */
  useEffect(() => {
    if (step === STEP.APPROVE && sub === SUB.WAIT) {
      setCount(120);
      timerRef.current = setInterval(() =>
        setCount(p => { if (p<=1){ clearInterval(timerRef.current); return 0; } return p-1; }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step, sub]);

  const fmt = sc => `${String(Math.floor(sc/60)).padStart(2,"0")}:${String(sc%60).padStart(2,"0")}`;

  /* ── API helper ── */
  const post = async (path, body) => {
    log.api("POST", path, { ...body, screenshotUrl: body.screenshotUrl ? `[base64 ${body.screenshotUrl.length} chars]` : undefined });
    let res, data;
    try {
      res  = await fetch(`${API_BASE}${path}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${tok()}` },
        body: JSON.stringify(body),
      });
      data = await res.json();
    } catch (e) {
      log.err("Network error", path, e);
      throw new Error("Network error — check your connection and try again.");
    }
    if (!res.ok) {
      log.fail(path, res.status, data);
      throw new Error(data?.message || data?.error || `Server error (${res.status})`);
    }
    log.res(path, res.status, data);
    return data;
  };

  /* ── MoMo handlers ── */
  const handleMomoInit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) return setError("Please enter a deposit amount.");
    if (amt < MIN_GHS) return setError(`Minimum deposit is GH₵${MIN_GHS.toLocaleString()}. Please enter GH₵${MIN_GHS} or more.`);
    if (!phone.trim()) return setError("MoMo phone number is required.");
    if (!/^0\d{9}$/.test(phone.trim())) return setError("Enter a valid 10-digit number starting with 0.");

    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/init", { amount: amt, phone: phone.trim(), network });
      setRef(data?.data?.externalref || "");
      const isAR = data?.data?.actionRequired === true;
      setActionRequired(isAR);
      setSub(isAR ? SUB.SMS : SUB.WAIT);
      setStep(STEP.APPROVE);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  const handleSmsSubmit = async () => {
    setError("");
    if (!smsCode.trim()) return setError("Please enter the SMS code.");
    setLoading(true);
    try {
      await post("/api/wallet/deposit/moolre/otp", { externalref: externalRef, otp: smsCode.trim() });
      setSmsCode(""); setSub(SUB.WAIT);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  const handleVerify = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/verify", { externalref: externalRef });
      const r = data?.data;
      if      (r?.credited)      setStep(STEP.DONE);
      else if (r?.txstatus === 0) setInfo("Still pending — please approve the prompt on your phone.");
      else if (r?.txstatus === 2) setError("Payment cancelled or failed. Please try again.");
      else                        setInfo(r?.message || "Status unclear. Try verifying again.");
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  const momoRestart = () => {
    setStep(STEP.DETAILS); setError(""); setInfo(""); setRef(""); setSmsCode(""); setSub(SUB.WAIT);
    clearInterval(timerRef.current);
  };

  /* ── Crypto handler ── */
  const validateCrypto = () => {
    const e = {};
    if (!cryptoTxHash.trim() || cryptoTxHash.trim().length < 10) e.hash = "A valid Transaction Hash is required";
    if (!cryptoAmtSent  || isNaN(+cryptoAmtSent)  || +cryptoAmtSent  <= 0) e.amt = "Enter the amount you sent";
    if (!cryptoExpected || isNaN(+cryptoExpected) || +cryptoExpected < 1)   e.exp = "Enter the expected credit amount";
    setCryptoErrors(e); return Object.keys(e).length === 0;
  };

  const handleCryptoSubmit = async () => {
    if (!validateCrypto()) return;
    setLoading(true); setError("");
    try {
      await post("/api/wallet/binance-deposits", {
        txid:              cryptoTxHash.trim(),
        cryptoAmount:      parseFloat(cryptoAmtSent),
        coin:              cryptoCoin,
        network:           cryptoNet,
        expectedGhsAmount: parseFloat(cryptoExpected),
        senderAddress:     cryptoWallet.trim()     || undefined,
        screenshotUrl:     cryptoScreenshot || undefined,
        userNote:          cryptoNote.trim()        || undefined,
      });
      setBStep(BSTEP.SUCCESS);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  /* ── Resets ── */
  const resetAll = () => {
    setStep(STEP.METHOD); setError(""); setInfo("");
    setAmount(""); setPhone(""); setNetwork("MTN"); setRef(""); setSmsCode(""); setSub(SUB.WAIT);
    setCryptoTxHash(""); setCryptoAmtSent(""); setCryptoCoin("USDT"); setCryptoNet("TRC20");
    setCryptoExpected(""); setCryptoWallet(""); setCryptoNote(""); setCryptoErrors({});
    setCryptoScreenshot(""); setBStep(BSTEP.INFO);
    clearInterval(timerRef.current);
  };

  /* ─────────────────────────────────────────────────────────────────────────
     SHARED HEADER
  ───────────────────────────────────────────────────────────────────────── */
  const Header = ({ title, subtitle, onBack }) => (
    <div style={{ padding:"20px 22px 18px", borderBottom:`1px solid ${C.cardBorder}`, background:`linear-gradient(180deg,#13131f,${C.card})` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:onBack||title?12:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="bolt" size={18} color="#fff"/>
          </div>
          <span style={{ fontSize:13, fontWeight:900, color:C.t1, letterSpacing:"1.5px", fontFamily:"'Sora',sans-serif" }}>ZYNOBET</span>
        </div>
        <button onClick={()=>setShowSupport(true)}
          style={{ display:"flex", alignItems:"center", gap:5, background:C.surface,
            border:`1px solid ${C.surfaceBorder}`, borderRadius:8, padding:"6px 11px",
            cursor:"pointer", color:C.t2, fontSize:11, fontWeight:700, fontFamily:"'Sora',sans-serif" }}>
          <Icon name="headset_mic" size={14}/> Support
        </button>
      </div>
      {onBack && (
        <button onClick={onBack} style={{ background:"none", border:"none", color:C.t3, cursor:"pointer",
          fontSize:12, padding:"0 0 10px", display:"flex", alignItems:"center", gap:4,
          fontFamily:"'Sora',sans-serif", fontWeight:600 }}>
          <Icon name="arrow_back" size={14}/> Back
        </button>
      )}
      {title    && <div style={{ fontSize:19, fontWeight:800, color:C.t1, fontFamily:"'Sora',sans-serif", letterSpacing:"-.3px" }}>{title}</div>}
      {subtitle && <div style={{ fontSize:12, color:C.t3, marginTop:2, fontFamily:"'Sora',sans-serif" }}>{subtitle}</div>}
    </div>
  );

  /* Support modal */
  const SupportModal = () => !showSupport ? null : (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex",
      alignItems:"flex-end", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)" }}
      onClick={()=>setShowSupport(false)}>
      <div onClick={e=>e.stopPropagation()} className="zcard"
        style={{ width:"100%", maxWidth:440, background:"#13131e", borderRadius:"20px 20px 0 0",
          padding:24, border:`1px solid ${C.cardBorder}`, borderBottom:"none" }}>
        <div style={{ width:32, height:3, background:"#2a2a3a", borderRadius:2, margin:"0 auto 18px" }}/>
        <div style={{ fontSize:16, fontWeight:800, color:C.t1, marginBottom:3, fontFamily:"'Sora',sans-serif" }}>Need Help?</div>
        <div style={{ fontSize:12, color:C.t3, marginBottom:18, fontFamily:"'Sora',sans-serif" }}>Our support team is available 24/7</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
          {SUPPORT_CHANNELS.map(ch => (
            <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:12, background:C.surface,
                border:`1px solid ${C.surfaceBorder}`, borderRadius:12, padding:"13px 15px", textDecoration:"none" }}>
              <div style={{ width:38, height:38, borderRadius:9, background:ch.color+"22",
                border:`1px solid ${ch.color}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name={ch.icon} size={18} color={ch.color}/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.t1, fontFamily:"'Sora',sans-serif" }}>{ch.label}</div>
                <div style={{ fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif", marginTop:1 }}>{ch.sub}</div>
              </div>
              <Icon name="chevron_right" size={18} color={C.t3} style={{ marginLeft:"auto" }}/>
            </a>
          ))}
        </div>
        <InfoBox icon="tips_and_updates" color={C.green}>
          Include your <strong>username</strong> and <strong>transaction details</strong> for faster support.
        </InfoBox>
        <button className="zbtn" onClick={()=>setShowSupport(false)} style={btn("secondary")}>Close</button>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Payment Method
  ══════════════════════════════════════════════════════════════ */
  const renderMethod = () => (
    <>
      <Header title="Add Funds" subtitle="Ghana · GHS · Choose your payment method"/>
      <div style={{ padding:22 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.t3, textTransform:"uppercase",
          letterSpacing:"1px", marginBottom:12, fontFamily:"'Sora',sans-serif" }}>PAYMENT METHOD</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          <button className="zmethod zbtn" onClick={() => setStep(STEP.DETAILS)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:13, background:C.surface,
              border:`1.5px solid ${C.surfaceBorder}`, borderRadius:13, padding:"15px 16px",
              cursor:"pointer", textAlign:"left" }}>
            <div style={{ width:44, height:44, borderRadius:11, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name="smartphone" size={22} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:C.t1, fontFamily:"'Sora',sans-serif" }}>Mobile Money</div>
              <div style={{ fontSize:11, color:C.t3, marginTop:2, fontFamily:"'Sora',sans-serif" }}>MTN MoMo · Telecel Cash · AirtelTigo</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20,
                background:C.greenDim, color:C.green, fontFamily:"'Sora',sans-serif",
                display:"flex", alignItems:"center", gap:3 }}>
                <Icon name="bolt" size={10}/> Instant
              </span>
              <Icon name="chevron_right" size={16} color={C.t3}/>
            </div>
          </button>

          <button className="zmethod zbtn" onClick={() => { setBStep(BSTEP.INFO); setStep(99); }}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:13,
              background:"#100e08", border:"1.5px solid #2a2410", borderRadius:13,
              padding:"15px 16px", cursor:"pointer", textAlign:"left" }}>
            <div style={{ width:44, height:44, borderRadius:11, background:"linear-gradient(135deg,#f59e0b,#d97706)",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name="currency_bitcoin" size={22} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:C.t1, fontFamily:"'Sora',sans-serif" }}>Crypto · Binance</div>
              <div style={{ fontSize:11, color:C.t3, marginTop:2, fontFamily:"'Sora',sans-serif" }}>USDT (TRC20) · BTC · ETH · BNB</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20,
                background:C.yellowDim, color:C.yellow, fontFamily:"'Sora',sans-serif",
                display:"flex", alignItems:"center", gap:3 }}>
                <Icon name="schedule" size={10}/> 1–5 min
              </span>
              <Icon name="chevron_right" size={16} color={C.t3}/>
            </div>
          </button>
        </div>

        <InfoBox icon="info" color={C.green} bg={C.greenDim}>
          Minimum deposit: <strong>GH₵{MIN_GHS.toLocaleString()}</strong>
        </InfoBox>

        <div style={{ background:C.surface, border:`1px solid ${C.surfaceBorder}`, borderRadius:12,
          padding:"12px 15px", display:"flex", alignItems:"center", gap:11 }}>
          <Icon name="headset_mic" size={22} color={C.accentLight}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.t2, fontFamily:"'Sora',sans-serif" }}>Need help with your deposit?</div>
            <div style={{ fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif" }}>Our team is online 24/7</div>
          </div>
          <button onClick={()=>setShowSupport(true)}
            style={{ background:C.accentDim, border:`1px solid ${C.accent}44`, borderRadius:8,
              padding:"6px 11px", color:C.accentLight, fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>Chat</button>
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: MoMo Details
  ══════════════════════════════════════════════════════════════ */
  const renderDetails = () => (
    <>
      <Header title={<span style={{ display:"flex", alignItems:"center", gap:7 }}><Icon name="smartphone" size={20}/> Mobile Money</span>}
        subtitle="Ghana · GHS · USSD Direct Charge" onBack={() => setStep(STEP.METHOD)}/>
      <div style={{ padding:"14px 22px 6px" }}>
        <Steps current={0} labels={["Details","Approve","Done"]} icons={["edit","check_circle","celebration"]}/>
      </div>
      <div style={{ padding:"0 22px 22px" }}>
        {error && (
          <div style={{ background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:10,
            padding:"11px 13px", color:C.red, fontSize:13, marginBottom:14, display:"flex",
            alignItems:"center", gap:7, fontFamily:"'Sora',sans-serif" }}>
            <Icon name="error" size={16}/> {error}
          </div>
        )}

        <div style={{ background:"#0c1a0e", border:`1px solid ${C.green}33`, borderRadius:10,
          padding:"10px 13px", marginBottom:16, display:"flex", alignItems:"center", gap:9 }}>
          <Icon name="info" size={15} color={C.green}/>
          <span style={{ fontSize:12, color:C.green, fontFamily:"'Sora',sans-serif", fontWeight:600 }}>
            Minimum deposit: <strong>GH₵{MIN_GHS.toLocaleString()}</strong>
          </span>
        </div>

        {/* Amount */}
        <div style={{ marginBottom:18 }}>
          <label style={lbl}>Amount (GHS)</label>
          <div style={{ display:"flex", alignItems:"center",
            background:"#0e0e18",
            border:`1.5px solid ${momoBelowMin ? C.red+"88" : C.surfaceBorder}`,
            borderRadius:10, overflow:"hidden", marginBottom:8,
            transition:"border-color .2s" }}>
            <span style={{ padding:"12px 13px", color:C.t3, fontSize:13, fontWeight:700,
              borderRight:`1px solid ${C.surfaceBorder}`, background:C.surface, fontFamily:"'Sora',sans-serif" }}>
              GH₵
            </span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              min={MIN_GHS}
              onChange={e => { setAmount(e.target.value); setError(""); }}
              style={{ flex:1, background:"none", border:"none", outline:"none", color:C.t1,
                fontSize:22, fontWeight:800, padding:"12px 13px", fontFamily:"'DM Mono',monospace" }}
            />
          </div>

          {momoBelowMin && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700,
              color:C.red, fontFamily:"'Sora',sans-serif", marginBottom:6,
              background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:8, padding:"8px 11px" }}>
              <Icon name="block" size={14} color={C.red}/>
              Amount too low — minimum is <strong>GH₵{MIN_GHS.toLocaleString()}</strong>
            </div>
          )}

          <div style={{ fontSize:11, color:C.t3, marginBottom:9, fontFamily:"'Sora',sans-serif" }}>
            Min: GH₵{MIN_GHS.toLocaleString()}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
            {QUICK_GHS.map(q => (
              <button key={q} onClick={() => { setAmount(String(q)); setError(""); }}
                style={{ background:parseFloat(amount)===q?"#1e1e3f":"#13131e",
                  border:`1.5px solid ${parseFloat(amount)===q?C.accent:C.surfaceBorder}`,
                  borderRadius:8, padding:"8px 0", color:parseFloat(amount)===q?C.accentLight:C.t3,
                  fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Sora',sans-serif", transition:"all .2s" }}>
                {q>=1000?`${q/1000}k`:q}
              </button>
            ))}
          </div>
        </div>

        {/* Phone */}
        <div style={{ marginBottom:18 }}>
          <label style={lbl}>MoMo Phone Number</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}>
              <Icon name="phone" size={16} color={C.t3}/>
            </span>
            <input type="tel" placeholder="0244123456" value={phone} maxLength={10}
              onChange={e=>setPhone(e.target.value)}
              style={{ ...inp(), paddingLeft:36 }}/>
          </div>
          <div style={{ fontSize:11, color:C.t3, marginTop:5, fontFamily:"'Sora',sans-serif" }}>
            Format: 0XXXXXXXXX (10 digits)
          </div>
        </div>

        {/* Network */}
        <div style={{ marginBottom:18 }}>
          <label style={lbl}>Network</label>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {NETWORKS_GH.map(n => (
              <button key={n.id} onClick={()=>setNetwork(n.id)}
                style={{ display:"flex", alignItems:"center", gap:11,
                  background:network===n.id?n.bg:"#0e0e18",
                  border:`1.5px solid ${network===n.id?n.color+"66":C.surfaceBorder}`,
                  borderRadius:10, padding:"11px 13px", cursor:"pointer", transition:"all .2s" }}>
                <img src={n.logo} alt={n.label} onError={e=>{e.target.style.display="none";}}
                  style={{ width:26, height:26, borderRadius:6, objectFit:"contain", background:"#fff", padding:2 }}/>
                <span style={{ color:network===n.id?n.color:C.t2, fontSize:14, fontWeight:700,
                  flex:1, textAlign:"left", fontFamily:"'Sora',sans-serif" }}>{n.label}</span>
                {network===n.id
                  ? <div style={{ width:18, height:18, borderRadius:"50%", background:n.color,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="check" size={11} color="#000"/>
                    </div>
                  : <div style={{ width:18, height:18, borderRadius:"50%", border:`1.5px solid ${C.surfaceBorder}` }}/>
                }
              </button>
            ))}
          </div>
        </div>

        <InfoBox icon="notifications_active" color={C.accentLight}>
          A USSD prompt will appear on <strong>{phone||"your phone"}</strong>. Approve within 2 minutes.
        </InfoBox>

        <button className="zbtn" onClick={handleMomoInit} disabled={loading || !momoSubmitOk} style={btn("primary", loading || !momoSubmitOk)}>
          {loading
            ? <><span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 1s linear infinite" }}/> Initiating…</>
            : <><Icon name="send" size={16}/> Send Prompt · GH₵{momoAmt >= MIN_GHS ? momoAmt.toFixed(2) : "—"}</>}
        </button>

        {!momoSubmitOk && (
          <div style={{ textAlign:"center", fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginTop:2 }}>
            <Icon name="lock" size={12} color={C.t3}/>
            Enter GH₵{MIN_GHS}+ and a valid phone number to continue
          </div>
        )}
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: MoMo Approve
  ══════════════════════════════════════════════════════════════ */
  const renderApprove = () => (
    <>
      <Header title="Approve Payment"
        subtitle={`GH₵${parseFloat(amount).toFixed(2)} via ${networkObj?.label ?? network}`}/>
      <div style={{ padding:"14px 22px 6px" }}>
        <Steps current={1} labels={["Details","Approve","Done"]} icons={["edit","check_circle","celebration"]}/>
      </div>
      <div style={{ padding:"0 22px 22px" }}>
        {error && (
          <div style={{ background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:10,
            padding:"11px 13px", color:C.red, fontSize:13, marginBottom:14,
            display:"flex", alignItems:"center", gap:7, fontFamily:"'Sora',sans-serif" }}>
            <Icon name="error" size={16}/> {error}
          </div>
        )}

        {sub === SUB.SMS && (
          <>
            <div style={{ background:"#100e00", border:"1px solid #3d3500", borderRadius:13,
              padding:18, marginBottom:16, textAlign:"center" }}>
              <Icon name="sms" size={36} color={C.yellow}/>
              <div style={{ fontWeight:800, fontSize:14, color:C.yellow, margin:"10px 0 6px", fontFamily:"'Sora',sans-serif" }}>Check your SMS</div>
              <div style={{ fontSize:12, color:"#b45309", lineHeight:1.7, fontFamily:"'Sora',sans-serif" }}>
                MTN sent a code to <strong style={{color:C.yellow}}>{phone}</strong>.<br/>Enter it below to trigger the USSD prompt.
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>SMS Verification Code</label>
              <input type="text" inputMode="numeric" placeholder="······" value={smsCode}
                maxLength={8} autoFocus onChange={e=>setSmsCode(e.target.value.replace(/\D/g,""))}
                style={{ ...inp(), fontSize:28, fontWeight:800, letterSpacing:12, textAlign:"center",
                  padding:16, fontFamily:"'DM Mono',monospace" }}/>
            </div>
            <button className="zbtn" onClick={handleSmsSubmit} disabled={loading||smsCode.length<4} style={btn("primary",loading||smsCode.length<4)}>
              {loading ? "Verifying…" : <><Icon name="verified" size={16}/> Submit Code &amp; Send USSD Prompt</>}
            </button>
            <button className="zbtn" onClick={momoRestart} style={btn("secondary")}>
              <Icon name="arrow_back" size={15}/> Start Over
            </button>
          </>
        )}

        {sub === SUB.WAIT && (
          <>
            <div style={{ background:"#100e00", border:"1px solid #2a2400", borderRadius:14,
              padding:20, marginBottom:14, textAlign:"center" }}>
              <div style={{ fontSize:46, marginBottom:10, animation:"pulse 2s infinite" }}>📳</div>
              <div style={{ fontWeight:800, fontSize:15, color:C.yellow, marginBottom:8, fontFamily:"'Sora',sans-serif" }}>
                Approve the USSD Prompt
              </div>
              <div style={{ fontSize:12, color:"#b45309", lineHeight:1.8, fontFamily:"'Sora',sans-serif" }}>
                A prompt was sent to <strong style={{color:C.yellow}}>{phone}</strong>.<br/>
                Approve <strong style={{color:C.yellow}}>GH₵{parseFloat(amount).toFixed(2)}</strong> on {networkObj?.label ?? network}.
              </div>
              <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:7,
                background:"#1a1800", border:"1px solid #3a3000", borderRadius:20, padding:"6px 14px" }}>
                <Icon name="timer" size={14} color={countdown>30?C.yellow:C.red}/>
                <span style={{ fontSize:13, color:countdown>30?C.yellow:C.red, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmt(countdown)}</span>
                <span style={{ fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif" }}>{countdown>0?"remaining":"expired"}</span>
              </div>
            </div>
            <button className="zbtn" onClick={()=>{ setSub(SUB.VERIFY); setError(""); setInfo(""); }} style={btn("primary")}>
              <Icon name="check_circle" size={16}/> I've Approved — Verify Payment
            </button>
            <button className="zbtn" onClick={momoRestart} style={btn("secondary")}>
              <Icon name="arrow_back" size={15}/> Start Over
            </button>
          </>
        )}

        {sub === SUB.VERIFY && (
          <>
            {info && (
              <div style={{ background:"#0d1020", border:`1px solid ${C.accent}44`, borderRadius:10,
                padding:"11px 13px", color:C.accentLight, fontSize:13, marginBottom:14,
                display:"flex", alignItems:"center", gap:7, fontFamily:"'Sora',sans-serif" }}>
                <Icon name="info" size={16}/> {info}
              </div>
            )}
            <div style={{ textAlign:"center", marginBottom:18 }}>
              <div style={{ width:60, height:60, borderRadius:"50%", background:C.accentDim,
                border:`2px solid ${C.accent}44`, display:"flex", alignItems:"center",
                justifyContent:"center", margin:"0 auto 12px" }}>
                <Icon name="manage_search" size={28} color={C.accentLight}/>
              </div>
              <div style={{ fontWeight:800, fontSize:16, color:C.t1, fontFamily:"'Sora',sans-serif" }}>Checking Payment…</div>
              <div style={{ fontSize:12, color:C.t3, marginTop:3, fontFamily:"'Sora',sans-serif" }}>
                GH₵{parseFloat(amount).toFixed(2)} · {networkObj?.label ?? network}
              </div>
            </div>
            <button className="zbtn" onClick={handleVerify} disabled={loading} style={btn("primary",loading)}>
              {loading
                ? <><span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 1s linear infinite" }}/> Verifying…</>
                : <><Icon name="refresh" size={16}/> Verify Payment</>}
            </button>
            <button className="zbtn" onClick={()=>{ setSub(SUB.WAIT); setError(""); setInfo(""); }} style={btn("secondary")}>
              <Icon name="arrow_back" size={15}/> Still Waiting
            </button>
            <button className="zbtn" onClick={momoRestart} style={{...btn("ghost"), color:C.t3}}>
              Start Over
            </button>
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
      <div style={{ background:"linear-gradient(135deg,#052e1c,#064e32)", padding:"22px 22px 18px",
        borderBottom:`1px solid ${C.cardBorder}` }}>
        <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.4)", letterSpacing:"1.5px",
          textTransform:"uppercase", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>ZYNOBET</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:20, fontWeight:800,
          color:"#fff", fontFamily:"'Sora',sans-serif" }}>
          <Icon name="check_circle" size={22} color="#4ade80"/> Deposit Successful
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginTop:2, fontFamily:"'Sora',sans-serif" }}>Funds added to your wallet</div>
      </div>
      <div style={{ padding:"14px 22px 6px" }}>
        <Steps current={2} labels={["Details","Approve","Done"]} icons={["edit","check_circle","celebration"]}/>
      </div>
      <div style={{ padding:"0 22px 22px", textAlign:"center" }}>
        <div style={{ width:70, height:70, borderRadius:"50%", background:C.greenDim,
          border:`2px solid ${C.green}66`, display:"flex", alignItems:"center", justifyContent:"center",
          margin:"8px auto 14px", animation:"successPop .5s cubic-bezier(.22,1,.36,1)" }}>
          <Icon name="check" size={34} color={C.green}/>
        </div>
        <div style={{ fontWeight:900, fontSize:30, color:C.green, fontFamily:"'DM Mono',monospace", marginBottom:3 }}>
          GH₵{parseFloat(amount).toFixed(2)}
        </div>
        <div style={{ fontSize:13, color:C.t3, marginBottom:22, fontFamily:"'Sora',sans-serif" }}>
          successfully added to your wallet
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.surfaceBorder}`, borderRadius:12,
          padding:"14px 16px", marginBottom:18, textAlign:"left" }}>
          {[["Amount",`GH₵ ${parseFloat(amount).toFixed(2)}`],["Network",networkObj?.label ?? network],["Phone",phone],["Status","Credited"]].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              marginBottom:k==="Status"?0:10 }}>
              <span style={{ color:C.t3, fontSize:12, fontFamily:"'Sora',sans-serif", display:"flex", alignItems:"center", gap:5 }}>
                <Icon name={k==="Amount"?"paid":k==="Network"?"cell_tower":k==="Phone"?"phone":"verified"} size={13} color={C.t3}/> {k}
              </span>
              <span style={{ color:k==="Status"?C.green:C.t1, fontSize:12, fontWeight:700, fontFamily:"'Sora',sans-serif",
                display:"flex", alignItems:"center", gap:4 }}>
                {k==="Status" && <Icon name="check_circle" size={13} color={C.green}/>} {v}
              </span>
            </div>
          ))}
        </div>
        <button className="zbtn" onClick={()=>window.location.href="/"} style={btn("primary")}>
          <Icon name="home" size={16}/> Back to Home
        </button>
        <button className="zbtn" onClick={()=>{ setStep(STEP.DETAILS); setAmount(""); setPhone(""); setNetwork("MTN"); setError(""); setInfo(""); setRef(""); setSmsCode(""); setSub(SUB.WAIT); }} style={btn("secondary")}>
          <Icon name="add_circle" size={15}/> Make Another Deposit
        </button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Crypto — Info
  ══════════════════════════════════════════════════════════════ */
  const renderBinanceInfo = () => (
    <>
      <Header title={<span style={{ display:"flex", alignItems:"center", gap:7 }}><Icon name="currency_bitcoin" size={20}/> Crypto Deposit</span>}
        subtitle="Send USDT · TRC20 Network" onBack={resetAll}/>
      <div style={{ padding:22 }}>
        {error && (
          <div style={{ background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:10,
            padding:"11px 13px", color:C.red, fontSize:13, marginBottom:14,
            display:"flex", alignItems:"center", gap:7, fontFamily:"'Sora',sans-serif" }}>
            <Icon name="error" size={16}/> {error}
          </div>
        )}

        <div style={{ background:"#0d0b00", border:"1px solid #3d3500", borderRadius:12,
          padding:"13px 15px", marginBottom:14, display:"flex", alignItems:"center", gap:13 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:C.yellow, fontFamily:"'Sora',sans-serif",
              display:"flex", alignItems:"center", gap:5 }}>
              <Icon name="open_in_new" size={14}/> New to Binance?
            </div>
            <div style={{ fontSize:11, color:"#b45309", marginTop:2, fontFamily:"'Sora',sans-serif" }}>
              Create a free account to buy &amp; send crypto.
            </div>
          </div>
          <a href="https://www.binance.com/en/register" target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:800,
              padding:"8px 14px", borderRadius:8, background:C.yellow, color:"#000",
              textDecoration:"none", flexShrink:0, fontFamily:"'Sora',sans-serif" }}>
            Sign Up <Icon name="arrow_forward" size={13} color="#000"/>
          </a>
        </div>

        <div style={{ background:"#08081a", border:`1px solid ${C.accent}33`, borderRadius:14, padding:18, marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:C.accentDim,
              border:`1px solid ${C.accent}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="account_balance_wallet" size={20} color={C.accentLight}/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:C.t1, fontFamily:"'Sora',sans-serif" }}>Send USDT to this address</div>
              <div style={{ fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif" }}>
                Network: <strong style={{color:C.accentLight}}>TRC20 (TRON)</strong>
              </div>
            </div>
          </div>

          <div style={{ background:"#10101e", border:`1px solid ${C.surfaceBorder}`, borderRadius:10, padding:"12px 13px", marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.t3, textTransform:"uppercase",
              letterSpacing:".5px", marginBottom:7, fontFamily:"'Sora',sans-serif",
              display:"flex", alignItems:"center", gap:4 }}>
              <Icon name="key" size={11}/> Wallet Address
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.t1,
              wordBreak:"break-all", lineHeight:1.7, marginBottom:10 }}>{BINANCE_ADDRESS}</div>
            <CopyButton text={BINANCE_ADDRESS}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[["Network","TRC20","hub"],["Coin","USDT","toll"],["Min.","$25 USDT","paid"]].map(([f,v,ic]) => (
              <div key={f} style={{ background:"#10101e", border:`1px solid ${C.surfaceBorder}`,
                borderRadius:8, padding:"9px 8px", textAlign:"center" }}>
                <Icon name={ic} size={14} color={C.accentLight}/>
                <div style={{ fontSize:10, color:C.t3, margin:"4px 0 2px", fontFamily:"'Sora',sans-serif" }}>{f}</div>
                <div style={{ fontSize:12, fontWeight:800, color:C.t1, fontFamily:"'Sora',sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>

          <InfoBox icon="warning" color={C.yellow}>
            Only send <strong>USDT via TRC20</strong>. Wrong network = <strong>permanent loss of funds</strong>.
          </InfoBox>
        </div>

        <button className="zbtn" onClick={()=>setBStep(BSTEP.FORM)} style={btn("primary")}>
          <Icon name="task_alt" size={16}/> I've Sent the Payment — Submit Proof
        </button>
        <div style={{ textAlign:"center", fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif",
          display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
          <Icon name="verified_user" size={12} color={C.t3}/> Credited after admin verification (1–5 mins)
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Crypto — Proof Form
  ══════════════════════════════════════════════════════════════ */
  const renderBinanceForm = () => (
    <>
      <Header title={<span style={{ display:"flex", alignItems:"center", gap:7 }}><Icon name="receipt_long" size={19}/> Payment Proof</span>}
        subtitle="Crypto Deposit — submit your details" onBack={()=>setBStep(BSTEP.INFO)}/>
      <div style={{ padding:22 }}>
        {error && (
          <div style={{ background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:10,
            padding:"11px 13px", color:C.red, fontSize:13, marginBottom:14,
            display:"flex", alignItems:"center", gap:7, fontFamily:"'Sora',sans-serif" }}>
            <Icon name="error" size={16}/> {error}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Transaction Hash (TXID) <span style={{color:C.red}}>*</span></label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}>
              <Icon name="tag" size={15} color={C.t3}/>
            </span>
            <input type="text" value={cryptoTxHash}
              onChange={e=>{ setCryptoTxHash(e.target.value); setCryptoErrors(p=>({...p,hash:""})); }}
              placeholder="Paste your blockchain transaction hash"
              style={{ ...inp(!!cryptoErrors.hash), paddingLeft:36 }}/>
          </div>
          <ErrMsg msg={cryptoErrors.hash}/>
          <div style={{ fontSize:11, color:C.t3, marginTop:4, fontFamily:"'Sora',sans-serif" }}>
            Find in Binance withdrawal history or a blockchain explorer.
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11, marginBottom:14 }}>
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

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11, marginBottom:14 }}>
          <div>
            <label style={lbl}>Amount Sent ({cryptoCoin}) <span style={{color:C.red}}>*</span></label>
            <input type="number" value={cryptoAmtSent} placeholder="0.00"
              onChange={e=>{ setCryptoAmtSent(e.target.value); setCryptoErrors(p=>({...p,amt:""})); }}
              style={inp(!!cryptoErrors.amt)}/>
            <ErrMsg msg={cryptoErrors.amt}/>
          </div>
          <div>
            <label style={lbl}>Expected GHS Credit <span style={{color:C.red}}>*</span></label>
            <input type="number" value={cryptoExpected} placeholder="0.00"
              onChange={e=>{ setCryptoExpected(e.target.value); setCryptoErrors(p=>({...p,exp:""})); }}
              style={inp(!!cryptoErrors.exp)}/>
            <ErrMsg msg={cryptoErrors.exp}/>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Sender Wallet Address</label>
          <input type="text" value={cryptoWallet} placeholder="Address you sent from (optional)"
            onChange={e=>setCryptoWallet(e.target.value)} style={inp()}/>
        </div>

        <ScreenshotPicker
          value={cryptoScreenshot}
          onChange={url => setCryptoScreenshot(url)}
          label="Transaction Screenshot (optional)"
          required={false}
          error={cryptoErrors.screenshot || ""}
        />

        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Note to Admin</label>
          <textarea value={cryptoNote} onChange={e=>setCryptoNote(e.target.value)}
            placeholder="Any additional info (optional)" rows={3}
            style={{ ...inp(), resize:"vertical", lineHeight:1.6 }}/>
        </div>

        <button className="zbtn" onClick={handleCryptoSubmit} disabled={loading} style={btn("primary",loading)}>
          {loading
            ? <><span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 1s linear infinite" }}/> Submitting…</>
            : <><Icon name="upload_file" size={16}/> Submit Deposit Proof</>}
        </button>
        <div style={{ textAlign:"center", fontSize:11, color:C.t3, fontFamily:"'Sora',sans-serif",
          display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
          <Icon name="verified_user" size={12} color={C.t3}/> Reviewed &amp; credited within 1–5 minutes
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     SCREEN: Crypto — Success
  ══════════════════════════════════════════════════════════════ */
  const renderBinanceSuccess = () => (
    <>
      <div style={{ background:"linear-gradient(135deg,#0c0a2e,#13104a)", padding:"22px 22px 18px",
        borderBottom:`1px solid ${C.cardBorder}` }}>
        <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.4)", letterSpacing:"1.5px",
          textTransform:"uppercase", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>ZYNOBET</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:20, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>
          <Icon name="task_alt" size={22} color={C.accentLight}/> Proof Submitted!
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginTop:2, fontFamily:"'Sora',sans-serif" }}>Under admin review · Crypto Deposit</div>
      </div>
      <div style={{ padding:"32px 22px 22px", textAlign:"center" }}>
        <div style={{ width:70, height:70, borderRadius:"50%", background:C.accentDim,
          border:`2px solid ${C.accent}66`, display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 16px", animation:"successPop .5s cubic-bezier(.22,1,.36,1)" }}>
          <Icon name="hourglass_top" size={32} color={C.accentLight}/>
        </div>
        <div style={{ fontWeight:800, fontSize:20, color:C.t1, fontFamily:"'Sora',sans-serif", marginBottom:8 }}>Pending Review</div>
        <div style={{ fontSize:13, color:C.t3, lineHeight:1.9, marginBottom:24, fontFamily:"'Sora',sans-serif" }}>
          Your crypto deposit is under review.<br/>
          An admin will verify and credit your wallet within <strong style={{color:C.t1}}>1–5 minutes</strong>.
        </div>
        <button className="zbtn" onClick={resetAll} style={btn("primary")}>
          <Icon name="add_circle" size={15}/> Back to Deposit
        </button>
        <button className="zbtn" onClick={()=>window.location.href="/"} style={btn("secondary")}>
          <Icon name="home" size={15}/> Go to Home
        </button>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     ROOT RENDER
  ══════════════════════════════════════════════════════════════ */
  const renderContent = () => {
    if (step === 99) {
      if (bStep === BSTEP.INFO)    return renderBinanceInfo();
      if (bStep === BSTEP.FORM)    return renderBinanceForm();
      if (bStep === BSTEP.SUCCESS) return renderBinanceSuccess();
    }
    if (step === STEP.METHOD)  return renderMethod();
    if (step === STEP.DETAILS) return renderDetails();
    if (step === STEP.APPROVE) return renderApprove();
    if (step === STEP.DONE)    return renderDone();
    return null;
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg,
      backgroundImage:"radial-gradient(ellipse at 15% 40%,#1a0e3a 0%,transparent 55%),radial-gradient(ellipse at 85% 15%,#0a1a30 0%,transparent 55%)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"24px 16px 56px", fontFamily:"'Sora',sans-serif" }}>
      <SupportModal/>
      <div style={{ width:"100%", maxWidth:440 }}>
        <div className="zcard" style={{ background:C.card, borderRadius:20,
          boxShadow:"0 24px 70px rgba(0,0,0,.6), 0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)",
          overflow:"hidden", border:`1px solid ${C.cardBorder}` }}>
          {renderContent()}
        </div>
        <div style={{ textAlign:"center", marginTop:14, fontSize:11, color:"#2a2a3a", fontFamily:"'Sora',sans-serif" }}>
          © 2025 Zynobet ·{" "}
          <a href="https://www.zynobet.site" style={{ color:"#3a3a52", textDecoration:"none" }}>zynobet.site</a>
        </div>
      </div>
    </div>
  );
}
