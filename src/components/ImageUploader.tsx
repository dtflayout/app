
import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImagePlus, X, Image as ImageIcon } from "lucide-react";
import { ImageObject } from "./CollageCreator";
import { toast } from "sonner";

// File and count limits to prevent memory issues
const MAX_FILE_SIZE_MB = 30; // Maximum size per file
const MAX_TOTAL_IMAGES = 40; // Maximum number of images

interface ImageUploaderProps {
  onImagesAdded: (images: ImageObject[]) => void;
  currentImageCount?: number; // Track how many images are already uploaded
}

export const ImageUploader = ({ onImagesAdded, currentImageCount = 0 }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList) => {
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

      const imageObjects: ImageObject[] = imageFiles.map((file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        url: URL.createObjectURL(file),
      }));

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
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"
          }
        `}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ImagePlus className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Upload Images</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your images here or click to browse
            </p>
            <Button
              type="button"
              variant="outline"
              className="pointer-events-none"
            >
              Browse Files
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: PNG, JPG, JPEG, GIF, WebP
          </p>
        </div>
      </div>
    </div>
  );
};
