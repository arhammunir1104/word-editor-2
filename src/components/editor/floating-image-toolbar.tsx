import React, { useState, useRef, useEffect } from 'react';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Trash,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crop,
  Image as ImageIcon,
  Type,
  Move
} from 'lucide-react';
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast";
import { Separator } from "../../components/ui/separator";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import './floating-toolbar.css';

interface FloatingImageToolbarProps {
  imageId: string;
  position: { x: number, y: number };
  dimensions: { width: number, height: number };
  onResizeImage: (id: string, width: number, height: number) => void;
  onRotateImage: (id: string, angle: number) => void;
  onRemoveImage: (id: string) => void;
  onAlignImage: (id: string, align: 'left' | 'center' | 'right', recordHistory?: boolean) => void;
  onMoveImage: (id: string, x: number, y: number) => void;
  onReplaceImage: (id: string, newImageUrl: string) => void;
  onResetImage: (id: string) => void;
  onSetAltText: (id: string, altText: string) => void;
  onClose: () => void;
}

const FloatingImageToolbar: React.FC<FloatingImageToolbarProps> = ({
  imageId,
  position,
  dimensions,
  onResizeImage,
  onRotateImage,
  onRemoveImage,
  onAlignImage,
  onMoveImage,
  onReplaceImage,
  onResetImage,
  onSetAltText,
  onClose
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [toolbarPosition, setToolbarPosition] = useState(position);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0
  });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Update toolbar position when the position prop changes
  useEffect(() => {
    setToolbarPosition(position);
  }, [position]);

  // Handle dragging the toolbar
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    if (e.target === toolbarRef.current || (e.target as HTMLElement).closest('.toolbar-drag-handle')) {
      dragRef.current = {
        isDragging: true,
        startX: e.clientX - toolbarPosition.x,
        startY: e.clientY - toolbarPosition.y
      };
      
      document.addEventListener('mousemove', handleToolbarMouseMove);
      document.addEventListener('mouseup', handleToolbarMouseUp);
    }
  };

  const handleToolbarMouseMove = (e: MouseEvent) => {
    if (dragRef.current.isDragging) {
      setToolbarPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      });
    }
  };

  const handleToolbarMouseUp = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleToolbarMouseMove);
    document.removeEventListener('mouseup', handleToolbarMouseUp);
  };

  // Handle resizing with predefined increments
  const handleResizeClick = (increment: number) => {
    const newWidth = dimensions.width * increment;
    const newHeight = dimensions.height * increment;
    onResizeImage(imageId, newWidth, newHeight);
  };

  // Handle rotation with predefined increments
  const handleRotateClick = (angle: number) => {
    const newRotation = (rotation + angle) % 360;
    setRotation(newRotation);
    onRotateImage(imageId, newRotation);
  };

  // Handle alignment
  const handleAlignClick = (align: 'left' | 'center' | 'right') => {
    onAlignImage(imageId, align);
  };

  // Handle file selection for replacement
  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
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
        onReplaceImage(imageId, event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle alt text change
  const handleAltTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAltText(e.target.value);
  };

  const handleAltTextSave = () => {
    onSetAltText(imageId, altText);
    toast({
      title: "Alt text updated",
      description: "The alternative text for this image has been updated.",
    });
  };

  return (
    <div 
      className="floating-image-toolbar" 
      style={{ 
        position: 'absolute',
        left: `${toolbarPosition.x}px`,
        top: `${toolbarPosition.y - 50}px`,
        zIndex: 9999
      }}
      onMouseDown={handleToolbarMouseDown}
      ref={toolbarRef}
    >
      <div className="toolbar-drag-handle">
        <ImageIcon size={16} className="mr-2" />
        <span>Image options</span>
      </div>
      
      <div className="toolbar-buttons">
        {/* Alignment controls */}
        <div className="alignment-controls">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleAlignClick('left')}
            title="Align left"
          >
            <AlignLeft size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleAlignClick('center')}
            title="Align center"
          >
            <AlignCenter size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleAlignClick('right')}
            title="Align right"
          >
            <AlignRight size={16} />
          </Button>
        </div>
        
        <Separator orientation="vertical" className="toolbar-separator" />
        
        {/* Size controls */}
        <div className="size-controls">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleResizeClick(0.9)}
            title="Decrease size"
          >
            <ZoomOut size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleResizeClick(1.1)}
            title="Increase size"
          >
            <ZoomIn size={16} />
          </Button>
        </div>
        
        <Separator orientation="vertical" className="toolbar-separator" />
        
        {/* Rotation controls */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleRotateClick(90)}
          title="Rotate 90° clockwise"
        >
          <RotateCcw size={16} />
        </Button>
        
        <Separator orientation="vertical" className="toolbar-separator" />
        
        {/* Replace image button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleReplaceClick}
          title="Replace image"
        >
          <ImageIcon size={16} />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        
        <Separator orientation="vertical" className="toolbar-separator" />
        
        {/* Alt text popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              title="Set alt text"
            >
              <Type size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Alternative Text</h4>
              <p className="text-xs text-gray-500">Describe this image for screen readers</p>
              <Input 
                placeholder="Image description" 
                value={altText} 
                onChange={handleAltTextChange}
              />
              <Button size="sm" onClick={handleAltTextSave}>Save</Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Separator orientation="vertical" className="toolbar-separator" />
        
        {/* Delete image button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-red-500 hover:text-red-700 hover:bg-red-100"
          onClick={() => onRemoveImage(imageId)}
          title="Delete image"
        >
          <Trash size={16} />
        </Button>
        
        {/* Close button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          title="Close toolbar"
          className="close-button"
        >
          ✕
        </Button>
      </div>
    </div>
  );
};

export default FloatingImageToolbar;