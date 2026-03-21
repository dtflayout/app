/**
 * Session Recovery Modal
 * 
 * Displayed when a previous session is detected on page load.
 * Allows user to either resume their previous work or start fresh.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2, Clock, Image, Ruler } from 'lucide-react';
import { SessionMetadata, formatRelativeTime } from '@/lib/sessionStorage';

interface SessionRecoveryModalProps {
  isOpen: boolean;
  metadata: SessionMetadata | null;
  isRestoring: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  primaryColor?: string;
}

export const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
  isOpen,
  metadata,
  isRestoring,
  onRestore,
  onDiscard,
  primaryColor,
}) => {
  if (!metadata) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor ? `${primaryColor}20` : '#eef2ff' }}>
              <RotateCcw className="h-5 w-5" style={{ color: primaryColor || '#4f46e5' }} />
            </div>
            Resume Previous Session?
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            We found an unsaved session from your previous visit. Would you like to continue where you left off?
          </DialogDescription>
        </DialogHeader>

        {/* Session Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 my-2">
          <div className="flex items-center gap-3 text-gray-700">
            <Image className="h-5 w-5 text-gray-500" />
            <span className="font-medium">{metadata.imageCount} images</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Ruler className="h-5 w-5 text-gray-500" />
            <span className="font-medium">{metadata.canvasWidthInches}" sheet width</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="h-5 w-5 text-gray-500" />
            <span>Saved {formatRelativeTime(metadata.timestamp)}</span>
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isRestoring}
            className="flex-1 gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Trash2 className="h-4 w-4" />
            Start Fresh
          </Button>
          <Button
            onClick={onRestore}
            disabled={isRestoring}
            className="flex-1 gap-2 shadow-lg"
            style={{ backgroundColor: primaryColor || '#4f46e5' }}
          >
            {isRestoring ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Resume Session
              </>
            )}
          </Button>
        </DialogFooter>

        <p className="text-xs text-gray-500 text-center mt-2">
          Sessions are automatically saved and expire after 24 hours.
        </p>
      </DialogContent>
    </Dialog>
  );
};
