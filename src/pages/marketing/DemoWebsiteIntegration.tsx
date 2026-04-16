import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import { trackCTA } from "@/lib/ga";

const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

function Sq({ top, left, right, bottom, size = 28, rotate = 12 }: any) { const p: any = {}; if (top != null) p.top = top; if (left != null) p.left = left; if (right != null) p.right = right; if (bottom != null) p.bottom = bottom; return <div style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.25, border: "1.5px dashed rgba(79,70,229,0.1)", transform: `rotate(${rotate}deg)`, pointerEvents: "none", ...p }} />; }
function Dots({ o = 0.2 }: { o?: number }) { return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />; }
function Pill({ children }: { children: React.ReactNode }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>{children}</span>; }
function Btn({ children, v = "p", sz = "m", style: sx, onClick }: any) { const pad: any = { s: "10px 24px", m: "14px 34px", l: "17px 42px" }[sz]; const fs: any = { s: 14, m: 15, l: 16 }[sz]; const vars: any = { p: { background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "none", boxShadow: "0 6px 28px rgba(79,70,229,0.28)" }, o: { background: "#fff", color: "#111827", border: "1.5px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" } }; return <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: BF, fontWeight: 600, cursor: "pointer", borderRadius: 99, transition: "all 0.25s", padding: pad, fontSize: fs, ...vars[v], ...sx }}>{children}</button>; }
function MovingPattern() { return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}><div className="orb orb-1" style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)", top: "-15%", left: "-10%", filter: "blur(40px)" }} /><div className="orb orb-2" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", top: "15%", right: "-12%", filter: "blur(30px)" }} /><div className="orb orb-3" style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)", bottom: "5%", left: "25%", filter: "blur(35px)" }} /><div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: "linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)", backgroundSize: "80px 80px" }} /></div>; }

const BRAND_COLORS = [
  { name: "Indigo", color: "#4F46E5", bg: "#EEF2FF" },
  { name: "Emerald", color: "#059669", bg: "#ECFDF5" },
  { name: "Rose", color: "#E11D48", bg: "#FFF1F2" },
  { name: "Amber", color: "#D97706", bg: "#FFFBEB" },
  { name: "Cyan", color: "#0891B2", bg: "#ECFEFF" },
];

const ANIM_CSS = `
@keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(60px,40px) scale(1.1)}50%{transform:translate(20px,80px) scale(0.95)}75%{transform:translate(-40px,30px) scale(1.05)}}
@keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-50px,60px) scale(1.08)}50%{transform:translate(-80px,20px) scale(0.92)}75%{transform:translate(-20px,-40px) scale(1.03)}}
@keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(70px,-30px) scale(1.12)}66%{transform:translate(-30px,-60px) scale(0.9)}}
@keyframes gridDrift{0%{transform:translate(0,0)}100%{transform:translate(60px,60px)}}
.orb-1{animation:orbFloat1 8s ease-in-out infinite}.orb-2{animation:orbFloat2 10s ease-in-out infinite}.orb-3{animation:orbFloat3 7s ease-in-out infinite}.grid-drift{animation:gridDrift 8s linear infinite}
.demo-card{transition:all 0.4s cubic-bezier(0.4,0,0.2,1)}.demo-card:hover{transform:translateY(-8px);box-shadow:0 24px 56px rgba(79,70,229,0.15)!important;border-color:#C7D2FE!important}
.color-dot{cursor:pointer;transition:all 0.25s;border:3px solid transparent}.color-dot:hover{transform:scale(1.15)}.color-dot.active{border-color:#fff;box-shadow:0 0 0 2px rgba(79,70,229,0.6)}
.stat-card{transition:all 0.3s ease}.stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.06)!important}
`;

function HeroBuilderDemo({ brandIdx }: { brandIdx: number }) {
  const b = BRAND_COLORS[brandIdx];
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid rgba(79,70,229,0.08)", boxShadow: "0 50px 120px rgba(79,70,229,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "#FAFBFD", borderBottom: "1px solid #EEF0F4" }}>
        <div style={{ display: "flex", gap: 6, marginRight: 16 }}>{["#FF5F57","#FFBD2E","#28C840"].map((c,i)=><div key={i} style={{ width:11,height:11,borderRadius:"50%",background:c }} />)}</div>
        <div style={{ flex:1,height:28,background:"#F3F4F6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{marginRight:6}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><span style={{ fontSize:12,color:"#9CA3AF",fontWeight:500,fontFamily:BF }}>yourstore.com/build-gang-sheet</span></div>
      </div>
      <div style={{ background:b.color,padding:"8px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background 0.4s" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:24,height:24,borderRadius:6,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><span style={{ fontSize:13,fontWeight:700,color:"#fff",fontFamily:HF }}>YourPrint Co.</span></div>
        <span style={{ fontSize:11,fontWeight:600,color:b.color,background:"#fff",padding:"4px 14px",borderRadius:6,transition:"color 0.4s" }}>Add to Cart</span>
      </div>
      <div style={{ background:b.bg,padding:"14px 18px 10px",transition:"background 0.4s" }}>
        <div style={{ textAlign:"center",marginBottom:10 }}><h2 style={{ fontFamily:HF,fontSize:17,fontWeight:700,color:"#111827",margin:"0 0 2px" }}>Create Your Gang Sheet</h2><p style={{ fontSize:11,color:"#6B7280",margin:0 }}>Upload designs and auto-generate layouts</p></div>
        <div style={{ display:"flex",gap:14,justifyContent:"center",marginBottom:10 }}>{[{l:"Trim",c:b.color},{l:"Flip",c:"#0EA5E9"},{l:"Remove BG",c:"#A855F7"},{l:"Enhance",c:"#F59E0B"},{l:"Text",c:b.color}].map((t,i)=><div key={i} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}><div style={{ width:32,height:32,borderRadius:"50%",background:t.c,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 3px 10px ${t.c}35`,transition:"background 0.4s" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg></div><span style={{ fontSize:7,color:"#6B7280",fontWeight:500 }}>{t.l}</span></div>)}</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:6 }}>{["logo_fire.png","skull_dtf.png","eagle_back.png","rose_vine.png"].map((n,i)=><div key={i} style={{ background:"#fff",borderRadius:8,border:"1px solid #E5E7EB",padding:6 }}><div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:4 }}><div style={{ width:22,height:26,borderRadius:3,background:`linear-gradient(135deg,${["#E74C3C","#3498DB","#2ECC71","#9B59B6"][i]}cc,${["#E74C3C","#3498DB","#2ECC71","#9B59B6"][i]}66)`,flexShrink:0 }} /><div style={{ fontSize:7,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{n}</div></div><div style={{ display:"inline-flex",padding:"1px 5px",borderRadius:99,background:"#DCFCE7" }}><span style={{ fontSize:6,fontWeight:700,color:"#16A34A" }}>300 DPI</span></div></div>)}</div>
        <div style={{ padding:"6px 0 10px" }}><div style={{ background:b.color,padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:10,transition:"background 0.4s" }}><span style={{ fontSize:10,color:"rgba(255,255,255,0.7)" }}>22" wide · 4 images</span><div style={{ display:"flex",gap:6 }}><span style={{ fontSize:10,fontWeight:500,color:"rgba(255,255,255,0.8)",padding:"4px 12px",borderRadius:99,border:"1px solid rgba(255,255,255,0.3)" }}>Preview</span><span style={{ fontSize:10,fontWeight:600,color:b.color,padding:"4px 14px",borderRadius:99,background:"#fff",transition:"color 0.4s" }}>Generate Layout</span></div></div></div>
      </div>
    </div>
  );
}

export default function DemoWebsiteIntegration() {
  const navigate = useNavigate();
  const [brandIdx, setBrandIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setBrandIdx(p => (p + 1) % BRAND_COLORS.length), 2500); return () => clearInterval(t); }, []);
  useEffect(() => { if (!document.querySelector("style[data-dtf-demo-wi]")) { const tag = document.createElement("style"); tag.setAttribute("data-dtf-demo-wi", "1"); tag.textContent = ANIM_CSS; document.head.appendChild(tag); } return () => { const tag = document.querySelector("style[data-dtf-demo-wi]"); if (tag) tag.remove(); }; }, []);

  const handleCTA = (label: string, dest: string) => { trackCTA(label, dest); navigate(dest); };

  return (
    <div style={{ fontFamily: BF, color: "#111827", overflowX: "hidden" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #0A0820 0%, #0F0D2E 12%, #1E1B4B 24%, #312E81 36%, #4F46E5 48%, #6366F1 55%, #818CF8 62%, #A5B4FC 68%, #C7D2FE 74%, #E0E7FF 80%, #EEF2FF 86%, #F5F5F7 92%, #FAFAFB 100%)", padding: "0 40px 0" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ padding: "140px 0 0" }}>
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg> Website Integration</Pill>
            <h1 style={{ fontFamily: HF, fontSize: 56, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>Let Customers Build Their Own<br/>Gang Sheets On Your Website</h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 32px" }}>Embed a fully white-labeled gang sheet builder on your Shopify, WooCommerce, or any website. Self-service ordering, automated pricing, zero manual work.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 16 }}>
              <Btn sz="l" onClick={() => handleCTA("hero_try_demo", "/demo/builder")} style={{ background: "#fff", color: P, boxShadow: "0 6px 28px rgba(0,0,0,0.15)" }}>Try Live Demo →</Btn>
              <Btn v="o" sz="l" onClick={() => handleCTA("hero_see_pricing", "/pricing")} style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.3)", boxShadow: "none" }}>See Pricing →</Btn>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 28 }}>{["No monthly fees","No per-order cuts","No credit card needed"].map((t,i)=><span key={i} style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:500 }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#34D399" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>{t}</span>)}</div>
          </div>
          <div style={{ position: "relative", zIndex: 2, maxWidth: 820, margin: "48px auto 0" }}>
            <HeroBuilderDemo brandIdx={brandIdx} />
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, alignSelf: "center" }}>Your brand colors:</span>
              {BRAND_COLORS.map((c, i) => <div key={i} className={`color-dot ${brandIdx === i ? "active" : ""}`} onClick={() => setBrandIdx(i)} style={{ width: 28, height: 28, borderRadius: "50%", background: c.color }} title={c.name} />)}
            </div>
          </div>
          <div style={{ height: 120, background: "linear-gradient(180deg, transparent, #FAFAFB)" }} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 40px 100px", position: "relative" }}><Dots o={0.06} /><div style={{ maxWidth: 1060, margin: "0 auto", position: "relative", zIndex: 1 }}><div style={{ textAlign: "center", marginBottom: 56 }}><Pill>3-Minute Setup</Pill><h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "20px 0 12px" }}>Live on Your Website in Minutes</h2><p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.7 }}>No coding. No plugins. Just a link you paste anywhere.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {[{ step:1,title:"Connect Your Store",desc:"Enter your product URL — we auto-fetch your variants and pricing. Works with Shopify, WooCommerce, or any platform.",tags:["Shopify","WooCommerce","Any URL"],color:"#4F46E5",bg:"linear-gradient(135deg,#EEF2FF,#E0E7FF)" },{ step:2,title:"Customize Everything",desc:"Match your brand with 8 color zones, 50+ Google Fonts, custom logo, and button styles. Full white-label — customers never see our brand.",tags:["8 Color Zones","50+ Fonts","Your Logo"],color:"#059669",bg:"linear-gradient(135deg,#ECFDF5,#D1FAE5)" },{ step:3,title:"Embed & Go Live",desc:"Copy your unique builder URL. Paste it on your website, link from your store, or share directly. Orders start flowing in.",tags:["Direct Link","iFrame","Any Website"],color:"#D97706",bg:"linear-gradient(135deg,#FFF7ED,#FED7AA)" }].map(({step,title,desc,tags,color,bg})=>(
            <div key={step} className="demo-card" style={{ background:"#fff",borderRadius:24,border:"1px solid #E5E7EB",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ padding:"24px 24px 20px",background:bg }}><div style={{ width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${color},${color}cc)`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,boxShadow:`0 4px 16px ${color}30` }}><span style={{ fontFamily:HF,fontSize:18,fontWeight:800,color:"#fff" }}>{step}</span></div><h3 style={{ fontFamily:HF,fontSize:22,fontWeight:700,color:"#111827",margin:"0 0 8px" }}>{title}</h3><p style={{ fontSize:14,color:"#4B5563",lineHeight:1.65,margin:0 }}>{desc}</p></div>
              <div style={{ padding:"16px 24px 20px",display:"flex",flexWrap:"wrap",gap:6 }}>{tags.map((t,i)=><span key={i} style={{ padding:"4px 12px",borderRadius:99,fontSize:11,fontWeight:600,background:"#F3F4F6",color:"#374151",border:"1px solid #E5E7EB" }}>{t}</span>)}</div>
            </div>))}
        </div>
      </div></section>

      {/* COMPARISON TABLE */}
      <section style={{ padding: "100px 40px", position: "relative" }}><Dots o={0.06} /><div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}><Pill>Why Switch?</Pill><h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "20px 0 12px" }}>Stop Paying 5% Per Order</h2><p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.7 }}>Other platforms take a cut on every single order. We don't.</p></div>
        <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid #E5E7EB", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}><div style={{ padding: "16px 24px", fontFamily: HF, fontWeight: 700, fontSize: 14, color: "#6B7280" }}>Feature</div><div style={{ padding: "16px 14px", textAlign: "center", fontFamily: HF, fontWeight: 700, fontSize: 14, color: P }}>DTF Layout</div><div style={{ padding: "16px 14px", textAlign: "center", fontFamily: HF, fontWeight: 700, fontSize: 14, color: "#6B7280" }}>Drip Apps</div><div style={{ padding: "16px 14px", textAlign: "center", fontFamily: HF, fontWeight: 700, fontSize: 14, color: "#6B7280" }}>Kixxl</div></div>
          {[{f:"Pricing Model",d:"One-time credits",dr:"5% per order",k:"$149–499/mo"},{f:"Per-Order Cut",d:"None",dr:"Up to $12",k:"5% (Basic)"},{f:"Platform Support",d:"Any website",dr:"Shopify only",k:"Shopify/Woo"},{f:"White-Label",d:"Full (8 zones)",dr:"Logo only",k:"Limited"},{f:"Quick Store",d:"Included free",dr:"Not available",k:"Not available"}].map((r,i)=>(
            <div key={i} style={{ display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr",borderBottom:i<4?"1px solid #F3F4F6":"none",background:"#fff" }}><div style={{ padding:"14px 24px",fontSize:14,fontWeight:600,color:"#374151" }}>{r.f}</div><div style={{ padding:"14px",textAlign:"center",fontSize:13,fontWeight:600,color:"#059669",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>{r.d}</div><div style={{ padding:"14px",textAlign:"center",fontSize:13,color:"#6B7280" }}>{r.dr}</div><div style={{ padding:"14px",textAlign:"center",fontSize:13,color:"#6B7280" }}>{r.k}</div></div>))}
        </div>
        <div style={{ marginTop:32,borderRadius:20,background:"linear-gradient(140deg,#0f0d2e,#1e1b4b,#312e81,#4338ca)",padding:"28px 36px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 8px 32px rgba(30,27,75,0.3)" }}>
          <div><div style={{ fontFamily:HF,fontSize:24,fontWeight:800,color:"#fff",marginBottom:6 }}>Want to see the actual builder?</div><div style={{ fontSize:15,color:"rgba(255,255,255,0.6)" }}>Try it live — customize colors, upload your logo, change fonts in real-time.</div></div>
          <Btn sz="m" onClick={() => handleCTA("comparison_try_demo", "/demo/builder")} style={{ background:"#fff",color:P,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",flexShrink:0 }}>Try Live Demo →</Btn>
        </div>
      </div></section>

      {/* STATS */}
      <section style={{ padding: "60px 40px", position: "relative" }}><div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
        {[{val:"No",label:"Monthly Fees",c:"#059669"},{val:"0%",label:"Per-Order Cut",c:"#4F46E5"},{val:"50+",label:"Google Fonts",c:"#D97706"},{val:"24/7",label:"Self-Service",c:"#E11D48"}].map((s,i)=>(
          <div key={i} className="stat-card" style={{ textAlign:"center",padding:"24px 16px",borderRadius:20,background:"#fff",border:"1px solid #E5E7EB",boxShadow:"0 2px 8px rgba(0,0,0,0.02)" }}><div style={{ fontFamily:HF,fontSize:36,fontWeight:800,color:s.c,lineHeight:1 }}>{s.val}</div><div style={{ fontSize:13,color:"#6B7280",fontWeight:500,marginTop:6 }}>{s.label}</div></div>))}
      </div></section>

      {/* CTA */}
      <section style={{ padding: "100px 40px 120px", position: "relative", overflow: "hidden" }}><Dots o={0.1} /><Sq top={60} right={160} size={34} rotate={15} /><Sq bottom={60} left={140} size={28} rotate={-20} /><div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}><h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Ready to Automate Your Orders?</h2><p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.7, margin: "0 0 36px" }}>Start with 20,000 sq.inch free. No credit card required. Set up in under 3 minutes.</p><div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 20 }}><Btn sz="l" onClick={() => handleCTA("final_start_free", "/signup")}>Start Free →</Btn><Btn v="o" sz="l" onClick={() => handleCTA("final_calculator", "/savings-calculator")}>Calculate Savings →</Btn></div><div style={{ display: "flex", justifyContent: "center", gap: 24 }}>{["Credits never expire","All tools included","Full white-label"].map((t,i)=><span key={i} style={{ display:"flex",alignItems:"center",gap:5,fontSize:13,color:"#6B7280",fontWeight:500 }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>{t}</span>)}</div></div></section>

      {/* FOOTER */}
      <footer style={{ position: "relative", padding: "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}><div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} /><div style={{ paddingTop: 64 }}><div style={{ maxWidth: 1060, margin: "0 auto" }}><div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}><div><div style={{ marginBottom: 16 }}><img src="/DTF-Layout-WHITE-logo-text.png" alt="DTF Layout" style={{ height: 38, width: "auto", display: "block" }} /></div><p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide.</p></div><div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{l:"Gang Sheet Builder",to:"/product/gang-sheet-builder"},{l:"Website Integration",to:"/product/website-integration"},{l:"Quick Store",to:"/product/quick-store"},{l:"Pricing",to:"/pricing"}].map(item=><Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div><div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{l:"FAQ",to:"/faq"},{l:"Contact",to:"/contact"}].map(item=><Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div><div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{l:"Privacy Policy",to:"/privacy-policy"},{l:"Terms & Conditions",to:"/terms-conditions"},{l:"Refund Policy",to:"/refund-policy"}].map(item=><Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div></div><div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span><span style={{ fontSize: 13, cursor: "pointer" }}>dtflayout@gmail.com</span></div></div></div></footer>
    </div>
  );
}
