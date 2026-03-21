/**
 * DownloadProgressModal Component
 * 
 * Shows progress when downloading multiple sheets.
 * Displays per-sheet status with checkmarks, spinners, and progress.
 */

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle2, Loader2, AlertCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type SheetDownloadStatus = 'pending' | 'rendering' | 'complete' | 'error';

export interface SheetProgress {
  sheetNumber: number;
  heightInches: number;
  status: SheetDownloadStatus;
  error?: string;
}

interface DownloadProgressModalProps {
  isOpen: boolean;
  sheets: SheetProgress[];
  currentSheet: number;
  totalSheets: number;
  downloadType: 'png' | 'zip';
  onClose?: () => void;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  isOpen,
  sheets,
  currentSheet,
  totalSheets,
  downloadType,
  onClose,
}) => {
  const completedCount = sheets.filter(s => s.status === 'complete').length;
  const progressPercent = totalSheets > 0 ? Math.round((completedCount / totalSheets) * 100) : 0;
  const isComplete = completedCount === totalSheets;
  const hasError = sheets.some(s => s.status === 'error');

  const getStatusIcon = (status: SheetDownloadStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-indigo-500" />;
      case 'rendering':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-200" />;
    }
  };

  const getStatusText = (status: SheetDownloadStatus) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'rendering':
        return 'Rendering...';
      case 'error':
        return 'Failed';
      default:
        return 'Waiting';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center py-4">
          {/* Header */}
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4",
            isComplete ? "bg-indigo-50" : hasError ? "bg-red-50" : "bg-blue-50"
          )}>
            {isComplete ? (
              <CheckCircle2 className="w-8 h-8 text-indigo-500" />
            ) : hasError ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : (
              <Download className="w-8 h-8 text-blue-500" />
            )}
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {isComplete 
              ? 'Download Complete!' 
              : hasError
                ? 'Download Error'
                : downloadType === 'zip' 
                  ? 'Creating ZIP...' 
                  : 'Downloading Sheets...'}
          </h3>
          
          <p className="text-sm text-gray-500 mb-6">
            {isComplete
              ? `Successfully downloaded ${totalSheets} sheet${totalSheets > 1 ? 's' : ''}`
              : hasError
                ? 'Some sheets failed to download'
                : 'Please keep this tab open'}
          </p>

          {/* Progress Bar */}
          <div className="w-full mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Progress</span>
              <span className="text-gray-900 font-bold">{completedCount} / {totalSheets}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  isComplete 
                    ? "bg-gradient-to-r from-indigo-400 to-indigo-500" 
                    : hasError
                      ? "bg-gradient-to-r from-red-400 to-red-500"
                      : "bg-gradient-to-r from-blue-400 to-blue-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Sheet List */}
          <div className="w-full space-y-2 max-h-48 overflow-y-auto">
            {sheets.map((sheet) => (
              <div 
                key={sheet.sheetNumber}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-colors",
                  sheet.status === 'rendering' && "bg-blue-50 border border-blue-100",
                  sheet.status === 'complete' && "bg-indigo-50 border border-indigo-100",
                  sheet.status === 'error' && "bg-red-50 border border-red-100",
                  sheet.status === 'pending' && "bg-gray-50 border border-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(sheet.status)}
                  <div>
                    <span className="font-medium text-gray-900">
                      Sheet {sheet.sheetNumber}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({sheet.heightInches.toFixed(1)}")
                    </span>
                  </div>
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  sheet.status === 'complete' && "text-indigo-600",
                  sheet.status === 'rendering' && "text-blue-600",
                  sheet.status === 'error' && "text-red-600",
                  sheet.status === 'pending' && "text-gray-400"
                )}>
                  {getStatusText(sheet.status)}
                </span>
              </div>
            ))}
          </div>

          {/* Warning or Close Button */}
          {isComplete || hasError ? (
            <Button
              onClick={onClose}
              className="mt-6 w-full bg-gray-900 hover:bg-gray-800"
            >
              Close
            </Button>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Please keep this tab open until download completes</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadProgressModal;
