import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileTooltip } from "@/components/ui/tooltip";
import { Eye, Loader2, HelpCircle } from "lucide-react";

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
  barColor?: string;
  accentColor?: string;
  buttonRadius?: string;
}

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
  barColor,
  accentColor,
  buttonRadius,
}) => {
  const canGenerate = imageCount > 0 && !creditsDisabled && !isGenerating;
  const canPreview = hasLayout && !isGenerating;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-2 sm:pb-4 px-2 sm:px-4 pointer-events-none animate-slide-up">
      {/* Floating pill container with dark gradient */}
      <div 
        className={`w-full sm:w-[92%] md:w-[85%] lg:w-[80%] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] pointer-events-auto border ${barColor ? 'border-white/10' : 'bg-gradient-dark border-indigo-500/20'}`}
        style={barColor ? { backgroundColor: barColor } : undefined}
      >
        <div className="px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Mobile: stacked 2-row layout. Desktop: single row (md+) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-6 lg:gap-8">
            
            {/* Row 1 (mobile) / Left (desktop): Sheet Width + Spacing */}
            <div className="flex items-center justify-between md:justify-start gap-3 md:gap-6 lg:gap-8">
              {/* Sheet Width */}
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 md:flex-initial">
                <Label className="text-xs sm:text-sm font-medium text-white/70 whitespace-nowrap flex items-center gap-1 md:gap-1.5">
                  <span className="hidden sm:inline">Sheet </span>Width
                  <MobileTooltip content={widthReadOnly ? "Sheet width is fixed for this product." : "Set your sheet width here — the generated file will use this exact width."}>
                    <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/70 transition-colors cursor-help" />
                  </MobileTooltip>
                </Label>
                {widthReadOnly ? (
                  <div className="w-full md:w-[180px] h-9 sm:h-10 rounded-lg bg-white/15 text-white border border-white/20 shadow-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 px-2">
                    <span>{canvasWidthInches}"</span>
                    <span className="text-[10px] sm:text-xs text-white/40">(fixed)</span>
                  </div>
                ) : (
                  <Select
                    value={canvasWidthInches.toString()}
                    onValueChange={(value) => onWidthChange(Number(value))}
                  >
                    <SelectTrigger className="w-full md:w-[180px] h-9 sm:h-10 rounded-lg bg-white/15 text-white border-white/20 shadow-lg text-xs sm:text-sm font-semibold hover:bg-white/25 transition-all duration-200 [&>svg]:text-white px-2 sm:px-3">
                      <SelectValue placeholder="Width" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-gray-200 bg-gray-900">
                      <SelectItem value="10.5" className="text-base font-medium text-white focus:bg-gray-700 focus:text-white data-[state=checked]:text-white">10.5 inches</SelectItem>
                      <SelectItem value="11" className="text-base font-medium text-white focus:bg-gray-700 focus:text-white data-[state=checked]:text-white">11 inches</SelectItem>
                      <SelectItem value="11.5" className="text-base font-medium text-white focus:bg-gray-700 focus:text-white data-[state=checked]:text-white">11.5 inches</SelectItem>
                      <SelectItem value="22" className="text-base font-medium text-white focus:bg-gray-700 focus:text-white data-[state=checked]:text-white">22 inches</SelectItem>
                      <SelectItem value="22.5" className="text-base font-medium text-white focus:bg-gray-700 focus:text-white data-[state=checked]:text-white">22.5 inches</SelectItem>
                      <SelectItem value="23" className="text-base font-medium text-white focus:bg-gray-700 focus:text-white data-[state=checked]:text-white">23 inches</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Spacing */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <Label className="text-xs sm:text-sm font-medium text-white/70 whitespace-nowrap flex items-center gap-1 md:gap-1.5">
                  Spacing<span className="hidden sm:inline"> (inches)</span>
                  <MobileTooltip content="Enter the spacing/padding you want around your images. 0.3 works best for cutting.">
                    <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/70 transition-colors cursor-help" />
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
                  className="w-[64px] sm:w-[80px] h-9 sm:h-10 px-2 sm:px-3 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs sm:text-sm font-medium shadow-sm hover:border-gray-400 transition-colors focus:ring-2 focus:ring-white/50 focus:border-white/50"
                />
              </div>
            </div>

            {/* Image count indicator (desktop only) */}
            {imageCount > 0 && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20">
                <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white/70">
                  {imageCount} image{imageCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Row 2 (mobile) / Right (desktop): Action Buttons */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Preview Button */}
              <MobileTooltip 
                content={canPreview ? "Preview your generated layout" : "Generate a layout first to preview"}
              >
                <span className="flex-1 md:flex-initial">
                  <Button
                    onClick={onOpenPreview}
                    disabled={!canPreview}
                    variant="outline"
                    className={`w-full md:w-auto h-9 sm:h-10 px-3 sm:px-5 rounded-lg border-2 font-semibold text-xs sm:text-sm transition-all duration-200 ${
                      canPreview 
                        ? "border-white text-white bg-transparent hover:bg-white/10 hover:border-white hover:text-white" 
                        : "border-white/20 text-white/30 cursor-not-allowed bg-transparent"
                    }`}
                  >
                    <Eye className={`mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 ${canPreview ? "text-white" : "text-white/30"}`} />
                    Preview
                  </Button>
                </span>
              </MobileTooltip>

              {/* Generate Layout Button */}
              <Button
                onClick={onGenerateLayout}
                disabled={!canGenerate}
                className={`flex-1 md:flex-initial h-9 sm:h-10 px-4 sm:px-6 text-white text-xs sm:text-sm font-bold shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  !accentColor ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_8px_24px_rgba(79,70,229,0.4)] rounded-full' : ''
                }`}
                style={accentColor ? { backgroundColor: accentColor, borderRadius: buttonRadius || '9999px' } : undefined}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                    <span className="sm:hidden">Generating</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Generate Layout</span>
                    <span className="sm:hidden">Generate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingLayoutBar;
