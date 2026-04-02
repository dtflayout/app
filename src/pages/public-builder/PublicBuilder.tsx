/**
 * PublicBuilder Page
 * The customer-facing builder page for Website Integration
 * Route: /builder/:printerSlug/:productSlug
 * 
 * Features:
 * - Confirmation modal before export (shows sheets, prices, time estimate)
 * - Detailed progress tracking during export and upload
 */

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Check, ShoppingCart, X, FileImage, Upload, Clock, Zap, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Types
import {
  PublicPrinter,
  PublicProduct,
  PublicVariant,
  SheetData,
  SerializedSheetData,
} from "@/types/publicBuilder";

// Services
import {
  getPublicPrinter,
  getPublicProduct,
  findMatchingVariant,
  uploadSheetFile,
  uploadPreviewFile,
  saveDesign,
  buildCartUrl,
} from "@/services/publicBuilderService";

// Components
import { PublicBuilderTopBar } from "@/components/public-builder";
import { CollageCreator, SheetLayoutData, SheetExportData } from "@/components/CollageCreator";

// Hooks
import { useBuilderSettings } from "@/hooks/useBuilderSettings";

/**
 * Internal sheet state - tracks layout data + matched variant
 */
interface SheetState {
  sheetNumber: number;
  heightInches: number;
  widthInches: number;
  imageCount: number;
  matchedVariant: PublicVariant | null;
}

/**
 * Individual sheet progress tracking
 */
interface SheetProgress {
  sheetNumber: number;
  status: 'pending' | 'exporting' | 'exported' | 'uploading' | 'uploaded' | 'error';
  heightInches?: number;
  widthInches?: number;
  imageCount?: number;
  fileSizeMB?: number;
  uploadStartTime?: number;
  uploadEndTime?: number;
  error?: string;
}

/**
 * Progress modal state with detailed tracking
 */
interface ProgressState {
  isOpen: boolean;
  currentStep: 'exporting' | 'saving' | 'uploading' | 'complete' | 'error' | 'cancelling';
  totalSheets: number;
  sheets: SheetProgress[];
  designCode: string | null;
  errorMessage: string | null;
  cartUrl: string | null;
  // Timing
  startTime: number | null;
  uploadStartTime: number | null;
  totalUploadedMB: number;
  totalToUploadMB: number;
}

// Debug mode
const DEBUG_MODE = true;

const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log('[PublicBuilder DEBUG]', ...args);
  }
};

/**
 * Format time in seconds or minutes
 */
const formatTime = (seconds: number): string => {
  if (seconds < 0 || !isFinite(seconds)) return '--';
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

/**
 * Format currency
 */
const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `$${amount.toFixed(2)}`;
};

/**
 * Confirmation Modal - Shows before export starts
 */
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  sheets: SheetState[];
  currency: string;
  totalPrice: number;
  sizeUnit?: 'inch' | 'cm' | 'mm';
  showPrice?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ isOpen, sheets, currency, totalPrice, sizeUnit = 'inch', showPrice = true, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  const totalImages = sheets.reduce((sum, s) => sum + s.imageCount, 0);
  
  // Format dimension in display unit
  const fmtDim = (inches: number, decimals?: number): string => {
    if (sizeUnit === 'inch') return `${inches.toFixed(decimals ?? 1)}"`;
    const factor = sizeUnit === 'cm' ? 2.54 : 25.4;
    const symbol = sizeUnit === 'cm' ? ' cm' : ' mm';
    return `${(inches * factor).toFixed(decimals ?? (sizeUnit === 'mm' ? 0 : 1))}${symbol}`;
  };

  // Always show 3-5 minutes - we don't want to scare users with longer estimates
  // Actual time depends on device/network but we optimize for perceived speed
  const timeEstimate = "3-5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-[540px] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
          <div className="flex items-center gap-3 text-white">
            <ShoppingCart className="w-7 h-7" />
            <div>
              <h2 className="text-xl font-semibold">Review Your Order</h2>
              <p className="text-sm text-white/80">Please confirm before proceeding</p>
            </div>
          </div>
        </div>

        {/* Sheet Summary */}
        <div className="px-5 py-4">
          <div className="text-sm font-medium text-gray-500 mb-3">
            YOUR SHEETS ({sheets.length})
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sheets.map((sheet) => (
              <div 
                key={sheet.sheetNumber}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-base text-gray-900">
                    Sheet {sheet.sheetNumber}
                  </div>
                  <div className="text-sm text-gray-500">
                    {fmtDim(sheet.widthInches, 0)} × {fmtDim(sheet.heightInches)} • {sheet.imageCount} images
                  </div>
                </div>
                {showPrice && (
                <div className="text-right">
                  <div className="font-semibold text-lg text-gray-900">
                    {formatCurrency(sheet.matchedVariant?.price || 0, currency)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {sheet.matchedVariant?.variant_name || 'Unknown'}
                  </div>
                </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div>
              <div className="font-semibold text-lg text-indigo-800">{showPrice ? 'Total' : 'Summary'}</div>
              <div className="text-sm text-indigo-600">
                {sheets.length} sheets • {totalImages} images
              </div>
            </div>
            {showPrice && (
            <div className="font-heading text-3xl font-bold text-indigo-700">
              {formatCurrency(totalPrice, currency)}
            </div>
            )}
          </div>
        </div>

        {/* Time Warning */}
        <div className="px-5 pb-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-amber-800">
              <div className="font-semibold text-base mb-1">This will take {timeEstimate} minutes</div>
              <div className="text-sm text-amber-600">
                Your sheets will be rendered at high resolution (300 DPI) and uploaded securely. 
                Please keep this tab open during the process.
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Make sure you've reviewed your layout. Once you proceed, changes cannot be made to this order.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <Button 
            onClick={onCancel} 
            variant="outline" 
            className="flex-1 h-11"
          >
            Go Back & Edit
          </Button>
          <Button 
            onClick={onConfirm} 
            className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Progress Modal - Shows during export and upload
 */
const ProgressModal: React.FC<{
  progress: ProgressState;
  onClose: () => void;
  onOpenCart: () => void;
  onCancel: () => void;
}> = ({ progress, onClose, onOpenCart, onCancel }) => {
  if (!progress.isOpen) return null;

  const uploadedCount = progress.sheets.filter(s => s.status === 'uploaded').length;
  const canCancel = progress.currentStep === 'exporting'; // Only allow cancel during export

  // Calculate upload speed and ETA
  const elapsedUploadTime = progress.uploadStartTime 
    ? (Date.now() - progress.uploadStartTime) / 1000 
    : 0;
  
  const uploadSpeed = elapsedUploadTime > 0 && progress.totalUploadedMB > 0
    ? progress.totalUploadedMB / elapsedUploadTime
    : 0;
  
  const remainingMB = progress.totalToUploadMB - progress.totalUploadedMB;
  const remainingTime = uploadSpeed > 0 ? remainingMB / uploadSpeed : 0;

  const getOverallProgress = () => {
    // Progress breakdown:
    // Export: 0-30% (based on exported sheets)
    // Saving: 30-35%
    // Upload: 35-95% (based on uploaded MB)
    // Complete: 100%
    
    if (progress.currentStep === 'exporting' || progress.currentStep === 'cancelling') {
      // Calculate based on how many sheets are exported
      const exportedCount = progress.sheets.filter(s => s.status === 'exported').length;
      const exportingCount = progress.sheets.filter(s => s.status === 'exporting').length;
      
      // Give partial credit for currently exporting sheet (half progress)
      const effectiveExported = exportedCount + (exportingCount * 0.5);
      const exportProgress = progress.totalSheets > 0 
        ? effectiveExported / progress.totalSheets 
        : 0;
      
      // Export phase is 0-30%
      return Math.round(exportProgress * 30);
    }
    
    if (progress.currentStep === 'saving') {
      return 32;
    }
    
    if (progress.currentStep === 'uploading') {
      // Upload phase is 35-95% (60% range)
      const uploadProgress = progress.totalToUploadMB > 0 
        ? (progress.totalUploadedMB / progress.totalToUploadMB) 
        : 0;
      return Math.round(35 + (uploadProgress * 60));
    }
    
    if (progress.currentStep === 'complete') {
      return 100;
    }
    
    return 0;
  };

  const getStatusIcon = (status: SheetProgress['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">⏳</div>;
      case 'exporting':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'exported':
        return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />;
      case 'uploaded':
        return <Check className="w-5 h-5 text-indigo-600" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = (sheet: SheetProgress) => {
    switch (sheet.status) {
      case 'pending':
        return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Waiting</span>;
      case 'exporting':
        return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full animate-pulse">Rendering...</span>;
      case 'exported':
        return <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{sheet.fileSizeMB?.toFixed(1)} MB ready</span>;
      case 'uploading':
        return <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full animate-pulse">Uploading...</span>;
      case 'uploaded':
        const uploadTime = sheet.uploadEndTime && sheet.uploadStartTime 
          ? ((sheet.uploadEndTime - sheet.uploadStartTime) / 1000).toFixed(1)
          : '?';
        return <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">Done in {uploadTime}s</span>;
      case 'error':
        return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Failed</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 ${
          progress.currentStep === 'error' 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : progress.currentStep === 'complete'
            ? 'bg-gradient-to-r from-indigo-500 to-violet-600'
            : progress.currentStep === 'cancelling'
            ? 'bg-gradient-to-r from-gray-500 to-gray-600'
            : progress.currentStep === 'exporting'
            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
            : 'bg-gradient-to-r from-indigo-500 to-violet-500'
        }`}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {progress.currentStep === 'error' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : progress.currentStep === 'complete' ? (
                <ShoppingCart className="w-7 h-7" />
              ) : progress.currentStep === 'cancelling' ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : progress.currentStep === 'exporting' ? (
                <FileImage className="w-7 h-7" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {progress.currentStep === 'error' ? 'Error Occurred' :
                   progress.currentStep === 'complete' ? 'Ready to Checkout!' :
                   progress.currentStep === 'cancelling' ? 'Cancelling...' :
                   progress.currentStep === 'exporting' ? 'Generating High-Res Sheets' :
                   progress.currentStep === 'saving' ? 'Saving Design...' :
                   'Uploading to Cloud'}
                </h2>
                <p className="text-sm text-white/80">
                  {progress.currentStep === 'exporting' && `Rendering ${progress.totalSheets} sheets at 300 DPI`}
                  {progress.currentStep === 'cancelling' && 'Please wait while we stop the process...'}
                  {progress.currentStep === 'uploading' && uploadSpeed > 0 && `Speed: ${uploadSpeed.toFixed(1)} MB/s`}
                  {progress.currentStep === 'uploading' && uploadSpeed === 0 && 'Starting upload...'}
                  {progress.currentStep === 'complete' && `All ${progress.totalSheets} sheets ready`}
                </p>
              </div>
            </div>
            {/* Cancel button - only during export phase */}
            {canCancel && (
              <button
                onClick={onCancel}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        {progress.currentStep !== 'complete' && progress.currentStep !== 'error' && progress.currentStep !== 'cancelling' && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1.5">
              <span className="font-medium">Overall Progress</span>
              <span>{Math.round(getOverallProgress())}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2.5" />
          </div>
        )}

        {/* Upload Stats Bar */}
        {progress.currentStep === 'uploading' && progress.totalToUploadMB > 0 && (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  {progress.totalUploadedMB > 0 ? (
                    <div className="text-xl font-bold text-indigo-600">
                      {progress.totalUploadedMB.toFixed(0)}
                    </div>
                  ) : (
                    <div className="text-xl font-bold text-indigo-600 animate-pulse">
                      ...
                    </div>
                  )}
                  <div className="text-sm text-gray-500">MB uploaded</div>
                </div>
                <div className="text-gray-300">/</div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-600">
                    {progress.totalToUploadMB.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-500">MB total</div>
                </div>
              </div>
              {remainingTime > 0 ? (
                <div className="flex items-center gap-2 text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium text-sm">~{formatTime(remainingTime)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-medium text-sm">Starting...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancelling Message */}
        {progress.currentStep === 'cancelling' && (
          <div className="px-5 py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Stopping the rendering process...</p>
            <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Sheet List - hidden during cancelling */}
        {progress.currentStep !== 'cancelling' && (
          <div className="px-5 py-4">
            <div className="text-sm font-medium text-gray-500 mb-2">
              SHEETS ({uploadedCount}/{progress.totalSheets} complete)
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {progress.sheets.map((sheet) => (
                <div 
                  key={sheet.sheetNumber}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    sheet.status === 'exporting' 
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : sheet.status === 'uploading'
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                      : sheet.status === 'uploaded'
                      ? 'bg-gray-50 border-gray-100'
                      : sheet.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  {getStatusIcon(sheet.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-base text-gray-900">
                        Sheet {sheet.sheetNumber}
                      </span>
                      {getStatusBadge(sheet)}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {sheet.widthInches && sheet.heightInches && (
                        <span>{sheet.widthInches.toFixed(0)}" × {sheet.heightInches.toFixed(1)}"</span>
                      )}
                      {sheet.imageCount && (
                        <span className="ml-2">• {sheet.imageCount} images</span>
                      )}
                      {sheet.fileSizeMB && sheet.status !== 'pending' && sheet.status !== 'exporting' && (
                        <span className="ml-2">• {sheet.fileSizeMB.toFixed(1)} MB</span>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Success Message */}
        {progress.currentStep === 'complete' && progress.designCode && (
          <div className="px-5 pb-2">
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-indigo-700 font-medium">
                <Zap className="w-5 h-5" />
                <span>Your design is ready!</span>
              </div>
              <div className="text-sm text-indigo-600 mt-2">
                Design Code: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded">{progress.designCode}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {progress.totalSheets} sheets • {progress.totalToUploadMB.toFixed(1)} MB total
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {progress.currentStep === 'error' && progress.errorMessage && (
          <div className="px-5 pb-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {progress.errorMessage}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-4 pt-2">
          {progress.currentStep === 'error' && (
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="w-full"
            >
              Close & Try Again
            </Button>
          )}
          {progress.currentStep === 'complete' && (
            <div className="space-y-2">
              <Button 
                onClick={onOpenCart} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Open Cart & Checkout
              </Button>
              <Button 
                onClick={onClose} 
                variant="ghost" 
                className="w-full text-gray-500"
              >
                Continue Designing
              </Button>
            </div>
          )}
          {progress.currentStep !== 'error' && progress.currentStep !== 'complete' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {progress.currentStep === 'exporting' 
                  ? '⚡ Rendering high-resolution images for print quality'
                  : progress.currentStep === 'saving'
                  ? '💾 Saving your design...'
                  : '☁️ Securely uploading your files...'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Please keep this tab open
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PublicBuilder: React.FC = () => {
  const { printerSlug, productSlug } = useParams<{
    printerSlug: string;
    productSlug: string;
  }>();

  debugLog('Route params:', { printerSlug, productSlug });

  // Load printer's builder settings
  const { settings: builderSettings } = useBuilderSettings(printerSlug);

  // Data state
  const [printer, setPrinter] = useState<PublicPrinter | null>(null);
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Multi-sheet layout state
  const [sheetStates, setSheetStates] = useState<SheetState[]>([]);
  const [hasLayout, setHasLayout] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [triggerExport, setTriggerExport] = useState(false);

  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Progress modal state
  const [progress, setProgress] = useState<ProgressState>({
    isOpen: false,
    currentStep: 'exporting',
    totalSheets: 0,
    sheets: [],
    designCode: null,
    errorMessage: null,
    cartUrl: null,
    startTime: null,
    uploadStartTime: null,
    totalUploadedMB: 0,
    totalToUploadMB: 0,
  });

  // Canvas width from product settings (defaults to 22" if not set)
  const canvasWidthInches = product?.sheet_width_inches || 22;

  // Load printer and product data
  useEffect(() => {
    const loadData = async () => {
      if (!printerSlug || !productSlug) {
        setLoadError("Invalid URL - missing printer or product slug");
        setIsLoading(false);
        debugLog('ERROR: Missing slugs', { printerSlug, productSlug });
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      debugLog('Loading data for:', { printerSlug, productSlug });

      try {
        debugLog('Fetching printer...');
        const printerResult = await getPublicPrinter(printerSlug);
        debugLog('Printer result:', printerResult);
        
        if (!printerResult.success || !printerResult.data) {
          setLoadError(printerResult.error || "Store not found");
          setIsLoading(false);
          return;
        }
        setPrinter(printerResult.data);

        debugLog('Fetching product...');
        const productResult = await getPublicProduct(
          printerResult.data.id,
          productSlug
        );
        debugLog('Product result:', productResult);
        
        if (!productResult.success || !productResult.data) {
          setLoadError(productResult.error || "Product not found");
          setIsLoading(false);
          return;
        }
        setProduct(productResult.data);

        if (productResult.data.variants.length === 0) {
          setLoadError(
            "This product has no configured size variants. Please contact the store."
          );
          setIsLoading(false);
          return;
        }

        debugLog('✅ Data loaded successfully');
        console.log("[PublicBuilder] Loaded:", printerResult.data.store_name);
      } catch (err) {
        console.error("[PublicBuilder] Error loading data:", err);
        debugLog('ERROR loading data:', err);
        setLoadError("Failed to load builder. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [printerSlug, productSlug]);

  // Inject live chat script if enabled
  useEffect(() => {
    if (!builderSettings.enable_live_chat || !builderSettings.live_chat_script?.trim()) return;

    const containerId = 'dtf-live-chat-container';
    // Avoid duplicate injection
    if (document.getElementById(containerId)) return;

    const container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);

    // Parse and execute script tags from the chat widget code
    const temp = document.createElement('div');
    temp.innerHTML = builderSettings.live_chat_script;

    const scripts = temp.querySelectorAll('script');
    scripts.forEach((origScript) => {
      const newScript = document.createElement('script');
      // Copy attributes (src, async, defer, etc.)
      Array.from(origScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      // Copy inline script content
      if (origScript.textContent) {
        newScript.textContent = origScript.textContent;
      }
      container.appendChild(newScript);
    });

    // Also append non-script elements (some widgets use noscript or div tags)
    const nonScripts = temp.querySelectorAll(':not(script)');
    nonScripts.forEach((el) => {
      container.appendChild(el.cloneNode(true));
    });

    console.log('[PublicBuilder] Live chat script injected');

    return () => {
      const el = document.getElementById(containerId);
      if (el) el.remove();
    };
  }, [builderSettings.enable_live_chat, builderSettings.live_chat_script]);

  /**
   * Handle layout generation callback from CollageCreator
   */
  const handleLayoutGenerated = (data: { 
    sheets: SheetLayoutData[];
    totalSheets: number;
    widthInches: number;
  }) => {
    if (!product) return;

    debugLog('📐 Layout generated:', {
      totalSheets: data.totalSheets,
      widthInches: data.widthInches,
      sheets: data.sheets.map(s => ({
        sheetNumber: s.sheetNumber,
        heightInches: s.heightInches,
        imageCount: s.imageCount
      }))
    });

    console.log(`[PublicBuilder] Layout generated: ${data.totalSheets} sheet(s)`);

    const newSheetStates: SheetState[] = data.sheets.map(sheet => {
      const matchedVariant = findMatchingVariant(
        sheet.heightInches,
        product.variants,
        product.size_unit
      );

      console.log(`[PublicBuilder] Sheet ${sheet.sheetNumber}: ${sheet.heightInches.toFixed(2)}" -> Variant: ${matchedVariant?.variant_name || 'None'}`);

      return {
        sheetNumber: sheet.sheetNumber,
        heightInches: sheet.heightInches,
        widthInches: sheet.widthInches,
        imageCount: sheet.imageCount,
        matchedVariant,
      };
    });

    setSheetStates(newSheetStates);
    setHasLayout(true);
  };

  /**
   * Build sheets array for TopBar
   */
  const sheets: SheetData[] = useMemo(() => {
    if (!hasLayout || sheetStates.length === 0) return [];

    return sheetStates.map(state => ({
      sheet_number: state.sheetNumber,
      images: [],
      layout: [],
      width_inches: state.widthInches,
      height_inches: state.heightInches,
      matched_variant: state.matchedVariant,
    }));
  }, [hasLayout, sheetStates]);

  /**
   * Check if all sheets have matched variants
   */
  const allSheetsHaveVariants = useMemo(() => {
    return sheetStates.length > 0 && sheetStates.every(s => s.matchedVariant !== null);
  }, [sheetStates]);

  /**
   * Calculate total price
   */
  const totalPrice = useMemo(() => {
    return sheetStates.reduce((sum, s) => sum + (s.matchedVariant?.price || 0), 0);
  }, [sheetStates]);

  /**
   * Add to cart handler - shows confirmation modal first
   */
  const handleAddToCart = () => {
    if (!hasLayout || sheetStates.length === 0) {
      toast.error("Please generate a layout first");
      return;
    }

    if (!allSheetsHaveVariants) {
      toast.error("Some sheets don't have matching variants. Please adjust your layout.");
      return;
    }

    // Show confirmation modal instead of starting export immediately
    setShowConfirmation(true);
  };

  /**
   * Handle confirmation - user confirmed, start the export process
   */
  const handleConfirmProceed = () => {
    setShowConfirmation(false);
    
    const now = Date.now();

    // Initialize progress with sheet details - first sheet starts as "exporting"
    const initialSheets: SheetProgress[] = sheetStates.map((s, index) => ({
      sheetNumber: s.sheetNumber,
      status: index === 0 ? 'exporting' : 'pending', // Only first sheet starts as exporting
      heightInches: s.heightInches,
      widthInches: s.widthInches,
      imageCount: s.imageCount,
    }));

    setProgress({
      isOpen: true,
      currentStep: 'exporting',
      totalSheets: sheetStates.length,
      sheets: initialSheets,
      designCode: null,
      errorMessage: null,
      cartUrl: null,
      startTime: now,
      uploadStartTime: null,
      totalUploadedMB: 0,
      totalToUploadMB: 0,
    });

    setIsAddingToCart(true);
    setTriggerExport(true);
  };

  /**
   * Handle individual sheet export progress from CollageCreator
   */
  const handleSheetExportProgress = (data: {
    sheetNumber: number;
    totalSheets: number;
    fileSizeMB: number;
  }) => {
    debugLog(`Sheet ${data.sheetNumber} exported: ${data.fileSizeMB.toFixed(1)} MB`);
    
    // Update the specific sheet's status to "exported" and mark next sheet as "exporting"
    setProgress(prev => ({
      ...prev,
      sheets: prev.sheets.map(s => {
        if (s.sheetNumber === data.sheetNumber) {
          // This sheet is now exported
          return { ...s, status: 'exported' as const, fileSizeMB: data.fileSizeMB };
        } else if (s.sheetNumber === data.sheetNumber + 1 && s.status === 'pending') {
          // Next sheet starts exporting
          return { ...s, status: 'exporting' as const };
        }
        return s;
      }),
    }));
  };

  /**
   * Handle confirmation cancel
   */
  const handleConfirmCancel = () => {
    setShowConfirmation(false);
  };

  /**
   * Close progress modal
   */
  const handleCloseProgress = () => {
    setProgress(prev => ({ ...prev, isOpen: false }));
    setIsAddingToCart(false);
  };

  /**
   * Cancel the export/upload process
   * Only allowed during export phase before anything is saved
   * Shows "Cancelling..." state briefly to give user feedback while browser finishes operations
   */
  const handleCancelProgress = () => {
    // Trigger the abort flag
    setTriggerExport(false);
    
    // Show cancelling state
    setProgress(prev => ({ ...prev, currentStep: 'cancelling' }));
    
    // Wait for the browser to finish any pending operations, then close
    setTimeout(() => {
      setProgress(prev => ({ ...prev, isOpen: false }));
      setIsAddingToCart(false);
      toast.info("Process cancelled. Your layout is still saved.");
    }, 5000); // 5 second delay to allow browser to settle
  };

  /**
   * Handle opening cart
   */
  const handleOpenCart = () => {
    if (progress.cartUrl) {
      window.open(progress.cartUrl, '_blank');
    }
  };

  /**
   * Upload sheets with detailed progress tracking
   */
  const uploadSheetsWithProgress = async (
    exportedSheets: SheetExportData[],
    storeId: string,
    designCode: string
  ) => {
    const totalSize = exportedSheets.reduce((sum, s) => sum + s.blob.size, 0);
    const totalSizeMB = totalSize / 1024 / 1024;

    setProgress(prev => ({
      ...prev,
      uploadStartTime: Date.now(),
      totalToUploadMB: totalSizeMB,
    }));

    let uploadedMB = 0;
    const maxConcurrent = 1; // Upload one at a time for clearer progress feedback

    for (let i = 0; i < exportedSheets.length; i += maxConcurrent) {
      const batch = exportedSheets.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (sheet) => {
        const startTime = Date.now();
        const fileSizeMB = sheet.blob.size / 1024 / 1024;

        // Update sheet status to uploading
        setProgress(prev => ({
          ...prev,
          sheets: prev.sheets.map(s => 
            s.sheetNumber === sheet.sheetNumber 
              ? { ...s, status: 'uploading' as const, uploadStartTime: startTime }
              : s
          ),
        }));

        debugLog(`Uploading sheet ${sheet.sheetNumber}... (${fileSizeMB.toFixed(1)} MB)`);

        // Upload full-resolution PNG
        const uploadResult = await uploadSheetFile(
          storeId,
          designCode,
          sheet.sheetNumber,
          sheet.blob
        );

        if (!uploadResult.success) {
          setProgress(prev => ({
            ...prev,
            sheets: prev.sheets.map(s => 
              s.sheetNumber === sheet.sheetNumber 
                ? { ...s, status: 'error' as const, error: uploadResult.error }
                : s
            ),
          }));
          throw new Error(`Failed to upload sheet ${sheet.sheetNumber}: ${uploadResult.error}`);
        }

        const endTime = Date.now();
        const uploadTime = (endTime - startTime) / 1000;
        debugLog(`✅ Sheet ${sheet.sheetNumber} uploaded in ${uploadTime.toFixed(1)}s`);

        // Upload preview (non-blocking)
        uploadPreviewFile(storeId, designCode, sheet.sheetNumber, sheet.previewBlob)
          .catch(err => console.warn(`Preview upload failed for sheet ${sheet.sheetNumber}:`, err));

        // Update progress
        uploadedMB += fileSizeMB;
        setProgress(prev => ({
          ...prev,
          totalUploadedMB: uploadedMB,
          sheets: prev.sheets.map(s => 
            s.sheetNumber === sheet.sheetNumber 
              ? { ...s, status: 'uploaded' as const, uploadEndTime: endTime }
              : s
          ),
        }));

        return { sheetNumber: sheet.sheetNumber, success: true };
      });

      await Promise.all(batchPromises);
    }
  };

  /**
   * Handle export completion from CollageCreator
   */
  const handleExportComplete = async (data: { 
    sheets: SheetExportData[];
    totalSheets: number;
  }) => {
    setTriggerExport(false);
    
    debugLog('🚀 Export complete:', {
      totalSheets: data.totalSheets,
      sheets: data.sheets.map(s => ({
        sheetNumber: s.sheetNumber,
        blobSizeMB: (s.blob.size / 1024 / 1024).toFixed(2) + ' MB'
      }))
    });

    // Update progress with exported sheet info - all sheets now "exported"
    setProgress(prev => ({
      ...prev,
      currentStep: 'saving',
      sheets: prev.sheets.map(s => {
        const exported = data.sheets.find(e => e.sheetNumber === s.sheetNumber);
        return {
          ...s,
          status: 'exported' as const,
          fileSizeMB: exported ? exported.blob.size / 1024 / 1024 : 0,
        };
      }),
    }));

    if (!printer || !product) {
      setProgress(prev => ({
        ...prev,
        currentStep: 'error',
        errorMessage: 'Missing printer or product data',
      }));
      return;
    }

    try {
      console.log(`[PublicBuilder] Processing ${data.totalSheets} exported sheets`);

      // Build sheet data for database
      const serializedSheets: SerializedSheetData[] = data.sheets.map((exportedSheet, index) => {
        const sheetState = sheetStates[index];
        const variant = sheetState?.matchedVariant;

        if (!variant) {
          throw new Error(`Sheet ${exportedSheet.sheetNumber} has no matched variant`);
        }

        return {
          sheet_number: exportedSheet.sheetNumber,
          image_count: sheetState?.imageCount || 0,
          width_inches: exportedSheet.widthInches,
          height_inches: exportedSheet.heightInches,
          variant_id: variant.id,
          variant_name: variant.variant_name || "",
          variant_price: variant.price,
          storage_path: "",
        };
      });

      // Save design to get design_code
      const designResult = await saveDesign({
        printer_id: printer.id,
        printer_product_id: product.id,
        sheets: serializedSheets,
        sheet_count: data.totalSheets,
        total_price: totalPrice,
        currency: printer.currency,
      });

      if (!designResult.success || !designResult.data) {
        throw new Error(designResult.error || "Failed to save design");
      }

      const designCode = designResult.data.design_code;
      console.log(`[PublicBuilder] Design saved with code: ${designCode}`);

      setProgress(prev => ({
        ...prev,
        designCode,
        currentStep: 'uploading',
      }));

      // Upload all sheet files with progress tracking
      await uploadSheetsWithProgress(data.sheets, printer.store_id, designCode);

      // Build cart URL
      const variants = sheetStates
        .map(s => s.matchedVariant)
        .filter((v): v is PublicVariant => v !== null);

      const cartUrl = buildCartUrl(variants, designCode, {
        "Design Code": designCode,
        "Sheets": `${data.totalSheets}`,
      });

      console.log(`[PublicBuilder] Cart URL ready: ${cartUrl}`);

      setProgress(prev => ({
        ...prev,
        currentStep: 'complete',
        cartUrl: cartUrl,
      }));

      setIsAddingToCart(false);
      toast.success("Design ready! Click to open your cart.");

    } catch (error: any) {
      console.error("[PublicBuilder] Add to cart error:", error);
      
      setProgress(prev => ({
        ...prev,
        currentStep: 'error',
        errorMessage: error.message || "Failed to add to cart. Please try again.",
      }));
    }
  };

  // Appearance CSS custom properties from builder settings
  const buttonRadius = builderSettings.button_style === 'pill' ? '9999px' : builderSettings.button_style === 'square' ? '2px' : '8px';
  
  const appearanceStyle = useMemo(() => ({
    '--builder-bg': builderSettings.color_background,
    '--builder-topbar': builderSettings.color_top_bar,
    '--builder-primary': builderSettings.color_primary,
    '--builder-secondary': builderSettings.color_secondary,
    '--builder-text': builderSettings.color_text,
    '--builder-button-radius': buttonRadius,
  } as React.CSSProperties), [builderSettings, buttonRadius]);

  // Load Google Font
  useEffect(() => {
    const fontFamily = builderSettings.font_family;
    if (!fontFamily || fontFamily === 'Inter') return;

    const linkId = 'dtf-builder-font';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;

    return () => {
      const el = document.getElementById(linkId);
      if (el) el.remove();
    };
  }, [builderSettings.font_family]);

  // Set favicon to printer's logo
  useEffect(() => {
    if (!printer?.logo_url) return;

    const linkId = 'dtf-builder-favicon';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = printer.logo_url;

    return () => {
      const el = document.getElementById(linkId);
      if (el) el.remove();
    };
  }, [printer?.logo_url]);

  // Loading state
  if (isLoading) {
    const loaderContent = builderSettings.use_logo_as_loader && printer?.logo_url ? (
      <img src={printer.logo_url} alt="Loading" className="h-12 w-12 animate-pulse mx-auto mb-4" />
    ) : (
      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: builderSettings.color_primary }} />
    );

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: builderSettings.color_background }}>
        <div className="text-center">
          {loaderContent}
          <p className="text-gray-600">Loading builder...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !printer || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: builderSettings.color_background }}>
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Builder
          </h1>
          <p className="text-gray-600 mb-6">
            {loadError || "The requested store or product could not be found."}
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: builderSettings.color_background, fontFamily: `'${builderSettings.font_family || 'Inter'}', sans-serif`, ...appearanceStyle }}>
      <PublicBuilderTopBar
        printer={printer}
        sheets={sheets}
        canvasWidthInches={canvasWidthInches}
        isGenerating={false}
        isAddingToCart={isAddingToCart}
        onAddToCart={handleAddToCart}
        hasLayout={hasLayout}
        topBarColor={builderSettings.color_top_bar}
        primaryColor={builderSettings.color_primary}
        sizeUnit={builderSettings.size_unit}
        showPrice={builderSettings.show_gangsheet_price !== false}
        buttonRadius={buttonRadius}
      />
      <div className="flex-1">
        <CollageCreator
          builderMode="public"
          printerSlug={printerSlug}
          productSlug={productSlug}
          dpi={300}
          initialCanvasWidth={canvasWidthInches}
          builderSettings={builderSettings}
          onLayoutGenerated={handleLayoutGenerated}
          triggerExport={triggerExport}
          onExportComplete={handleExportComplete}
          onSheetExportProgress={handleSheetExportProgress}
        />
      </div>

      {/* Confirmation Modal - Shows first */}
      <ConfirmationModal
        isOpen={showConfirmation}
        sheets={sheetStates}
        currency={printer.currency}
        totalPrice={totalPrice}
        sizeUnit={builderSettings.size_unit}
        showPrice={builderSettings.show_gangsheet_price !== false}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmProceed}
      />

      {/* Progress Modal - Shows after confirmation */}
      <ProgressModal 
        progress={progress} 
        onClose={handleCloseProgress}
        onOpenCart={handleOpenCart}
        onCancel={handleCancelProgress}
      />
    </div>
  );
};

export default PublicBuilder;
