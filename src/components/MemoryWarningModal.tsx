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
import { AlertTriangle } from 'lucide-react';

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
  const getColorClass = () => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      default: return 'text-yellow-600';
    }
  };

  const getIconBgClass = () => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100';
      case 'high': return 'bg-orange-100';
      default: return 'bg-yellow-100';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`flex-shrink-0 w-12 h-12 ${getIconBgClass()} rounded-full flex items-center justify-center`}>
              <AlertTriangle className={`h-6 w-6 ${getColorClass()}`} />
            </div>
            <AlertDialogTitle className="text-xl">
              {riskLevel === 'critical' ? 'Critical Memory Usage' :
               riskLevel === 'high' ? 'High Memory Usage' :
               'Memory Usage Notice'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-base pt-2 space-y-4">
              <p className="text-gray-700">{message}</p>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">
                  Estimated memory: <span className="font-bold">{Math.round(memoryMB)} MB</span>
                </p>
              </div>

              {riskLevel === 'critical' && (
                <p className="text-sm text-red-600 font-medium">
                  We strongly recommend reducing images, but you can try anyway.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onProceed();
              onClose();
            }}
            className={riskLevel === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
          >
            {riskLevel === 'critical' ? 'Proceed Anyway' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
