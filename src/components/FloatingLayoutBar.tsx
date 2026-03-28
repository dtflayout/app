import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileTooltip } from "@/components/ui/tooltip";
import { Eye, Loader2, HelpCircle, Sun, Moon } from "lucide-react";

type BarTheme = 'light' | 'dark';

interface FloatingLayoutBarProps {
  // Sheet settings
  canvasWidthInches: number;
  onWidthChange: (width: number) => void;
  spacingInches: number;
  onSpacingChange: (spacing: number) => void;
  
  // Actions
  onGenerateLayout: () => void;
  onOpenPreview: () => void;
  
  // State
  imageCount: number;
  hasLayout: boolean;
  isGenerating: boolean;
  creditsDisabled: boolean;
  
  // Read-only mode (for public builder - width is fixed)
  widthReadOnly?: boolean;
  
  // Appearance overrides from builder settings
  barColorLight?: string;
  barColorDark?: string;
  /** @deprecated Use barColorLight/barColorDark instead */
  barColor?: string;
  accentColor?: string;
  buttonRadius?: string;
  
  // Toggle control — hide toggle when printer has set explicit colors
  showThemeToggle?: boolean;
  defaultTheme?: BarTheme;
}

const BAR_THEME_KEY = 'dtf-bar-theme';

export const FloatingLayoutBar: React.FC<FloatingLayoutBarProps> = ({
  canvasWidthInches,
  onWidthChange,
  spacingInches,
  onSpacingChange,
  onGenerateLayout,
  onOpenPreview,
  imageCount,
  hasLayout,
  isGenerating,
  creditsDisabled,
  widthReadOnly = false,
  barColorLight,
  barColorDark,
  barColor,
  accentColor,
  buttonRadius,
  showThemeToggle = true,
  defaultTheme,
}) => {
  const canGenerate = imageCount > 0 && !creditsDisabled && !isGenerating;
  const canPreview = hasLayout && !isGenerating;

  // Theme state — persists in localStorage
  const [theme, setTheme] = useState<BarTheme>(() => {
    if (defaultTheme) return defaultTheme;
    try {
      const saved = localStorage.getItem(BAR_THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'light';
  });

  useEffect(() => {
    try { localStorage.setItem(BAR_THEME_KEY, theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // Determine if printer has overridden bar color (legacy single barColor or new dual colors)
  const printerHasCustomColor = !!(barColor || barColorLight || barColorDark);
  const canToggle = showThemeToggle && !barColor; // Hide toggle if legacy single barColor is set
  
  // Resolve the actual background
  const isDark = theme === 'dark';
  let barBg: string;
  let barStyle: React.CSSProperties;

  if (barColor) {
    // Legacy: single barColor from printer — always use it, no toggle
    barBg = '';
    barStyle = { backgroundColor: barColor };
  } else if (isDark) {
    barBg = barColorDark ? '' : 'bg-gradient-dark';
    barStyle = barColorDark ? { backgroundColor: barColorDark } : {};
  } else {
    barBg = '';
    barStyle = barColorLight
      ? { backgroundColor: barColorLight }
      : { background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' };
  }

  // Dynamic text/border colors
  const textPrimary = isDark && !barColor ? 'text-white' : (barColor ? 'text-white' : 'text-gray-800');
  const textSecondary = isDark && !barColor ? 'text-white/60' : (barColor ? 'text-white/70' : 'text-gray-500');
  const borderColor = isDark && !barColor ? 'border-white/10' : (barColor ? 'border-white/10' : 'border-gray-200/60');
  const inputBg = isDark && !barColor ? 'bg-white/12 border-white/15 text-white' : (barColor ? 'bg-white/15 border-white/20 text-white' : 'bg-white/60 border-gray-200 text-gray-800');
  const countBg = isDark && !barColor ? 'bg-white/8 border-white/15 text-white/70' : (barColor ? 'bg-white/10 border-white/20 text-white/70' : 'bg-indigo-50 border-indigo-100 text-indigo-600');
  const countDot = isDark && !barColor ? 'bg-white/60' : (barColor ? 'bg-white/60' : 'bg-indigo-500');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none animate-slide-up">
      <div 
        className={`w-[80%] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] pointer-events-auto border ${borderColor} ${barBg}`}
        style={barStyle}
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-8">
            
            {/* Left: Sheet Width */}
            <div className="flex items-center gap-3">
              <Label className={`text-sm font-medium ${textSecondary} whitespace-nowrap flex items-center gap-1.5`}>
                Sheet Width
                <MobileTooltip content={widthReadOnly ? "Sheet width is fixed for this product." : "Set your sheet width here — the generated file will use this exact width."}>
                  <HelpCircle className={`w-3.5 h-3.5 opacity-50 hover:opacity-80 transition-colors cursor-help`} />
                </MobileTooltip>
              </Label>
              {widthReadOnly ? (
                <div className={`w-[180px] h-10 rounded-lg ${inputBg} shadow-sm text-sm font-semibold flex items-center justify-center gap-2 border`}>
                  <span>{canvasWidthInches} inches</span>
                  <span className="text-xs opacity-50">(fixed)</span>
                </div>
              ) : (
                <Select
                  value={canvasWidthInches.toString()}
                  onValueChange={(value) => onWidthChange(Number(value))}
                >
                  <SelectTrigger className={`w-[180px] h-10 rounded-lg ${inputBg} shadow-sm text-sm font-semibold hover:opacity-90 transition-all duration-200 border [&>svg]:${isDark ? 'text-white' : 'text-gray-500'}`}>
                    <SelectValue placeholder="Select width" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border-gray-200 bg-white">
                    <SelectItem value="10.5" className="text-base font-medium">10.5 inches</SelectItem>
                    <SelectItem value="11" className="text-base font-medium">11 inches</SelectItem>
                    <SelectItem value="11.5" className="text-base font-medium">11.5 inches</SelectItem>
                    <SelectItem value="22" className="text-base font-medium">22 inches</SelectItem>
                    <SelectItem value="22.5" className="text-base font-medium">22.5 inches</SelectItem>
                    <SelectItem value="23" className="text-base font-medium">23 inches</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Center: Spacing */}
            <div className="flex items-center gap-3">
              <Label className={`text-sm font-medium ${textSecondary} whitespace-nowrap flex items-center gap-1.5`}>
                Spacing (inches)
                <MobileTooltip content="Enter the spacing/padding you want around your images. 0.3 works best for cutting.">
                  <HelpCircle className="w-3.5 h-3.5 opacity-50 hover:opacity-80 transition-colors cursor-help" />
                </MobileTooltip>
              </Label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="2"
                value={spacingInches}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0.1 && value <= 2) {
                    onSpacingChange(value);
                  }
                }}
                className={`w-[80px] h-10 px-3 rounded-lg border ${inputBg} text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50`}
              />
            </div>

            {/* Image count indicator */}
            {imageCount > 0 && (
              <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 ${countBg} rounded-full border`}>
                <div className={`w-2 h-2 ${countDot} rounded-full animate-pulse`}></div>
                <span className="text-xs font-medium">
                  {imageCount} image{imageCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Preview Button */}
              <MobileTooltip 
                content={canPreview ? "Preview your generated layout" : "Generate a layout first to preview"}
              >
                <span>
                  <Button
                    onClick={onOpenPreview}
                    disabled={!canPreview}
                    variant="outline"
                    className={`h-10 px-5 rounded-full border-[1.5px] font-semibold transition-all duration-200 ${
                      canPreview 
                        ? isDark || barColor
                          ? "border-white/30 text-white bg-transparent hover:bg-white/10"
                          : "border-gray-300 text-gray-600 bg-transparent hover:bg-gray-50 hover:border-gray-400"
                        : isDark || barColor
                          ? "border-white/10 text-white/20 cursor-not-allowed bg-transparent"
                          : "border-gray-200 text-gray-300 cursor-not-allowed bg-transparent"
                    }`}
                  >
                    <Eye className={`mr-2 h-4 w-4`} />
                    Preview
                  </Button>
                </span>
              </MobileTooltip>

              {/* Generate Layout Button */}
              <Button
                onClick={onGenerateLayout}
                disabled={!canGenerate}
                className={`h-10 px-6 text-white text-sm font-bold shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  !accentColor ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_8px_24px_rgba(79,70,229,0.4)] rounded-full' : ''
                }`}
                style={accentColor ? { backgroundColor: accentColor, borderRadius: buttonRadius || '9999px' } : undefined}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Layout"
                )}
              </Button>

              {/* Dark/Light Theme Toggle */}
              {canToggle && (
                <div className={`border-l ${borderColor} pl-3 ml-1`}>
                  <button
                    onClick={toggleTheme}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/20 text-white/70'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                    }`}
                    title={isDark ? 'Switch to light bar' : 'Switch to dark bar'}
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingLayoutBar;
