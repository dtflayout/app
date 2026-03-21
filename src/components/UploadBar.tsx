import React, { useRef, useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { generateThumbnail } from "@/utils/thumbnailUtils";
import { ImageObject } from "./CollageCreator";

interface UploadBarProps {
  onImagesAdded: (images: ImageObject[]) => void;
  currentImageCount: number;
  maxImages?: number;
  /** Override accent color (uses primary color from builder settings) */
  accentColor?: string;
  /** Button border-radius override */
  buttonRadius?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const UploadBar: React.FC<UploadBarProps> = ({
  onImagesAdded,
  currentImageCount,
  maxImages = 80,
  accentColor,
  buttonRadius,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxImages - currentImageCount;

    if (fileArray.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more images can be added (max ${maxImages})`);
      fileArray.splice(remainingSlots);
    }

    if (fileArray.length === 0) return;

    setIsProcessing(true);

    const validFiles: ImageObject[] = [];

    for (const file of fileArray) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 25MB limit`);
        continue;
      }

      try {
        const url = URL.createObjectURL(file);
        const thumbnailUrl = await generateThumbnail(file, 300);

        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          url,
          thumbnailUrl,
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        toast.error(`Failed to process ${file.name}`);
      }
    }

    setIsProcessing(false);

    if (validFiles.length > 0) {
      onImagesAdded(validFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-[46rem] mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Gradient border wrapper - 2px stroke, more rounded */}
      <div 
        className={`
          relative p-[2px] rounded-[18px] cursor-pointer
          transition-all duration-300
          ${isDragging 
            ? "scale-[1.02]" 
            : "hover:scale-[1.01]"
          }
        `}
        style={{
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED, #6366F1)',
          boxShadow: isDragging 
            ? '0 20px 40px -10px rgba(79, 70, 229, 0.4), 0 10px 20px -5px rgba(124, 58, 237, 0.3)'
            : '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(79, 70, 229, 0.35), 0 8px 16px -4px rgba(124, 58, 237, 0.25)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(0, 0, 0, 0.08)';
          }
        }}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Inner white content - more rounded */}
        <div
          className={`
            flex items-center gap-4 px-5 py-4
            bg-white rounded-[16px]
            transition-all duration-300
          `}
        >
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
            transition-all duration-300
            ${!accentColor ? (isDragging 
              ? "bg-indigo-600 text-white scale-110" 
              : "bg-gradient-to-br from-indigo-500 to-violet-500 text-white") 
              : "text-white"}
          `}
            style={accentColor ? { backgroundColor: accentColor } : undefined}
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImagePlus className="w-6 h-6" />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-800">
              {isDragging ? "Drop images here" : "Drop images here or click to browse"}
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, JPEG • Max 25 MB each
            </p>
          </div>

          {/* Browse button */}
          <div className={`
            flex-shrink-0 px-5 py-2.5 font-semibold text-sm
            transition-all duration-300
            ${!accentColor ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700' : ''}
            text-white shadow-md hover:shadow-lg
          `}
            style={{ 
              backgroundColor: accentColor || undefined,
              borderRadius: buttonRadius || '12px',
            }}
          >
            Browse Files
          </div>
        </div>
      </div>

      {/* Image count indicator */}
      {currentImageCount > 0 && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur rounded-full text-sm font-medium text-gray-600 shadow-sm border border-gray-200">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor || '#6366f1' }} />
            {currentImageCount} / {maxImages} images uploaded
          </span>
        </div>
      )}
    </div>
  );
};

export default UploadBar;
