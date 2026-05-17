import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import { trackCTA, trackCalculator } from "@/lib/ga";

/* ══════════ RESPONSIVE HOOK ══════════ */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ══════════ DESIGN TOKENS ══════════ */
const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

/* ══════════ SHARED COMPONENTS ══════════ */
function Sq({ top, left, right, bottom, size = 28, rotate = 12 }: any) {
  const p: any = {};
  if (top != null) p.top = top; if (left != null) p.left = left;
  if (right != null) p.right = right; if (bottom != null) p.bottom = bottom;
  return <div style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.25, border: "1.5px dashed rgba(79,70,229,0.1)", transform: `rotate(${rotate}deg)`, pointerEvents: "none", ...p }} />;
}
function Dots({ o = 0.2 }: { o?: number }) {
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />;
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 14, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>{children}</span>;
}
function Btn({ children, v = "p", sz = "m", style: sx, onClick }: any) {
  const pad: any = { s: "10px 24px", m: "14px 34px", l: "17px 42px" }[sz];
  const fs: any = { s: 14, m: 16, l: 17 }[sz];
  const vars: any = {
    p: { background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "none", boxShadow: "0 6px 28px rgba(79,70,229,0.28)" },
    o: { background: "#fff", color: "#111827", border: "1.5px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  };
  return <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: BF, fontWeight: 600, cursor: "pointer", borderRadius: 99, transition: "all 0.25s", padding: pad, fontSize: fs, ...vars[v], ...sx }}>{children}</button>;
}
function MovingPattern() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div className="orb orb-1" style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)", top: "-15%", left: "-10%", filter: "blur(40px)" }} />
      <div className="orb orb-2" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", top: "15%", right: "-12%", filter: "blur(30px)" }} />
      <div className="orb orb-3" style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)", bottom: "5%", left: "25%", filter: "blur(35px)" }} />
      <div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: "linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
    </div>
  );
}
function StepBadge({ n }: { n: number }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(79,70,229,0.3)", flexShrink: 0 }}>
      <span style={{ fontFamily: HF, fontSize: 14, fontWeight: 800, color: "#fff" }}>{n}</span>
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

/* ══════════ CSS ══════════ */
const ANIM_CSS = `
@keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(60px,40px) scale(1.1)}50%{transform:translate(20px,80px) scale(.95)}75%{transform:translate(-40px,30px) scale(1.05)}}
@keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-50px,60px) scale(1.08)}50%{transform:translate(-80px,20px) scale(.92)}75%{transform:translate(-20px,-40px) scale(1.03)}}
@keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(70px,-30px) scale(1.12)}66%{transform:translate(-30px,-60px) scale(.9)}}
@keyframes gridDrift{0%{transform:translate(0,0)}100%{transform:translate(60px,60px)}}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes popIn{0%{transform:scale(0.96);opacity:0.6}100%{transform:scale(1);opacity:1}}
.orb-1{animation:orbFloat1 8s ease-in-out infinite}.orb-2{animation:orbFloat2 10s ease-in-out infinite}.orb-3{animation:orbFloat3 7s ease-in-out infinite}.grid-drift{animation:gridDrift 8s linear infinite}
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

/* ══════════ CALCULATOR DATA ══════════ */
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

const calcLbl: React.CSSProperties = { fontFamily: HF, fontSize: 14, fontWeight: 700, color: "#1E1B4B", marginBottom: 6, display: "block" };
const calcSel: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(99,102,241,0.15)", fontSize: 15, fontWeight: 600,
  fontFamily: HF, color: "#1e1b4b", outline: "none", cursor: "pointer", background: "white", boxSizing: "border-box" as const,
  appearance: "none" as const, WebkitAppearance: "none" as any, transition: "border-color 0.2s, box-shadow 0.2s",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

/* ══════════ MAIN PAGE ══════════ */
export default function SavingsCalculatorPage() {
  const navigate = useNavigate();
  const mob = useIsMobile();
  

  // Calculator state
  const [width, setWidth] = useState(22);
  const [price, setPrice] = useState(35);
  const [ci, setCi] = useState(0);
  const [si, setSi] = useState(0);
  const [sheets, setSheets] = useState(200);
  const [plan, setPlan] = useState(2);
  const comp = COMPETITORS[ci];
  const interactionCount = useRef(0);

  // Section refs for tracking


  // Track calculator interactions (debounced for sliders)
  const sliderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackCalcChange = (action: string, values: Record<string, any>) => {
    interactionCount.current++;
    // For sliders, debounce to avoid spamming
    if (action === "sheets_change") {
      if (sliderTimeout.current) clearTimeout(sliderTimeout.current);
      sliderTimeout.current = setTimeout(() => {
        trackCalculator(action, { ...values, interaction_number: interactionCount.current });
      }, 500);
    } else {
      trackCalculator(action, { ...values, interaction_number: interactionCount.current });
    }
  };

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

  const mx = Math.max(c.cM, c.dtfM, 1);
  const sp = ((sheets - 10) / 990) * 100;

  // Inject styles
  useEffect(() => {
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
    l.rel = "stylesheet";
    document.head.appendChild(l);
    if (!document.querySelector("style[data-dtf-sc]")) {
      const tag = document.createElement("style");
      tag.setAttribute("data-dtf-sc", "1");
      tag.textContent = ANIM_CSS;
      document.head.appendChild(tag);
    }
    return () => { document.head.removeChild(l); const tag = document.querySelector("style[data-dtf-sc]"); if (tag) tag.remove(); };
  }, []);

  const handleCTA = (label: string, dest: string) => {
    // Track CTA with calculator context
    trackCTA(label, dest);
    trackCalculator("cta_with_context", {
      cta: label,
      competitor: comp.name,
      sheets_per_month: sheets,
      dtf_plan: CALC_PLANS[plan].name,
      monthly_savings: Math.round(c.sM),
      yearly_savings: Math.round(c.sM * 12),
    });
    navigate(dest);
  };

  return (
    <div style={{ fontFamily: BF, color: "#111827", background: "#FAFAFB", overflowX: "hidden" }}>

      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #0A0820 0%, #0A0820 8%, #0F0D2E 18%, #1E1B4B 32%, #312E81 46%, #4F46E5 60%, #6366F1 70%, #818CF8 78%, #C7D2FE 86%, #FAFAFB 96%)", padding: mob ? "0 18px 0" : "0 40px 0", minHeight: mob ? "40vh" : "50vh" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ padding: mob ? "120px 0 50px" : "160px 0 80px" }}>
          <Sq top={20} right={140} size={32} rotate={18} /><Sq top={100} right={80} size={22} rotate={-12} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              Savings Calculator
            </Pill>
            <h1 style={{ fontFamily: HF, fontSize: mob ? 48 : 64, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: mob ? "20px 0 16px" : "28px 0 20px" }}>
              See How Much You'll Save<br />Switching to DTF Layout
            </h1>
            <p style={{ fontSize: mob ? 15 : 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 20px" }}>
              Compare your current platform costs with DTF Layout. Fill in 3 details below — your savings update instantly.
            </p>
            <p style={{ fontFamily: HF, fontSize: mob ? 14 : 16, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
              Most printers save $200–$2,000+ per month.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CALCULATOR ═══ */}
      <section style={{ padding: mob ? "0 14px 50px" : "0 40px 80px", position: "relative" }}>
        <div style={{ maxWidth: 1000, margin: "-40px auto 0" }}>

          {/* STEP 1 — YOUR SETUP */}
          <div style={{ padding: mob ? "14px 16px" : "16px 24px", borderRadius: 18, marginBottom: 10, background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", border: "1.5px solid #C7D2FE", boxShadow: "0 4px 16px rgba(79,70,229,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <StepBadge n={1} />
              <span style={{ fontFamily: HF, fontSize: mob ? 16 : 18, fontWeight: 700, color: "#1E1B4B" }}>Your Setup</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
              <div>
                <label style={calcLbl}>Sheet Width</label>
                <select className="sc3-sel" value={width} onChange={e => { setWidth(Number(e.target.value)); trackCalcChange("width_change", { width: e.target.value }); }} style={calcSel}>
                  {CALC_WIDTHS.map(w => <option key={w} value={w}>{w} inch wide</option>)}
                </select>
              </div>
              <div>
                <label style={calcLbl}>Selling Price / 100 inch<span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#6366f1", marginTop: 2, lineHeight: 1.3 }}>What you charge per 100 inches in length</span></label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 600, color: "#6366f1" }}>$</span>
                  <input className="sc3-sel" type="number" value={price} onChange={e => { setPrice(Math.max(0, Number(e.target.value))); trackCalcChange("price_change", { price: e.target.value }); }} style={{ ...calcSel, paddingLeft: 28, cursor: "text" }} />
                </div>
              </div>
              <div>
                <label style={calcLbl}>Currently Using</label>
                <select className="sc3-sel" value={ci} onChange={e => { const v = Number(e.target.value); setCi(v); setSi(0); trackCalcChange("competitor_change", { competitor: COMPETITORS[v].name }); }} style={calcSel}>
                  {COMPETITORS.map((cc, i) => <option key={i} value={i}>{cc.name}{cc.type === "percentage" ? ` (${cc.rate * 100}%)` : ""}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Kixxl sub-plans */}
          {comp.subPlans && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center", padding: mob ? "10px 12px" : "10px 14px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#5B21B6", letterSpacing: "0.05em", marginRight: 4, ...(mob ? { width: "100%", marginBottom: 4 } : {}) }}>KIXXL PLAN:</span>
              {comp.subPlans.map((subP, i) => (
                <button key={i} className="sc3-sub" onClick={() => { setSi(i); trackCalcChange("kixxl_plan_change", { kixxl_plan: subP.name }); }} style={{ padding: mob ? "5px 8px" : "5px 12px", borderRadius: 8, fontSize: mob ? 11 : 12, fontWeight: 600, border: "1.5px solid", cursor: "pointer", borderColor: si === i ? "#4f46e5" : "rgba(0,0,0,0.06)", background: si === i ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "white", color: si === i ? "white" : "#4B5563", boxShadow: si === i ? "0 2px 8px rgba(79,70,229,0.25)" : "0 1px 2px rgba(0,0,0,0.03)" }}>
                  {subP.name}{subP.type === "subscription" ? ` · $${subP.monthly}/mo` : ""}
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 & 3 */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {/* STEP 2 — Slider */}
            <div style={{ padding: "14px 20px 10px", borderRadius: 18, background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", border: "1.5px solid #DDD6FE", boxShadow: "0 4px 16px rgba(124,58,237,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <StepBadge n={2} />
                <div>
                  <span style={{ fontFamily: HF, fontSize: 18, fontWeight: 700, color: "#3B0764" }}>Sheets / Month</span>
                  <div style={{ fontSize: 13, color: "#7C3AED", fontWeight: 500, marginTop: 1, lineHeight: 1.3 }}>Each sheet is assumed 100 inches in length</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: HF, fontSize: 28, fontWeight: 800, color: "#1e1b4b" }}>{sheets}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}>sheets</span>
              </div>
              <div style={{ position: "relative", height: 34, marginTop: 2 }}>
                <div style={{ position: "absolute", top: 14, left: 0, right: 0, height: 6, borderRadius: 3, background: "rgba(124,58,237,0.08)" }} />
                <div style={{ position: "absolute", top: 14, left: 0, width: `${sp}%`, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", transition: "width 0.08s" }} />
                <input type="range" className="sc3-range" min={10} max={1000} step={10} value={sheets} onChange={e => { setSheets(Number(e.target.value)); trackCalcChange("sheets_change", { sheets: e.target.value }); }} style={{ position: "absolute", top: 3, left: 0, width: "100%", WebkitAppearance: "none", appearance: "none" as any, background: "transparent", cursor: "pointer", height: 24 }} />
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
                    <button key={i} className="sc3-pill" onClick={() => { setPlan(i); trackCalcChange("plan_change", { plan: p.name, price: p.price }); }} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center" as const, border: a ? "2px solid #059669" : "1.5px solid rgba(0,0,0,0.06)", background: a ? "white" : "rgba(255,255,255,0.7)", boxShadow: a ? "0 2px 10px rgba(5,150,105,0.15)" : "none", position: "relative" as const }}>
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
          {c.note && <div style={{ padding: "8px 14px", borderRadius: 10, marginBottom: 14, background: "linear-gradient(135deg, #fef3c7, #fef9c3)", border: "1px solid #fbbf24", fontSize: 13, color: "#92400e", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>{c.note}</div>}

          {/* COMPARISON CARDS */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: mob ? 0 : undefined }}>
            {!mob && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Competitor - Desktop */}
                <div className="sc3-card" style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(239,68,68,0.15)", background: "#fff", boxShadow: "0 2px 12px rgba(239,68,68,0.06)" }}>
                  <div style={{ height: 4, background: "linear-gradient(90deg, #fca5a5, #ef4444)" }} />
                  <div style={{ padding: "20px 22px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></div>
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
                {/* DTF Layout - Desktop */}
                <div className="sc3-card" style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(16,185,129,0.2)", background: "#fff", boxShadow: "0 2px 12px rgba(16,185,129,0.06)" }}>
                  <div style={{ height: 4, background: "linear-gradient(90deg, #6ee7b7, #10b981)" }} />
                  <div style={{ padding: "20px 22px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg></div>
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
            )}
            {!mob && (
              /* VS Badge - Desktop (absolute overlay) */
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg, #1E1B4B, #312E81)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(30,27,75,0.35), 0 0 0 4px white" }}>
                  <span style={{ fontFamily: HF, fontSize: 14, fontWeight: 800, color: "#C7D2FE" }}>VS</span>
                </div>
              </div>
            )}
            {mob && (
              <>
                {/* Competitor - Mobile */}
                <div className="sc3-card" style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(239,68,68,0.15)", background: "#fff", boxShadow: "0 2px 12px rgba(239,68,68,0.06)" }}>
                  <div style={{ height: 4, background: "linear-gradient(90deg, #fca5a5, #ef4444)" }} />
                  <div style={{ padding: "20px 22px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></div>
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
                {/* VS Badge - Mobile (between cards) */}
                <div style={{ display: "flex", justifyContent: "center", margin: "-12px 0", zIndex: 10, position: "relative" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg, #1E1B4B, #312E81)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(30,27,75,0.35), 0 0 0 4px white" }}>
                    <span style={{ fontFamily: HF, fontSize: 14, fontWeight: 800, color: "#C7D2FE" }}>VS</span>
                  </div>
                </div>
                {/* DTF Layout - Mobile */}
                <div className="sc3-card" style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(16,185,129,0.2)", background: "#fff", boxShadow: "0 2px 12px rgba(16,185,129,0.06)" }}>
                  <div style={{ height: 4, background: "linear-gradient(90deg, #6ee7b7, #10b981)" }} />
                  <div style={{ padding: "20px 22px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg></div>
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
              </>
            )}
          </div>

          {/* SAVINGS BANNER */}
          <div style={{ marginTop: 16, borderRadius: 20, overflow: "hidden", background: "linear-gradient(140deg, #0f0d2e 0%, #1e1b4b 30%, #312e81 65%, #4338ca 100%)", position: "relative", boxShadow: "0 8px 32px rgba(30,27,75,0.3), 0 0 0 1px rgba(99,102,241,0.1)" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)", animation: "float 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", animation: "float 8s ease-in-out infinite 1s" }} />
            <div style={{ padding: mob ? "20px 16px" : "24px 28px", display: "flex", flexDirection: mob ? "column" : "row", alignItems: "center", gap: mob ? 16 : 24, position: "relative", zIndex: 1 }}>
              <div style={{ flex: "0 0 auto", textAlign: "center", minWidth: mob ? undefined : 200 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 14px", borderRadius: 99, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)", marginBottom: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399", letterSpacing: "0.05em" }}>YOU SAVE</span>
                </div>
                <div className="sc3-pop" key={Math.round(c.sM)} style={{ fontFamily: HF, fontSize: mob ? 40 : 52, fontWeight: 800, background: "linear-gradient(135deg, #34d399, #6ee7b7, #34d399)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s ease-in-out infinite", lineHeight: 1 }}><AnimNum value={c.sM} /></div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 4 }}>every month</div>
              </div>
              <div style={mob ? { width: "80%", height: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0 } : { width: 1, height: 80, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: mob ? 8 : 12, width: mob ? "100%" : undefined }}>
                <div style={{ textAlign: "center", padding: mob ? "10px 0" : "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}><div style={{ fontFamily: HF, fontSize: mob ? 20 : 26, fontWeight: 800, color: "white" }}>{c.mult === Infinity ? "∞" : `${c.mult.toFixed(1)}x`}</div><div style={{ fontSize: mob ? 10 : 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>cheaper</div></div>
                <div style={{ textAlign: "center", padding: mob ? "10px 0" : "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}><div style={{ fontFamily: HF, fontSize: mob ? 20 : 26, fontWeight: 800, color: "white" }}>{c.pct.toFixed(0)}%</div><div style={{ fontSize: mob ? 10 : 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>less cost</div></div>
                <div style={{ textAlign: "center", padding: mob ? "10px 0" : "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}><div style={{ fontFamily: HF, fontSize: mob ? 20 : 26, fontWeight: 800, color: "white" }}><AnimNum value={c.sM * 12} /></div><div style={{ fontSize: mob ? 10 : 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>saved / year</div></div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", margin: "14px 0 0", fontWeight: 450 }}>Pricing based on publicly available information as of March 2026. DTF Layout uses per-use credits — one-time pack purchase required.</p>
        </div>
      </section>

      {/* ═══ INLINE CTA ═══ */}
      <section style={{ padding: mob ? "40px 18px 80px" : "60px 40px 120px", position: "relative", overflow: "hidden" }}>
        <Dots o={0.1} /><Sq top={40} right={160} size={34} rotate={15} /><Sq bottom={40} left={140} size={28} rotate={-20} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: HF, fontSize: mob ? 28 : 40, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 14px" }}>Ready to Start Saving?</h2>
          <p style={{ fontSize: mob ? 14 : 16, color: "#6B7280", lineHeight: 1.7, margin: "0 0 32px" }}>
            20,000 sq.inch free trial. No credit card. No monthly fees. Credits never expire.
          </p>
          <div style={{ display: "flex", flexDirection: mob ? "column" : "row", justifyContent: "center", gap: mob ? 10 : 14, marginBottom: 20 }}>
            <Btn sz={mob ? "m" : "l"} onClick={() => handleCTA("bottom_start_free", "/signup")}>Start Free →</Btn>
            <Btn v="o" sz={mob ? "m" : "l"} onClick={() => handleCTA("bottom_see_demo", "/demo/website-integration")}>Try Demo →</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: mob ? "column" : "row", justifyContent: "center", gap: mob ? 10 : 28, alignItems: mob ? "center" : undefined }}>
            {["No credit card", "All tools included", "No per-order cuts"].map((t, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: mob ? 13 : 14, color: "#4B5563", fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", padding: mob ? "0 18px 24px" : "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} />
        <div style={{ paddingTop: mob ? 40 : 64 }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: mob ? 28 : 48, marginBottom: mob ? 28 : 48 }}>
              <div style={mob ? { gridColumn: "1 / -1" } : undefined}>
                <div style={{ marginBottom: 16 }}><img src="/DTF-Layout-WHITE-logo-text.png" alt="DTF Layout" style={{ height: 38, width: "auto", display: "block" }} /></div>
                <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide. Auto-arrange, optimize, and print — all from one platform.</p>
              </div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{ l: "Gang Sheet Builder", to: "/product/gang-sheet-builder" }, { l: "Website Integration", to: "/product/website-integration" }, { l: "Quick Store", to: "/product/quick-store" }, { l: "Order Automation", to: "/product/order-automation" }, { l: "Pricing", to: "/pricing" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{ l: "FAQ", to: "/faq" }, { l: "Contact", to: "/contact" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{ l: "Privacy Policy", to: "/privacy-policy" }, { l: "Terms & Conditions", to: "/terms-conditions" }, { l: "Refund Policy", to: "/refund-policy" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", flexDirection: mob ? "column" : "row", justifyContent: "space-between", alignItems: mob ? "flex-start" : "center", gap: mob ? 8 : 0 }}><span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span><span style={{ fontSize: 13, cursor: "pointer" }}>dtflayout@gmail.com</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
