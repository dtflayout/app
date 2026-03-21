import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpFromLine,
  Search,
  X,
  Check,
  Plus,
  RotateCcw,
  Minus,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  TextRenderConfig,
  defaultTextConfig,
  renderTextToCanvas,
  renderTextToBlob,
  WarpStyle,
  WARP_STYLES,
} from "@/utils/textRenderUtils";
import {
  FontCategory,
  FontEntry,
  FONT_CATEGORIES,
  FONT_CATALOG,
  getFontsByCategory,
  searchFonts,
  loadFont,
  loadFontCategory,
  isCategoryLoaded,
  isFontLoaded,
} from "@/utils/fontCatalog";
import { PreviewBackgroundToggle, PreviewBackground, getPreviewBackgroundStyle } from "./PreviewBackgroundToggle";
import { toast } from "sonner";

interface TextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImage: (blob: Blob, url: string, width: number, height: number, fileName: string) => void;
}

const TextEditorModal: React.FC<TextEditorModalProps> = ({
  isOpen,
  onClose,
  onAddImage,
}) => {
  // ============ TEXT CONFIG STATE ============
  const [config, setConfig] = useState<TextRenderConfig>({
    ...defaultTextConfig,
    text: "Your Text Here",
  });

  // ============ UI STATE ============
  const [previewBg, setPreviewBg] = useState<PreviewBackground>("checker");
  const [activeCategory, setActiveCategory] = useState<FontCategory>("display");
  const [fontSearch, setFontSearch] = useState("");
  const [loadingFont, setLoadingFont] = useState<string | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [categoryLoaded, setCategoryLoaded] = useState<Set<FontCategory>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(String(defaultTextConfig.fontSize));
  const [strokeWidthInput, setStrokeWidthInput] = useState(String(defaultTextConfig.strokeWidth));
  const [zoom, setZoom] = useState(100); // percentage: 10-300
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // ============ REFS ============
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // ============ RESET ON OPEN ============
  useEffect(() => {
    if (isOpen) {
      setConfig({ ...defaultTextConfig, text: "Your Text Here" });
      setFontSearch("");
      setActiveCategory("display");
      setFontSizeInput(String(defaultTextConfig.fontSize));
      setStrokeWidthInput(String(defaultTextConfig.strokeWidth));
      setZoom(100);
      setRenderedSize({ w: 0, h: 0 });
      setIsPanning(false);
      setCategoryLoaded(new Set());
      // Load default font + batch load display category
      loadFont(defaultTextConfig.fontFamily);
      loadCategoryFonts("display");
    }
  }, [isOpen]);

  // Batch-load all fonts when category tab changes
  const loadCategoryFonts = async (category: FontCategory) => {
    if (isCategoryLoaded(category)) {
      setCategoryLoaded(prev => new Set([...prev, category]));
      return;
    }
    setLoadingCategory(true);
    await loadFontCategory(category);
    setCategoryLoaded(prev => new Set([...prev, category]));
    setLoadingCategory(false);
  };

  const handleCategoryChange = (category: FontCategory) => {
    setActiveCategory(category);
    loadCategoryFonts(category);
  };

  // ============ CONFIG UPDATER ============
  const updateConfig = useCallback(<K extends keyof TextRenderConfig>(
    key: K,
    value: TextRenderConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // ============ PREVIEW RENDERING ============
  const drawPreview = useCallback(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas || !config.text.trim()) {
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
        canvas.getContext("2d")?.clearRect(0, 0, 1, 1);
      }
      setRenderedSize({ w: 0, h: 0 });
      return;
    }

    try {
      // Render at 2x internal scale for crisp preview at any zoom
      const previewConfig = { ...config, scale: 2 };
      const rendered = renderTextToCanvas(previewConfig);

      // Store logical size (1x) for display
      const logicalW = Math.round(rendered.width / 2);
      const logicalH = Math.round(rendered.height / 2);
      setRenderedSize({ w: logicalW, h: logicalH });

      // Canvas is 2x resolution, logical size stored in state for zoom control
      canvas.width = rendered.width;
      canvas.height = rendered.height;

      const ctx = canvas.getContext("2d")!;

      // Draw checkerboard or solid background at 2x
      const bgStyle = getPreviewBackgroundStyle(previewBg);
      if (bgStyle.backgroundImage) {
        const checkerSize = 20; // 20px at 2x = 10px logical
        for (let y = 0; y < rendered.height; y += checkerSize) {
          for (let x = 0; x < rendered.width; x += checkerSize) {
            const isLight = ((x / checkerSize) + (y / checkerSize)) % 2 === 0;
            ctx.fillStyle = isLight ? "#ffffff" : "#e2e8f0";
            ctx.fillRect(x, y, checkerSize, checkerSize);
          }
        }
      } else if (bgStyle.backgroundColor) {
        ctx.fillStyle = bgStyle.backgroundColor;
        ctx.fillRect(0, 0, rendered.width, rendered.height);
      }

      ctx.drawImage(rendered, 0, 0);
    } catch (error) {
      console.error("Preview render failed:", error);
    }
  }, [config, previewBg]);

  // Debounced preview
  useEffect(() => {
    if (!isOpen) return;

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    previewTimeoutRef.current = setTimeout(() => {
      drawPreview();
    }, 50);

    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, [isOpen, drawPreview]);

  // Auto-fit zoom when rendered size changes significantly
  useEffect(() => {
    if (!isOpen || renderedSize.w === 0 || renderedSize.h === 0) return;
    const container = previewContainerRef.current;
    if (!container) return;

    const availW = container.clientWidth - 64;
    const availH = container.clientHeight - 64;
    const fitW = (availW / renderedSize.w) * 100;
    const fitH = (availH / renderedSize.h) * 100;
    const fitZoom = Math.max(10, Math.min(600, Math.round(Math.min(fitW, fitH))));

    // Auto-fit if current zoom would overflow, or content is tiny
    const displayW = renderedSize.w * zoom / 100;
    const displayH = renderedSize.h * zoom / 100;
    if (displayW > availW + 20 || displayH > availH + 20 || (displayW < availW * 0.2 && displayH < availH * 0.2)) {
      setZoom(fitZoom);
    }
  }, [renderedSize.w, renderedSize.h, isOpen]); // intentionally exclude zoom

  // ============ FONT SELECTION ============
  const handleSelectFont = async (family: string) => {
    setLoadingFont(family);
    await loadFont(family);
    setLoadingFont(null);
    updateConfig("fontFamily", family);
  };

  // Load fonts for search results so they preview in their actual style
  const searchLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!fontSearch.trim()) return;
    if (searchLoadTimeoutRef.current) clearTimeout(searchLoadTimeoutRef.current);
    searchLoadTimeoutRef.current = setTimeout(() => {
      const results = searchFonts(fontSearch);
      // Load up to 15 fonts from search results
      results.slice(0, 15).forEach(f => {
        if (!isFontLoaded(f.family)) loadFont(f.family);
      });
    }, 300);
    return () => { if (searchLoadTimeoutRef.current) clearTimeout(searchLoadTimeoutRef.current); };
  }, [fontSearch]);

  // ============ ADD TO SHEET ============
  const handleAddToSheet = async () => {
    if (!config.text.trim()) {
      toast.warning("Please enter some text");
      return;
    }

    setIsAdding(true);
    try {
      // Render at high quality (2x scale for print quality)
      const highResConfig: TextRenderConfig = { ...config, scale: 2 };
      const { blob, url, width, height } = await renderTextToBlob(highResConfig);

      // Generate a filename from the text
      const textSnippet = config.text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      const fileName = `text_${textSnippet}.png`;

      onAddImage(blob, url, width, height, fileName);
      toast.success("Text added to sheet");
      onClose();
    } catch (error) {
      console.error("Failed to add text:", error);
      toast.error("Failed to add text");
    } finally {
      setIsAdding(false);
    }
  };

  // ============ FONT LIST ============
  const displayedFonts: FontEntry[] = fontSearch.trim()
    ? searchFonts(fontSearch)
    : getFontsByCategory(activeCategory);

  // ============ COMPUTED ============
  const fontEntry = FONT_CATALOG.find(f => f.family === config.fontFamily);
  const hasBold = fontEntry ? fontEntry.weights.includes(700) : false;
  const hasItalic = fontEntry ? fontEntry.italic : false;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[98vw] w-[1700px] h-[90vh] p-0 gap-0 overflow-hidden bg-white rounded-2xl border-0 shadow-2xl [&>button]:hidden"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Type className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Type Text</h2>
              <p className="text-xs text-gray-400">Create text graphics for your sheet</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PreviewBackgroundToggle value={previewBg} onChange={setPreviewBg} />
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-red-50 group"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ============ LEFT SIDEBAR ============ */}
          <div className="w-[340px] min-w-[340px] border-r border-gray-100 overflow-y-auto bg-gray-50/50">
            <div className="p-4 space-y-5">

              {/* ---- TEXT INPUT ---- */}
              <section className="space-y-2">
                <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wider">Text</Label>
                <textarea
                  value={config.text}
                  onChange={(e) => updateConfig("text", e.target.value)}
                  placeholder="Enter your text..."
                  className="w-full h-28 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 transition-all"
                />
              </section>

              {/* ---- FONT PICKER ---- */}
              <section className="space-y-2.5">
                <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wider">Font Family</Label>

                {/* Current font display */}
                <div className="px-3 py-2.5 bg-white rounded-xl border border-gray-200 text-sm">
                  <span
                    className="text-gray-800 font-medium"
                    style={{ fontFamily: isFontLoaded(config.fontFamily) ? `"${config.fontFamily}"` : undefined }}
                  >
                    {config.fontFamily}
                  </span>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search fonts..."
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                  {fontSearch && (
                    <button
                      onClick={() => setFontSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category tabs */}
                {!fontSearch && (
                  <div className="flex flex-wrap gap-1">
                    {FONT_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                          activeCategory === cat.id
                            ? "bg-sky-600 text-white shadow-sm"
                            : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Font list */}
                <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-slate-50">
                  {loadingCategory && !categoryLoaded.has(activeCategory) && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                      <span className="text-xs text-gray-400">Loading fonts...</span>
                    </div>
                  )}
                  {displayedFonts.map(font => (
                    <button
                      key={font.family}
                      onClick={() => handleSelectFont(font.family)}
                      className={`w-full text-left px-3 py-2 text-sm transition-all flex items-center justify-between group ${
                        config.fontFamily === font.family
                          ? "bg-sky-50 text-sky-700"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span
                        className="truncate"
                        style={{
                          fontFamily: isFontLoaded(font.family) ? `"${font.family}"` : undefined,
                        }}
                      >
                        {font.family}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {loadingFont === font.family && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                        )}
                        {config.fontFamily === font.family && (
                          <Check className="w-3.5 h-3.5 text-sky-600" />
                        )}
                      </div>
                    </button>
                  ))}
                  {displayedFonts.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">No fonts found</div>
                  )}
                </div>
              </section>

              {/* ---- SIZE & STYLE ---- */}
              <section className="space-y-3">
                <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wider">Typography</Label>

                {/* Font Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Font Size</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const v = Math.max(8, config.fontSize - 2);
                          updateConfig("fontSize", v);
                          setFontSizeInput(String(v));
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="text"
                        value={fontSizeInput}
                        onChange={(e) => setFontSizeInput(e.target.value)}
                        onBlur={() => {
                          const v = Math.max(8, Math.min(500, parseInt(fontSizeInput) || config.fontSize));
                          updateConfig("fontSize", v);
                          setFontSizeInput(String(v));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="w-14 text-center text-xs font-mono bg-white border border-gray-200 rounded px-1 py-1"
                      />
                      <button
                        onClick={() => {
                          const v = Math.min(500, config.fontSize + 2);
                          updateConfig("fontSize", v);
                          setFontSizeInput(String(v));
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-xs text-gray-400 ml-0.5">px</span>
                    </div>
                  </div>
                  <Slider
                    value={[config.fontSize]}
                    onValueChange={([v]) => {
                      updateConfig("fontSize", v);
                      setFontSizeInput(String(v));
                    }}
                    min={8}
                    max={500}
                  />
                </div>

                {/* Font Weight */}
                {fontEntry && fontEntry.weights.length > 1 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Weight</span>
                      <span className="text-xs font-mono text-gray-400">{config.fontWeight}</span>
                    </div>
                    <Slider
                      value={[config.fontWeight]}
                      onValueChange={([v]) => {
                        // Snap to nearest available weight
                        const nearest = fontEntry!.weights.reduce((prev, curr) =>
                          Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev
                        );
                        updateConfig("fontWeight", nearest);
                      }}
                      min={Math.min(...fontEntry.weights)}
                      max={Math.max(...fontEntry.weights)}
                      step={1}
                    />
                  </div>
                )}

                {/* Bold + Italic toggles */}
                <div className="flex gap-2">
                  {hasBold && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig("fontWeight", config.fontWeight === 700 ? 400 : 700)}
                      className={`h-9 px-3 rounded-lg text-xs font-medium gap-1.5 ${
                        config.fontWeight === 700
                          ? "bg-sky-50 border-sky-300 text-sky-700"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                      Bold
                    </Button>
                  )}
                  {hasItalic && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig("italic", !config.italic)}
                      className={`h-9 px-3 rounded-lg text-xs font-medium gap-1.5 ${
                        config.italic
                          ? "bg-sky-50 border-sky-300 text-sky-700"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                      Italic
                    </Button>
                  )}
                </div>
              </section>

              {/* ---- SPACING ---- */}
              <section className="space-y-3">
                <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wider">Spacing</Label>

                {/* Letter Spacing */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Letter Spacing</span>
                    <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded">{config.letterSpacing}px</span>
                  </div>
                  <Slider
                    value={[config.letterSpacing]}
                    onValueChange={([v]) => updateConfig("letterSpacing", v)}
                    min={-10}
                    max={50}
                    step={1}
                  />
                </div>

                {/* Line Height */}
                {!config.vertical && config.warpStyle === "none" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Line Height</span>
                      <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded">{config.lineHeight.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[config.lineHeight * 10]}
                      onValueChange={([v]) => updateConfig("lineHeight", v / 10)}
                      min={5}
                      max={30}
                      step={1}
                    />
                  </div>
                )}
              </section>

              {/* ---- COLOR & STROKE ---- */}
              <section className="space-y-3">
                <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wider">Color & Stroke</Label>

                {/* Fill Color */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-600 font-medium flex-1">Fill Color</span>
                  <input
                    type="color"
                    value={config.fillColor}
                    onChange={(e) => updateConfig("fillColor", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <span className="text-xs font-mono text-gray-400 w-16">{config.fillColor}</span>
                </div>

                {/* Stroke Toggle */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => updateConfig("strokeEnabled", !config.strokeEnabled)}
                  >
                    <span className="text-xs text-gray-600 font-medium">Text Stroke</span>
                    <div className={`w-9 h-5 rounded-full transition-all ${config.strokeEnabled ? "bg-sky-500" : "bg-gray-200"} relative`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${config.strokeEnabled ? "left-[18px]" : "left-0.5"}`} />
                    </div>
                  </div>

                  {config.strokeEnabled && (
                    <div className="px-3 pb-3 space-y-3 border-t border-slate-50">
                      {/* Stroke Color */}
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-xs text-gray-500 flex-1">Stroke Color</span>
                        <input
                          type="color"
                          value={config.strokeColor}
                          onChange={(e) => updateConfig("strokeColor", e.target.value)}
                          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        />
                        <span className="text-xs font-mono text-gray-400 w-16">{config.strokeColor}</span>
                      </div>

                      {/* Stroke Width */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Stroke Width</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={strokeWidthInput}
                              onChange={(e) => setStrokeWidthInput(e.target.value)}
                              onBlur={() => {
                                const v = Math.max(1, Math.min(30, parseInt(strokeWidthInput) || config.strokeWidth));
                                updateConfig("strokeWidth", v);
                                setStrokeWidthInput(String(v));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              }}
                              className="w-10 text-center text-xs font-mono bg-white border border-gray-200 rounded px-1 py-0.5"
                            />
                            <span className="text-xs text-gray-400">px</span>
                          </div>
                        </div>
                        <Slider
                          value={[config.strokeWidth]}
                          onValueChange={([v]) => {
                            updateConfig("strokeWidth", v);
                            setStrokeWidthInput(String(v));
                          }}
                          min={1}
                          max={30}
                          step={1}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ---- LAYOUT ---- */}
              <section className="space-y-3">
                <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wider">Layout</Label>

                {/* Alignment */}
                {!config.vertical && config.warpStyle !== "arc-up" && config.warpStyle !== "arc-down" && (
                  <div className="flex gap-1.5">
                    {([
                      { value: "left", icon: AlignLeft },
                      { value: "center", icon: AlignCenter },
                      { value: "right", icon: AlignRight },
                    ] as const).map(({ value, icon: Icon }) => (
                      <Button
                        key={value}
                        variant="outline"
                        size="sm"
                        onClick={() => updateConfig("textAlign", value)}
                        className={`h-9 w-9 p-0 rounded-lg ${
                          config.textAlign === value
                            ? "bg-sky-50 border-sky-300 text-sky-700"
                            : "border-gray-200 text-gray-500"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </Button>
                    ))}
                  </div>
                )}

                {/* Vertical Toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    config.vertical
                      ? "bg-sky-50 border-sky-300"
                      : "bg-white border-gray-100 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    updateConfig("vertical", !config.vertical);
                    if (!config.vertical) updateConfig("warpStyle", "none");
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600 font-medium">Vertical Text</span>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-all ${config.vertical ? "bg-sky-500" : "bg-gray-200"} relative`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${config.vertical ? "left-[18px]" : "left-0.5"}`} />
                  </div>
                </div>
              </section>

              {/* ---- WARP / CURVE ---- */}
              {!config.vertical && (
                <section className="space-y-3">
                  <Label className="text-[13px] text-gray-600 font-semibold uppercase tracking-wider">Warp Style</Label>

                  {/* Warp style grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {WARP_STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => updateConfig("warpStyle", style.id)}
                        className={`px-2.5 py-2 text-[11px] font-medium rounded-lg transition-all text-left ${
                          config.warpStyle === style.id
                            ? "bg-sky-100 border-sky-400 text-sky-700 border"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>

                  {/* Bend intensity (only for non-none styles) */}
                  {config.warpStyle !== "none" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Bend Intensity</span>
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded">{config.warpBend}%</span>
                      </div>
                      <Slider
                        value={[config.warpBend]}
                        onValueChange={([v]) => updateConfig("warpBend", v)}
                        min={5}
                        max={100}
                        step={1}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* ---- RESET ---- */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfig({ ...defaultTextConfig, text: config.text });
                  setFontSizeInput(String(defaultTextConfig.fontSize));
                  setStrokeWidthInput(String(defaultTextConfig.strokeWidth));
                  loadFont(defaultTextConfig.fontFamily);
                }}
                className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium text-gray-500"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Reset to Defaults
              </Button>
            </div>
          </div>

          {/* ============ CANVAS AREA ============ */}
          <div className="flex-1 flex flex-col bg-gray-100/50">
            {/* Preview — scrollable + draggable when zoomed in */}
            <div
              ref={previewContainerRef}
              className="flex-1 overflow-auto"
              style={{
                cursor: isPanning ? "grabbing" : "grab",
                position: "relative",
              }}
              onMouseDown={(e) => {
                const container = previewContainerRef.current;
                if (!container) return;
                setIsPanning(true);
                panStartRef.current = {
                  x: e.clientX,
                  y: e.clientY,
                  scrollLeft: container.scrollLeft,
                  scrollTop: container.scrollTop,
                };
                e.preventDefault();
              }}
              onMouseMove={(e) => {
                if (!isPanning) return;
                const container = previewContainerRef.current;
                if (!container) return;
                const dx = e.clientX - panStartRef.current.x;
                const dy = e.clientY - panStartRef.current.y;
                container.scrollLeft = panStartRef.current.scrollLeft - dx;
                container.scrollTop = panStartRef.current.scrollTop - dy;
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
            >
              {config.text.trim() ? (
                <div
                  className="rounded-xl shadow-md overflow-hidden bg-white"
                  style={{
                    width: `${Math.round(renderedSize.w * zoom / 100)}px`,
                    height: `${Math.round(renderedSize.h * zoom / 100)}px`,
                    margin: "32px auto",
                    flexShrink: 0,
                  }}
                >
                  <canvas
                    ref={displayCanvasRef}
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-400 space-y-2" style={{ cursor: "default" }}>
                  <Type className="w-12 h-12 mx-auto text-gray-300" />
                  <p className="text-sm">Type something to see a preview</p>
                </div>
              )}
            </div>

            {/* Zoom + Dimensions bar */}
            {config.text.trim() && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-white/80 flex items-center justify-between gap-4">
                {/* Zoom controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom(z => Math.max(10, z - 10))}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-28">
                    <Slider
                      value={[zoom]}
                      onValueChange={([v]) => setZoom(v)}
                      min={10}
                      max={600}
                      step={5}
                    />
                  </div>
                  <button
                    onClick={() => setZoom(z => Math.min(600, z + 10))}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-gray-400 w-10 text-center">{zoom}%</span>
                  <button
                    onClick={() => {
                      const container = previewContainerRef.current;
                      if (container && renderedSize.w > 0 && renderedSize.h > 0) {
                        // Available space = container size minus margins (32px each side)
                        const availW = container.clientWidth - 64;
                        const availH = container.clientHeight - 64;
                        const fitW = (availW / renderedSize.w) * 100;
                        const fitH = (availH / renderedSize.h) * 100;
                        const fitZoom = Math.max(10, Math.min(600, Math.round(Math.min(fitW, fitH))));
                        setZoom(fitZoom);
                        // Reset scroll to top-left after fitting
                        setTimeout(() => {
                          if (container) {
                            container.scrollLeft = 0;
                            container.scrollTop = 0;
                          }
                        }, 50);
                      }
                    }}
                    className="px-2 py-1 text-[10px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Fit
                  </button>
                </div>

                {/* Dimensions */}
                <div className="text-xs text-gray-400">
                  {renderedSize.w > 0 && (
                    <>
                      Size: {renderedSize.w} × {renderedSize.h} px
                      <span className="mx-2">·</span>
                      Output: {renderedSize.w * 2} × {renderedSize.h * 2} px (2× print)
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10 px-5 rounded-xl border-gray-200 text-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddToSheet}
            disabled={!config.text.trim() || isAdding}
            className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add to Sheet
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TextEditorModal;
