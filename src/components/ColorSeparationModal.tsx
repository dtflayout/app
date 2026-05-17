/**
 * ColorSeparationModal — Per-region halftone control for vectorized images
 * 
 * Professional screen printing workflow in-browser:
 * 1. Parse vectorized SVG → extract color groups
 * 2. Display color swatches with hover-highlighting
 * 3. Toggle halftone per region with individual controls
 * 4. Auto-assign moiré-preventing angles
 * 5. Composite and apply to canvas
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Layers,
  Check,
  X,
  Loader2,
  ChevronLeft,
  CircleDashed,
  Coins,
  Palette,
  RotateCcw,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/contexts/CreditsContext";
import {
  ColorGroup,
  RegionHalftoneSettings,
  defaultRegionHalftone,
  extractColorGroups,
  autoAssignAngles,
  createHighlightPreview,
  compositeColorSeparation,
} from "@/utils/colorSeparationUtils";
import { AI_TOOL_CREDITS } from "@/utils/imageAnalyzerUtils";
import { DotShape } from "@/utils/halftoneUtils";

// ─── Types ───────────────────────────────────────────────────────────

interface ColorSeparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  svgContent: string;
  imageId: string;
  /** Called with the composited result blob URL and File */
  onApply: (imageId: string, blobUrl: string, file: File) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export const ColorSeparationModal: React.FC<ColorSeparationModalProps> = ({
  isOpen,
  onClose,
  svgContent,
  imageId,
  onApply,
}) => {
  const { credits, deductCredits } = useCredits();

  // ── State ──
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompositing, setIsCompositing] = useState(false);
  const [compositeProgress, setCompositeProgress] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const creditCost = AI_TOOL_CREDITS.COLOR_SEPARATION;
  const hasEnoughCredits = credits >= creditCost;
  const halftoneCount = colorGroups.filter(g => g.halftoneSettings?.enabled).length;

  // ── Parse SVG on open ──
  useEffect(() => {
    if (isOpen && svgContent) {
      try {
        const groups = extractColorGroups(svgContent);
        setColorGroups(groups);
        setSelectedColor(null);
        setHoveredColor(null);
        setParseError(null);
        updatePreview(svgContent, null, groups);
      } catch (err: any) {
        console.error('[ColorSep] Parse error:', err);
        setParseError(err.message || 'Failed to parse SVG');
      }
    }
  }, [isOpen, svgContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update preview on hover/select ──
  useEffect(() => {
    const activeColor = hoveredColor || selectedColor;
    if (isOpen && svgContent && colorGroups.length > 0) {
      updatePreview(svgContent, activeColor, colorGroups);
    }
  }, [hoveredColor, selectedColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePreview = useCallback(async (svg: string, highlight: string | null, groups: ColorGroup[]) => {
    try {
      const canvas = await createHighlightPreview(svg, highlight, groups, 600, 600);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blob = await canvasToBlob(canvas);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('[ColorSep] Preview error:', err);
    }
  }, [previewUrl]);

  // ── Toggle halftone for a color group ──
  const toggleHalftone = useCallback((color: string) => {
    setColorGroups(prev => {
      const updated = prev.map(g => {
        if (g.color !== color) return g;
        if (g.halftoneSettings?.enabled) {
          // Disable halftone
          return { ...g, halftoneSettings: null };
        }
        // Enable with auto-assigned angle
        const enabledCount = prev.filter(p => p.halftoneSettings?.enabled && p.color !== color).length;
        const ANGLES = [45, 15, 75, 0, 30, 60, 105, 135];
        return {
          ...g,
          halftoneSettings: {
            ...defaultRegionHalftone,
            angle: ANGLES[enabledCount % ANGLES.length],
          },
        };
      });
      return updated;
    });
    setSelectedColor(color);
  }, []);

  // ── Update halftone setting for selected region ──
  const updateRegionSetting = useCallback(<K extends keyof RegionHalftoneSettings>(
    color: string,
    key: K,
    value: RegionHalftoneSettings[K],
  ) => {
    setColorGroups(prev =>
      prev.map(g => {
        if (g.color !== color || !g.halftoneSettings) return g;
        return { ...g, halftoneSettings: { ...g.halftoneSettings, [key]: value } };
      })
    );
  }, []);

  // ── Auto-assign all angles ──
  const handleAutoAngles = useCallback(() => {
    setColorGroups(prev => autoAssignAngles(prev));
    toast.success('Angles auto-assigned for moiré prevention');
  }, []);

  // ── Composite & Apply ──
  const handleApply = useCallback(async () => {
    if (!svgContent || colorGroups.length === 0) return;

    if (halftoneCount === 0) {
      toast.error('Enable halftone on at least one color region');
      return;
    }

    if (!hasEnoughCredits) {
      toast.error(`Insufficient credits. Need ${creditCost.toLocaleString()}.`);
      return;
    }

    setIsCompositing(true);
    setCompositeProgress('Preparing regions...');

    try {
      const result = await compositeColorSeparation(
        colorGroups,
        svgContent,
        1200, // Output width — high res for print
        1200,
        (current, total) => {
          setCompositeProgress(`Processing region ${current} of ${total}...`);
        },
      );

      // Convert canvas to blob
      const blob = await canvasToBlob(result.canvas);
      const blobUrl = URL.createObjectURL(blob);
      const file = new File([blob], 'color_separated.png', { type: 'image/png' });

      // Deduct credits
      await deductCredits(creditCost, 'Color Separation');

      onApply(imageId, blobUrl, file);
      toast.success(`Color separation applied! ${creditCost.toLocaleString()} credits used.`);
      onClose();
    } catch (err: any) {
      console.error('[ColorSep] Composite error:', err);
      toast.error(err.message || 'Color separation failed');
    } finally {
      setIsCompositing(false);
      setCompositeProgress('');
    }
  }, [svgContent, colorGroups, halftoneCount, hasEnoughCredits, creditCost, deductCredits, imageId, onApply, onClose]);

  // ── Get the selected group ──
  const selectedGroup = colorGroups.find(g => g.color === selectedColor);

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            Color Separation
            <Badge variant="outline" className="ml-2 text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              Beta
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {parseError ? (
          <div className="flex items-center gap-2 text-sm text-red-600 p-4">
            <X className="w-4 h-4" />
            {parseError}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-col sm:flex-row gap-4 p-1">

              {/* ── Left: Preview ── */}
              <div className="sm:w-1/2 space-y-3">
                <div className="relative rounded-xl overflow-hidden border bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] aspect-square flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  )}
                  {(hoveredColor || selectedColor) && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-white/90 text-gray-700 border shadow-sm text-xs">
                        <div
                          className="w-2.5 h-2.5 rounded-full mr-1.5 border border-gray-300"
                          style={{ backgroundColor: hoveredColor || selectedColor || '' }}
                        />
                        {hoveredColor || selectedColor}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>{colorGroups.length} colors detected</span>
                  <span className="flex items-center gap-1">
                    <CircleDashed className="w-3 h-3" />
                    {halftoneCount} region{halftoneCount !== 1 ? 's' : ''} halftoned
                  </span>
                </div>
              </div>

              {/* ── Right: Controls ── */}
              <div className="sm:w-1/2 space-y-4">

                {/* Color swatches */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" />
                      Color Regions
                    </label>
                    <button
                      onClick={handleAutoAngles}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Auto-assign angles
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {colorGroups.map(group => {
                      const isSelected = selectedColor === group.color;
                      const isHalftoned = group.halftoneSettings?.enabled;
                      return (
                        <button
                          key={group.color}
                          onClick={() => setSelectedColor(isSelected ? null : group.color)}
                          onMouseEnter={() => setHoveredColor(group.color)}
                          onMouseLeave={() => setHoveredColor(null)}
                          className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-indigo-500 ring-2 ring-indigo-200 scale-110'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: group.color }}
                          title={`${group.color} (${group.elementCount} elements)`}
                        >
                          {isHalftoned && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                              <CircleDashed className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Per-region controls (when a swatch is selected) */}
                {selectedGroup && (
                  <div className="rounded-xl border bg-white p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border border-gray-300"
                          style={{ backgroundColor: selectedGroup.color }}
                        />
                        <span className="text-sm font-medium">{selectedGroup.color}</span>
                        <span className="text-xs text-muted-foreground">
                          ({selectedGroup.elementCount} elements)
                        </span>
                      </div>
                    </div>

                    {/* Toggle halftone */}
                    <button
                      onClick={() => toggleHalftone(selectedGroup.color)}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-all border ${
                        selectedGroup.halftoneSettings?.enabled
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {selectedGroup.halftoneSettings?.enabled ? (
                        <span className="flex items-center justify-center gap-2">
                          <CircleDashed className="w-4 h-4" /> Halftone Enabled
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Enable Halftone for this Region
                        </span>
                      )}
                    </button>

                    {/* Halftone controls */}
                    {selectedGroup.halftoneSettings?.enabled && (
                      <div className="space-y-4 pt-1">
                        {/* Strength */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">Strength</label>
                            <span className="text-xs text-muted-foreground">{selectedGroup.halftoneSettings.strength}%</span>
                          </div>
                          <Slider
                            value={[selectedGroup.halftoneSettings.strength]}
                            onValueChange={([v]) => updateRegionSetting(selectedGroup.color, 'strength', v)}
                            min={0}
                            max={100}
                            step={5}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>More solid</span>
                            <span>More dots</span>
                          </div>
                        </div>

                        {/* LPI */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">LPI (dot density)</label>
                            <span className="text-xs text-muted-foreground">{selectedGroup.halftoneSettings.lpi}</span>
                          </div>
                          <Slider
                            value={[selectedGroup.halftoneSettings.lpi]}
                            onValueChange={([v]) => updateRegionSetting(selectedGroup.color, 'lpi', v)}
                            min={20}
                            max={60}
                            step={5}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Bigger dots</span>
                            <span>Finer dots</span>
                          </div>
                        </div>

                        {/* Angle */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">Angle</label>
                            <span className="text-xs text-muted-foreground">{selectedGroup.halftoneSettings.angle}°</span>
                          </div>
                          <Slider
                            value={[selectedGroup.halftoneSettings.angle]}
                            onValueChange={([v]) => updateRegionSetting(selectedGroup.color, 'angle', v)}
                            min={0}
                            max={175}
                            step={5}
                          />
                        </div>

                        {/* Dot shape */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Dot Shape</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['round', 'ellipse', 'diamond', 'line'] as DotShape[]).map(shape => (
                              <button
                                key={shape}
                                onClick={() => updateRegionSetting(selectedGroup.color, 'dotShape', shape)}
                                className={`py-1.5 rounded text-xs font-medium transition-all border ${
                                  selectedGroup.halftoneSettings?.dotShape === shape
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {shape.charAt(0).toUpperCase() + shape.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No selection prompt */}
                {!selectedGroup && colorGroups.length > 0 && (
                  <div className="rounded-xl border border-dashed bg-gray-50/50 p-6 text-center space-y-2">
                    <Palette className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Click a color swatch to select a region
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Then enable halftone and adjust settings per region
                    </p>
                  </div>
                )}

                {/* Credit cost & Apply */}
                <div className="space-y-3 pt-2">
                  {!hasEnoughCredits && (
                    <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-2.5 border border-red-200/50">
                      <Coins className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Insufficient credits. Need {creditCost.toLocaleString()}.{' '}
                        <a href="/app/billing" className="underline font-medium">Buy credits</a>
                      </span>
                    </div>
                  )}

                  <Button
                    onClick={handleApply}
                    disabled={isCompositing || halftoneCount === 0 || !hasEnoughCredits}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md"
                    size="lg"
                  >
                    {isCompositing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {compositeProgress}
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4 mr-2" />
                        Apply Color Separation
                        <span className="ml-2 text-xs opacity-80">
                          ({creditCost.toLocaleString()} credits)
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas to blob failed')),
      'image/png'
    );
  });
}

export default ColorSeparationModal;
