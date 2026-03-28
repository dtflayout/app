import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

/* Tints */
const tint = {
  indigo: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
  mint: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
  peach: "linear-gradient(135deg, #FFF7ED, #FED7AA)",
  pink: "linear-gradient(135deg, #FDF2F8, #FCE7F3)",
};

/* Deco */
function Sq({ top, left, right, bottom, size = 28, rotate = 12 }) {
  const p = {};
  if (top != null) p.top = top;
  if (left != null) p.left = left;
  if (right != null) p.right = right;
  if (bottom != null) p.bottom = bottom;
  return (
    <div style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.25, border: "1.5px dashed rgba(79,70,229,0.1)", transform: `rotate(${rotate}deg)`, pointerEvents: "none", ...p }} />
  );
}
function Dots({ o = 0.2 }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
  );
}

function Pill({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>
      {children}
    </span>
  );
}

function Btn({ children, v = "p", sz = "m", style: sx, onClick }: any) {
  const pad = { s: "10px 24px", m: "14px 34px", l: "17px 42px" }[sz];
  const fs = { s: 14, m: 15, l: 16 }[sz];
  const vars = {
    p: { background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "none", boxShadow: "0 6px 28px rgba(79,70,229,0.28)" },
    o: { background: "#fff", color: "#111827", border: "1.5px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  };
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: BF, fontWeight: 600, cursor: "pointer", borderRadius: 99, transition: "all 0.25s", padding: pad, fontSize: fs, ...vars[v], ...sx }}>
      {children}
    </button>
  );
}

const ic = {
  chev: <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
};

/* ══════════ HERO PRODUCT SHOT ══════════ */
function HeroShot() {
  const imgCards = [
    { name: "stones_---LARGE.png", dpi: 300, w: "8.82", h: "10.85", orig: "2647 × 3254 px" },
    { name: "stones_---LARGE_01.png", dpi: 300, w: "8.82", h: "10.85", orig: "2647 × 3254 px" },
    { name: "stones_---LARGE_01.png", dpi: 300, w: "8.82", h: "10.85", orig: "2647 × 3254 px" },
    { name: "stones_---LARGE_02.png", dpi: 300, w: "8.82", h: "10.85", orig: "2647 × 3254 px" },
  ];

  const tools = [
    { l: "Trim", c: "#4F46E5", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M6 9V2H18V9"/><path d="M6 22V15"/><path d="M18 22V15"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/></svg> },
    { l: "Flip / Rotate", c: "#0EA5E9", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 2v6h-6"/><path d="M21 8A9.96 9.96 0 0 0 12 4C7.03 4 3 8.03 3 13s4.03 9 9 9a9.96 9.96 0 0 0 8-4"/></svg> },
    { l: "Remove Color", c: "#A855F7", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><line x1="2" y1="2" x2="22" y2="22"/></svg> },
    { l: "Replace Color", c: "#F59E0B", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
    { l: "Enhance", c: "#F59E0B", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
    { l: "Type Text", c: "#4F46E5", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
    { l: "Guide", c: "#3B82F6", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg> },
    { l: "Coming Soon", c: "#D1D5DB", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  ];

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid rgba(79,70,229,0.08)", boxShadow: "0 50px 120px rgba(79,70,229,0.12)" }}>
      {/* Chrome bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "#FAFBFD", borderBottom: "1px solid #EEF0F4" }}>
        <div style={{ display: "flex", gap: 6, marginRight: 16 }}>
          {["#FF5F57", "#FFBD2E", "#28C840"].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, height: 28, background: "#F3F4F6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, fontFamily: BF }}>dtflayout.com/app</span>
        </div>
      </div>
      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <div style={{ width: 52, background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", padding: "12px 0", flexShrink: 0, fontFamily: BF, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <div style={{ width: 36, padding: "4px 0", borderRadius: 6, background: "rgba(79,70,229,0.2)", textAlign: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: "#A5B4FC" }}>124k</div>
            <div style={{ width: 24, height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 1, margin: "2px auto 0" }}>
              <div style={{ width: "5%", height: "100%", background: "#818CF8", borderRadius: 1 }} />
            </div>
          </div>
          {[
            { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
            { active: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
            { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
            { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
            { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
            { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
            { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
          ].map((n, i) => (
            <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: n.active ? P : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{n.icon}</div>
          ))}
        </div>
        {/* Main */}
        <div style={{ flex: 1, background: "#F7F7F5", padding: "14px 18px 0", display: "flex", flexDirection: "column", fontFamily: BF }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <h2 style={{ fontFamily: HF, fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>Create Your Gang Sheet</h2>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>Upload your designs and generate optimized layouts for DTF printing</p>
          </div>
          {/* Upload bar — compact like real app */}
          <div style={{ padding: 2, borderRadius: 12, background: "linear-gradient(135deg,#4F46E5,#7C3AED,#6366F1)", marginBottom: 6, flexShrink: 0, maxWidth: 560, margin: "0 auto 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#fff", borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Drop images here or click to browse</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>PNG, JPG, JPEG · Max 25 MB each</div>
              </div>
              <div style={{ padding: "6px 16px", borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", fontSize: 12, color: "#fff", fontWeight: 600, flexShrink: 0 }}>Browse Files</div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 14px", background: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 500, color: "#6B7280", border: "1px solid #E5E7EB" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1" }} />4 / 80 images uploaded
            </span>
          </div>
          {/* Toolbox */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 12, flexShrink: 0 }}>
            {tools.map((t, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.c, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: t.c !== "#D1D5DB" ? `0 3px 10px ${t.c}35` : "none" }}>{t.icon}</div>
                <span style={{ fontSize: 8, color: "#6B7280", fontWeight: 500, whiteSpace: "nowrap" }}>{t.l}</span>
              </div>
            ))}
          </div>
          {/* Uploaded Images header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, padding: "0 2px" }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: HF }}>Uploaded Images</span>
              <span style={{ fontSize: 10, color: "#9CA3AF", marginLeft: 8 }}>4 images ready for layout</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: "#9CA3AF" }}>Press & hold to preview:</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 1 ? "#C7D2FE" : i === 2 ? "#D1D5DB" : "#374151" }} />)}
              </div>
              <span style={{ fontSize: 10, color: "#9CA3AF", background: "#fff", padding: "2px 10px", borderRadius: 5, border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Grid 4
              </span>
            </div>
          </div>
          {/* Image cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 6 }}>
            {imgCards.map((card, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", padding: 10, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 40, height: 44, borderRadius: 5, flexShrink: 0, overflow: "hidden", backgroundImage: "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)", backgroundSize: "8px 8px", backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 28, height: 32, borderRadius: 3, background: "linear-gradient(145deg, #F472B660, #F472B630)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", border: "1px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: 6, color: "#9CA3AF", fontWeight: 600 }}>IMG</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.name}</div>
                  </div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 99, background: "#DCFCE7", marginBottom: 6, alignSelf: "flex-start" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A" }}>{card.dpi} DPI</span>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", border: "1.5px solid #F59E0B", background: "#FEF3C7" }} />
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 7, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>WIDTH</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#111827", background: "#F9FAFB", padding: "4px 6px", borderRadius: 5, border: "1px solid #E5E7EB" }}>{card.w} <span style={{ color: "#9CA3AF", fontSize: 8, fontWeight: 400 }}>in</span></div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 7, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>HEIGHT</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#111827", background: "#F9FAFB", padding: "4px 6px", borderRadius: 5, border: "1px solid #E5E7EB" }}>{card.h} <span style={{ color: "#9CA3AF", fontSize: 8, fontWeight: 400 }}>in</span></div>
                  </div>
                </div>
                <div style={{ fontSize: 8, color: "#9CA3AF", marginBottom: 5 }}>Original: {card.orig}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <div style={{ width: 24, height: 13, borderRadius: 7, background: P, position: "relative" }}><div style={{ position: "absolute", top: 1.5, right: 1.5, width: 10, height: 10, borderRadius: "50%", background: "#fff" }} /></div>
                  <span style={{ fontSize: 8, color: "#6B7280" }}>Lock Aspect Ratio</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <div style={{ flex: 1, padding: "4px 0", textAlign: "center", fontSize: 8, fontWeight: 500, color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>Edit
                  </div>
                  <div style={{ flex: 1, padding: "4px 0", textAlign: "center", fontSize: 8, fontWeight: 500, color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Duplicate
                  </div>
                  <div style={{ width: 26, padding: "4px 0", textAlign: "center", border: "1px solid #E5E7EB", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Bottom bar */}
          <div style={{ padding: "6px 0 10px" }}>
            <div style={{ background: "linear-gradient(135deg, #0F172A, #1E1B4B, #312E81)", padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Sheet Width</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.12)", padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 4 }}>23 inches <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Spacing (inches)</span>
                  <div style={{ width: 48, padding: "5px 8px", borderRadius: 6, background: "#fff", fontSize: 11, fontWeight: 500, color: "#1f2937", textAlign: "center" }}>0.3</div>
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.07)", padding: "5px 14px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.6)" }} />4 Images
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.8)", padding: "6px 16px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>Preview
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", padding: "6px 20px", borderRadius: 99, background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>Generate Layout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════ BENTO: Builder with image cards ══════════ */
function BentoBuilder() {
  return (
    <div style={{ background: tint.indigo, borderRadius: 16, padding: 16, height: 250, display: "flex", flexDirection: "column" }}>
      {/* Upload bar — compact */}
      <div style={{ padding: 2, borderRadius: 10, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", marginBottom: 8, maxWidth: 220, margin: "0 auto 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", background: "#fff", borderRadius: 8 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", flexShrink: 0 }} />
          <div style={{ flex: 1, height: 4, background: "#EEF2FF", borderRadius: 2 }} />
          <div style={{ padding: "2px 8px", borderRadius: 4, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", fontSize: 7, color: "#fff", fontWeight: 600 }}>Browse</div>
        </div>
      </div>
      {/* Mini image cards grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, overflow: "hidden" }}>
        {[
          { name: "design_01.png", c: "#818CF8" },
          { name: "skull_print.png", c: "#F472B6" },
          { name: "tiger_DTF.png", c: "#34D399" },
          { name: "vintage.png", c: "#FBBF24" },
          { name: "floral.png", c: "#60A5FA" },
          { name: "eagle.png", c: "#A78BFA" },
        ].map((card, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.9)", borderRadius: 6, padding: 4, border: "1px solid rgba(79,70,229,0.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ height: 28, borderRadius: 4, marginBottom: 3, backgroundImage: "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)", backgroundSize: "6px 6px", backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 16, height: 20, borderRadius: 2, background: `linear-gradient(145deg, ${card.c}70, ${card.c}30)`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
            </div>
            <div style={{ fontSize: 6, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{card.name}</div>
            <span style={{ fontSize: 5, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "1px 4px", borderRadius: 3, alignSelf: "flex-start" }}>300 DPI</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1E1B4B", borderRadius: 6, padding: "4px 8px" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {['23"', '0.3"'].map((t, i) => <span key={i} style={{ padding: "2px 5px", borderRadius: 3, background: "rgba(255,255,255,0.1)", fontSize: 7, color: "rgba(255,255,255,0.6)" }}>{t}</span>)}
        </div>
        <div style={{ padding: "3px 8px", borderRadius: 4, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", fontSize: 7, color: "#fff", fontWeight: 600 }}>Generate</div>
      </div>
    </div>
  );
}

/* ══════════ BENTO: Kanban with arrows ══════════ */
function BentoKanban() {
  const cols = [
    { l: "Pending", c: "#F59E0B", orders: ["#ORD-241", "#ORD-238", "#ORD-235"] },
    { l: "Paid", c: "#10B981", orders: ["#ORD-237", "#ORD-234"] },
    { l: "Done", c: "#6366F1", orders: ["#ORD-233", "#ORD-230"] },
  ];
  return (
    <div style={{ background: tint.mint, borderRadius: 16, padding: 16, height: 250 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", marginBottom: 3, fontFamily: HF }}>Orders Dashboard</div>
      <div style={{ fontSize: 9, color: "#6B7280", marginBottom: 10, fontFamily: BF }}>Drag-and-drop order management</div>
      <div style={{ display: "flex", gap: 5, height: 180, alignItems: "stretch" }}>
        {cols.map((col, ci) => (
          <div key={ci} style={{ display: "flex", alignItems: "stretch", gap: 0, flex: 1 }}>
            {/* Column */}
            <div style={{ flex: 1, background: "rgba(255,255,255,0.8)", borderRadius: 8, padding: 5, border: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col.c }} />
                <span style={{ fontSize: 8, fontWeight: 600, color: "#111827", fontFamily: BF }}>{col.l}</span>
                <span style={{ fontSize: 7, color: "#9CA3AF", marginLeft: "auto", background: "#F3F4F6", padding: "1px 4px", borderRadius: 3 }}>{col.orders.length}</span>
              </div>
              {col.orders.map((order, j) => (
                <div key={j} style={{ background: "#fff", borderRadius: 5, padding: "5px 6px", marginBottom: 3, border: "1px solid #F3F4F6", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: `${col.c}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 6, height: 6, borderRadius: 1, background: `${col.c}40` }} />
                    </div>
                    <span style={{ fontSize: 7, fontWeight: 600, color: "#374151" }}>{order}</span>
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    <div style={{ height: 2, borderRadius: 1, background: "#E5E7EB", flex: 1 }} />
                    <div style={{ height: 2, borderRadius: 1, background: "#F3F4F6", width: "30%" }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Arrow between columns */}
            {ci < 2 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 14, flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5h6M6 3l2 2-2 2" stroke="#10B981" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════ BENTO: Quick Store ══════════ */
function BentoStore() {
  return (
    <div style={{ background: tint.peach, borderRadius: 16, padding: 16, height: 250, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {["Domain", "Design", "Products"].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: i < 2 ? "#F59E0B" : "rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: i < 2 ? "#fff" : "#F59E0B" }}>{i < 2 ? "✓" : (i + 1)}</div>
              <span style={{ fontSize: 8, fontWeight: 600, color: i < 2 ? "#92400E" : "#D97706" }}>{s}</span>
              {i < 2 && <div style={{ width: 12, height: 1, background: "#FDE68A" }} />}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.9)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.04)", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 14, height: 14, borderRadius: 3, background: "#F59E0B" }} /><div style={{ width: 40, height: 4, borderRadius: 2, background: "#FDE68A" }} /></div>
            <div style={{ display: "flex", gap: 8 }}>{[1, 2, 3].map(i => <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: "#FEF3C7" }} />)}</div>
          </div>
          <div style={{ padding: "10px", textAlign: "center" }}>
            <div style={{ height: 5, borderRadius: 3, background: "#FDE68A", width: "60%", margin: "0 auto 4px" }} />
            <div style={{ height: 3, borderRadius: 2, background: "#FEF3C7", width: "40%", margin: "0 auto 6px" }} />
            <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 4, background: "#F59E0B", fontSize: 7, color: "#fff", fontWeight: 600 }}>Shop Now</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: "0 8px 8px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ borderRadius: 5, overflow: "hidden", border: `2px dashed ${i <= 2 ? "transparent" : "#FDE68A"}`, background: i <= 2 ? "#fff" : "rgba(253,230,138,0.1)", boxShadow: i === 2 ? "0 4px 12px rgba(245,158,11,0.15)" : "none" }}>
                <div style={{ height: 28, background: i <= 2 ? `hsl(${25 + i * 18}, 85%, 92%)` : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i === 3 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                </div>
                {i <= 2 && <div style={{ padding: 3 }}><div style={{ height: 3, borderRadius: 1, background: "#FDE68A", marginBottom: 2, width: "70%" }} /><div style={{ height: 2, borderRadius: 1, background: "#FEF3C7", width: "40%" }} /></div>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.8)", borderRadius: 6, padding: "4px 8px", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#16A34A" }} />
          <span style={{ fontSize: 8, color: "#92400E", fontWeight: 500 }}>yourstore.dtflayout.com</span>
          <span style={{ fontSize: 7, color: "#16A34A", fontWeight: 600, marginLeft: "auto" }}>Live</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════ BENTO: White Label ══════════ */
function BentoWhiteLabel() {
  return (
    <div style={{ background: tint.pink, borderRadius: 16, padding: 16, height: 250 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", marginBottom: 3, fontFamily: HF }}>Appearance Settings</div>
      <div style={{ fontSize: 9, color: "#6B7280", marginBottom: 10, fontFamily: BF }}>Full white-label customization</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {["#4F46E5", "#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#0EA5E9"].map((c, i) => (
          <div key={i} style={{ width: 28, height: 28, borderRadius: 7, background: c, border: i === 0 ? "2px solid #1E1B4B" : "2px solid rgba(255,255,255,0.8)", boxShadow: i === 0 ? "0 0 0 2px #C7D2FE" : `0 2px 5px ${c}25` }} />
        ))}
      </div>
      <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: 7, padding: "7px 10px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 7, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#6B7280", fontFamily: BF }}>Font Family</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#111827", fontFamily: BF }}>Inter ▾</span>
      </div>
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {[{ l: "Pill", r: 99 }, { l: "Rounded", r: 8 }, { l: "Square", r: 2 }].map((b, i) => (
          <span key={i} style={{ flex: 1, padding: "4px 0", textAlign: "center", fontSize: 8, fontWeight: 600, borderRadius: b.r, background: i === 0 ? P : "rgba(255,255,255,0.8)", color: i === 0 ? "#fff" : P, fontFamily: BF, border: `1px solid ${i === 0 ? P : "#C7D2FE"}` }}>{b.l}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[{ l: "Logo loader", on: true }, { l: "Live chat", on: false }].map((s, i) => (
          <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.8)", borderRadius: 7, padding: "6px 8px", border: "1px solid rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: 8, color: "#6B7280", fontFamily: BF }}>{s.l}</span>
            <div style={{ marginTop: 3, width: 28, height: 14, borderRadius: 7, background: s.on ? P : "#D1D5DB", position: "relative" }}>
              <div style={{ position: "absolute", top: 2, [s.on ? "right" : "left"]: 2, width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════ Animated Moving Pattern — reusable ══════════ */
function MovingPattern({ opacity = 0.3 }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Floating light orbs — visible against dark bg */}
      <div className="orb orb-1" style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)", top: "-15%", left: "-10%", filter: "blur(40px)" }} />
      <div className="orb orb-2" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", top: "15%", right: "-12%", filter: "blur(30px)" }} />
      <div className="orb orb-3" style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)", bottom: "5%", left: "25%", filter: "blur(35px)" }} />
      <div className="orb orb-4" style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,181,253,0.3) 0%, transparent 60%)", top: "40%", left: "5%", filter: "blur(25px)" }} />
      <div className="orb orb-5" style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 60%)", top: "0%", right: "20%", filter: "blur(30px)" }} />
      {/* Animated grid mesh */}
      <div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: `
        linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)
      `, backgroundSize: "80px 80px" }} />
    </div>
  );
}

/* ══════════ CSS — injected via useEffect in component ══════════ */
const ANIM_CSS = `
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes orbFloat1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(60px, 40px) scale(1.1); }
    50% { transform: translate(20px, 80px) scale(0.95); }
    75% { transform: translate(-40px, 30px) scale(1.05); }
  }
  @keyframes orbFloat2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(-50px, 60px) scale(1.08); }
    50% { transform: translate(-80px, 20px) scale(0.92); }
    75% { transform: translate(-20px, -40px) scale(1.03); }
  }
  @keyframes orbFloat3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(70px, -30px) scale(1.12); }
    66% { transform: translate(-30px, -60px) scale(0.9); }
  }
  @keyframes orbFloat4 {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(40px, -50px); }
    50% { transform: translate(80px, 20px); }
    75% { transform: translate(30px, 60px); }
  }
  @keyframes orbFloat5 {
    0%, 100% { transform: translate(0, 0); }
    30% { transform: translate(-60px, 40px); }
    60% { transform: translate(20px, -30px); }
  }
  @keyframes gridDrift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(60px, 60px); }
  }
  .orb-1 { animation: orbFloat1 8s ease-in-out infinite; }
  .orb-2 { animation: orbFloat2 10s ease-in-out infinite; }
  .orb-3 { animation: orbFloat3 7s ease-in-out infinite; }
  .orb-4 { animation: orbFloat4 9s ease-in-out infinite; }
  .orb-5 { animation: orbFloat5 6s ease-in-out infinite; }
  .grid-drift { animation: gridDrift 8s linear infinite; }
  .bento-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .bento-card:hover { transform: translateY(-8px); box-shadow: 0 24px 56px rgba(79,70,229,0.12) !important; border-color: #C7D2FE !important; }
  .bento-card:hover .bento-inner { transform: scale(1.02); }
  .bento-inner { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .hw-card { transition: all 0.3s ease; }
  .hw-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.08) !important; }
  .ow-item { transition: all 0.2s ease; border-radius: 10px; margin: 0 -8px; padding-left: 8px !important; padding-right: 8px !important; cursor: default; }
  .ow-item:hover { background: rgba(79,70,229,0.04); transform: translateX(4px); }
  .hiw-bg {
    background: linear-gradient(270deg, #E0E7FF, #C7D2FE, #DDD6FE, #C7D2FE, #E0E7FF);
    background-size: 400% 400%;
    animation: gradientShift 8s ease infinite;
  }
`;


/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export default function Home() {
  const [sc, setSc] = useState(false);
  const [dd, setDd] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);

  // Inject animation CSS
  useEffect(() => {
    if (!document.querySelector("style[data-dtf]")) {
      const tag = document.createElement("style");
      tag.setAttribute("data-dtf", "1");
      tag.textContent = ANIM_CSS;
      document.head.appendChild(tag);
    }
    return () => {
      const tag = document.querySelector("style[data-dtf]");
      if (tag) tag.remove();
    };
  }, []);

  return (
    <div style={{ fontFamily: BF, color: "#111827", background: "#FAFAFB" }}>

      {/* ═══ NAV — Solid indigo, matches builder sidebar ═══ */}
      <div style={{ position: "fixed", top: 16, left: 0, right: 0, zIndex: 100, padding: "0 32px" }}>
        <nav style={{
          maxWidth: 960, margin: "0 auto",
          background: "linear-gradient(135deg, #1E1B4B, #252272, #1E1B4B)",
          borderRadius: 16,
          padding: "0 8px 0 24px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          boxShadow: "0 8px 32px rgba(15,13,46,0.5), 0 2px 8px rgba(0,0,0,0.2)",
          transition: "all 0.4s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <span style={{ fontFamily: HF, fontWeight: 700, fontSize: 16, color: "#fff" }}>DTF Layout</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link to="/" style={{ fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer", padding: "8px 14px", textDecoration: "none" }}>Home</Link>
            <div style={{ position: "relative" }} onMouseEnter={() => setDd(true)} onMouseLeave={() => setDd(false)}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 10, background: dd ? "rgba(255,255,255,0.08)" : "transparent", transition: "background 0.2s" }}>
                Product {ic.chev}
              </span>
              {dd && (
                <div style={{ position: "absolute", top: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", width: 260 }}>
                  <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", boxShadow: "0 20px 56px rgba(0,0,0,0.15)", padding: 5 }}>
                    {[
                      { l: "Gang Sheet Builder", d: "Auto-layout optimized gang sheets", to: "/product" },
                      { l: "Website Integration", d: "Embed builder on any website", to: "/product" },
                      { l: "Quick Store", d: "Full storefront, zero coding", to: "/product" },
                    ].map((it, i) => (
                      <Link key={i} to={it.to} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", transition: "background 0.15s", display: "block", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.background = "#EEF2FF"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{it.l}</div>
                        <div style={{ fontSize: 10, color: "#6B7280" }}>{it.d}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {[
              { l: "Pricing", to: "/pricing" },
              { l: "FAQ", to: "/faq" },
              { l: "Contact", to: "/contact" },
            ].map(item => (
              <Link key={item.l} to={item.to} style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "8px 14px", textDecoration: "none" }}>{item.l}</Link>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "8px 14px", textDecoration: "none" }}>Login</Link>
            <button onClick={() => navigate("/signup")} style={{
              fontFamily: BF, fontWeight: 600, fontSize: 14, cursor: "pointer",
              padding: "10px 24px", borderRadius: 12,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              color: "#fff", border: "none",
              boxShadow: "0 4px 16px rgba(79,70,229,0.4)",
              transition: "all 0.25s",
            }}>Register →</button>
          </div>
        </nav>
      </div>

      {/* ═══ HERO — no white gap ═══ */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(180deg, #0A0820 0%, #0F0D2E 12%, #1E1B4B 24%, #312E81 36%, #4F46E5 48%, #6366F1 55%, #818CF8 62%, #A5B4FC 68%, #C7D2FE 74%, #E0E7FF 80%, #EEF2FF 86%, #FAFAFB 92%)",
        padding: "0 40px 0",
      }}>
        <Dots o={0.04} />
        <MovingPattern />

        {/* ═══ HERO content ═══ */}
        <div style={{ padding: "140px 0 0" }}>
          <Sq top={20} right={140} size={32} rotate={18} />
          <Sq top={100} right={80} size={22} rotate={-12} />
          <Sq top={30} left={100} size={28} rotate={22} />
          <Sq top={150} left={60} size={20} rotate={-8} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill>Smart DTF Sheet Builder — Now Available</Pill>
            <h1 style={{ fontFamily: HF, fontSize: 64, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>
              Build Gang Sheets Smarter, Print with Confidence
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}>
              Upload your designs, auto-arrange them into optimized sheets in seconds, and get print-ready files instantly — all in one platform built for DTF printers.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              <Btn sz="l" onClick={() => navigate("/signup")} style={{ background: "#fff", color: P, boxShadow: "0 6px 28px rgba(0,0,0,0.15)" }}>Get Started Now →</Btn>
              <Btn v="o" sz="l" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.3)", boxShadow: "none" }}>Watch a demo →</Btn>
            </div>
            {/* Highlighted free text */}
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginTop: 20, fontWeight: 500 }}>
              <span style={{ background: "rgba(255,255,255,0.15)", padding: "6px 20px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />
                20,000 sq.inch free · No credit card required
              </span>
            </p>
          </div>
          <div style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "72px auto 0", padding: "0 20px" }}>
            <HeroShot />
          </div>
          <div style={{ height: 60, background: "#FAFAFB" }} />
        </div>
      </section>

      {/* ═══ PRODUCTS BENTO ═══ */}
      <section style={{ padding: "100px 40px 120px", position: "relative" }}>
        <Sq top={40} right={80} size={30} rotate={20} />
        <Sq bottom={80} left={60} size={24} rotate={-15} />
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ maxWidth: 640, marginBottom: 56 }}>
            <h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-0.03em" }}>Solutions for every step of your DTF workflow</h2>
            <p style={{ fontSize: 20, color: "#374151", lineHeight: 1.6, margin: 0, fontWeight: 500, position: "relative", paddingLeft: 20, borderLeft: "3px solid #4F46E5" }}>
              Whether you have a <span style={{ color: P, fontWeight: 700 }}>Shopify</span> store, a <span style={{ color: P, fontWeight: 700 }}>WooCommerce</span> site, or{" "}
              <span style={{ fontWeight: 700, background: "linear-gradient(180deg, transparent 10%, #C7D2FE 10%)", padding: "0 3px", borderRadius: 2 }}>no website at all</span> — we've got you covered.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { t: "Auto-layout gang sheet builder", d: "Upload images, hit build. Our algorithm arranges everything in seconds — what used to take hours, now takes minutes. Built-in BG remover, enhancer, trimmer, and text editor.", ui: <BentoBuilder /> },
              { t: "Embed on any website", d: "Your customers build their own gang sheets on your store. Manage orders with drag-and-drop Kanban. Works with Shopify, WooCommerce, and more.", ui: <BentoKanban /> },
              { t: "No website? No problem.", d: "Get a fully functional storefront at your own subdomain. Customers browse, build sheets, and place orders — managed from your dashboard.", ui: <BentoStore /> },
              { t: "Make it look like your tool", d: "Customize colors, fonts, button styles, logo, and favicon. 8 color zones, 20 Google Fonts, live chat injection, and more.", ui: <BentoWhiteLabel /> },
            ].map((card, i) => (
              <div key={i} className="bento-card" style={{ background: "#fff", borderRadius: 24, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", cursor: "default" }}>
                <div className="bento-inner" style={{ padding: 20 }}>{card.ui}</div>
                <div style={{ padding: "4px 28px 32px" }}>
                  <h3 style={{ fontFamily: HF, fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>{card.t}</h3>
                  <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.65, margin: "0 0 14px" }}>{card.d}</p>
                  <Link to="/product" style={{ fontSize: 14, fontWeight: 600, color: P, cursor: "pointer", textDecoration: "none" }}>Learn More ↗</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — Animated gradient ═══ */}
      <section className="hiw-bg" style={{ padding: "120px 40px", position: "relative" }}>
        <Dots o={0.1} />
        <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 12px" }}>How It Works — 3 Simple Steps</h2>
            <p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.7 }}>Create Your DTF Print Sheet in Minutes</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              {
                num: "1", title: "Upload Your Files", desc: "Simply drag and drop your PNG artwork — instant previews make it effortless to get started.",
                inner: (
                  <div style={{ height: 180, borderRadius: 12, border: "2px dashed #C7D2FE", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    <span style={{ fontSize: 13, fontWeight: 700, color: P, textTransform: "uppercase", letterSpacing: "0.05em" }}>DROP FILES HERE</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>or click to browse</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      {["#F472B6", "#F97316", "#818CF8"].map((c, i) => <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: c, opacity: 0.7 }} />)}
                    </div>
                  </div>
                ),
              },
              {
                num: "2", title: "Set the Dimensions", desc: "Enter your required width and height — the aspect ratio stays perfectly maintained for accurate print sizing.",
                inner: (
                  <div style={{ height: 180, borderRadius: 12, border: "1px solid #E5E7EB", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #EC4899, #F472B6)", opacity: 0.7 }} />
                      <div><div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Your Design File.png</div><div style={{ fontSize: 10, color: "#9CA3AF" }}>PNG Image</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <div><div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600 }}>WIDTH</div><div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>12.00 <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>inches</span></div></div>
                      <div><div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600 }}>HEIGHT</div><div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>18.00 <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>inches</span></div></div>
                    </div>
                    <div style={{ fontSize: 10, color: "#9CA3AF" }}>Original: 3600 × 5400 px</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 28, height: 15, borderRadius: 8, background: P, position: "relative" }}><div style={{ position: "absolute", top: 2, right: 2, width: 11, height: 11, borderRadius: "50%", background: "#fff" }} /></div>
                      <span style={{ fontSize: 11, color: "#374151" }}>Lock Aspect Ratio</span>
                    </div>
                    <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 99, background: "#DCFCE7", alignSelf: "flex-start" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A" }}>300 DPI</span></div>
                  </div>
                ),
              },
              {
                num: "3", title: "Generate Sheet", desc: "With one click, your images are arranged into a clean, print-ready sheet ready to download.",
                inner: (
                  <div style={{ height: 180, borderRadius: 12, border: "1px solid #E5E7EB", padding: 14, display: "flex", flexDirection: "column", background: "#FAFAFB" }}>
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 6 }}>
                      {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ borderRadius: 6, background: ["#C7D2FE", "#DDD6FE", "#C7D2FE", "#E0E7FF", "#DDD6FE", "#E0E7FF"][i], opacity: 0.6 }} />)}
                    </div>
                    <div style={{ marginTop: 10, padding: "8px 0", borderRadius: 10, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", textAlign: "center", color: "#fff", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                      Generate Sheet
                    </div>
                  </div>
                ),
              },
            ].map((step, i) => (
              <div key={i} className="hw-card" style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", position: "relative", padding: "28px 24px 24px" }}>
                <div style={{ position: "absolute", top: 12, left: 12, width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800, boxShadow: "0 4px 12px rgba(79,70,229,0.3)", zIndex: 2 }}>
                  {step.num}
                </div>
                <div style={{ marginTop: 24 }}>
                  <div style={{ marginBottom: 20 }}>{step.inner}</div>
                  <h3 style={{ fontFamily: HF, fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ OLD WAY vs DTF LAYOUT — Spacious VS, bigger fonts ═══ */}
      <section style={{ padding: "120px 40px", position: "relative" }}>
        <Sq top={50} right={100} size={30} rotate={15} />
        <Sq bottom={60} left={80} size={26} rotate={-22} />
        <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Pill>Why switch?</Pill>
            <h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "18px 0 0" }}>The old way vs The DTF Layout way</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 0, alignItems: "stretch" }}>
            {/* Old way */}
            <div style={{ background: "#FAFAFA", borderRadius: 24, border: "1px solid #E5E7EB", padding: "40px 36px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", fontFamily: HF }}>The old way</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF" }}>Manual, slow, expensive</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { t: "Manually arrange each image in Photoshop", time: "~45 min" },
                  { t: "Handle customer files via email or WeTransfer", time: "~20 min" },
                  { t: "Track orders in spreadsheets", time: "Error-prone" },
                  { t: "No storefront without a website", time: "Lost sales" },
                  { t: "Monthly subscriptions or per-order fees", time: "$149+/mo" },
                  { t: "Limited to one platform (Shopify only)", time: "Lock-in" },
                ].map((item, i) => (
                  <div key={i} className="ow-item" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: i < 5 ? "1px solid #F3F4F6" : "none" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", flexShrink: 0, opacity: 0.5 }} />
                    <span style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.5, flex: 1 }}>{item.t}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", background: "#FEF2F2", padding: "4px 12px", borderRadius: 99, flexShrink: 0 }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* VS divider — spacious */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fff", border: "2px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HF, fontWeight: 800, fontSize: 15, color: "#9CA3AF", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", zIndex: 2 }}>VS</div>
            </div>
            {/* DTF Layout way */}
            <div style={{ background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)", borderRadius: 24, border: "2px solid #C7D2FE", padding: "40px 36px", position: "relative" }}>
              <div style={{ position: "absolute", top: -12, right: 24, padding: "5px 18px", borderRadius: 99, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 12px rgba(79,70,229,0.3)" }}>Recommended</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", fontFamily: HF }}>The DTF Layout way</div>
                  <div style={{ fontSize: 13, color: "#6366F1" }}>Automated, fast, affordable</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { t: "Auto-arrange all images in seconds", time: "~2 min" },
                  { t: "Customers build their own sheets on your site", time: "Self-serve" },
                  { t: "Full Kanban dashboard for order management", time: "Organized" },
                  { t: "Launch your own storefront with Quick Store", time: "Zero code" },
                  { t: "Credit-based pricing — no monthly fees", time: "Pay once" },
                  { t: "Works with any website — no platform lock-in", time: "Freedom" },
                ].map((item, i) => (
                  <div key={i} className="ow-item" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: i < 5 ? "1px solid rgba(79,70,229,0.08)" : "none" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 3px rgba(79,70,229,0.1)" }}>
                      <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke={P} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <span style={{ fontSize: 15, color: "#374151", lineHeight: 1.5, fontWeight: 500, flex: 1 }}>{item.t}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: P, background: "#EEF2FF", padding: "4px 12px", borderRadius: 99, flexShrink: 0 }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON — Bigger fonts, darker text, red crosses ═══ */}
      <section style={{ padding: "120px 40px", background: "#fff", position: "relative" }}>
        <Dots o={0.06} />
        <div style={{ maxWidth: 940, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Pill>Feature comparison</Pill>
            <h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "18px 0 14px" }}>How we stack up</h2>
            <p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.7 }}>No subscriptions. No per-order cuts. No platform lock-in.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* DTF Layout */}
            <div style={{ background: "linear-gradient(135deg, #1E1B4B, #312E81)", borderRadius: 20, padding: "32px 32px 28px", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                </div>
                <span style={{ fontFamily: HF, fontWeight: 700, fontSize: 20 }}>DTF Layout</span>
              </div>
              {[
                { f: "Pricing model", v: "Credits (one-time buy)" },
                { f: "Monthly fees", v: "None, ever" },
                { f: "Per-order cut", v: "None" },
                { f: "Standalone store", v: "Quick Store included" },
                { f: "Platform support", v: "Any website" },
                { f: "White-label builder", v: "Full customization" },
                { f: "Background remover", v: "Included" },
                { f: "Image enhancer", v: "Included" },
                { f: "Text editor", v: "Included" },
                { f: "Multi-sheet export", v: "Up to 5 sheets" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                  <span style={{ fontSize: 14, color: "rgba(165,180,252,0.8)", fontWeight: 500 }}>{row.f}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#C7D2FE", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#34D399" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
            {/* Others */}
            <div style={{ background: "#FAFAFA", borderRadius: 20, border: "1px solid #E5E7EB", padding: "32px 32px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
                </div>
                <span style={{ fontFamily: HF, fontWeight: 700, fontSize: 20, color: "#6B7280" }}>Others</span>
              </div>
              {[
                { f: "Pricing model", v: "5% per order or $149–999/mo", bad: true },
                { f: "Monthly fees", v: "$0–999/month", bad: true },
                { f: "Per-order cut", v: "Up to $12/order", bad: true },
                { f: "Standalone store", v: "Not available", bad: true },
                { f: "Platform support", v: "Shopify / WooCommerce only", bad: true },
                { f: "White-label builder", v: "Logo only or limited", bad: true },
                { f: "Background remover", v: "Paid or unavailable", bad: true },
                { f: "Image enhancer", v: "Not available", bad: true },
                { f: "Text editor", v: "Limited or unavailable", bad: true },
                { f: "Multi-sheet export", v: "Available", bad: false },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < 9 ? "1px solid #F3F4F6" : "none" }}>
                  <span style={{ fontSize: 14, color: "#6B7280", fontWeight: 500 }}>{row.f}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: row.bad ? "#6B7280" : "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                    {row.bad ? (
                      <svg width="14" height="14" viewBox="0 0 12 12"><line x1="3" y1="3" x2="9" y2="9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="3" x2="3" y2="9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#6B7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "120px 40px", position: "relative", overflow: "hidden" }}>
        <Dots o={0.1} />
        <Sq top={60} right={160} size={34} rotate={15} />
        <Sq bottom={60} left={140} size={28} rotate={-20} />
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: HF, fontSize: 44, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Ready to speed up your workflow?</h2>
          <p style={{ fontSize: 16, color: "#6B7280", lineHeight: 1.7, margin: "0 0 40px" }}>Start with 20,000 sq.inch free. No credit card required. No monthly fees, ever.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            <Btn sz="l" onClick={() => navigate("/signup")}>Get Started Now →</Btn>
            <Btn v="o" sz="l" onClick={() => navigate("/pricing")}>View Pricing →</Btn>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", padding: "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}>
        {/* Top divider */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} />
        <div style={{ paddingTop: 64 }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
                <span style={{ fontFamily: HF, fontWeight: 700, fontSize: 15, color: "#fff" }}>DTF Layout</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide. Auto-arrange, optimize, and print — all from one platform.</p>
            </div>
            <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{l:"Gang Sheet Builder",to:"/product"},{l:"Website Integration",to:"/product"},{l:"Quick Store",to:"/product"},{l:"Pricing",to:"/pricing"}].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, cursor: "pointer", display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{l:"FAQ",to:"/faq"},{l:"Contact",to:"/contact"},{l:"Blog",to:"/"}].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, cursor: "pointer", display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{l:"Privacy Policy",to:"/privacy-policy"},{l:"Terms & Conditions",to:"/terms-conditions"},{l:"Refund Policy",to:"/refund-policy"}].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, cursor: "pointer", display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
          </div>
          <div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span>
            <span style={{ fontSize: 13, cursor: "pointer" }}>dtflayout@gmail.com</span>
          </div>
        </div>
        </div>
      </footer>
    </div>
  );
}
