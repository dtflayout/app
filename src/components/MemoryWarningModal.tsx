import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Info, CheckCircle2 } from 'lucide-react';

interface MemoryWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  riskLevel: 'medium' | 'high' | 'critical';
  memoryMB: number;
  message: string;
}

export function MemoryWarningModal({
  isOpen,
  onClose,
  onProceed,
  riskLevel,
  memoryMB,
  message
}: MemoryWarningModalProps) {
  const memoryGB = (memoryMB / 1024).toFixed(1);
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="font-heading text-xl font-bold text-white tracking-tight">
                Performance Notice
              </AlertDialogTitle>
              <p className="text-sm text-white/80 mt-0.5">
                Large layout detected
              </p>
            </div>
          </div>
        </div>

        <AlertDialogHeader className="px-6 pt-5 pb-0">
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Memory Info */}
              <p className="text-base text-gray-700">
                This layout will use approximately <span className="font-semibold text-gray-900">{memoryGB} GB</span> of memory during export.
              </p>
              
              {/* Tips Box */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  To ensure smooth processing:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>Close unnecessary browser tabs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>Save work in other applications</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>Keep this tab in focus during export</span>
                  </div>
                </div>
              </div>

              {/* Time Estimate */}
              <p className="text-sm text-gray-500">
                Export may take 1-2 minutes on most devices.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="px-6 py-4 gap-3 sm:gap-2 bg-gray-50 border-t">
          <AlertDialogCancel 
            onClick={onClose} 
            className="px-5 py-2.5 text-sm font-medium h-auto"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onProceed();
              onClose();
            }}
            className="px-5 py-2.5 text-sm font-medium h-auto bg-blue-600 hover:bg-blue-700"
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
