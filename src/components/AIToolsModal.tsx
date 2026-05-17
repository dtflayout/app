/**
 * AIToolsModal — AI-powered image tools for DTF Layout builder
 * 
 * Features:
 * - Smart Image Analyzer (auto-detects image type, recommends tool)
 * - AI Enhance (Real-ESRGAN via Replicate: 2x/4x upscale)
 * - AI Vectorize (Vectorizer.AI: raster → SVG → high-res PNG for canvas)
 * 
 * Opens from Toolbox "AI Tools" button. User picks an image, sees analysis,
 * then enhances or vectorizes. Result replaces the original on the canvas.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Wand2,
  Zap,
  ArrowRight,
  Check,
  X,
  Loader2,
  ChevronLeft,
  Eye,
  ArrowUpRight,
  Coins,
  AlertTriangle,
  Infinity,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import {
  analyzeImage,
  ImageAnalysis,
  AI_TOOL_CREDITS,
  AI_TOOLS_MAX_FILE_SIZE,
} from "@/utils/imageAnalyzerUtils";
import type { ImageObject } from "@/components/CollageCreator";

// ─── Types ───────────────────────────────────────────────────────────

type AIToolStep = 'pick-image' | 'analyze' | 'result';
type ActiveTool = 'enhance' | 'vectorize';
type ScaleOption = 2 | 4;

interface AIToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageObject[];
  initialImageId?: string;
  /** Called when an image is enhanced/vectorized — parent replaces original with result */
  onEnhanceComplete: (imageId: string, newBlobUrl: string, newFile: File, svgContent?: string) => void;
  /** Called to open color separation modal for a vectorized image */
  onOpenColorSep?: (imageId: string, svgContent: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export const AIToolsModal: React.FC<AIToolsModalProps> = ({
  isOpen,
  onClose,
  images,
  initialImageId,
  onEnhanceComplete,
  onOpenColorSep,
}) => {
  const { session } = useAuth();
  const { credits, deductCredits } = useCredits();

  // ── State ──
  const [step, setStep] = useState<AIToolStep>('pick-image');
  const [selectedImage, setSelectedImage] = useState<ImageObject | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Enhance state
  const [scale, setScale] = useState<ScaleOption>(4);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Vectorize state
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  // Shared result state
  const [activeTool, setActiveTool] = useState<ActiveTool>('enhance');
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [resultDimensions, setResultDimensions] = useState<{ width: number; height: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const isProcessing = isEnhancing || isVectorizing;

  // ── Reset on open/close ──
  useEffect(() => {
    if (isOpen) {
      resetState();

      if (initialImageId) {
        const img = images.find(i => i.id === initialImageId);
        if (img) {
          setSelectedImage(img);
          setStep('analyze');
          return;
        }
      }

      if (images.length === 1) {
        setSelectedImage(images[0]);
        setStep('analyze');
      } else {
        setStep('pick-image');
      }
    } else {
      abortRef.current?.abort();
      if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetState = () => {
    setToolError(null);
    setResultBlobUrl(null);
    setResultDimensions(null);
    setSvgContent(null);
    setShowOriginal(false);
    setIsEnhancing(false);
    setIsVectorizing(false);
    setAnalysis(null);
    setScale(4);
    setSelectedImage(null);
  };

  // ── Auto-analyze when image selected ──
  useEffect(() => {
    if (step === 'analyze' && selectedImage && !analysis && !isAnalyzing) {
      runAnalysis(selectedImage);
    }
  }, [step, selectedImage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Analysis ──
  const runAnalysis = useCallback(async (image: ImageObject) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeImage(image.url);
      setAnalysis(result);
    } catch (err) {
      console.error('[AITools] Analysis failed:', err);
      setAnalysis({
        recommendation: 'enhance',
        confidence: 0.3,
        details: {
          uniqueColors: 0, flatColorRatio: 0, hasTransparency: false,
          semiTransparentRatio: 0, edgeSharpness: 0, noiseLevel: 0,
          dimensions: { width: 0, height: 0 },
        },
        vectorScore: 0, enhanceScore: 50, detectedType: 'Unknown',
      });
    }
    setIsAnalyzing(false);
  }, []);

  // ── Enhance ──
  const handleEnhance = useCallback(async () => {
    if (!selectedImage || !session?.access_token) return;

    const creditCost = AI_TOOL_CREDITS.ENHANCE_4X;
    if (credits < creditCost) {
      toast.error(`Insufficient credits. You need ${creditCost.toLocaleString()} credits.`);
      return;
    }
    if (selectedImage.file.size > AI_TOOLS_MAX_FILE_SIZE) {
      toast.error('Image exceeds 30MB limit.');
      return;
    }

    setIsEnhancing(true);
    setToolError(null);
    setActiveTool('enhance');
    cleanupResult();

    try {
      const base64 = await fileToBase64(selectedImage.file);

      abortRef.current = new AbortController();
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image: base64, scale, faceEnhance: false }),
        signal: abortRef.current.signal,
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Enhancement failed');

      // Download the enhanced image
      const imgResponse = await fetch(data.url);
      if (!imgResponse.ok) throw new Error('Failed to download enhanced image');
      const blob = await imgResponse.blob();
      const blobUrl = URL.createObjectURL(blob);

      const dims = await getImageDimensions(blobUrl);
      setResultDimensions(dims);
      setResultBlobUrl(blobUrl);

      // Deduct credits after success
      await deductCredits(creditCost, `AI Enhance ${scale}x`);

      setStep('result');
      toast.success(`Image enhanced at ${scale}x! ${creditCost.toLocaleString()} credits used.`);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[AITools] Enhance error:', err);
      setToolError(err.message || 'Enhancement failed. Please try again.');
      toast.error(err.message || 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  }, [selectedImage, session, scale, credits, deductCredits]);

  // ── Vectorize ──
  const handleVectorize = useCallback(async () => {
    if (!selectedImage || !session?.access_token) return;

    const creditCost = AI_TOOL_CREDITS.VECTORIZE;
    if (credits < creditCost) {
      toast.error(`Insufficient credits. You need ${creditCost.toLocaleString()} credits.`);
      return;
    }
    if (selectedImage.file.size > AI_TOOLS_MAX_FILE_SIZE) {
      toast.error('Image exceeds 30MB limit.');
      return;
    }

    setIsVectorizing(true);
    setToolError(null);
    setActiveTool('vectorize');
    cleanupResult();

    try {
      const base64 = await fileToBase64(selectedImage.file);

      abortRef.current = new AbortController();
      const response = await fetch('/api/vectorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image: base64 }),
        signal: abortRef.current.signal,
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Vectorization failed');

      const svg = data.svg as string;
      setSvgContent(svg);

      // Rasterize SVG to high-res PNG for canvas integration
      const origDims = analysis?.details.dimensions || { width: 800, height: 800 };
      const targetScale = Math.min(4, 4000 / Math.max(origDims.width, origDims.height));
      const targetW = Math.round(origDims.width * targetScale);
      const targetH = Math.round(origDims.height * targetScale);

      const { blobUrl, width, height } = await rasterizeSvg(svg, targetW, targetH);
      setResultBlobUrl(blobUrl);
      setResultDimensions({ width, height });

      // Deduct credits after success
      await deductCredits(creditCost, 'AI Vectorize');

      setStep('result');
      toast.success(`Image vectorized! ${creditCost.toLocaleString()} credits used.`);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[AITools] Vectorize error:', err);
      setToolError(err.message || 'Vectorization failed. Please try again.');
      toast.error(err.message || 'Vectorization failed');
    } finally {
      setIsVectorizing(false);
    }
  }, [selectedImage, session, credits, deductCredits, analysis]);

  // ── Apply result ──
  const handleApplyResult = useCallback(async () => {
    if (!selectedImage || !resultBlobUrl) return;

    try {
      const response = await fetch(resultBlobUrl);
      const blob = await response.blob();
      const suffix = activeTool === 'vectorize' ? 'vectorized' : 'enhanced';
      const file = new File([blob], `${suffix}_${selectedImage.file.name}`, { type: 'image/png' });

      // Pass SVG content for vectorized images (needed for Color Separation)
      const svgToStore = activeTool === 'vectorize' ? svgContent || undefined : undefined;
      onEnhanceComplete(selectedImage.id, resultBlobUrl, file, svgToStore);
      setResultBlobUrl(null); // Parent owns the blob URL now
      toast.success(`${activeTool === 'vectorize' ? 'Vectorized' : 'Enhanced'} image applied to canvas`);
      onClose();
    } catch (err) {
      console.error('[AITools] Apply failed:', err);
      toast.error('Failed to apply image');
    }
  }, [selectedImage, resultBlobUrl, activeTool, svgContent, onEnhanceComplete, onClose]);

  // ── Helpers ──
  const handleSelectImage = (image: ImageObject) => {
    setSelectedImage(image);
    setAnalysis(null);
    cleanupResult();
    setToolError(null);
    setStep('analyze');
  };

  const cleanupResult = () => {
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);
    setResultDimensions(null);
    setSvgContent(null);
  };

  const handleBack = () => {
    if (step === 'result') {
      cleanupResult();
      setStep('analyze');
    } else if (images.length > 1) {
      setStep('pick-image');
      setSelectedImage(null);
      setAnalysis(null);
    }
  };

  const enhanceCost = AI_TOOL_CREDITS.ENHANCE_4X;
  const vectorizeCost = AI_TOOL_CREDITS.VECTORIZE;

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-500" />
            AI Image Tools
            <Badge variant="outline" className="ml-2 text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              Beta
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-1">

          {/* ═══ Step 1: Pick Image ═══ */}
          {step === 'pick-image' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select an image to analyze and enhance with AI.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map(image => (
                  <button
                    key={image.id}
                    onClick={() => handleSelectImage(image)}
                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all duration-200 bg-gray-100"
                  >
                    <img src={image.thumbnailUrl} alt="Upload" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Step 2: Analysis + Tool Cards ═══ */}
          {step === 'analyze' && selectedImage && (
            <div className="space-y-5">
              {/* Image preview + analysis */}
              <div className="flex gap-4 items-start">
                <div className="w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border">
                  <img src={selectedImage.thumbnailUrl} alt="Selected" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing image...
                    </div>
                  ) : analysis ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-500/15 text-indigo-600 border-0 text-xs">
                          {analysis.detectedType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(analysis.confidence * 100)}% confidence
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{analysis.details.dimensions.width} × {analysis.details.dimensions.height}px</span>
                        <span>{analysis.details.uniqueColors.toLocaleString()} colors</span>
                        <span>Edges: {analysis.details.edgeSharpness > 0.5 ? 'Sharp' : analysis.details.edgeSharpness > 0.2 ? 'Mixed' : 'Soft'}</span>
                        {analysis.details.hasTransparency && <span>Has transparency</span>}
                      </div>
                      <div className="rounded-lg border bg-indigo-50/50 p-3 mt-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                          <Sparkles className="w-4 h-4" />
                          Recommended: {analysis.recommendation === 'enhance' ? 'AI Enhance' : 'AI Vectorize'}
                        </div>
                        <p className="text-xs text-indigo-600/70 mt-1">
                          {analysis.recommendation === 'enhance'
                            ? 'This looks like a photo or complex artwork. AI enhancement will upscale while preserving detail.'
                            : 'This looks like a logo or illustration with clean edges and few colors. Vectorizing will produce the crispest result.'}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* ── Enhance Card ── */}
              <ToolCard
                icon={<Zap className="w-4 h-4 text-white" />}
                iconBg="bg-amber-500"
                title="AI Enhance"
                subtitle="Upscale with Real-ESRGAN"
                creditCost={enhanceCost}
                recommended={analysis?.recommendation === 'enhance'}
                isProcessing={isEnhancing}
                processingLabel="Enhancing... (10-30 sec)"
                disabled={isProcessing || credits < enhanceCost || isAnalyzing}
                error={activeTool === 'enhance' ? toolError : null}
                insufficientCredits={credits < enhanceCost}
                credits={credits}
                onAction={handleEnhance}
                actionLabel={`Enhance at ${scale}×`}
                actionIcon={<Zap className="w-4 h-4" />}
              >
                {/* Scale selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Upscale Factor</label>
                  <div className="flex gap-2">
                    {([2, 4] as ScaleOption[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setScale(s)}
                        disabled={isProcessing}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                          scale === s
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {s}× Upscale
                        {analysis && (
                          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                            {analysis.details.dimensions.width * s} × {analysis.details.dimensions.height * s}px
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {analysis?.details.hasTransparency && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5 border border-amber-200/50">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>This image has transparency. The AI enhancer will process the visible content and preserve the transparent background.</span>
                  </div>
                )}
              </ToolCard>

              {/* ── Vectorize Card ── */}
              <ToolCard
                icon={<ArrowUpRight className="w-4 h-4 text-white" />}
                iconBg="bg-emerald-500"
                title="AI Vectorize"
                subtitle="Convert to infinitely scalable SVG"
                creditCost={vectorizeCost}
                recommended={analysis?.recommendation === 'vectorize'}
                isProcessing={isVectorizing}
                processingLabel="Vectorizing... (10-30 sec)"
                disabled={isProcessing || credits < vectorizeCost || isAnalyzing}
                error={activeTool === 'vectorize' ? toolError : null}
                insufficientCredits={credits < vectorizeCost}
                credits={credits}
                onAction={handleVectorize}
                actionLabel="Vectorize"
                actionIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2.5 border border-emerald-200/50">
                  <Infinity className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Produces a crisp vector that renders perfectly at any size. Best for logos, icons, cartoons, and line art. Placed on the canvas as a high-resolution PNG.</span>
                </div>
              </ToolCard>

              {/* ── Color Separate Card (shown if image has SVG data) ── */}
              {selectedImage?.svgContent && onOpenColorSep && (
                <div className="rounded-xl border overflow-hidden shadow-sm">
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center">
                          <Layers className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-sm">Color Separation</h3>
                          <p className="text-xs text-muted-foreground">Per-region halftone from vector data</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-medium">{AI_TOOL_CREDITS.COLOR_SEPARATION.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-violet-700 bg-violet-50 rounded-lg p-2.5 border border-violet-200/50">
                      <Layers className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>This image was vectorized. You can separate each color into its own region and apply independent halftone settings — like professional screen printing separation.</span>
                    </div>
                    <Button
                      onClick={() => {
                        onOpenColorSep(selectedImage.id, selectedImage.svgContent!);
                        onClose();
                      }}
                      disabled={credits < AI_TOOL_CREDITS.COLOR_SEPARATION}
                      className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md"
                      size="lg"
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Open Color Separation
                    </Button>
                  </div>
                </div>
              )}

              {/* Back button */}
              {images.length > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Choose different image
                </button>
              )}
            </div>
          )}

          {/* ═══ Step 3: Result (Before/After) ═══ */}
          {step === 'result' && selectedImage && resultBlobUrl && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">
                    {activeTool === 'vectorize' ? 'Vectorization' : 'Enhancement'} complete!
                  </span>
                </div>
                <button
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onMouseLeave={() => setShowOriginal(false)}
                  onTouchStart={() => setShowOriginal(true)}
                  onTouchEnd={() => setShowOriginal(false)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 active:bg-gray-100"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Hold to see original
                </button>
              </div>

              {/* Preview */}
              <div className="relative rounded-xl overflow-hidden border bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] aspect-video flex items-center justify-center">
                {showOriginal ? (
                  <img src={selectedImage.url} alt="Original" className="max-w-full max-h-full object-contain" />
                ) : activeTool === 'vectorize' && svgContent ? (
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`}
                    alt="Vectorized"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <img src={resultBlobUrl} alt="Enhanced" className="max-w-full max-h-full object-contain" />
                )}
                <div className="absolute top-3 left-3">
                  <Badge variant="outline" className={`text-xs border-0 ${
                    showOriginal ? 'bg-gray-900/70 text-white' : 'bg-emerald-500/90 text-white'
                  }`}>
                    {showOriginal
                      ? 'Original'
                      : activeTool === 'vectorize'
                        ? 'Vectorized (SVG)'
                        : `Enhanced ${scale}×`}
                  </Badge>
                </div>
              </div>

              {/* Dimension comparison */}
              {analysis && resultDimensions && (
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span>{analysis.details.dimensions.width} × {analysis.details.dimensions.height}px</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-medium text-foreground">
                    {resultDimensions.width} × {resultDimensions.height}px
                    {activeTool === 'vectorize' && (
                      <span className="text-emerald-600 ml-1">(vector-crisp)</span>
                    )}
                  </span>
                </div>
              )}

              {/* SVG info */}
              {activeTool === 'vectorize' && svgContent && (
                <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50/70 rounded-lg p-2.5 border border-emerald-200/50">
                  <Infinity className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    The vector SVG is stored internally. A high-resolution PNG will be placed on your canvas for the gang sheet. Color separation tools will use the vector data for precision halftoning.
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Try Again
                </Button>
                <Button
                  onClick={handleApplyResult}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Apply to Canvas
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Reusable Tool Card ──────────────────────────────────────────────

interface ToolCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  creditCost: number;
  recommended?: boolean;
  isProcessing: boolean;
  processingLabel: string;
  disabled: boolean;
  error: string | null;
  insufficientCredits: boolean;
  credits: number;
  onAction: () => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
  children?: React.ReactNode;
}

const ToolCard: React.FC<ToolCardProps> = ({
  icon, iconBg, title, subtitle, creditCost, recommended,
  isProcessing, processingLabel, disabled, error,
  insufficientCredits, credits, onAction, actionLabel, actionIcon,
  children,
}) => (
  <div className={`rounded-xl border overflow-hidden transition-shadow ${recommended ? 'shadow-md ring-1 ring-indigo-200' : 'shadow-sm'}`}>
    <div className="p-4 space-y-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center`}>{icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm">{title}</h3>
              {recommended && (
                <Badge className="bg-indigo-500/15 text-indigo-600 border-0 text-[10px] px-1.5 py-0">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-medium">{creditCost.toLocaleString()}</span>
        </div>
      </div>

      {children}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-2.5 border border-red-200/50">
          <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Insufficient credits */}
      {insufficientCredits && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-2.5 border border-red-200/50">
          <Coins className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Insufficient credits. You have {credits.toLocaleString()} but need {creditCost.toLocaleString()}.{' '}
            <a href="/app/billing" className="underline font-medium">Buy credits</a>
          </span>
        </div>
      )}

      {/* Action button */}
      <Button
        onClick={onAction}
        disabled={disabled}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {processingLabel}
          </>
        ) : (
          <>
            {actionIcon}
            <span className="ml-2">{actionLabel}</span>
          </>
        )}
      </Button>
    </div>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Rasterize an SVG string to a high-res PNG blob URL.
 * Renders SVG into a canvas at the target dimensions.
 */
function rasterizeSvg(
  svgString: string,
  targetWidth: number,
  targetHeight: number
): Promise<{ blobUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      // Maintain aspect ratio
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      let w = targetWidth;
      let h = targetHeight;
      if (w / h > aspectRatio) {
        w = Math.round(h * aspectRatio);
      } else {
        h = Math.round(w / aspectRatio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to rasterize SVG'));
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          resolve({ blobUrl, width: w, height: h });
        },
        'image/png'
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for rasterization'));
    };

    img.src = url;
  });
}

export default AIToolsModal;
