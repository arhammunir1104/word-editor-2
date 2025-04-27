import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Slider } from "../../components/ui/slider";
import { 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  Image as ImageIcon,
  Crop, 
  RotateCcw, 
  Trash, 
  WrapText,
  AlignJustify,
  Move,
  RefreshCcw,
  FileImage,
  Info
} from 'lucide-react';
import { useToast } from "../../hooks/use-toast";

interface ImageControlsProps {
  selectedImageId: string | null;
  onRemoveImage: (id: string) => void;
  onChangeWrapping: (id: string, mode: 'inline' | 'wrap' | 'break') => void;
  onResizeImage: (id: string, width: number, height: number) => void;
  onRotateImage: (id: string, angle: number) => void;
  onCropImage: (id: string, crop: { x: number, y: number, width: number, height: number }) => void;
  onReplaceImage: (id: string, newImageUrl: string) => void;
  onResetImage: (id: string) => void;
  onSetAltText: (id: string, altText: string) => void;
}

/**
 * Component for image controls that appear when an image is selected
 * Handles wrapping, resizing, rotation, cropping and other image controls
 */
const ImageControls: React.FC<ImageControlsProps> = ({
  selectedImageId,
  onRemoveImage,
  onChangeWrapping,
  onResizeImage,
  onRotateImage,
  onCropImage,
  onReplaceImage,
  onResetImage,
  onSetAltText
}) => {
  const [wrappingMode, setWrappingMode] = useState<'inline' | 'wrap' | 'break'>('inline');
  const [rotation, setRotation] = useState(0);
  const [altText, setAltText] = useState('');
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reset state when selected image changes
  useEffect(() => {
    if (selectedImageId) {
      // Get current wrapping mode from the image element
      const imageElement = document.getElementById(selectedImageId) as HTMLImageElement;
      if (imageElement) {
        // Detect wrapping based on parent element or class
        const parent = imageElement.parentElement;
        if (parent?.classList.contains('image-wrap')) {
          setWrappingMode('wrap');
        } else if (parent?.classList.contains('image-break')) {
          setWrappingMode('break');
        } else {
          setWrappingMode('inline');
        }

        // Get current rotation
        const transform = imageElement.style.transform || '';
        const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
        if (rotateMatch && rotateMatch[1]) {
          setRotation(parseInt(rotateMatch[1], 10));
        } else {
          setRotation(0);
        }

        // Get alt text
        setAltText(imageElement.alt || '');
      }
    }
  }, [selectedImageId]);

  // Handle wrapping mode change
  const handleWrappingChange = (value: string) => {
    if (!selectedImageId) return;
    
    const newMode = value as 'inline' | 'wrap' | 'break';
    setWrappingMode(newMode);
    onChangeWrapping(selectedImageId, newMode);
  };

  // Handle rotation change
  const handleRotationChange = (value: number[]) => {
    if (!selectedImageId) return;
    
    const newRotation = value[0];
    setRotation(newRotation);
    onRotateImage(selectedImageId, newRotation);
  };

  // Handle alt text change
  const handleAltTextChange = () => {
    if (!selectedImageId) return;
    
    onSetAltText(selectedImageId, altText);
    toast({
      title: "Alt text updated",
      description: "Image accessibility information has been updated",
    });
  };

  // Handle crop button click
  const handleCropClick = () => {
    if (!selectedImageId) return;
    
    setIsCropping(true);
    toast({
      title: "Crop mode activated",
      description: "Drag the handles to crop the image, then press Enter to apply",
    });
    
    // Setup crop UI elements (will be implemented separately)
    // This would involve adding crop handles to the selected image
  };

  // Handle delete image
  const handleDeleteImage = () => {
    if (!selectedImageId) return;
    
    onRemoveImage(selectedImageId);
    toast({
      title: "Image removed",
      description: "The image has been removed from the document",
    });
  };

  // Handle replace image button click
  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection for replacement
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedImageId || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Only accept image files
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onReplaceImage(selectedImageId, event.target.result as string);
        toast({
          title: "Image replaced",
          description: "The image has been replaced successfully",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle reset image
  const handleResetImage = () => {
    if (!selectedImageId) return;
    
    onResetImage(selectedImageId);
    toast({
      title: "Image reset",
      description: "The image has been reset to its original size and rotation",
    });
  };

  // If no image is selected, don't render anything
  if (!selectedImageId) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 z-50 flex items-center space-x-2">
      {/* Wrapping mode controls */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <WrapText className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Text Wrapping</h4>
            <RadioGroup
              value={wrappingMode}
              onValueChange={handleWrappingChange}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inline" id="inline" />
                <Label htmlFor="inline" className="flex items-center">
                  <AlignCenter className="h-4 w-4 mr-2" />
                  In line
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wrap" id="wrap" />
                <Label htmlFor="wrap" className="flex items-center">
                  <WrapText className="h-4 w-4 mr-2" />
                  Wrap text
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="break" id="break" />
                <Label htmlFor="break" className="flex items-center">
                  <AlignJustify className="h-4 w-4 mr-2" />
                  Break text
                </Label>
              </div>
            </RadioGroup>
          </div>
        </PopoverContent>
      </Popover>

      {/* Replace image button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={handleReplaceClick}
        title="Replace image"
      >
        <FileImage className="h-4 w-4" />
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Crop tool */}
      <Button 
        variant="ghost" 
        size="sm" 
        className={`h-8 w-8 p-0 ${isCropping ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
        onClick={handleCropClick}
        title="Crop image"
      >
        <Crop className="h-4 w-4" />
      </Button>

      {/* Reset image button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={handleResetImage}
        title="Reset size and rotation"
      >
        <RefreshCcw className="h-4 w-4" />
      </Button>

      {/* Rotation control */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Rotate Image</h4>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span>0°</span>
                <span>{rotation}°</span>
                <span>360°</span>
              </div>
              <Slider
                value={[rotation]}
                min={0}
                max={360}
                step={1}
                onValueChange={handleRotationChange}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Alt text */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Info className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Alt Text</h4>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="alt-text">Description (for accessibility)</Label>
              <Input
                id="alt-text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe this image for screen readers"
              />
              <Button onClick={handleAltTextChange} className="mt-2">Save</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete image button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
        onClick={handleDeleteImage}
        title="Delete image"
      >
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ImageControls;