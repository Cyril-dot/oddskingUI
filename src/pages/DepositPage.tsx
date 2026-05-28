import { useState, useEffect, useRef } from "react";

const API_BASE = "https://futballbackend-production-aefb.up.railway.app";
const MIN_DEPOSIT = 1;
const QUICK_AMOUNTS = [1, 2, 5, 10, 20, 50, 100, 200];
const NETWORKS = [
  { id: "MTN",        label: "MTN MoMo",        check: true  },
  { id: "VODAFONE",   label: "Telecel Cash",     check: false },
  { id: "AIRTELTIGO", label: "AirtelTigo Money", check: false },
];

// Steps map to the 3 tabs: Details(1) → Approve(2) → Done(3)
// USSD_WAIT and VERIFY both live inside step 2 "Approve"
const STEP = { DETAILS: 1, APPROVE: 2, DONE: 3 };
const SUB  = { WAIT: "wait", VERIFY: "verify" };

export default function DepositPage() {
  const [amount,      setAmount]  = useState("");
  const [phone,       setPhone]   = useState("");
  const [network,     setNetwork] = useState("MTN");
  const [step,        setStep]    = useState(STEP.DETAILS);
  const [sub,         setSub]     = useState(SUB.WAIT);
  const [loading,     setLoading] = useState(false);
  const [error,       setError]   = useState("");
  const [info,        setInfo]    = useState("");
  const [externalRef, setRef]     = useState("");
  const [countdown,   setCount]   = useState(120);
  const [actionRequired, setActionRequired] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (step === STEP.APPROVE && sub === SUB.WAIT) {
      setCount(120);
      timerRef.current = setInterval(() =>
        setCount(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step, sub]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  // Same key used in LoginPage.tsx — TOKEN_KEY = "accessToken"
  const tok = () => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

  const handleInit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_DEPOSIT) return setError(`Minimum deposit is GH₵${MIN_DEPOSIT}.00`);
    if (!phone.trim())            return setError("MoMo phone number is required.");
    if (!/^0\d{9}$/.test(phone.trim())) return setError("Enter a valid 10-digit number starting with 0.");
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/wallet/deposit/moolre/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ amount: amt, phone: phone.trim(), network }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data?.message || data?.error || "Payment initiation failed. Please try again.");
      setRef(data?.data?.externalref || "");
      setActionRequired(data?.data?.actionRequired === true);
      setSub(SUB.WAIT);
      setStep(STEP.APPROVE);
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  const handleVerify = async () => {
    setError(""); setInfo("");
    if (!externalRef) return setError("Missing reference. Please start over.");
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/wallet/deposit/moolre/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ externalref: externalRef }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data?.message || "Verification failed. Please try again.");
      const r = data?.data;
      if (r?.credited)          { setStep(STEP.DONE); }
      else if (r?.txstatus === 0) setInfo("Payment still pending — please approve the prompt on your phone, then verify again.");
      else if (r?.txstatus === 2) setError("Payment was cancelled or failed. Please start a new deposit.");
      else                        setInfo(r?.message || "Status unclear. Try verifying again in a moment.");
    } catch { setError("Network error during verification. Please try again."); }
    finally  { setLoading(false); }
  };

  const restart = () => { setStep(STEP.DETAILS); setError(""); setInfo(""); setRef(""); };

  // ── shared tab styles ───────────────────────────────────────────────────────
  const tabActive = { background:"#1a3a5c", color:"#fff",   borderBottom:"2px solid #4a9eff" };
  const tabIdle   = { background:"transparent", color:"#556677", borderBottom:"2px solid transparent" };

  return (
    <div style={{ minHeight:"100vh", background:"#0a1628", display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:"420px", background:"#0d1e30", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", overflow:"hidden" }}>

        {/* ── Header ── */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontWeight:700, fontSize:"16px", color:"#fff" }}>Deposit Funds</div>
          <div style={{ fontSize:"12px", color:"#556677", marginTop:"2px" }}>Mobile Money · GHS</div>
        </div>

        {/* ── Step tabs: 1 · 2 · 3 ── */}
        <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          {[
            { n:1, label:"Details" },
            { n:2, label:"Approve" },
            { n:3, label:"Done"    },
          ].map(({ n, label }) => (
            <div key={n} style={{ flex:1, padding:"10px 0", textAlign:"center", fontSize:"12px", fontWeight:600, cursor:"default", transition:"all 0.2s", ...(step === n ? tabActive : tabIdle) }}>
              {n} · {label}
            </div>
          ))}
        </div>

        <div style={{ padding:"20px" }}>

          {/* ════════════ STEP 1 — DETAILS ════════════ */}
          {step === STEP.DETAILS && (<>

            {error && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"8px", padding:"10px 12px", color:"#f87171", fontSize:"13px", marginBottom:"14px" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Amount */}
            <div style={{ marginBottom:"18px" }}>
              <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"#556677", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"7px" }}>Amount</label>
              <div style={{ display:"flex", alignItems:"center", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"10px", overflow:"hidden" }}>
                <span style={{ padding:"13px 12px 13px 14px", color:"#8899aa", fontSize:"13px", fontWeight:600, borderRight:"1px solid rgba(255,255,255,0.06)" }}>GHS</span>
                <input
                  type="number" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  style={{ flex:1, background:"none", border:"none", outline:"none", color:"#fff", fontSize:"16px", fontWeight:700, padding:"13px 14px" }}
                />
              </div>
              <div style={{ color:"#334455", fontSize:"11px", marginTop:"5px" }}>Minimum: GH₵1.00</div>
              {/* Quick amounts */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"7px", marginTop:"10px" }}>
                {QUICK_AMOUNTS.map(q => (
                  <button key={q}
                    onClick={() => setAmount(String(q))}
                    style={{ background: parseFloat(amount)===q ? "rgba(74,158,255,0.15)" : "rgba(255,255,255,0.04)", border:`1px solid ${parseFloat(amount)===q ? "rgba(74,158,255,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius:"8px", padding:"8px 0", color: parseFloat(amount)===q ? "#4a9eff" : "#667788", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div style={{ marginBottom:"18px" }}>
              <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"#556677", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"7px" }}>MoMo Phone Number</label>
              <div style={{ display:"flex", gap:"8px", alignItems:"stretch" }}>
                <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"10px", padding:"13px 12px", color:"#667788", fontSize:"13px", fontWeight:600, whiteSpace:"nowrap" }}>+233</div>
                <input
                  type="tel" placeholder="Enter your full number starting with 0 (e.g. 0244123456)"
                  value={phone} onChange={e => setPhone(e.target.value)} maxLength={10}
                  style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"10px", padding:"13px 14px", color:"#fff", fontSize:"14px", outline:"none" }}
                />
              </div>
            </div>

            {/* Network */}
            <div style={{ marginBottom:"20px" }}>
              <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"#556677", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"7px" }}>Select Network</label>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {NETWORKS.map(n => (
                  <button key={n.id} onClick={() => setNetwork(n.id)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background: network===n.id ? "rgba(74,158,255,0.08)" : "rgba(255,255,255,0.03)", border:`1px solid ${network===n.id ? "rgba(74,158,255,0.35)" : "rgba(255,255,255,0.07)"}`, borderRadius:"10px", padding:"12px 14px", cursor:"pointer", transition:"all 0.15s" }}>
                    <span style={{ color: network===n.id ? "#cce0ff" : "#889aaa", fontSize:"14px", fontWeight:600 }}>{n.label}</span>
                    {network===n.id && <span style={{ color:"#4a9eff", fontSize:"13px", fontWeight:700 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:"rgba(74,158,255,0.06)", border:"1px solid rgba(74,158,255,0.15)", borderRadius:"8px", padding:"10px 12px", color:"#6a9ec0", fontSize:"12px", marginBottom:"18px", lineHeight:"1.5" }}>
              📲 A USSD prompt will be sent to your MoMo phone. Approve it within 2 minutes to complete your deposit.
            </div>

            <button onClick={handleInit} disabled={loading || !amount || !phone}
              style={{ width:"100%", padding:"15px", background: loading||!amount||!phone ? "rgba(74,158,255,0.1)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:"10px", color: loading||!amount||!phone ? "#334466" : "#fff", fontSize:"15px", fontWeight:700, cursor: loading||!amount||!phone ? "not-allowed":"pointer", transition:"all 0.2s" }}>
              {loading ? "Initiating…" : `Send USSD Prompt · GH₵${parseFloat(amount)||"0.00"}`}
            </button>

            <div style={{ textAlign:"center", fontSize:"10px", color:"#223344", marginTop:"14px" }}>
              🔒 Secured by Moolre · USSD Direct Charge
            </div>
          </>)}

          {/* ════════════ STEP 2 — APPROVE ════════════ */}
          {step === STEP.APPROVE && (<>

            {error && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"8px", padding:"10px 12px", color:"#f87171", fontSize:"13px", marginBottom:"14px" }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── sub: WAIT — user needs to approve on phone ── */}
            {sub === SUB.WAIT && (<>

              {/* SMS + USSD two-step flow (actionRequired=true from backend) */}
              {actionRequired ? (<>
                <div style={{ background:"rgba(255,204,0,0.06)", border:"1px solid rgba(255,204,0,0.18)", borderRadius:"12px", padding:"18px", marginBottom:"14px" }}>
                  <div style={{ color:"#ffe066", fontWeight:700, fontSize:"13px", marginBottom:"14px", textAlign:"center" }}>
                    📋 Complete these steps to finish your deposit
                  </div>

                  {/* Step 1 — SMS code */}
                  <div style={{ display:"flex", gap:"12px", alignItems:"flex-start", marginBottom:"14px" }}>
                    <div style={{ minWidth:"24px", height:"24px", borderRadius:"50%", background:"#2563eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:800, color:"#fff", flexShrink:0 }}>1</div>
                    <div>
                      <div style={{ color:"#ffe066", fontWeight:700, fontSize:"13px", marginBottom:"3px" }}>Check your SMS</div>
                      <div style={{ color:"#998844", fontSize:"12px", lineHeight:"1.6" }}>
                        MTN has sent a verification code to <strong style={{ color:"#ccaa44" }}>{phone}</strong>. Enter that code in the SMS prompt on your phone to approve.
                      </div>
                    </div>
                  </div>

                  {/* Step 2 — USSD */}
                  <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
                    <div style={{ minWidth:"24px", height:"24px", borderRadius:"50%", background:"rgba(74,158,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:800, color:"#fff", flexShrink:0 }}>2</div>
                    <div>
                      <div style={{ color:"#8899bb", fontWeight:700, fontSize:"13px", marginBottom:"3px" }}>Approve the USSD prompt</div>
                      <div style={{ color:"#556677", fontSize:"12px", lineHeight:"1.6" }}>
                        After completing the SMS step, a USSD menu will appear. Approve the <strong style={{ color:"#7799bb" }}>GH₵{parseFloat(amount).toFixed(2)}</strong> payment on your {NETWORKS.find(n=>n.id===network)?.label}.
                      </div>
                    </div>
                  </div>
                </div>
              </>) : (<>
                {/* Normal USSD-only flow */}
                <div style={{ background:"rgba(255,204,0,0.06)", border:"1px solid rgba(255,204,0,0.18)", borderRadius:"12px", padding:"18px", marginBottom:"14px", textAlign:"center" }}>
                  <div style={{ fontSize:"28px", marginBottom:"8px" }}>📳</div>
                  <div style={{ color:"#ffe066", fontWeight:700, fontSize:"14px", marginBottom:"6px" }}>Check your phone</div>
                  <div style={{ color:"#998844", fontSize:"12px", lineHeight:"1.6" }}>
                    A USSD prompt has been sent to <strong style={{ color:"#ccaa44" }}>{phone}</strong>.<br />
                    Approve the <strong>GH₵{parseFloat(amount).toFixed(2)}</strong> payment on your {NETWORKS.find(n=>n.id===network)?.label} to continue.
                  </div>
                  {countdown > 0
                    ? <div style={{ marginTop:"10px", fontSize:"12px", color:"#665522" }}>Expires in <strong style={{ color:"#ffcc00" }}>{fmt(countdown)}</strong></div>
                    : <div style={{ marginTop:"10px", fontSize:"12px", color:"#994433" }}>Prompt may have expired — you can still verify below</div>
                  }
                </div>
              </>)}

              <button onClick={() => { setSub(SUB.VERIFY); setError(""); setInfo(""); }}
                style={{ width:"100%", padding:"15px", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:"10px", color:"#fff", fontSize:"15px", fontWeight:700, cursor:"pointer", marginBottom:"10px" }}>
                I've Done Both Steps — Verify Payment ✓
              </button>

              <button onClick={restart}
                style={{ width:"100%", padding:"13px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"10px", color:"#667788", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
                ← Start Over
              </button>
            </>)}

            {/* ── sub: VERIFY — check if payment went through ── */}
            {sub === SUB.VERIFY && (<>
              <div style={{ textAlign:"center", marginBottom:"20px" }}>
                <div style={{ fontSize:"28px", marginBottom:"8px" }}>🔍</div>
                <div style={{ color:"#fff", fontWeight:700, fontSize:"15px", marginBottom:"4px" }}>Verify Payment</div>
                <div style={{ color:"#556677", fontSize:"12px" }}>
                  Checking GH₵{parseFloat(amount).toFixed(2)} on {NETWORKS.find(n=>n.id===network)?.label}
                </div>
              </div>

              {info && (
                <div style={{ background:"rgba(74,158,255,0.06)", border:"1px solid rgba(74,158,255,0.2)", borderRadius:"8px", padding:"10px 12px", color:"#6a9ec0", fontSize:"13px", marginBottom:"14px", lineHeight:"1.5" }}>
                  ℹ️ {info}
                </div>
              )}

              <button onClick={handleVerify} disabled={loading}
                style={{ width:"100%", padding:"15px", background: loading ? "rgba(74,158,255,0.1)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:"10px", color: loading ? "#334466" : "#fff", fontSize:"15px", fontWeight:700, cursor: loading ? "not-allowed":"pointer", marginBottom:"10px" }}>
                {loading ? "Verifying…" : "Verify Payment"}
              </button>

              <button onClick={() => { setSub(SUB.WAIT); setError(""); setInfo(""); }}
                style={{ width:"100%", padding:"13px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"10px", color:"#667788", fontSize:"13px", fontWeight:600, cursor:"pointer", marginBottom:"10px" }}>
                ← Back (Waiting for Approval)
              </button>

              <button onClick={restart}
                style={{ width:"100%", padding:"13px", background:"transparent", border:"none", color:"#445566", fontSize:"12px", cursor:"pointer" }}>
                Start Over
              </button>

              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"8px", padding:"10px 12px", color:"#445566", fontSize:"12px", marginTop:"12px", lineHeight:"1.5" }}>
                💡 If still pending, go back and approve the USSD prompt first.
              </div>
            </>)}
          </>)}

          {/* ════════════ STEP 3 — DONE ════════════ */}
          {step === STEP.DONE && (<>
            <div style={{ textAlign:"center", padding:"12px 0 20px" }}>
              <div style={{ width:"56px", height:"56px", borderRadius:"50%", background:"rgba(34,197,94,0.1)", border:"2px solid rgba(34,197,94,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto 14px" }}>✅</div>
              <div style={{ color:"#4ade80", fontWeight:800, fontSize:"18px", marginBottom:"6px" }}>Deposit Successful!</div>
              <div style={{ color:"#556677", fontSize:"13px" }}>GH₵{parseFloat(amount).toFixed(2)} has been added to your wallet.</div>
            </div>

            <div style={{ background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
              {[
                ["Amount",  `GH₵ ${parseFloat(amount).toFixed(2)}`],
                ["Network", NETWORKS.find(n=>n.id===network)?.label],
                ["Phone",   phone],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px", ":last-child":{ marginBottom:0 } }}>
                  <span style={{ color:"#445566", fontSize:"12px" }}>{k}</span>
                  <span style={{ color:"#aabbcc", fontSize:"12px", fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>

            <button onClick={() => window.location.href = "/"}
              style={{ width:"100%", padding:"15px", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:"10px", color:"#fff", fontSize:"15px", fontWeight:700, cursor:"pointer", marginBottom:"10px" }}>
              Back to Home
            </button>

            <button onClick={() => { setStep(STEP.DETAILS); setAmount(""); setPhone(""); setNetwork("MTN"); setError(""); setInfo(""); setRef(""); }}
              style={{ width:"100%", padding:"13px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"10px", color:"#667788", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
              Make Another Deposit
            </button>
          </>)}

        </div>
      </div>
    </div>
  );
}
