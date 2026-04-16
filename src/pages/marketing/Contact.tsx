import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";

/* ══════════ DESIGN TOKENS ══════════ */
const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

/* ══════════ SHARED COMPONENTS ══════════ */
function Sq({ top, left, right, bottom, size = 28, rotate = 12 }: any) { const p: any = {}; if (top != null) p.top = top; if (left != null) p.left = left; if (right != null) p.right = right; if (bottom != null) p.bottom = bottom; return <div style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.25, border: "1.5px dashed rgba(79,70,229,0.1)", transform: `rotate(${rotate}deg)`, pointerEvents: "none", ...p }} />; }
function Dots({ o = 0.2 }: { o?: number }) { return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />; }
function Pill({ children }: any) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>{children}</span>; }
function Btn({ children, v = "p", sz = "m", style: sx, onClick }: any) { const pad: any = { s: "10px 24px", m: "14px 34px", l: "17px 42px" }[sz]; const fs: any = { s: 14, m: 15, l: 16 }[sz]; const vars: any = { p: { background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "none", boxShadow: "0 6px 28px rgba(79,70,229,0.28)" }, o: { background: "#fff", color: "#111827", border: "1.5px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" } }; return <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: BF, fontWeight: 600, cursor: "pointer", borderRadius: 99, transition: "all 0.25s", padding: pad, fontSize: fs, ...vars[v], ...sx }}>{children}</button>; }
const ic = { chev: <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> };
function MovingPattern() { return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}><div className="orb orb-1" style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)", top: "-15%", left: "-10%", filter: "blur(40px)" }} /><div className="orb orb-2" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", top: "15%", right: "-12%", filter: "blur(30px)" }} /><div className="orb orb-3" style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)", bottom: "5%", left: "25%", filter: "blur(35px)" }} /><div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: "linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)", backgroundSize: "80px 80px" }} /></div>; }

const ANIM_CSS = `
@keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(60px,40px) scale(1.1)}50%{transform:translate(20px,80px) scale(0.95)}75%{transform:translate(-40px,30px) scale(1.05)}}
@keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-50px,60px) scale(1.08)}50%{transform:translate(-80px,20px) scale(0.92)}75%{transform:translate(-20px,-40px) scale(1.03)}}
@keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(70px,-30px) scale(1.12)}66%{transform:translate(-30px,-60px) scale(0.9)}}
@keyframes gridDrift{0%{transform:translate(0,0)}100%{transform:translate(60px,60px)}}
.orb-1{animation:orbFloat1 8s ease-in-out infinite}.orb-2{animation:orbFloat2 10s ease-in-out infinite}.orb-3{animation:orbFloat3 7s ease-in-out infinite}.grid-drift{animation:gridDrift 8s linear infinite}
.info-card{transition:all 0.3s ease}.info-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(79,70,229,0.1)!important;border-color:#C7D2FE!important}
.topic-card{transition:all 0.3s ease;cursor:pointer}.topic-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(79,70,229,0.1)!important;border-color:#C7D2FE!important}
.form-input{width:100%;padding:12px 16px;border-radius:10px;border:1.5px solid #E5E7EB;font-size:14px;font-weight:500;color:#111827;background:#fff;outline:none;transition:all 0.2s;box-sizing:border-box;font-family:'Inter',sans-serif}
.form-input:focus{border-color:#4F46E5;box-shadow:0 0 0 3px rgba(79,70,229,0.1)}
.form-input::placeholder{color:#9CA3AF;font-weight:400}
.form-textarea{resize:none;min-height:140px}
.form-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
`;

/* ══════════ FORM INPUT STYLES ══════════ */
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: HF, marginBottom: 6 };

/* ══════════ COMPONENT ══════════ */
export default function Contact() {
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  const [formData, setFormData] = useState({ name: "", email: "", subject: "general", message: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { const l1 = document.createElement("link"); l1.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"; l1.rel = "stylesheet"; document.head.appendChild(l1); return () => { document.head.removeChild(l1); }; }, []);
  useEffect(() => { if (!document.querySelector("style[data-dtf-contact]")) { const tag = document.createElement("style"); tag.setAttribute("data-dtf-contact", "1"); tag.textContent = ANIM_CSS; document.head.appendChild(tag); } return () => { const tag = document.querySelector("style[data-dtf-contact]"); if (tag) tag.remove(); }; }, []);

  const subjectLabels: Record<string, string> = { general: "General Inquiry", setup: "Setup & Onboarding Help", billing: "Billing & Credits", bug: "Bug Report", feature: "Feature Request", integration: "Website Integration Help", quickstore: "Quick Store Help", other: "Other" };
  const handleSubmit = () => {
    const subjectLine = `[DTF Layout - ${subjectLabels[formData.subject] || "General"}] ${formData.name ? "from " + formData.name : ""}`.trim();
    const body = formData.message ? encodeURIComponent(formData.message) : "";
    window.open(`mailto:support@dtflayout.com?subject=${encodeURIComponent(subjectLine)}&body=${body}`, "_self");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div style={{ fontFamily: BF, color: "#111827", overflowX: "hidden" }}>

      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #030310 0%, #050412 4%, #08061A 8%, #0A0820 12%, #0D0B26 16%, #0F0D2E 21%, #141138 26%, #1A1744 31%, #1E1B4B 36%, #272368 42%, #312E81 48%, #4F46E5 58%, #6366F1 65%, #818CF8 72%, #A5B4FC 78%, #C7D2FE 84%, #E0E7FF 90%, #F5F5F7 95%, #FAFAFB 100%)", padding: isMobile ? "0 16px 0" : "0 40px 0" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ padding: isMobile ? "100px 0 0" : "140px 0 0" }}>
          <Sq top={20} right={140} size={32} rotate={18} /><Sq top={100} right={80} size={22} rotate={-12} /><Sq top={30} left={100} size={28} rotate={22} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> Get in Touch</Pill>
            <h1 style={{ fontFamily: HF, fontSize: isMobile ? 56 : 60, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>We'd Love to<br />Hear From You</h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 0" }}>Questions, feedback, or need help getting started? We respond to every message — usually within a few hours.</p>
          </div>
          <div style={{ height: 120, background: "linear-gradient(180deg, transparent, #FAFAFB)" }} />
        </div>
      </section>

      {/* ═══ CONTACT INFO CARDS ═══ */}
      <section style={{ padding: isMobile ? "0 16px 0" : "0 40px 0", position: "relative", marginTop: -60 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
            {/* Email */}
            <div className="info-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: HF, marginBottom: 4 }}>Email Us</div>
              <a href="mailto:support@dtflayout.com" style={{ fontSize: 14, fontWeight: 600, color: P, textDecoration: "none" }}>support@dtflayout.com</a>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>Best for detailed questions</div>
            </div>

            {/* Response Time */}
            <div className="info-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: HF, marginBottom: 4 }}>Fast Response</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#059669" }}>Within a few hours</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>Usually much faster</div>
            </div>

            {/* Human Support */}
            <div className="info-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: HF, marginBottom: 4 }}>100% Human</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#7C3AED" }}>No bots, no auto-replies</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>Real people, real answers</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FORM SECTION ═══ */}
      <section style={{ padding: isMobile ? "32px 16px 60px" : "48px 40px 100px", position: "relative" }}>
        <Dots o={0.04} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr", gap: 32, alignItems: "flex-start" }}>

            {/* Left — Info Panel */}
            <div>
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "28px 26px 20px", borderBottom: "1px solid #F3F4F6" }}>
                  <h2 style={{ fontFamily: HF, fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Let's Talk</h2>
                  <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>Whether you're evaluating DTF Layout, need setup help, or have a feature idea — we want to hear from you.</p>
                </div>

                {/* What to expect */}
                <div style={{ padding: "20px 26px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>What to expect</div>
                  {[
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, text: "Confirmation email within minutes", color: "#059669" },
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, text: "Personal reply — no bots, no templates", color: P },
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, text: "Resolution within 24 hours", color: "#D97706" },
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, text: "Setup help & screen share if needed", color: "#7C3AED" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${item.color}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                      <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Direct email */}
                <div style={{ padding: "16px 26px 24px", borderTop: "1px solid #F3F4F6", background: "#FAFAFB" }}>
                  <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>Prefer email directly?</div>
                  <a href="mailto:support@dtflayout.com" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid #E5E7EB", textDecoration: "none", transition: "all 0.2s" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>support@dtflayout.com</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>We respond to every message</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Right — Contact Form */}
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "32px 30px" }}>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  <h3 style={{ fontFamily: HF, fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Message Sent!</h3>
                  <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.6 }}>Thank you for reaching out. We'll get back to you within a few hours.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontFamily: HF, fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Send a Message</h2>
                    <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Fill out the form and we'll get back to you shortly.</p>
                  </div>

                  {/* Name + Email row */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input className="form-input" placeholder="Your name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input className="form-input" type="email" placeholder="you@company.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Subject</label>
                    <select className="form-input form-select" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}>
                      <option value="general">General Inquiry</option>
                      <option value="setup">Setup & Onboarding Help</option>
                      <option value="billing">Billing & Credits</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="integration">Website Integration Help</option>
                      <option value="quickstore">Quick Store Help</option>
                      <option value="other">Something Else</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Message</label>
                    <textarea className="form-input form-textarea" placeholder="Tell us how we can help..." value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
                  </div>

                  {/* Submit */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Btn onClick={handleSubmit}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                      Send Message
                    </Btn>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>We reply within hours, not days.</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMON TOPICS ═══ */}
      <section style={{ padding: isMobile ? "48px 16px" : "80px 40px", background: "#fff", position: "relative" }}>
        <Dots o={0.04} /><Sq top={40} right={100} size={28} rotate={15} /><Sq bottom={50} left={120} size={24} rotate={-18} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> Before you reach out</Pill>
            <h2 style={{ fontFamily: HF, fontSize: 38, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "18px 0 10px" }}>Common Topics</h2>
            <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.6 }}>Your question might already be answered in our FAQ.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14 }}>
            {[
              { title: "Getting Started", desc: "Account setup, free trial, first gang sheet", to: "/faq", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>, tint: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", accent: P },
              { title: "Pricing & Credits", desc: "Plans, billing, how credits work", to: "/faq", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>, tint: "linear-gradient(135deg, #F0F9FF, #BAE6FD)", accent: "#0284C7" },
              { title: "Website Integration", desc: "Embedding, platforms, white-labeling", to: "/faq", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" /></svg>, tint: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", accent: "#059669" },
              { title: "Switching Tools", desc: "Migration from other platforms", to: "/faq", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>, tint: "linear-gradient(135deg, #FDF2F8, #FCE7F3)", accent: "#DB2777" },
            ].map((topic, i) => (
              <Link key={i} to={topic.to} className="topic-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "22px 20px", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: topic.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>{topic.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: HF, marginBottom: 3 }}>{topic.title}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{topic.desc}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: topic.accent }}>Read FAQ</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={topic.accent} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: isMobile ? "60px 16px" : "100px 40px", position: "relative", overflow: "hidden" }}>
        <Dots o={0.1} /><Sq top={60} right={160} size={34} rotate={15} /><Sq bottom={60} left={140} size={28} rotate={-20} />
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: HF, fontSize: 42, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 14px" }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: "#4B5563", lineHeight: 1.7, margin: "0 0 36px" }}>Start with 20,000 sq.inch free. No credit card required.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            <Btn sz="l" onClick={() => navigate("/signup")}>Get Started Free →</Btn>
            <Btn v="o" sz="l" onClick={() => navigate("/pricing")}>View Pricing →</Btn>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", padding: isMobile ? "0 16px 24px" : "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} />
        <div style={{ paddingTop: 64 }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
              <div>
                <div style={{ marginBottom: 16 }}><img src="/DTF-Layout-WHITE-logo-text.png" alt="DTF Layout" style={{ height: 38, width: "auto", display: "block" }} /></div>
                <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide. Auto-arrange, optimize, and print — all from one platform.</p>
              </div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{ l: "Gang Sheet Builder", to: "/product/gang-sheet-builder" }, { l: "Website Integration", to: "/product/website-integration" }, { l: "Quick Store", to: "/product/quick-store" }, { l: "Pricing", to: "/pricing" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{ l: "FAQ", to: "/faq" }, { l: "Contact", to: "/contact" }, { l: "Blog", to: "/" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{ l: "Privacy Policy", to: "/privacy-policy" }, { l: "Terms & Conditions", to: "/terms-conditions" }, { l: "Refund Policy", to: "/refund-policy" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span>
              <span style={{ fontSize: 13, cursor: "pointer" }}>support@dtflayout.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
