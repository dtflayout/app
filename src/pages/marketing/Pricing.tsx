import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import MarketingNav from "@/components/marketing/MarketingNav";
import { useCredits } from "@/contexts/CreditsContext";
import {
  createCheckoutSession,
  claimFreeTrial,
  UserInfo,
} from "@/services/paymentService";

/* ══════════ DESIGN TOKENS ══════════ */
const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

/* ══════════ PLAN DATA ══════════ */
const PLANS = [
  {
    id: "free_trial", name: "DTF Trial",
    price: { india: "₹0", global: "$0" },
    credits: { india: "20,000", global: "20K" }, creditsValue: 20000,
    rate: "Free",
    description: "Experience the full platform — no credit card needed.",
    features: ["Full access to all tools", "BG Remover, Enhancer, Crop, Text Editor & more", "Integrate with any website", "No credit card required"],
    cta: "Get Started Free", popular: false,
    tint: "linear-gradient(135deg, #F0F9FF, #BAE6FD)",
  },
  {
    id: "starter", name: "DTF Starter",
    price: { india: "₹1,999", global: "$49" },
    credits: { india: "1,50,000", global: "150K" }, creditsValue: 150000,
    rate: { india: "1.33 paisa/sq.in", global: "$0.33/1K sq.in" },
    description: "Balanced and budget-smart for getting started.",
    features: ["Full access to all tools", "BG Remover, Enhancer, Crop, Text Editor & more", "White-label builder — your brand colors, logo & fonts", "In-depth user behavior analytics", "Integrate with any website"],
    cta: "Get Started", popular: false,
    tint: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
  },
  {
    id: "growth", name: "DTF Growth",
    price: { india: "₹5,999", global: "$149" },
    credits: { india: "5,00,000", global: "500K" }, creditsValue: 500000,
    rate: { india: "1.2 paisa/sq.in", global: "$0.30/1K sq.in" },
    description: "Significantly cheaper per-inch for heavy users.",
    features: ["Full access to all tools", "BG Remover, Enhancer, Crop, Text Editor & more", "White-label builder — your brand colors, logo & fonts", "In-depth user behavior analytics", "Integrate with any website"],
    cta: "Get Started", popular: false,
    tint: "linear-gradient(135deg, #FFF7ED, #FED7AA)",
  },
  {
    id: "max", name: "DTF Max",
    price: { india: "₹11,999", global: "$299" },
    credits: { india: "20,00,000", global: "2M" }, creditsValue: 2000000,
    rate: { india: "0.6 paisa/sq.in", global: "$0.15/1K sq.in" },
    description: "Our lowest per-inch rate — maximum savings unlocked.",
    features: ["Full access to all tools", "BG Remover, Enhancer, Crop, Text Editor & more", "White-label builder — your brand colors, logo & fonts", "In-depth user behavior analytics", "Integrate with any website"],
    cta: "Get Started", popular: true,
    tint: "linear-gradient(135deg, #C7D2FE, #A5B4FC)",
  },
];

/* ══════════ FAQ DATA ══════════ */
const FAQS = [
  { q: "How does credit-based pricing work?", a: "You buy credits once — no recurring subscription. Credits are measured in square inches. Every time you generate a gang sheet, the area used is deducted from your balance. When credits run low, just recharge with any plan." },
  { q: "Is there a free trial?", a: "Yes! Every new account gets 20,000 sq.inch of credits for free — no credit card required. That's enough to create several gang sheets and experience the full platform before purchasing." },
  { q: "Do credits expire?", a: "No, your credits never expire. Use them at your own pace — there's no time limit or monthly reset." },
  { q: "Are there any monthly fees or per-order charges?", a: "None at all. DTF Layout uses a pure credit-based model. You pay once for credits and use them whenever you need. No subscriptions, no hidden fees, no per-order cuts." },
  { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards, UPI, and net banking for Indian customers, and credit/debit cards for international customers. All payments are processed securely via Dodo Payments." },
  { q: "Can I upgrade to a bigger plan later?", a: "Since there are no subscriptions, you simply purchase additional credits anytime. Your existing credits carry over — new credits are added to your current balance." },
  { q: "Do you offer refunds?", a: "Yes, we offer refunds within 7 days of purchase for unused credits. Please refer to our refund policy or contact us for details." },
  { q: "What features are included in every plan?", a: "All plans include full access to the Gang Sheet Builder, Background Remover, Image Enhancer, Trimmer, Text Editor, Website Integration, Quick Store, multi-sheet export, and the white-label builder." },
];

/* ══════════ SAVINGS CALCULATOR DATA ══════════ */
const CALC_PLANS = [
  { name: "Starter", price: 49, sqIn: 150000, ratePerSqIn: 0.00033 },
  { name: "Growth", price: 149, sqIn: 500000, ratePerSqIn: 0.0003 },
  { name: "Max", price: 299, sqIn: 2000000, ratePerSqIn: 0.00015 },
];
const COMPETITORS = [
  { name: "Drip Apps", type: "percentage" as const, rate: 0.05, subPlans: null },
  { name: "Kixxl", type: "multi" as const, rate: 0, subPlans: [
    { name: "Basic (5%)", type: "percentage_capped" as const, rate: 0.05, cap: 10, monthly: 0, sqftLimit: 0 },
    { name: "Intermediate", type: "subscription" as const, rate: 0, cap: 0, monthly: 149, sqftLimit: 1800 },
    { name: "Small Business", type: "subscription" as const, rate: 0, cap: 0, monthly: 249, sqftLimit: 3500 },
    { name: "Professional", type: "subscription" as const, rate: 0, cap: 0, monthly: 399, sqftLimit: 10000 },
    { name: "Business", type: "subscription" as const, rate: 0, cap: 0, monthly: 499, sqftLimit: 30000 },
  ]},
  { name: "Other", type: "percentage" as const, rate: 0.05, subPlans: null },
];
const CALC_WIDTHS = [10.5, 11, 11.5, 22, 22.5, 23];
function fmt(v: number) {
  if (v >= 1000) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (v >= 10) return `$${v.toFixed(0)}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(3)}`;
}
function fmtK(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

/* ══════════ SHARED COMPONENTS ══════════ */
function Sq({ top, left, right, bottom, size = 28, rotate = 12 }: any) {
  const p: any = {}; if (top != null) p.top = top; if (left != null) p.left = left; if (right != null) p.right = right; if (bottom != null) p.bottom = bottom;
  return <div style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.25, border: "1.5px dashed rgba(79,70,229,0.1)", transform: `rotate(${rotate}deg)`, pointerEvents: "none", ...p }} />;
}
function Dots({ o = 0.2 }: { o?: number }) {
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />;
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 14, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>{children}</span>;
}
function Btn({ children, v = "p", sz = "m", style: sx, onClick, disabled }: any) {
  const pad: any = { s: "10px 24px", m: "14px 34px", l: "17px 42px" }[sz];
  const fs: any = { s: 14, m: 16, l: 17 }[sz];
  const vars: any = {
    p: { background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "none", boxShadow: "0 6px 28px rgba(79,70,229,0.28)" },
    o: { background: "#fff", color: "#111827", border: "1.5px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: BF, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", borderRadius: 99, transition: "all 0.25s", padding: pad, fontSize: fs, opacity: disabled ? 0.6 : 1, ...vars[v], ...sx }}>{children}</button>;
}
function MovingPattern() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div className="orb orb-1" style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)", top: "-15%", left: "-10%", filter: "blur(40px)" }} />
      <div className="orb orb-2" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", top: "15%", right: "-12%", filter: "blur(30px)" }} />
      <div className="orb orb-3" style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)", bottom: "5%", left: "25%", filter: "blur(35px)" }} />
      <div className="orb orb-4" style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,181,253,0.3) 0%, transparent 60%)", top: "40%", left: "5%", filter: "blur(25px)" }} />
      <div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: "linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
    </div>
  );
}
function AnimNum({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const from = prev.current; const to = value; prev.current = value;
    if (from === to) return;
    const start = performance.now(); const dur = 400;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    function tick(now: number) { const t = Math.min((now - start) / dur, 1); setDisplay(from + (to - from) * ease(t)); if (t < 1) raf.current = requestAnimationFrame(tick); }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <>{fmt(display)}</>;
}
function StepBadge({ n }: { n: number }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(79,70,229,0.3)", flexShrink: 0 }}>
      <span style={{ fontFamily: HF, fontSize: 14, fontWeight: 800, color: "#fff" }}>{n}</span>
    </div>
  );
}

/* ══════════ CSS ══════════ */
const ANIM_CSS = `
  @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(60px,40px) scale(1.1)}50%{transform:translate(20px,80px) scale(.95)}75%{transform:translate(-40px,30px) scale(1.05)}}
  @keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-50px,60px) scale(1.08)}50%{transform:translate(-80px,20px) scale(.92)}75%{transform:translate(-20px,-40px) scale(1.03)}}
  @keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(70px,-30px) scale(1.12)}66%{transform:translate(-30px,-60px) scale(.9)}}
  @keyframes orbFloat4{0%,100%{transform:translate(0,0)}25%{transform:translate(40px,-50px)}50%{transform:translate(80px,20px)}75%{transform:translate(30px,60px)}}
  @keyframes gridDrift{0%{transform:translate(0,0)}100%{transform:translate(60px,60px)}}
  @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes popIn{0%{transform:scale(0.96);opacity:0.6}100%{transform:scale(1);opacity:1}}
  .orb-1{animation:orbFloat1 8s ease-in-out infinite}.orb-2{animation:orbFloat2 10s ease-in-out infinite}.orb-3{animation:orbFloat3 7s ease-in-out infinite}.orb-4{animation:orbFloat4 9s ease-in-out infinite}
  .grid-drift{animation:gridDrift 8s linear infinite}
  .pricing-card{transition:all .4s cubic-bezier(.4,0,.2,1)}.pricing-card:hover{transform:translateY(-8px);box-shadow:0 24px 56px rgba(79,70,229,.15)!important}
  .faq-item{transition:all .3s ease}.faq-item:hover{background:rgba(79,70,229,.03)!important}
  .sc3-pill{transition:all .2s cubic-bezier(.4,0,.2,1)}.sc3-pill:hover{transform:translateY(-1px)}
  .sc3-bar{transition:width .5s cubic-bezier(.34,1.56,.64,1)}
  .sc3-card{transition:box-shadow .3s ease}
  .sc3-pop{animation:popIn .3s ease-out}
  .sc3-sub{transition:all .15s ease}.sc3-sub:hover{transform:translateY(-1px)}
  .sc3-sel:focus{border-color:#4f46e5!important;box-shadow:0 0 0 3px rgba(79,70,229,.1)!important}
  input[type="range"].sc3-range::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);box-shadow:0 2px 8px rgba(79,70,229,.4),0 0 0 4px rgba(79,70,229,.08);cursor:grab;border:3px solid white;transition:transform .15s,box-shadow .15s}
  input[type="range"].sc3-range::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 2px 12px rgba(79,70,229,.5),0 0 0 6px rgba(79,70,229,.12)}
  input[type="range"].sc3-range::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.1)}
  input[type="range"].sc3-range::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);box-shadow:0 2px 8px rgba(79,70,229,.4),0 0 0 4px rgba(79,70,229,.08);cursor:grab;border:3px solid white}
`;

const ic = { chev: <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> };
const calcLbl: React.CSSProperties = { fontFamily: HF, fontSize: 14, fontWeight: 700, color: "#1E1B4B", marginBottom: 6, display: "block" };
const calcSel: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(99,102,241,0.15)", fontSize: 15, fontWeight: 600,
  fontFamily: HF, color: "#1e1b4b", outline: "none", cursor: "pointer", background: "white", boxSizing: "border-box" as const,
  appearance: "none" as const, WebkitAppearance: "none" as any, transition: "border-color 0.2s, box-shadow 0.2s",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

/* ══════════ SAVINGS CALCULATOR ══════════ */
function SavingsCalculator() {
  const [width, setWidth] = useState(22);
  const [price, setPrice] = useState(35);
  const [ci, setCi] = useState(0);
  const [si, setSi] = useState(0);
  const [sheets, setSheets] = useState(200);
  const [plan, setPlan] = useState(2);
  const comp = COMPETITORS[ci];

  const c = useMemo(() => {
    const p = CALC_PLANS[plan]; const sqIn = width * 100; const dtfPS = sqIn * p.ratePerSqIn; const dtfM = dtfPS * sheets;
    let cPS = 0, cM = 0, note = "";
    if (comp.type === "percentage") { cPS = price * comp.rate; cM = cPS * sheets; }
    else if (comp.subPlans) { const s = comp.subPlans[si];
      if (s.type === "percentage_capped") { cPS = Math.min(price * s.rate, s.cap); cM = cPS * sheets; }
      else if (s.type === "subscription") { cM = s.monthly; cPS = sheets > 0 ? cM / sheets : 0; if ((sqIn * sheets) / 144 > s.sqftLimit) note = `Exceeds ${s.sqftLimit.toLocaleString()} sqft limit — would need upgrade`; }
    }
    const sM = cM - dtfM;
    return { dtfPS, dtfM, cPS, cM, note, sM, pct: cM > 0 ? (sM / cM) * 100 : 0, mult: dtfM > 0 ? cM / dtfM : Infinity };
  }, [width, price, ci, si, sheets, plan, comp]);

  const mx = Math.max(c.cM, c.dtfM, 1); const sp = ((sheets - 10) / 990) * 100;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> Savings Calculator</Pill>
        <h2 style={{ fontFamily: HF, fontSize: 40, fontWeight: 800, color: "#111827", lineHeight: 1.15, letterSpacing: "-0.03em", margin: "18px 0 8px" }}>Already Using a Gang Sheet Builder?</h2>
        <p style={{ fontSize: 17, color: "#4B5563", margin: "0 0 6px", lineHeight: 1.6, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>Compare your current platform costs with DTF Layout and see exactly how much you could save every month.</p>
        <p style={{ fontFamily: HF, fontSize: 16, fontWeight: 700, color: "#312E81", margin: 0 }}>Fill in 3 quick details below — your savings update instantly.</p>
      </div>

      {/* STEP 1 — YOUR SETUP */}
      <div style={{ padding: "16px 24px", borderRadius: 18, marginBottom: 10, background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", border: "1.5px solid #C7D2FE", boxShadow: "0 4px 16px rgba(79,70,229,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <StepBadge n={1} />
          <span style={{ fontFamily: HF, fontSize: 18, fontWeight: 700, color: "#1E1B4B" }}>Your Setup</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
          <div>
            <label style={calcLbl}>Sheet Width</label>
            <select className="sc3-sel" value={width} onChange={e => setWidth(Number(e.target.value))} style={calcSel}>{CALC_WIDTHS.map(w => <option key={w} value={w}>{w}" wide</option>)}</select>
          </div>
          <div>
            <label style={calcLbl}>Selling Price / 100"<span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#6366f1", marginTop: 2, lineHeight: 1.3 }}>What you charge per 100 inches in length</span></label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 600, color: "#6366f1" }}>$</span>
              <input className="sc3-sel" type="number" value={price} onChange={e => setPrice(Math.max(0, Number(e.target.value)))} style={{ ...calcSel, paddingLeft: 28, cursor: "text" }} />
            </div>
          </div>
          <div>
            <label style={calcLbl}>Currently Using</label>
            <select className="sc3-sel" value={ci} onChange={e => { setCi(Number(e.target.value)); setSi(0); }} style={calcSel}>{COMPETITORS.map((cc, i) => <option key={i} value={i}>{cc.name}{cc.type === "percentage" ? ` (${cc.rate * 100}%)` : ""}</option>)}</select>
          </div>
        </div>
      </div>

      {/* Kixxl sub-plans */}
      {comp.subPlans && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#5B21B6", letterSpacing: "0.05em", marginRight: 4 }}>KIXXL PLAN:</span>
          {comp.subPlans.map((subP, i) => (
            <button key={i} className="sc3-sub" onClick={() => setSi(i)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1.5px solid", cursor: "pointer", borderColor: si === i ? "#4f46e5" : "rgba(0,0,0,0.06)", background: si === i ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "white", color: si === i ? "white" : "#4B5563", boxShadow: si === i ? "0 2px 8px rgba(79,70,229,0.25)" : "0 1px 2px rgba(0,0,0,0.03)" }}>
              {subP.name}{subP.type === "subscription" ? ` · $${subP.monthly}/mo` : ""}
            </button>
          ))}
        </div>
      )}

      {/* STEP 2 & 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {/* STEP 2 — Slider */}
        <div style={{ padding: "14px 20px 10px", borderRadius: 18, background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", border: "1.5px solid #DDD6FE", boxShadow: "0 4px 16px rgba(124,58,237,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <StepBadge n={2} />
            <div>
              <span style={{ fontFamily: HF, fontSize: 18, fontWeight: 700, color: "#3B0764" }}>Sheets / Month</span>
              <div style={{ fontSize: 13, color: "#7C3AED", fontWeight: 500, marginTop: 1, lineHeight: 1.3 }}>Each sheet is assumed 100" in length for this calculation</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: HF, fontSize: 28, fontWeight: 800, color: "#1e1b4b" }}>{sheets}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}>sheets</span>
          </div>
          <div style={{ position: "relative", height: 34, marginTop: 2 }}>
            <div style={{ position: "absolute", top: 14, left: 0, right: 0, height: 6, borderRadius: 3, background: "rgba(124,58,237,0.08)" }} />
            <div style={{ position: "absolute", top: 14, left: 0, width: `${sp}%`, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", transition: "width 0.08s" }} />
            <input type="range" className="sc3-range" min={10} max={1000} step={10} value={sheets} onChange={e => setSheets(Number(e.target.value))} style={{ position: "absolute", top: 3, left: 0, width: "100%", WebkitAppearance: "none", appearance: "none" as any, background: "transparent", cursor: "pointer", height: 24 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A78BFA" }}><span>10</span><span>1,000</span></div>
        </div>
        {/* STEP 3 — Plan */}
        <div style={{ padding: "14px 20px", borderRadius: 18, background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", border: "1.5px solid #A7F3D0", boxShadow: "0 4px 16px rgba(16,185,129,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <StepBadge n={3} />
            <span style={{ fontFamily: HF, fontSize: 18, fontWeight: 700, color: "#064E3B" }}>DTF Layout Plan</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {CALC_PLANS.map((p, i) => {
              const a = plan === i;
              return (
                <button key={i} className="sc3-pill" onClick={() => setPlan(i)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center" as const, border: a ? "2px solid #059669" : "1.5px solid rgba(0,0,0,0.06)", background: a ? "white" : "rgba(255,255,255,0.7)", boxShadow: a ? "0 2px 10px rgba(5,150,105,0.15)" : "none", position: "relative" as const }}>
                  {p.name === "Max" && <span style={{ position: "absolute", top: -7, right: -4, fontSize: 8, fontWeight: 800, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.06em" }}>BEST</span>}
                  <div style={{ fontFamily: HF, fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>{p.name}</div>
                  <div style={{ fontFamily: HF, fontSize: 15, fontWeight: 700, color: "#059669", marginTop: 2 }}>${p.price} <span style={{ fontSize: 11, fontWeight: 500, color: "#6B7280" }}>({fmtK(p.sqIn)} sq.in)</span></div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Warning */}
      {c.note && <div style={{ padding: "8px 14px", borderRadius: 10, marginBottom: 14, background: "linear-gradient(135deg, #fef3c7, #fef9c3)", border: "1px solid #fbbf24", fontSize: 13, color: "#92400e", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>{c.note}</div>}

      {/* COMPARISON CARDS */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Competitor */}
          <div className="sc3-card" style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(239,68,68,0.15)", background: "#fff", boxShadow: "0 2px 12px rgba(239,68,68,0.06)" }}>
            <div style={{ height: 4, background: "linear-gradient(90deg, #fca5a5, #ef4444)" }} />
            <div style={{ padding: "20px 22px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em" }}>CURRENTLY PAYING</div><div style={{ fontFamily: HF, fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>{comp.name}</div></div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: 4 }}>MONTHLY COST</div>
                <div style={{ fontFamily: HF, fontSize: 42, fontWeight: 800, color: "#ef4444", lineHeight: 1 }}><AnimNum value={c.cM} /></div>
                <div style={{ height: 10, borderRadius: 6, background: "rgba(239,68,68,0.06)", overflow: "hidden", marginTop: 10 }}><div className="sc3-bar" style={{ width: `${Math.max((c.cM / mx) * 100, 4)}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg, #fca5a5 0%, #f87171 50%, #ef4444 100%)" }} /></div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: 2 }}>PER SHEET</div>
                <div style={{ fontFamily: HF, fontSize: 24, fontWeight: 800, color: "#ef4444" }}><AnimNum value={c.cPS} /></div>
              </div>
            </div>
          </div>
          {/* DTF Layout */}
          <div className="sc3-card" style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(16,185,129,0.2)", background: "#fff", boxShadow: "0 2px 12px rgba(16,185,129,0.06)" }}>
            <div style={{ height: 4, background: "linear-gradient(90deg, #6ee7b7, #10b981)" }} />
            <div style={{ padding: "20px 22px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em" }}>WITH DTF LAYOUT</div><div style={{ fontFamily: HF, fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>{CALC_PLANS[plan].name} Plan</div></div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: 4 }}>MONTHLY COST</div>
                <div style={{ fontFamily: HF, fontSize: 42, fontWeight: 800, color: "#059669", lineHeight: 1 }}><AnimNum value={c.dtfM} /></div>
                <div style={{ height: 10, borderRadius: 6, background: "rgba(5,150,105,0.06)", overflow: "hidden", marginTop: 10 }}><div className="sc3-bar" style={{ width: `${Math.max((c.dtfM / mx) * 100, 4)}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg, #6ee7b7 0%, #34d399 50%, #059669 100%)" }} /></div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(5,150,105,0.04)", border: "1px solid rgba(5,150,105,0.08)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: 2 }}>PER SHEET</div>
                <div style={{ fontFamily: HF, fontSize: 24, fontWeight: 800, color: "#059669" }}><AnimNum value={c.dtfPS} /></div>
              </div>
            </div>
          </div>
        </div>
        {/* VS Badge */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg, #1E1B4B, #312E81)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(30,27,75,0.35), 0 0 0 4px white" }}>
            <span style={{ fontFamily: HF, fontSize: 14, fontWeight: 800, color: "#C7D2FE" }}>VS</span>
          </div>
        </div>
      </div>

      {/* SAVINGS BANNER */}
      <div style={{ marginTop: 16, borderRadius: 20, overflow: "hidden", background: "linear-gradient(140deg, #0f0d2e 0%, #1e1b4b 30%, #312e81 65%, #4338ca 100%)", position: "relative", boxShadow: "0 8px 32px rgba(30,27,75,0.3), 0 0 0 1px rgba(99,102,241,0.1)" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)", animation: "float 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", animation: "float 8s ease-in-out infinite 1s" }} />
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 24, position: "relative", zIndex: 1 }}>
          <div style={{ flex: "0 0 auto", textAlign: "center", minWidth: 200 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 14px", borderRadius: 99, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)", marginBottom: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399", letterSpacing: "0.05em" }}>YOU SAVE</span>
            </div>
            <div className="sc3-pop" key={Math.round(c.sM)} style={{ fontFamily: HF, fontSize: 52, fontWeight: 800, background: "linear-gradient(135deg, #34d399, #6ee7b7, #34d399)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s ease-in-out infinite", lineHeight: 1 }}><AnimNum value={c.sM} /></div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 4 }}>every month</div>
          </div>
          <div style={{ width: 1, height: 80, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ textAlign: "center", padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}><div style={{ fontFamily: HF, fontSize: 26, fontWeight: 800, color: "white" }}>{c.mult === Infinity ? "∞" : `${c.mult.toFixed(1)}x`}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>cheaper</div></div>
            <div style={{ textAlign: "center", padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}><div style={{ fontFamily: HF, fontSize: 26, fontWeight: 800, color: "white" }}>{c.pct.toFixed(0)}%</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>less cost</div></div>
            <div style={{ textAlign: "center", padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}><div style={{ fontFamily: HF, fontSize: 26, fontWeight: 800, color: "white" }}><AnimNum value={c.sM * 12} /></div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>saved / year</div></div>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", margin: "14px 0 0", fontWeight: 450 }}>Pricing based on publicly available information as of March 2026. DTF Layout uses per-use credits — one-time pack purchase required.</p>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export default function Pricing() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { refreshCredits, freeTrialClaimed } = useCredits();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [region, setRegion] = useState<"india" | "global">(() => {
    try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "india"; } catch {} return "global";
  });

  useEffect(() => {
    if (!document.querySelector("style[data-dtf-pricing]")) { const tag = document.createElement("style"); tag.setAttribute("data-dtf-pricing", "1"); tag.textContent = ANIM_CSS; document.head.appendChild(tag); }
    return () => { const tag = document.querySelector("style[data-dtf-pricing]"); if (tag) tag.remove(); };
  }, []);

  const handleGetStarted = async (plan: (typeof PLANS)[number]) => {
    if (!user) { toast.info("Please sign up to get started"); navigate("/signup"); return; }
    if (processingPlanId) return;
    setProcessingPlanId(plan.id);
    try {
      const userInfo: UserInfo = { name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User", email: user?.email || "", userId: user?.id };
      if (plan.id === "free_trial") {
        if (freeTrialClaimed) { toast.error("You have already claimed your free trial"); setProcessingPlanId(null); return; }
        const result = await claimFreeTrial(userInfo, session?.access_token);
        if (result.success) { toast.success(`Free trial activated! Credits added to your account.`); await refreshCredits(); navigate("/app"); }
        else if (result.already_claimed) { toast.error("You have already claimed your free trial"); }
        else { toast.error(result.error || "Failed to activate free trial"); }
        return;
      }
      const result = await createCheckoutSession(plan.id, region, userInfo);
      if (result.success && result.checkout_url) { window.location.href = result.checkout_url; return; }
      else { toast.error(result.error || "Failed to initiate payment. Please try again."); }
    } catch (error: any) { console.error("[Payment] Error:", error); toast.error(error?.message || "Payment failed. Please try again."); }
    finally { setProcessingPlanId(null); }
  };

  return (
    <div style={{ fontFamily: BF, color: "#111827", background: "#FAFAFB" }}>

      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #0A0820 0%, #0A0820 8%, #0F0D2E 18%, #1E1B4B 32%, #312E81 46%, #4F46E5 60%, #6366F1 70%, #818CF8 78%, #C7D2FE 86%, #FAFAFB 96%)", padding: "0 40px 0", minHeight: "90vh" }}>
        <Dots o={0.04} />
        <MovingPattern />
        <div style={{ padding: "160px 0 80px" }}>
          <Sq top={20} right={140} size={32} rotate={18} /><Sq top={100} right={80} size={22} rotate={-12} /><Sq top={30} left={100} size={28} rotate={22} /><Sq top={150} left={60} size={20} rotate={-8} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> Simple, transparent pricing</Pill>
            <h1 style={{ fontFamily: HF, fontSize: 64, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>No Fixed Costs.<br />No Commissions.<br />Just Recharge & Go.</h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}>Buy credits once, use them forever. No subscriptions, no monthly fees, no per-order cuts. Pay only for what you use.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              <Btn sz="l" onClick={() => navigate("/signup")} style={{ background: "#fff", color: P, boxShadow: "0 6px 28px rgba(0,0,0,0.15)" }}>Get Started Now →</Btn>
              <Btn v="o" sz="l" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.3)", boxShadow: "none" }}>View Plans ↓</Btn>
            </div>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginTop: 20, fontWeight: 500 }}>
              <span style={{ background: "rgba(255,255,255,0.15)", padding: "6px 20px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />20,000 sq.inch free · No credit card required</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ PRICING CARDS ═══ */}
      <section style={{ padding: "10px 40px 0", position: "relative" }}>
        <Sq top={40} right={100} size={30} rotate={20} /><Sq bottom={60} left={80} size={24} rotate={-15} />
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", borderRadius: 99, background: "#F3F4F6", padding: 4, border: "1px solid #E5E7EB" }}>
              {(["india", "global"] as const).map(r => <button key={r} onClick={() => setRegion(r)} style={{ padding: "8px 24px", borderRadius: 99, fontSize: 15, fontWeight: 600, fontFamily: BF, cursor: "pointer", border: "none", transition: "all 0.2s", background: region === r ? "linear-gradient(135deg,#4F46E5,#7C3AED)" : "transparent", color: region === r ? "#fff" : "#4B5563", boxShadow: region === r ? "0 2px 8px rgba(79,70,229,0.3)" : "none" }}>{r === "india" ? "🇮🇳 India (INR)" : "🌍 Global (USD)"}</button>)}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, alignItems: "start" }}>
            {PLANS.map((plan) => {
              const isProcessing = processingPlanId === plan.id;
              const isTrialClaimed = plan.id === "free_trial" && user && freeTrialClaimed;
              const isDisabled = !!processingPlanId || !!isTrialClaimed;
              const priceDisplay = typeof plan.price === "object" ? plan.price[region] : plan.price;
              const rateDisplay = typeof plan.rate === "object" ? plan.rate[region] : plan.rate;
              const creditsDisplay = typeof plan.credits === "object" ? plan.credits[region] : plan.credits;

              return (
                <div key={plan.id} className="pricing-card" style={{ background: "#fff", borderRadius: 24, border: plan.popular ? "2px solid #4F46E5" : "1px solid #E5E7EB", overflow: "visible", boxShadow: plan.popular ? "0 20px 56px rgba(79,70,229,0.12)" : "0 2px 8px rgba(0,0,0,0.02)", position: "relative", display: "flex", flexDirection: "column", marginTop: plan.popular ? 16 : 0 }}>
                  {plan.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", zIndex: 2, padding: "5px 18px", borderRadius: 99, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(79,70,229,0.3)", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>Best Value</div>}
                  <div style={{ padding: "28px 24px 20px", background: plan.tint, borderRadius: plan.popular ? "22px 22px 0 0" : "24px 24px 0 0" }}>
                    <div style={{ fontFamily: HF, fontWeight: 700, fontSize: 24, color: "#111827", marginBottom: 12 }}>{plan.name}</div>
                    <div style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 6 }}>{priceDisplay}</div>
                    <div style={{ fontSize: 14, color: "#4B5563", fontWeight: 500 }}>{plan.description}</div>
                  </div>
                  <div style={{ padding: "16px 24px", borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <div><span style={{ fontFamily: HF, fontSize: 30, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{creditsDisplay}</span><span style={{ fontSize: 14, color: "#6B7280", marginLeft: 6 }}>sq.in</span></div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P, background: "#EEF2FF", padding: "4px 12px", borderRadius: 99 }}>{rateDisplay}</span>
                    </div>
                  </div>
                  <div style={{ padding: "20px 24px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, marginBottom: 24 }}>
                      {plan.features.map((f, fi) => (
                        <div key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                            <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                          <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Btn v={plan.popular ? "p" : "o"} sz="m" disabled={isDisabled} onClick={() => handleGetStarted(plan)}
                      style={{ width: "100%", ...(plan.popular ? {} : { border: `1.5px solid ${P}`, color: P, background: "transparent" }) }}>
                      {isProcessing ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Processing...</span>
                      : isTrialClaimed ? "Already Claimed"
                      : <>{plan.cta} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 32, display: "flex", justifyContent: "center", gap: 32 }}>
            {["Credits never expire", "All tools included", "No monthly fees"].map((t, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, color: "#4B5563", fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>{t}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 80, paddingTop: 80, borderTop: "1px solid #E5E7EB" }}><SavingsCalculator /></div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section style={{ padding: "120px 40px", background: "#fff", position: "relative" }}>
        <Dots o={0.06} />
        <div style={{ maxWidth: 940, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Pill>Feature comparison</Pill>
            <h2 style={{ fontFamily: HF, fontSize: 46, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "18px 0 14px" }}>How we stack up</h2>
            <p style={{ fontSize: 17, color: "#4B5563", lineHeight: 1.7 }}>No subscriptions. No per-order cuts. No platform lock-in.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "linear-gradient(135deg, #1E1B4B, #312E81)", borderRadius: 20, padding: "32px 32px 28px", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div><span style={{ fontFamily: HF, fontWeight: 700, fontSize: 22 }}>DTF Layout</span></div>
              {[["Pricing model","Credits (one-time buy)"],["Monthly fees","None, ever"],["Per-order cut","None"],["Standalone store","Quick Store included"],["Platform support","Any website"],["White-label builder","Full customization"],["Background remover","Included"],["Image enhancer","Included"],["Text editor","Included"],["Multi-sheet export","Up to 5 sheets"]].map(([f,v],i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                  <span style={{ fontSize: 15, color: "rgba(165,180,252,0.85)", fontWeight: 500 }}>{f}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#C7D2FE", display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#34D399" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>{v}</span>
                </div>))}
            </div>
            <div style={{ background: "#FAFAFA", borderRadius: 20, border: "1px solid #E5E7EB", padding: "32px 32px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /></svg></div><span style={{ fontFamily: HF, fontWeight: 700, fontSize: 22, color: "#4B5563" }}>Others</span></div>
              {[["Pricing model","5% per order or $149–999/mo",true],["Monthly fees","$0–999/month",true],["Per-order cut","Up to $12/order",true],["Standalone store","Not available",true],["Platform support","Shopify / WooCommerce only",true],["White-label builder","Logo only or limited",true],["Background remover","Paid or unavailable",true],["Image enhancer","Not available",true],["Text editor","Limited or unavailable",true],["Multi-sheet export","Available",false]].map(([f,v,bad],i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderBottom: i < 9 ? "1px solid #F3F4F6" : "none" }}>
                  <span style={{ fontSize: 15, color: "#4B5563", fontWeight: 500 }}>{f as string}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: bad ? "#6B7280" : "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                    {bad ? <svg width="14" height="14" viewBox="0 0 12 12"><line x1="3" y1="3" x2="9" y2="9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" /><line x1="9" y1="3" x2="3" y2="9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#6B7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    {v as string}
                  </span>
                </div>))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{ padding: "120px 40px", position: "relative" }}>
        <Dots o={0.06} /><Sq top={60} right={120} size={30} rotate={15} /><Sq bottom={80} left={100} size={24} rotate={-20} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> Got questions?</Pill>
            <h2 style={{ fontFamily: HF, fontSize: 46, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "18px 0 14px" }}>Frequently Asked Questions</h2>
            <p style={{ fontSize: 17, color: "#4B5563", lineHeight: 1.7 }}>Everything you need to know about our pricing</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="faq-item" onClick={() => setOpenFaq(isOpen ? null : i)} style={{ background: "#fff", borderRadius: 16, border: isOpen ? "1px solid #C7D2FE" : "1px solid #E5E7EB", padding: "22px 26px", cursor: "pointer", boxShadow: isOpen ? "0 4px 16px rgba(79,70,229,0.08)" : "0 1px 3px rgba(0,0,0,0.02)", transition: "all 0.3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 18, fontWeight: 600, color: "#111827", fontFamily: HF }}>{faq.q}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: isOpen ? "#EEF2FF" : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 16, transition: "all 0.3s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke={isOpen ? P : "#9CA3AF"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                  {isOpen && <p style={{ fontSize: 16, color: "#4B5563", lineHeight: 1.7, margin: "16px 0 0", paddingRight: 44 }}>{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "120px 40px", position: "relative", overflow: "hidden" }}>
        <Dots o={0.1} /><Sq top={60} right={160} size={34} rotate={15} /><Sq bottom={60} left={140} size={28} rotate={-20} />
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: HF, fontSize: 46, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Ready to speed up your workflow?</h2>
          <p style={{ fontSize: 17, color: "#4B5563", lineHeight: 1.7, margin: "0 0 40px" }}>Start with 20,000 sq.inch free. No credit card required. No monthly fees, ever.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}><Btn sz="l" onClick={() => navigate("/signup")}>Get Started Now →</Btn><Btn v="o" sz="l" onClick={() => navigate("/contact")}>Contact Us →</Btn></div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", padding: "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} />
        <div style={{ paddingTop: 64 }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}><div style={{ width: 28, height: 28, borderRadius: 7, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div><span style={{ fontFamily: HF, fontWeight: 700, fontSize: 15, color: "#fff" }}>DTF Layout</span></div>
                <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide. Auto-arrange, optimize, and print — all from one platform.</p>
              </div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{ l: "Gang Sheet Builder", to: "/product/gang-sheet-builder" }, { l: "Website Integration", to: "/product/website-integration" }, { l: "Quick Store", to: "/product/quick-store" }, { l: "Pricing", to: "/pricing" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{ l: "FAQ", to: "/faq" }, { l: "Contact", to: "/contact" }, { l: "Blog", to: "/" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{ l: "Privacy Policy", to: "/privacy-policy" }, { l: "Terms & Conditions", to: "/terms-conditions" }, { l: "Refund Policy", to: "/refund-policy" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span><span style={{ fontSize: 13, cursor: "pointer" }}>dtflayout@gmail.com</span></div>
          </div>
        </div>
      </footer>

      {/* PAYMENT OVERLAY */}
      {processingPlanId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 320 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            <div style={{ textAlign: "center" }}><p style={{ fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: HF, margin: "0 0 4px" }}>Processing payment...</p><p style={{ fontSize: 15, color: "#4B5563", margin: 0 }}>Please wait, do not close this page</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
