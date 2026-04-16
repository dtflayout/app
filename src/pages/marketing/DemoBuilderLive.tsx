import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CollageCreator } from "@/components/CollageCreator";
import { BuilderSettings, DEFAULT_BUILDER_SETTINGS, BUTTON_STYLE_OPTIONS } from "@/types/builderSettings";
import { trackDemoBuilder, trackCTA } from "@/lib/ga";

const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";

/* ══════════ 115 GOOGLE FONTS ══════════ */
const DEMO_FONTS = [
  "Inter","Roboto","Open Sans","Montserrat","Poppins","Lato","Raleway","Nunito","Source Sans 3","Work Sans",
  "DM Sans","Outfit","Manrope","Plus Jakarta Sans","Playfair Display","Merriweather","Libre Baskerville",
  "Oswald","Bebas Neue","Barlow","Quicksand","Rubik","Mulish","Karla","Josefin Sans","Ubuntu","Cabin",
  "Comfortaa","Kanit","Exo 2","Titillium Web","Mukta","Heebo","Noto Sans","Fira Sans","PT Sans",
  "Arimo","Dosis","Overpass","Lexend","Red Hat Display","Sora","Space Grotesk","Archivo","Jost",
  "Urbanist","Albert Sans","Figtree","Onest","IBM Plex Sans","Noto Serif","Cormorant Garamond","Crimson Text",
  "Lora","EB Garamond","Bitter","Spectral","Vollkorn","Cardo","Alegreya","Zilla Slab","Roboto Slab",
  "Noto Serif Display","Fraunces","Newsreader","Literata","Source Serif 4","PT Serif","Libre Franklin",
  "Assistant","Catamaran","Signika","Maven Pro","Asap","Sarabun","Hind","Varela Round","Prompt",
  "ABeeZee","Abel","Acme","Amatic SC","Anton","Archivo Narrow","Arvo","Barlow Condensed","Cairo",
  "Caveat","Chakra Petch","Chivo","Courgette","Dancing Script","Encode Sans","Epilogue","Fjalla One",
  "Fredoka","Geologica","Glory","Great Vibes","Hind Siliguri","Inconsolata","Indie Flower","Kalam",
  "Lobster","Lobster Two","Marcellus","Merriweather Sans","Pacifico","Permanent Marker","Philosopher",
  "Righteous","Russo One","Sacramento","Satisfy","Secular One","Shadows Into Light","Sigmar One","Teko",
];

/* ══════════ COLOR FIELDS ══════════ */
const COLOR_FIELDS: { key: keyof BuilderSettings; label: string }[] = [
  { key: "color_background", label: "Background" },
  { key: "color_top_bar", label: "Top Bar" },
  { key: "action_bar_color", label: "Action Bar" },
  { key: "color_primary", label: "Primary" },
  { key: "color_text", label: "Text" },
  { key: "toolbox_icon_color", label: "Toolbox Icons" },
  { key: "card_background_color", label: "Card BG" },
];

/* ══════════ PRESET THEMES ══════════ */
const PRESETS = [
  { name: "Default", bg: "#f1f5f9", topBar: "#1e293b", primary: "#4F46E5", text: "#1e293b", action: "", card: "#ffffff", toolbox: "" },
  { name: "Emerald", bg: "#0f172a", topBar: "#064e3b", primary: "#10B981", text: "#f1f5f9", action: "#064e3b", card: "#1e293b", toolbox: "#10B981" },
  { name: "Rose", bg: "#fff1f2", topBar: "#881337", primary: "#E11D48", text: "#1e293b", action: "#881337", card: "#ffffff", toolbox: "#E11D48" },
  { name: "Amber", bg: "#fffbeb", topBar: "#78350f", primary: "#D97706", text: "#1e293b", action: "#78350f", card: "#ffffff", toolbox: "#D97706" },
  { name: "Cyan", bg: "#ecfeff", topBar: "#164e63", primary: "#0891B2", text: "#1e293b", action: "#164e63", card: "#ffffff", toolbox: "#0891B2" },
];

/* ══════════ CSS ══════════ */
const DEMO_CSS = `
@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
@keyframes slideOut{from{transform:translateX(0)}to{transform:translateX(-100%)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.demo-drawer-open{animation:slideIn 0.3s ease-out forwards}
.demo-drawer-close{animation:slideOut 0.25s ease-in forwards}
.demo-overlay{animation:fadeIn 0.2s ease-out forwards}
.demo-builder-wrap .font-heading{font-family:var(--demo-font)!important}
.demo-builder-wrap .font-body,.demo-builder-wrap p,.demo-builder-wrap span,.demo-builder-wrap div,.demo-builder-wrap button,.demo-builder-wrap input,.demo-builder-wrap select,.demo-builder-wrap label,.demo-builder-wrap h1,.demo-builder-wrap h2,.demo-builder-wrap h3,.demo-builder-wrap h4{font-family:var(--demo-font)!important}

/* Mobile responsiveness (≤ 640px) */
@media (max-width: 640px) {
  .demo-customize-btn {
    left: 10px !important;
    padding: 10px 14px !important;
    font-size: 13px !important;
    border-radius: 10px !important;
  }
  .demo-customize-btn-label {
    display: none !important;
  }
  .demo-drawer {
    width: 100vw !important;
    max-width: 100vw !important;
  }
  .demo-signup-modal {
    padding: 28px 22px !important;
  }
}
@media (max-width: 420px) {
  .demo-drawer-content {
    padding: 16px 16px !important;
  }
  .demo-drawer-header {
    padding: 16px 16px 12px !important;
  }
  .demo-drawer-footer {
    padding: 12px 16px !important;
  }
}
`;

/* ══════════ MAIN COMPONENT ══════════ */
export default function DemoBuilderLive() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [storeName, setStoreName] = useState("Your Store");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [fontSearch, setFontSearch] = useState("");
  const [showSignupModal, setShowSignupModal] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<BuilderSettings>({
    ...DEFAULT_BUILDER_SETTINGS,
    id: "demo", printer_id: "demo", created_at: "", updated_at: "",
  } as BuilderSettings);

  // Inject CSS
  useEffect(() => {
    if (!document.querySelector("style[data-demo-live]")) {
      const tag = document.createElement("style");
      tag.setAttribute("data-demo-live", "1");
      tag.textContent = DEMO_CSS;
      document.head.appendChild(tag);
    }
    return () => { const t = document.querySelector("style[data-demo-live]"); if (t) t.remove(); };
  }, []);

  // Load Google Font dynamically
  useEffect(() => {
    const font = settings.font_family;
    if (!font) return;
    const id = `demo-font-${font.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
  }, [settings.font_family]);

  // Intercept download clicks — block downloads in demo mode
  const handleBuilderClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("button");
    if (!btn) return;
    const text = btn.textContent?.toLowerCase() || "";
    const hasDownloadIcon = btn.querySelector('[class*="download"], [data-lucide="download"]') !== null;
    const isDownload = text.includes("download") || text.includes("confirm & download") || hasDownloadIcon;
    if (isDownload) {
      e.stopPropagation();
      e.preventDefault();
      setShowSignupModal(true);
      trackDemoBuilder("download_blocked");
    }
  }, []);

  const updateSetting = (key: keyof BuilderSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    trackDemoBuilder("setting_changed", { field: key, value });
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSettings(prev => ({
      ...prev, color_background: preset.bg, color_top_bar: preset.topBar,
      color_primary: preset.primary, color_text: preset.text,
      action_bar_color: preset.action, card_background_color: preset.card,
      toolbox_icon_color: preset.toolbox,
    }));
    trackDemoBuilder("preset_applied", { name: preset.name });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUrl(URL.createObjectURL(file));
    trackDemoBuilder("logo_uploaded");
  };

  const closeDrawer = () => { setClosing(true); setTimeout(() => { setDrawerOpen(false); setClosing(false); }, 250); };

  const btnRadius = BUTTON_STYLE_OPTIONS.find(o => o.value === settings.button_style)?.preview || "8px";
  const topBarColor = settings.color_top_bar || "#1e293b";
  const primaryColor = settings.color_primary || "#4F46E5";
  const filteredFonts = fontSearch ? DEMO_FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase())) : DEMO_FONTS;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", position: "relative" }}>

      {/* ═══ TOP BAR — Matches real PublicBuilderTopBar ═══ */}
      <div className="sticky top-0 z-30 border-b shadow-sm" style={{ backgroundColor: topBarColor }}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 max-w-screen-2xl mx-auto gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* DTF Layout back link — muted, orients user without breaking store illusion */}
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); trackCTA("demo_back_to_site", "/"); navigate("/"); }}
              className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ color: "#ffffff", fontFamily: BF, textDecoration: "none" }}
              title="Back to DTF Layout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="hidden sm:inline">DTF Layout</span>
            </a>
            {/* Vertical divider */}
            <div className="w-px h-5 sm:h-6 flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }} />
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-8 sm:h-10 w-auto max-w-[100px] sm:max-w-[150px] object-contain flex-shrink-0" />
            ) : (
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}20` }}>
                <span className="font-bold text-base sm:text-lg" style={{ color: primaryColor }}>{storeName.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-semibold text-xs sm:text-sm truncate" style={{ color: "#ffffff" }}>{storeName}</h1>
              <p className="text-[10px] sm:text-xs truncate" style={{ color: "rgba(255,255,255,0.7)" }}>Gang Sheet Builder</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-base">
            <span style={{ color: "rgba(255,255,255,0.7)" }}>Sheet:</span>
            <span className="font-semibold" style={{ color: "#ffffff" }}>22" × --</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] sm:text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>Price</p>
              <p className="text-sm sm:text-lg font-bold" style={{ color: "#ffffff" }}>--</p>
            </div>
            <button disabled className="gap-1.5 sm:gap-2 disabled:opacity-50 text-white flex items-center px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm"
              style={{ backgroundColor: "#9ca3af", borderRadius: btnRadius }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" className="sm:w-4 sm:h-4"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span className="hidden sm:inline">Add to Cart</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ FLOATING CUSTOMIZE BUTTON — horizontal ═══ */}
      {!drawerOpen && (
        <button
          className="demo-customize-btn"
          onClick={() => { setDrawerOpen(true); trackDemoBuilder("drawer_opened"); }}
          style={{
            position: "fixed", left: 16, top: "62%", transform: "translateY(-50%)", zIndex: 35,
            background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", border: "none", cursor: "pointer",
            borderRadius: 12, padding: "12px 20px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 8px 32px rgba(79,70,229,0.4)",
            fontFamily: BF, fontWeight: 700, fontSize: 15, transition: "all 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-50%) scale(1.05)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-50%)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span className="demo-customize-btn-label">Click to Customize</span>
        </button>
      )}

      {/* ═══ DRAWER OVERLAY ═══ */}
      {drawerOpen && <div className="demo-overlay" onClick={closeDrawer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }} />}

      {/* ═══ CUSTOMIZATION DRAWER — 50% wider ═══ */}
      {drawerOpen && (
        <div className={`demo-drawer ${closing ? "demo-drawer-close" : "demo-drawer-open"}`}
          style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 420, maxWidth: "100vw", background: "#fff", zIndex: 45, boxShadow: "8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div className="demo-drawer-header" style={{ padding: "20px 22px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <h3 style={{ fontFamily: HF, fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Customize Builder</h3>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: "4px 0 0" }}>Changes update in real-time</p>
            </div>
            <button onClick={closeDrawer} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Content — scrollable */}
          <div className="demo-drawer-content" style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Store Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Store Name</label>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, fontWeight: 500, color: "#111827", fontFamily: BF, outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#4F46E5"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Logo</label>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              {logoUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={logoUrl} alt="Logo" style={{ height: 44, maxWidth: 140, objectFit: "contain", borderRadius: 8, border: "1px solid #E5E7EB", padding: 4 }} />
                  <button onClick={() => { setLogoUrl(null); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                    style={{ fontSize: 12, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Remove</button>
                </div>
              ) : (
                <button onClick={() => logoInputRef.current?.click()} style={{
                  width: "100%", padding: "14px", borderRadius: 10, border: "1.5px dashed #C7D2FE", background: "#F9FAFB", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#4F46E5", fontFamily: BF,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload Your Logo
                </button>
              )}
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Temporary — only visible in this session</p>
            </div>

            {/* Quick Presets */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>Quick Presets</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => applyPreset(p)} style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6, fontFamily: BF,
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.primary }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Theme */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 10 }}>Color Theme</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {COLOR_FIELDS.map(f => (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={(settings[f.key] as string) || "#4F46E5"} onChange={e => updateSetting(f.key, e.target.value)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "2px solid #E5E7EB", cursor: "pointer", padding: 0, background: "transparent" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{f.label}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "monospace" }}>{(settings[f.key] as string) || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Font Family with search */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Font Family <span style={{ fontWeight: 400, color: "#9CA3AF" }}>({DEMO_FONTS.length} fonts)</span></label>
              <input type="text" placeholder="Search fonts..." value={fontSearch} onChange={e => setFontSearch(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, color: "#111827", fontFamily: BF, outline: "none", marginBottom: 6, boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#4F46E5"} onBlur={e => e.target.style.borderColor = "#E5E7EB"}
              />
              <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #E5E7EB", borderRadius: 8 }}>
                {filteredFonts.map(font => (
                  <div key={font} onClick={() => { updateSetting("font_family", font); setFontSearch(""); }}
                    style={{ padding: "9px 12px", cursor: "pointer", fontSize: 14, fontWeight: settings.font_family === font ? 700 : 400,
                      color: settings.font_family === font ? "#4F46E5" : "#374151",
                      background: settings.font_family === font ? "#EEF2FF" : "transparent",
                      borderBottom: "1px solid #F3F4F6" }}
                    onMouseEnter={e => { if (settings.font_family !== font) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                    onMouseLeave={e => { if (settings.font_family !== font) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >{font}</div>
                ))}
                {filteredFonts.length === 0 && <div style={{ padding: "14px", fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>No fonts match "{fontSearch}"</div>}
              </div>
            </div>

            {/* Button Style */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>Button Style</label>
              <div style={{ display: "flex", gap: 8 }}>
                {BUTTON_STYLE_OPTIONS.map(opt => {
                  const active = settings.button_style === opt.value;
                  return (
                    <button key={opt.value} onClick={() => updateSetting("button_style", opt.value)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", textAlign: "center",
                      border: active ? "2px solid #4F46E5" : "1.5px solid #E5E7EB",
                      background: active ? "#EEF2FF" : "#fff", fontFamily: BF, fontSize: 13, fontWeight: active ? 700 : 500,
                      color: active ? "#4F46E5" : "#6B7280",
                    }}>
                      <div style={{ width: 44, height: 22, borderRadius: opt.preview, background: active ? "#4F46E5" : "#D1D5DB", margin: "0 auto 5px" }} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset */}
            <button onClick={() => { setSettings(prev => ({ ...prev, ...DEFAULT_BUILDER_SETTINGS })); setStoreName("Your Store"); setLogoUrl(null); trackDemoBuilder("settings_reset"); }}
              style={{ padding: "10px 0", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6B7280", fontFamily: BF, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset to Defaults
            </button>
          </div>

          {/* Footer CTA */}
          <div className="demo-drawer-footer" style={{ padding: "16px 22px", borderTop: "1px solid #E5E7EB", background: "#F9FAFB", flexShrink: 0 }}>
            <button onClick={() => { trackCTA("demo_drawer_signup", "/signup"); navigate("/signup"); }}
              style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: BF, boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}>
              Start Free — 20,000 sq.in →
            </button>
            <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 5 }}>No credit card required</p>
          </div>
        </div>
      )}

      {/* ═══ REAL BUILDER — with font override + download interception ═══ */}
      <div
        ref={builderRef}
        className="demo-builder-wrap"
        style={{ background: settings.color_background, "--demo-font": `'${settings.font_family}', sans-serif` } as React.CSSProperties}
        onClickCapture={handleBuilderClick}
      >
        <CollageCreator
          builderMode="standalone"
          isDemoMode={true}
          dpi={150}
          builderSettings={settings}
        />
      </div>

      {/* ═══ SIGNUP MODAL — shown when download is attempted ═══ */}
      {showSignupModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowSignupModal(false)}>
          <div onClick={e => e.stopPropagation()} className="demo-signup-modal" style={{ background: "#fff", borderRadius: 24, padding: "36px 32px", maxWidth: 420, width: "90%", boxShadow: "0 32px 80px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <h3 style={{ fontFamily: HF, fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>This is a Demo Version</h3>
            <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.6, margin: "0 0 24px" }}>
              Sign up for a free account to generate and download your gang sheets. You get <strong style={{ color: "#4F46E5" }}>20,000 sq.inch free</strong> — no credit card required.
            </p>
            <button onClick={() => { trackCTA("demo_modal_signup", "/signup"); navigate("/signup"); }}
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: BF, boxShadow: "0 6px 24px rgba(79,70,229,0.3)", marginBottom: 10 }}>
              Sign Up Free →
            </button>
            <button onClick={() => setShowSignupModal(false)}
              style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: "transparent", color: "#6B7280", fontSize: 14, fontWeight: 600, border: "1.5px solid #E5E7EB", cursor: "pointer", fontFamily: BF }}>
              Continue Exploring
            </button>
            {/* Tertiary link — appears at the moment users are evaluating value */}
            <a
              href="/pricing"
              onClick={(e) => { e.preventDefault(); trackCTA("demo_modal_pricing", "/pricing"); navigate("/pricing"); }}
              style={{ display: "inline-block", marginTop: 14, fontSize: 12.5, color: "#9CA3AF", textDecoration: "none", fontFamily: BF, fontWeight: 500, transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#4F46E5"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9CA3AF"}
            >
              or see our pricing →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
