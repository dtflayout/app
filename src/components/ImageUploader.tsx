
import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImagePlus, X, Image as ImageIcon } from "lucide-react";
import { ImageObject } from "./CollageCreator";
import { toast } from "sonner";
import { generateThumbnail } from "@/utils/thumbnailUtils";

// File and count limits to prevent memory issues
const MAX_FILE_SIZE_MB = 25; // Maximum size per file
const MAX_TOTAL_IMAGES = 40; // Maximum number of images

interface ImageUploaderProps {
  onImagesAdded: (images: ImageObject[]) => void;
  currentImageCount?: number; // Track how many images are already uploaded
}

export const ImageUploader = ({ onImagesAdded, currentImageCount = 0 }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length === 0) {
        toast.error("Please upload image files only");
        return;
      }

      // Check total count limit
      if (currentImageCount + imageFiles.length > MAX_TOTAL_IMAGES) {
        toast.error(
          `Maximum ${MAX_TOTAL_IMAGES} images allowed. You have ${currentImageCount} images and are trying to add ${imageFiles.length} more.`
        );
        return;
      }

      // Check for oversized files - block only, no warnings
      const oversizedFiles = imageFiles.filter(
        (f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024
      );
      if (oversizedFiles.length > 0) {
        const fileList = oversizedFiles
          .map((f) => `• ${f.name} (${(f.size / (1024 * 1024)).toFixed(1)}MB)`)
          .join("\n");
        toast.error(
          `Files exceed ${MAX_FILE_SIZE_MB}MB limit:\n${fileList}\n\nPlease compress or resize these images.`
        );
        return;
      }

      // Generate thumbnails in parallel for gallery display (max 300px, JPEG 0.7 quality)
      // This dramatically reduces memory usage for 20+ images on low-RAM devices
      const imageObjects: ImageObject[] = await Promise.all(
        imageFiles.map(async (file) => {
          const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          // Full-resolution URL for layout generation, trimming, bg removal, and export
          const url = URL.createObjectURL(file);

          // Generate low-res thumbnail for gallery display only
          let thumbnailUrl: string;
          try {
            thumbnailUrl = await generateThumbnail(file, 300);
          } catch (error) {
            console.error(`Failed to generate thumbnail for ${file.name}:`, error);
            // Fallback to full URL if thumbnail generation fails
            thumbnailUrl = url;
          }

          return { id, file, url, thumbnailUrl };
        })
      );

      onImagesAdded(imageObjects);
    },
    [onImagesAdded, currentImageCount]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  return (
    <div>
      <input
        id="file-upload"
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? "border-emerald-400 bg-emerald-50"
            : "hover:border-emerald-400 hover:bg-emerald-50/50"
          }
        `}
        style={{ borderColor: isDragging ? undefined : 'rgb(167, 243, 208)' }}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <ImagePlus className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1">Upload Images</h3>
            <p className="text-base text-muted-foreground mb-4">
              Drag and drop your images here or click to browse
            </p>
            <Button
              type="button"
              className="pointer-events-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl px-6 py-2 shadow-md hover:shadow-xl transition-all duration-200"
            >
              Browse Files
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Supported formats: PNG, JPG, JPEG
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-3 mt-2">
            <p className="text-base text-emerald-700 font-medium">
              Max 40 images per sheet &bull; Max 25 MB per image
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
