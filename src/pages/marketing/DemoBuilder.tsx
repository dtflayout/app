import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import { GOOGLE_FONTS, BUTTON_STYLE_OPTIONS, DEFAULT_BUILDER_SETTINGS } from "@/types/builderSettings";
import { trackCTA, trackDemoBuilder } from "@/lib/ga";

/* ══════════ DESIGN TOKENS ══════════ */
const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

/* ══════════ SHARED MARKETING COMPONENTS ══════════ */
function Dots({ o = 0.2 }: { o?: number }) {
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />;
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>{children}</span>;
}
function Btn({ children, v = "p", sz = "m", style: sx, onClick }: any) {
  const pad: any = { s: "10px 24px", m: "14px 34px", l: "17px 42px" }[sz];
  const fs: any = { s: 14, m: 15, l: 16 }[sz];
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
      <div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: "linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
    </div>
  );
}

const ANIM_CSS = `
@keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(60px,40px) scale(1.1)}50%{transform:translate(20px,80px) scale(0.95)}75%{transform:translate(-40px,30px) scale(1.05)}}
@keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-50px,60px) scale(1.08)}50%{transform:translate(-80px,20px) scale(0.92)}75%{transform:translate(-20px,-40px) scale(1.03)}}
@keyframes gridDrift{0%{transform:translate(0,0)}100%{transform:translate(60px,60px)}}
.orb-1{animation:orbFloat1 8s ease-in-out infinite}.orb-2{animation:orbFloat2 10s ease-in-out infinite}.grid-drift{animation:gridDrift 8s linear infinite}
`;

/* ══════════ TYPES ══════════ */
interface DemoSettings {
  color_background: string;
  color_top_bar: string;
  action_bar_color: string;
  color_primary: string;
  color_text: string;
  toolbox_icon_color: string;
  card_background_color: string;
  font_family: string;
  button_style: 'pill' | 'rounded' | 'square';
  logo_url: string | null;
  store_name: string;
}

/* ══════════ COLOR SWATCH + PICKER ══════════ */
function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div
        onClick={() => inputRef.current?.click()}
        style={{ width: 36, height: 36, borderRadius: 8, background: value, border: "2px solid rgba(0,0,0,0.08)", cursor: "pointer", flexShrink: 0, position: "relative", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "monospace" }}>{value}</div>
      </div>
    </div>
  );
}

/* ══════════ BUILDER PREVIEW ══════════ */
function BuilderPreview({ s }: { s: DemoSettings }) {
  const btnRadius = s.button_style === 'pill' ? '9999px' : s.button_style === 'square' ? '2px' : '8px';
  const toolboxColors = s.toolbox_icon_color
    ? [s.toolbox_icon_color, s.toolbox_icon_color, s.toolbox_icon_color, s.toolbox_icon_color, s.toolbox_icon_color]
    : ['#4F46E5', '#0EA5E9', '#A855F7', '#F59E0B', '#4F46E5'];

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 80px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)", fontFamily: `'${s.font_family || 'Inter'}', sans-serif` }}>
      {/* ─── TOP BAR ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", backgroundColor: s.color_top_bar }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {s.logo_url ? (
            <img src={s.logo_url} alt="" style={{ height: 36, width: "auto", maxWidth: 120, objectFit: "contain", borderRadius: 6 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color_primary}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: s.color_primary }}>{s.store_name.charAt(0)}</span>
            </div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{s.store_name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Gang Sheet Builder</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Sheet: 22" × --</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Price: --</div>
          </div>
          <button style={{ padding: "8px 18px", borderRadius: btnRadius, backgroundColor: s.color_primary, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "default", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Add to Cart
          </button>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div style={{ padding: "24px 28px", backgroundColor: s.color_background }}>
        {/* Headline */}
        <h3 style={{ fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 4, color: s.color_text }}>Create Your Gang Sheet</h3>
        <p style={{ fontSize: 13, textAlign: "center", marginBottom: 20, color: s.color_text, opacity: 0.5 }}>Upload your designs and generate optimized layouts for DTF printing</p>

        {/* Upload Zone */}
        <div style={{ border: `2px dashed ${s.color_primary}40`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: s.color_primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: s.color_text }}>Drop images here or click to browse</div>
              <div style={{ fontSize: 11, color: s.color_text, opacity: 0.4 }}>PNG, JPG · Max 25 MB each</div>
            </div>
          </div>
          <button style={{ padding: "8px 18px", borderRadius: btnRadius, backgroundColor: s.color_primary, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "default" }}>Browse</button>
        </div>

        {/* Toolbox Icons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 20 }}>
          {[
            { label: "Trim", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 9V2H18V9"/><path d="M6 22V15"/><path d="M18 22V15"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/></svg> },
            { label: "Flip", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M21 8A9.96 9.96 0 0 0 12 4C7 4 3 8 3 13s4 9 9 9a10 10 0 0 0 8-4"/></svg> },
            { label: "Remove BG", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> },
            { label: "Enhance", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
            { label: "Text", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
          ].map((tool, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: toolboxColors[i], display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 3px 12px ${toolboxColors[i]}40` }}>{tool.icon}</div>
              <span style={{ fontSize: 10, color: s.color_text, opacity: 0.5, fontWeight: 500 }}>{tool.label}</span>
            </div>
          ))}
        </div>

        {/* Image Cards (sample) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { name: "logo_fire.png", color: "#E74C3C" },
            { name: "skull_dtf.png", color: "#3498DB" },
            { name: "eagle_back.png", color: "#2ECC71" },
            { name: "rose_vine.png", color: "#9B59B6" },
          ].map((img, i) => (
            <div key={i} style={{ backgroundColor: s.card_background_color, borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)", padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 34, borderRadius: 4, background: `linear-gradient(135deg,${img.color}cc,${img.color}66)`, flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: s.color_text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
              </div>
              <div style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 99, background: "#DCFCE7", marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#16A34A" }}>300 DPI</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <div>
                  <div style={{ fontSize: 8, color: "#9CA3AF", fontWeight: 600 }}>W</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: s.color_text, background: s.color_background, padding: "3px 6px", borderRadius: 4, border: "1px solid rgba(0,0,0,0.06)" }}>8.2 in</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: "#9CA3AF", fontWeight: 600 }}>H</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: s.color_text, background: s.color_background, padding: "3px 6px", borderRadius: 4, border: "1px solid rgba(0,0,0,0.06)" }}>10.5 in</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ACTION BAR ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", backgroundColor: s.action_bar_color || s.color_top_bar }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Sheet Width: 22 inches (fixed) · 4 Images</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "6px 16px", borderRadius: btnRadius, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.25)", background: "transparent", cursor: "default" }}>Preview</button>
          <button style={{ padding: "6px 16px", borderRadius: btnRadius, fontSize: 12, fontWeight: 600, color: "#fff", backgroundColor: s.color_primary, border: "none", cursor: "default" }}>Generate Layout</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ MAIN PAGE ══════════ */
export default function DemoBuilder() {
  const navigate = useNavigate();

  // Demo settings state — starts with defaults
  const [s, setS] = useState<DemoSettings>({
    color_background: DEFAULT_BUILDER_SETTINGS.color_background,
    color_top_bar: DEFAULT_BUILDER_SETTINGS.color_top_bar,
    action_bar_color: '',
    color_primary: DEFAULT_BUILDER_SETTINGS.color_primary,
    color_text: DEFAULT_BUILDER_SETTINGS.color_text,
    toolbox_icon_color: '',
    card_background_color: DEFAULT_BUILDER_SETTINGS.card_background_color,
    font_family: DEFAULT_BUILDER_SETTINGS.font_family,
    button_style: DEFAULT_BUILDER_SETTINGS.button_style,
    logo_url: null,
    store_name: "Your Store",
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [customFont, setCustomFont] = useState("");

  // Update a single setting
  const update = useCallback((key: keyof DemoSettings, value: any) => {
    setS(prev => ({ ...prev, [key]: value }));
    trackDemoBuilder(`change_${key}`, { [key]: value });
  }, []);

  // Handle logo upload (temp blob URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max

    // Revoke old blob URL
    if (s.logo_url && s.logo_url.startsWith("blob:")) {
      URL.revokeObjectURL(s.logo_url);
    }

    const url = URL.createObjectURL(file);
    update("logo_url", url);
    trackDemoBuilder("upload_logo");
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (s.logo_url && s.logo_url.startsWith("blob:")) {
        URL.revokeObjectURL(s.logo_url);
      }
    };
  }, []);

  // Load Google Font when font changes
  useEffect(() => {
    if (!s.font_family) return;
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(s.font_family)}:wght@400;500;600;700&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [s.font_family]);

  // Inject animations
  useEffect(() => {
    if (!document.querySelector("style[data-dtf-demo-builder]")) {
      const tag = document.createElement("style");
      tag.setAttribute("data-dtf-demo-builder", "1");
      tag.textContent = ANIM_CSS;
      document.head.appendChild(tag);
    }
    return () => { const tag = document.querySelector("style[data-dtf-demo-builder]"); if (tag) tag.remove(); };
  }, []);

  // Reset to defaults
  const resetDefaults = () => {
    if (s.logo_url && s.logo_url.startsWith("blob:")) URL.revokeObjectURL(s.logo_url);
    setS({
      color_background: DEFAULT_BUILDER_SETTINGS.color_background,
      color_top_bar: DEFAULT_BUILDER_SETTINGS.color_top_bar,
      action_bar_color: '',
      color_primary: DEFAULT_BUILDER_SETTINGS.color_primary,
      color_text: DEFAULT_BUILDER_SETTINGS.color_text,
      toolbox_icon_color: '',
      card_background_color: DEFAULT_BUILDER_SETTINGS.card_background_color,
      font_family: DEFAULT_BUILDER_SETTINGS.font_family,
      button_style: DEFAULT_BUILDER_SETTINGS.button_style,
      logo_url: null,
      store_name: "Your Store",
    });
    trackDemoBuilder("reset_defaults");
  };

  const handleCTA = (label: string, dest: string) => {
    trackCTA(label, dest);
    navigate(dest);
  };

  /* ═══ CONTROL PANEL STYLES ═══ */
  const sectionTitle: React.CSSProperties = { fontFamily: HF, fontSize: 15, fontWeight: 700, color: "#1E1B4B", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 };
  const sectionBox: React.CSSProperties = { padding: "16px 18px", borderRadius: 14, background: "#fff", border: "1px solid #E5E7EB", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" };

  return (
    <div style={{ fontFamily: BF, color: "#111827", background: "#FAFAFB" }}>

      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #0A0820 0%, #0F0D2E 18%, #1E1B4B 35%, #312E81 50%, #4F46E5 65%, #818CF8 78%, #C7D2FE 88%, #FAFAFB 100%)", padding: "140px 40px 60px", textAlign: "center" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 700, margin: "0 auto" }}>
          <Pill>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Interactive Demo
          </Pill>
          <h1 style={{ fontFamily: HF, fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "24px 0 16px" }}>See Exactly How Your Builder Will Look</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, maxWidth: 500, margin: "0 auto" }}>Customize colors, fonts, logo, and button styles — the preview updates live. This is exactly what your customers will see.</p>
        </div>
      </section>

      {/* ═══ MAIN CONTENT: Controls + Preview ═══ */}
      <section style={{ padding: "40px 40px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 32, alignItems: "start" }}>

          {/* ─── LEFT: CONTROL PANEL ─── */}
          <div style={{ position: "sticky", top: 80 }}>

            {/* Store Name */}
            <div style={sectionBox}>
              <div style={sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                Store Name
              </div>
              <input
                type="text"
                value={s.store_name}
                onChange={e => update("store_name", e.target.value)}
                maxLength={30}
                style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, fontWeight: 500, color: "#111827", outline: "none", fontFamily: BF, boxSizing: "border-box" }}
              />
            </div>

            {/* Logo Upload */}
            <div style={sectionBox}>
              <div style={sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Logo
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              {s.logo_url ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={s.logo_url} alt="Logo" style={{ height: 40, width: "auto", maxWidth: 120, objectFit: "contain", borderRadius: 6, border: "1px solid #E5E7EB" }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => logoInputRef.current?.click()} style={{ fontSize: 12, fontWeight: 600, color: P, background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>Change</button>
                    <button onClick={() => { if (s.logo_url?.startsWith("blob:")) URL.revokeObjectURL(s.logo_url); update("logo_url", null); }} style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => logoInputRef.current?.click()} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "2px dashed #C7D2FE", background: "#F8FAFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, color: P }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload Your Logo
                </button>
              )}
              <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6 }}>Temporary — only visible in this session</p>
            </div>

            {/* Colors */}
            <div style={sectionBox}>
              <div style={sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                Color Theme
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <ColorControl label="Background" value={s.color_background} onChange={v => update("color_background", v)} />
                <ColorControl label="Top Bar" value={s.color_top_bar} onChange={v => update("color_top_bar", v)} />
                <ColorControl label="Action Bar" value={s.action_bar_color || s.color_top_bar} onChange={v => update("action_bar_color", v)} />
                <ColorControl label="Primary" value={s.color_primary} onChange={v => update("color_primary", v)} />
                <ColorControl label="Text" value={s.color_text} onChange={v => update("color_text", v)} />
                <ColorControl label="Toolbox Icons" value={s.toolbox_icon_color || "#4F46E5"} onChange={v => update("toolbox_icon_color", v)} />
                <ColorControl label="Image Card" value={s.card_background_color} onChange={v => update("card_background_color", v)} />
              </div>
            </div>

            {/* Font Family */}
            <div style={sectionBox}>
              <div style={sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                Font Family
              </div>
              <select
                value={GOOGLE_FONTS.includes(s.font_family) ? s.font_family : "__custom__"}
                onChange={e => {
                  if (e.target.value === "__custom__") return;
                  update("font_family", e.target.value);
                  setCustomFont("");
                }}
                style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, fontWeight: 500, color: "#111827", outline: "none", fontFamily: BF, appearance: "none" as any, background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center`, boxSizing: "border-box", cursor: "pointer", marginBottom: 8 }}
              >
                {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                {!GOOGLE_FONTS.includes(s.font_family) && s.font_family && <option value="__custom__">Custom: {s.font_family}</option>}
              </select>
              <input
                type="text"
                placeholder="Or type exact Google Font name..."
                value={customFont}
                onChange={e => setCustomFont(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && customFont.trim()) {
                    update("font_family", customFont.trim());
                  }
                }}
                onBlur={() => { if (customFont.trim()) update("font_family", customFont.trim()); }}
                style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, color: "#6B7280", outline: "none", fontFamily: BF, boxSizing: "border-box" }}
              />
              <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: P, fontWeight: 500, marginTop: 4, display: "inline-block", textDecoration: "none" }}>Browse at fonts.google.com</a>
            </div>

            {/* Button Style */}
            <div style={sectionBox}>
              <div style={sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><rect x="3" y="8" width="18" height="8" rx="4"/></svg>
                Button Style
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {BUTTON_STYLE_OPTIONS.map(opt => {
                  const active = s.button_style === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => update("button_style", opt.value)}
                      style={{ flex: 1, padding: "10px 0", borderRadius: parseInt(opt.preview) > 100 ? 99 : parseInt(opt.preview) < 4 ? 2 : 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: active ? `2px solid ${P}` : "1.5px solid #E5E7EB", background: active ? "#EEF2FF" : "#fff", color: active ? P : "#6B7280", transition: "all 0.2s" }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset + CTA */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={resetDefaults} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Reset to Defaults</button>
              <button onClick={() => handleCTA("demo_start_free", "/signup")} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4F46E5,#7C3AED)", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}>Start Free — 20K sq.in →</button>
            </div>
          </div>

          {/* ─── RIGHT: LIVE PREVIEW ─── */}
          <div>
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontFamily: HF, fontSize: 18, fontWeight: 700, color: "#111827" }}>Live Preview</span>
                <span style={{ fontSize: 13, color: "#9CA3AF", marginLeft: 10 }}>Changes update instantly</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", background: "#ECFDF5", padding: "4px 12px", borderRadius: 99, border: "1px solid #A7F3D0" }}>300 DPI Builder</span>
            </div>
            <BuilderPreview s={s} />
            <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 12 }}>This is exactly how the builder will look on your website. Colors, fonts, logo — all fully customizable.</p>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "80px 40px 100px", position: "relative", overflow: "hidden" }}>
        <Dots o={0.1} />
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: HF, fontSize: 40, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 14px" }}>Ready to Add This to Your Website?</h2>
          <p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.7, margin: "0 0 32px" }}>Start with 20,000 sq.inch free. No credit card. Set up in under 3 minutes. All the customization you just saw is included in every plan.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 20 }}>
            <Btn sz="l" onClick={() => handleCTA("final_start_free", "/signup")}>Start Free →</Btn>
            <Btn v="o" sz="l" onClick={() => handleCTA("final_pricing", "/pricing")}>See Pricing →</Btn>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            {["No monthly fees", "No per-order cuts", "Credits never expire"].map((t, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", padding: "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} />
        <div style={{ paddingTop: 64 }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
              <div>
                <div style={{ marginBottom: 16 }}><img src="/DTF-Layout-WHITE-logo-text.png" alt="DTF Layout" style={{ height: 38, width: "auto", display: "block" }} /></div>
                <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide.</p>
              </div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{l:"Gang Sheet Builder",to:"/product/gang-sheet-builder"},{l:"Website Integration",to:"/product/website-integration"},{l:"Quick Store",to:"/product/quick-store"},{l:"Pricing",to:"/pricing"}].map(item=><Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{l:"FAQ",to:"/faq"},{l:"Contact",to:"/contact"}].map(item=><Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{l:"Privacy Policy",to:"/privacy-policy"},{l:"Terms & Conditions",to:"/terms-conditions"},{l:"Refund Policy",to:"/refund-policy"}].map(item=><Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span><span style={{ fontSize: 13, cursor: "pointer" }}>dtflayout@gmail.com</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
