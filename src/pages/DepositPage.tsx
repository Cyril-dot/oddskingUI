import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE    = "https://futballbackend-production-aefb.up.railway.app";
const MIN_DEPOSIT = 1;
const QUICK_AMOUNTS = [1, 2, 5, 10, 20, 50, 100, 200];
const NETWORKS = [
  { id: "MTN",        label: "MTN MoMo"        },
  { id: "VODAFONE",   label: "Telecel Cash"     },
  { id: "AIRTELTIGO", label: "AirtelTigo Money" },
];

const STEP = { DETAILS: 1, APPROVE: 2, DONE: 3 };
const SUB  = { SMS: "sms", WAIT: "wait", VERIFY: "verify" };

export default function DepositPage() {
  const navigate = useNavigate();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token =
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken");
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  const tok = () =>
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    "";

  // ── State ───────────────────────────────────────────────────────────────────
  const [amount,         setAmount]         = useState("");
  const [phone,          setPhone]          = useState("");
  const [network,        setNetwork]        = useState("MTN");
  const [step,           setStep]           = useState(STEP.DETAILS);
  const [sub,            setSub]            = useState(SUB.WAIT);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [info,           setInfo]           = useState("");
  const [externalRef,    setRef]            = useState("");
  const [countdown,      setCount]          = useState(120);
  const [actionRequired, setActionRequired] = useState(false);
  const [smsCode,        setSmsCode]        = useState("");
  const timerRef = useRef(null);

  // Countdown — only active during USSD wait sub-step
  useEffect(() => {
    if (step === STEP.APPROVE && sub === SUB.WAIT) {
      setCount(120);
      timerRef.current = setInterval(
        () =>
          setCount(p => {
            if (p <= 1) { clearInterval(timerRef.current); return 0; }
            return p - 1;
          }),
        1000
      );
    }
    return () => clearInterval(timerRef.current);
  }, [step, sub]);

  const fmt = s =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const networkLabel = NETWORKS.find(n => n.id === network)?.label ?? network;

  // ── API helpers ─────────────────────────────────────────────────────────────
  const post = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${tok()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || data?.error || "Request failed.");
    return data;
  };

  // ── Step 1: Initiate deposit ────────────────────────────────────────────────
  const handleInit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_DEPOSIT)
      return setError(`Minimum deposit is GH₵${MIN_DEPOSIT}.00`);
    if (!phone.trim())
      return setError("MoMo phone number is required.");
    if (!/^0\d{9}$/.test(phone.trim()))
      return setError("Enter a valid 10-digit number starting with 0.");

    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/init", {
        amount:  amt,
        phone:   phone.trim(),
        network,
      });

      setRef(data?.data?.externalref || "");
      const isActionRequired = data?.data?.actionRequired === true;
      setActionRequired(isActionRequired);

      // MTN actionRequired=true → show SMS code entry screen first
      // All other networks (or MTN without actionRequired) → straight to USSD wait
      setSub(isActionRequired ? SUB.SMS : SUB.WAIT);
      setStep(STEP.APPROVE);
    } catch (e) {
      setError(e.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2a: Submit SMS OTP — re-calls /open/transact/payment with otpcode ─
  // The backend retrieves amount/phone/network from its pendingCharges cache,
  // so the frontend only needs to send externalref + otp.
  const handleSmsSubmit = async () => {
    setError("");
    if (!smsCode.trim())  return setError("Please enter the code from your SMS.");
    if (!externalRef)     return setError("Missing payment reference. Please start over.");

    setLoading(true);
    try {
      await post("/api/wallet/deposit/moolre/otp", {
        externalref: externalRef,
        otp:         smsCode.trim(),
      });
      // OTP accepted — Moolre has now pushed the USSD prompt to the user's phone
      setSmsCode("");
      setError("");
      setSub(SUB.WAIT);
    } catch (e) {
      setError(e.message || "Code verification failed. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2b: Verify payment ─────────────────────────────────────────────────
  const handleVerify = async () => {
    setError(""); setInfo("");
    if (!externalRef) return setError("Missing reference. Please start over.");

    setLoading(true);
    try {
      const data = await post("/api/wallet/deposit/moolre/verify", {
        externalref: externalRef,
      });
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
    setStep(STEP.DETAILS);
    setError(""); setInfo("");
    setRef(""); setSmsCode("");
    setSub(SUB.WAIT);
    clearInterval(timerRef.current);
  };

  // ── Shared styles ───────────────────────────────────────────────────────────
  const S = {
    page:     { minHeight: "100vh", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'DM Sans','Segoe UI',sans-serif" },
    card:     { width: "100%", maxWidth: "420px", background: "#0d1e30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" },
    hdr:      { padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
    hdrTitle: { fontWeight: 700, fontSize: "16px", color: "#fff" },
    hdrSub:   { fontSize: "12px", color: "#556677", marginTop: "2px" },
    tabs:     { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" },
    body:     { padding: "20px" },
    err:      { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "10px 12px", color: "#f87171", fontSize: "13px", marginBottom: "14px", lineHeight: "1.5" },
    info:     { background: "rgba(74,158,255,0.06)", border: "1px solid rgba(74,158,255,0.2)", borderRadius: "8px", padding: "10px 12px", color: "#6a9ec0", fontSize: "13px", marginBottom: "14px", lineHeight: "1.5" },
    label:    { display: "block", fontSize: "11px", fontWeight: 600, color: "#556677", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" },
    input:    { flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "13px 14px", color: "#fff", fontSize: "14px", outline: "none" },
    btnPri:   { width: "100%", padding: "15px", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "10px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff" },
    btnPriDis:{ width: "100%", padding: "15px", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: "not-allowed", marginBottom: "10px", background: "rgba(74,158,255,0.1)", color: "#334466" },
    btnSec:   { width: "100%", padding: "13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", color: "#667788", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginBottom: "10px" },
    btnGhost: { width: "100%", padding: "13px", background: "transparent", border: "none", color: "#445566", fontSize: "12px", cursor: "pointer" },
  };

  const tab = active => ({
    flex: 1, padding: "10px 0", textAlign: "center", fontSize: "12px", fontWeight: 600, cursor: "default", transition: "all 0.2s",
    ...(active
      ? { background: "#1a3a5c", color: "#fff",    borderBottom: "2px solid #4a9eff" }
      : { background: "transparent", color: "#556677", borderBottom: "2px solid transparent" }),
  });

  // ── Progress indicator helper ───────────────────────────────────────────────
  const ProgressSteps = ({ steps }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "10px", fontWeight: 800, flexShrink: 0,
              background: s.done ? "rgba(34,197,94,0.3)" : s.active ? "#2563eb" : "rgba(255,255,255,0.08)",
              color: s.done || s.active ? "#fff" : "#445566",
            }}>
              {s.done ? "✓" : s.n}
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap",
              color: s.active ? "#aaccff" : s.done ? "#4ade80" : "#445566" }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)", minWidth: "12px" }} />
          )}
        </div>
      ))}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Header */}
        <div style={S.hdr}>
          <div style={S.hdrTitle}>Deposit Funds</div>
          <div style={S.hdrSub}>Mobile Money · GHS</div>
        </div>

        {/* Step tabs */}
        <div style={S.tabs}>
          {[{ n: 1, label: "Details" }, { n: 2, label: "Approve" }, { n: 3, label: "Done" }].map(({ n, label }) => (
            <div key={n} style={tab(step === n)}>{n} · {label}</div>
          ))}
        </div>

        <div style={S.body}>

          {/* ════ STEP 1 — DETAILS ════ */}
          {step === STEP.DETAILS && (
            <>
              {error && <div style={S.err}>⚠️ {error}</div>}

              {/* Amount */}
              <div style={{ marginBottom: "18px" }}>
                <label style={S.label}>Amount</label>
                <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
                  <span style={{ padding: "13px 12px 13px 14px", color: "#8899aa", fontSize: "13px", fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.06)" }}>GHS</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: "16px", fontWeight: 700, padding: "13px 14px" }}
                  />
                </div>
                <div style={{ color: "#334455", fontSize: "11px", marginTop: "5px" }}>Minimum: GH₵1.00</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px", marginTop: "10px" }}>
                  {QUICK_AMOUNTS.map(q => (
                    <button key={q} onClick={() => setAmount(String(q))} style={{
                      background: parseFloat(amount) === q ? "rgba(74,158,255,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${parseFloat(amount) === q ? "rgba(74,158,255,0.4)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "8px", padding: "8px 0",
                      color: parseFloat(amount) === q ? "#4a9eff" : "#667788",
                      fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div style={{ marginBottom: "18px" }}>
                <label style={S.label}>MoMo Phone Number</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "13px 12px", color: "#667788", fontSize: "13px", fontWeight: 600 }}>+233</div>
                  <input
                    type="tel"
                    placeholder="0244123456"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    maxLength={10}
                    style={S.input}
                  />
                </div>
              </div>

              {/* Network */}
              <div style={{ marginBottom: "20px" }}>
                <label style={S.label}>Select Network</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {NETWORKS.map(n => (
                    <button key={n.id} onClick={() => setNetwork(n.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: network === n.id ? "rgba(74,158,255,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${network === n.id ? "rgba(74,158,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "10px", padding: "12px 14px", cursor: "pointer",
                    }}>
                      <span style={{ color: network === n.id ? "#cce0ff" : "#889aaa", fontSize: "14px", fontWeight: 600 }}>{n.label}</span>
                      {network === n.id && <span style={{ color: "#4a9eff", fontSize: "13px", fontWeight: 700 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ ...S.info, marginBottom: "18px" }}>
                📲 A USSD prompt will be sent to your MoMo phone. Approve it within 2 minutes to complete your deposit.
              </div>

              <button
                onClick={handleInit}
                disabled={loading || !amount || !phone}
                style={loading || !amount || !phone ? S.btnPriDis : S.btnPri}
              >
                {loading ? "Initiating…" : `Send Prompt · GH₵${parseFloat(amount) || "0.00"}`}
              </button>

              <div style={{ textAlign: "center", fontSize: "10px", color: "#223344", marginTop: "14px" }}>
                🔒 Secured by Moolre · USSD Direct Charge
              </div>
            </>
          )}

          {/* ════ STEP 2 — APPROVE ════ */}
          {step === STEP.APPROVE && (
            <>
              {error && <div style={S.err}>⚠️ {error}</div>}

              {/* ── SUB: SMS — enter the OTP code received via SMS ── */}
              {sub === SUB.SMS && (
                <>
                  <ProgressSteps steps={[
                    { n: "1", label: "Enter SMS Code", active: true,  done: false },
                    { n: "2", label: "Approve USSD",   active: false, done: false },
                    { n: "3", label: "Done",           active: false, done: false },
                  ]} />

                  <div style={{ background: "rgba(255,204,0,0.06)", border: "1px solid rgba(255,204,0,0.18)", borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
                    <div style={{ fontSize: "24px", textAlign: "center", marginBottom: "8px" }}>💬</div>
                    <div style={{ color: "#ffe066", fontWeight: 700, fontSize: "13px", textAlign: "center", marginBottom: "6px" }}>
                      Check your SMS
                    </div>
                    <div style={{ color: "#998844", fontSize: "12px", lineHeight: "1.65", textAlign: "center" }}>
                      MTN has sent a verification code to{" "}
                      <strong style={{ color: "#ccaa44" }}>{phone}</strong>.
                      <br />Enter it below to trigger the USSD payment prompt.
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={S.label}>SMS Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="······"
                      value={smsCode}
                      onChange={e => setSmsCode(e.target.value.replace(/\D/g, ""))}
                      maxLength={8}
                      autoFocus
                      style={{
                        width: "100%", boxSizing: "border-box",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(74,158,255,0.35)",
                        borderRadius: "10px",
                        padding: "16px",
                        color: "#fff",
                        fontSize: "24px",
                        fontWeight: 700,
                        letterSpacing: "8px",
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                    <div style={{ fontSize: "11px", color: "#445566", marginTop: "6px", textAlign: "center" }}>
                      Check your SMS inbox — the code is from MTN MoMo
                    </div>
                  </div>

                  <button
                    onClick={handleSmsSubmit}
                    disabled={loading || smsCode.length < 4}
                    style={loading || smsCode.length < 4 ? S.btnPriDis : S.btnPri}
                  >
                    {loading ? "Verifying Code…" : "Submit Code & Send USSD Prompt →"}
                  </button>

                  <button onClick={restart} style={S.btnSec}>← Start Over</button>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px", color: "#445566", fontSize: "12px", lineHeight: "1.5" }}>
                    💡 Didn't receive an SMS? Wait 30 seconds then{" "}
                    <span onClick={restart} style={{ color: "#4a9eff", cursor: "pointer", textDecoration: "underline" }}>
                      start over
                    </span>
                    {" "}to resend.
                  </div>
                </>
              )}

              {/* ── SUB: WAIT — waiting for USSD approval on phone ── */}
              {sub === SUB.WAIT && (
                <>
                  <ProgressSteps steps={[
                    ...(actionRequired ? [{ n: "1", label: "SMS Code",     active: false, done: true  }] : []),
                    {                    n: "2", label: "Approve USSD", active: true,  done: false },
                    {                    n: "3", label: "Done",         active: false, done: false },
                  ]} />

                  <div style={{ background: "rgba(255,204,0,0.06)", border: "1px solid rgba(255,204,0,0.18)", borderRadius: "12px", padding: "18px", marginBottom: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📳</div>
                    <div style={{ color: "#ffe066", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>
                      Check your phone
                    </div>
                    <div style={{ color: "#998844", fontSize: "12px", lineHeight: "1.7" }}>
                      A USSD prompt has been sent to{" "}
                      <strong style={{ color: "#ccaa44" }}>{phone}</strong>.
                      <br />
                      Approve the{" "}
                      <strong style={{ color: "#ffcc66" }}>GH₵{parseFloat(amount).toFixed(2)}</strong>{" "}
                      payment on your {networkLabel} to continue.
                    </div>
                    {countdown > 0 ? (
                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#665522" }}>
                        Expires in{" "}
                        <strong style={{ color: "#ffcc00" }}>{fmt(countdown)}</strong>
                      </div>
                    ) : (
                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#994433" }}>
                        Prompt may have expired — you can still verify below
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setSub(SUB.VERIFY); setError(""); setInfo(""); }}
                    style={S.btnPri}
                  >
                    I've Approved — Verify Payment ✓
                  </button>

                  <button onClick={restart} style={S.btnSec}>← Start Over</button>
                </>
              )}

              {/* ── SUB: VERIFY — check payment status ── */}
              {sub === SUB.VERIFY && (
                <>
                  <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                      Verify Payment
                    </div>
                    <div style={{ color: "#556677", fontSize: "12px" }}>
                      Checking GH₵{parseFloat(amount).toFixed(2)} on {networkLabel}
                    </div>
                  </div>

                  {info && <div style={S.info}>ℹ️ {info}</div>}

                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    style={loading ? S.btnPriDis : S.btnPri}
                  >
                    {loading ? "Verifying…" : "Verify Payment"}
                  </button>

                  <button
                    onClick={() => { setSub(SUB.WAIT); setError(""); setInfo(""); }}
                    style={S.btnSec}
                  >
                    ← Back (Still Waiting for Approval)
                  </button>

                  <button onClick={restart} style={S.btnGhost}>Start Over</button>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px", color: "#445566", fontSize: "12px", marginTop: "12px", lineHeight: "1.5" }}>
                    💡 If still pending, go back and approve the USSD prompt on your phone first.
                  </div>
                </>
              )}
            </>
          )}

          {/* ════ STEP 3 — DONE ════ */}
          {step === STEP.DONE && (
            <>
              <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 14px" }}>
                  ✅
                </div>
                <div style={{ color: "#4ade80", fontWeight: 800, fontSize: "18px", marginBottom: "6px" }}>
                  Deposit Successful!
                </div>
                <div style={{ color: "#556677", fontSize: "13px" }}>
                  GH₵{parseFloat(amount).toFixed(2)} has been added to your wallet.
                </div>
              </div>

              <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "10px", padding: "14px", marginBottom: "18px" }}>
                {[
                  ["Amount",  `GH₵ ${parseFloat(amount).toFixed(2)}`],
                  ["Network", networkLabel],
                  ["Phone",   phone],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#445566", fontSize: "12px" }}>{k}</span>
                    <span style={{ color: "#aabbcc", fontSize: "12px", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => window.location.href = "/"} style={S.btnPri}>
                Back to Home
              </button>

              <button
                onClick={() => {
                  setStep(STEP.DETAILS);
                  setAmount(""); setPhone(""); setNetwork("MTN");
                  setError(""); setInfo("");
                  setRef(""); setSmsCode(""); setSub(SUB.WAIT);
                }}
                style={S.btnSec}
              >
                Make Another Deposit
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
