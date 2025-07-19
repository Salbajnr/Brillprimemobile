import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "./button";

interface ImagePickerProps {
  currentImage?: string | null;
  onImageSelect: (file: File | null) => void;
  onError: (error: string) => void;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

export function ImagePicker({
  currentImage,
  onImageSelect,
  onError,
  maxSize = 5,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}: ImagePickerProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      onError(`Image size must be less than ${maxSize}MB`);
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      onError(`Please upload a ${allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} image`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    onImageSelect(file);
    setShowOptions(false);
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
    setShowOptions(false);
  };

  const handleCameraCapture = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          // Camera access granted
          cameraInputRef.current?.click();
        })
        .catch(() => {
          // Camera access denied, fallback to gallery
          fileInputRef.current?.click();
        });
    } else {
      // Camera API not supported
      fileInputRef.current?.click();
    }
    setShowOptions(false);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageSelect(null);
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto bg-gradient-to-r from-[var(--brill-primary)] to-[var(--brill-secondary)]">
        {preview ? (
          <img 
            src={preview} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Camera Button */}
      <Button
        type="button"
        onClick={() => setShowOptions(true)}
        className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--brill-secondary)] rounded-full text-white flex items-center justify-center shadow-lg p-0 hover:bg-[var(--brill-secondary)]/90"
      >
        <Camera className="h-4 w-4" />
      </Button>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 mx-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--brill-text)]">Profile Photo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptions(false)}
                className="p-1"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCameraCapture}
                className="w-full flex items-center justify-start space-x-3 p-4 bg-gray-50 hover:bg-gray-100 text-[var(--brill-text)] rounded-xl"
                variant="outline"
              >
                <Camera className="h-5 w-5" />
                <span>Take Photo</span>
              </Button>

              <Button
                onClick={handleGallerySelect}
                className="w-full flex items-center justify-start space-x-3 p-4 bg-gray-50 hover:bg-gray-100 text-[var(--brill-text)] rounded-xl"
                variant="outline"
              >
                <Upload className="h-5 w-5" />
                <span>Choose from Gallery</span>
              </Button>

              {preview && (
                <Button
                  onClick={handleRemoveImage}
                  className="w-full flex items-center justify-start space-x-3 p-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                  variant="outline"
                >
                  <X className="h-5 w-5" />
                  <span>Remove Photo</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
    </div>
  );
}