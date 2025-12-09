import React from "react";

export type PreviewBackground = 'transparent' | 'grey' | 'black';

interface PreviewBackgroundToggleProps {
  value: PreviewBackground;
  onChange: (bg: PreviewBackground) => void;
  className?: string;
}

/**
 * Reusable component for toggling preview background color.
 * Press and hold to temporarily change background, release to return to default.
 */
export const PreviewBackgroundToggle = ({
  value,
  onChange,
  className = "",
}: PreviewBackgroundToggleProps) => {
  return (
    <div className={`flex items-center gap-2 border rounded-md px-2 py-1 ${className}`} title="Hold to preview background">
      <span className="text-xs text-slate-500">Press & hold to preview:</span>
      <div
        className="h-5 w-5 rounded flex items-center justify-center bg-blue-50 ring-1 ring-blue-300"
        title="Default (checkered)"
      >
        <div
          className="w-3.5 h-3.5 rounded-sm border border-slate-300"
          style={{
            backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '4px 4px',
            backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
          }}
        />
      </div>
      <button
        onMouseDown={() => onChange('grey')}
        onMouseUp={() => onChange('transparent')}
        onMouseLeave={() => onChange('transparent')}
        className={`h-5 w-5 rounded flex items-center justify-center transition-colors select-none ${
          value === 'grey'
            ? 'bg-gray-200 ring-2 ring-gray-400'
            : 'hover:bg-slate-100'
        }`}
        title="Hold to preview grey background"
      >
        <div className="w-3.5 h-3.5 rounded-sm bg-gray-500 border border-slate-300" />
      </button>
      <button
        onMouseDown={() => onChange('black')}
        onMouseUp={() => onChange('transparent')}
        onMouseLeave={() => onChange('transparent')}
        className={`h-5 w-5 rounded flex items-center justify-center transition-colors select-none ${
          value === 'black'
            ? 'bg-gray-700 ring-2 ring-gray-500'
            : 'hover:bg-slate-100'
        }`}
        title="Hold to preview black background"
      >
        <div className="w-3.5 h-3.5 rounded-sm bg-black border border-slate-300" />
      </button>
    </div>
  );
};

/**
 * Helper function to get background style based on preview background type.
 */
export const getPreviewBackgroundStyle = (bg: PreviewBackground): React.CSSProperties => {
  switch (bg) {
    case 'grey':
      return { backgroundColor: '#808080' };
    case 'black':
      return { backgroundColor: '#000000' };
    default: // transparent - checkered pattern
      return {
        backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        backgroundColor: '#f8fafc'
      };
  }
};
