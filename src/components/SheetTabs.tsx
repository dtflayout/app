/**
 * SheetTabs Component
 * 
 * Chrome-style tabs for switching between multiple sheets in preview.
 * Only renders when there are 2+ sheets.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SheetTabInfo {
  sheetNumber: number;
  heightInches: number;
  imageCount: number;
  utilizationPercent?: number;
}

interface SheetTabsProps {
  sheets: SheetTabInfo[];
  activeSheet: number;  // 1-indexed sheet number
  onSheetChange: (sheetNumber: number) => void;
  className?: string;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets,
  activeSheet,
  onSheetChange,
  className,
}) => {
  // Don't render if only one sheet
  if (sheets.length <= 1) {
    return null;
  }

  return (
    <div className={cn("flex items-end gap-1 px-2 pt-2 bg-gray-100 border-b border-gray-200", className)}>
      {sheets.map((sheet) => {
        const isActive = sheet.sheetNumber === activeSheet;
        
        return (
          <button
            key={sheet.sheetNumber}
            onClick={() => onSheetChange(sheet.sheetNumber)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-150",
              "min-w-[120px] max-w-[180px]",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
              isActive
                ? "bg-white text-gray-900 shadow-sm border border-gray-200 border-b-white -mb-px z-10"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800"
            )}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-semibold">
                Sheet {sheet.sheetNumber}
              </span>
              <span className={cn(
                "text-xs",
                isActive ? "text-gray-500" : "text-gray-500"
              )}>
                {sheet.heightInches.toFixed(1)}"
              </span>
            </div>
          </button>
        );
      })}
      
      {/* Spacer to fill remaining width */}
      <div className="flex-1 border-b border-gray-200 -mb-px" />
    </div>
  );
};

/**
 * Compact version for smaller spaces
 */
export const SheetTabsCompact: React.FC<SheetTabsProps> = ({
  sheets,
  activeSheet,
  onSheetChange,
  className,
}) => {
  if (sheets.length <= 1) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1 p-1 bg-gray-100 rounded-lg", className)}>
      {sheets.map((sheet) => {
        const isActive = sheet.sheetNumber === activeSheet;
        
        return (
          <button
            key={sheet.sheetNumber}
            onClick={() => onSheetChange(sheet.sheetNumber)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500",
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            )}
          >
            {sheet.sheetNumber} ({sheet.heightInches.toFixed(0)}")
          </button>
        );
      })}
    </div>
  );
};

/**
 * Sheet indicator pills (for very compact spaces)
 */
export const SheetIndicator: React.FC<{
  totalSheets: number;
  activeSheet: number;
  onSheetChange: (sheetNumber: number) => void;
}> = ({ totalSheets, activeSheet, onSheetChange }) => {
  if (totalSheets <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSheets }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          onClick={() => onSheetChange(num)}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-150",
            num === activeSheet
              ? "bg-indigo-600 scale-125"
              : "bg-gray-300 hover:bg-gray-400"
          )}
          aria-label={`Go to sheet ${num}`}
        />
      ))}
    </div>
  );
};

export default SheetTabs;
