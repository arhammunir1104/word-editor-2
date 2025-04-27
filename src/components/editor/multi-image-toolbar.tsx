import React, { useState, useRef } from 'react';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Trash,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  X,
  MoveHorizontal,
  MoveVertical
} from 'lucide-react';
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast";
import { Separator } from "../../components/ui/separator";
import './floating-toolbar.css';

interface MultiImageToolbarProps {
  selectedImageIds: string[];
  position: { x: number, y: number };
  onAlignImages: (ids: string[], align: 'left' | 'center' | 'right') => void;
  onRemoveImages: (ids: string[]) => void;
  onResizeImages: (ids: string[], scaleChange: number) => void;
  onReplaceImages: (ids: string[], newUrl: string) => void;
  onDistributeImages: (ids: string[], direction: 'horizontal' | 'vertical') => void;
  onClose: () => void;
}

const MultiImageToolbar: React.FC<MultiImageToolbarProps> = ({
  selectedImageIds,
  position,
  onAlignImages,
  onRemoveImages,
  onResizeImages,
  onReplaceImages,
  onDistributeImages,
  onClose
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
        onReplaceImages(selectedImageIds, event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <div 
      className="floating-image-toolbar multi-image-toolbar" 
      style={{ 
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y - 50}px`,
        zIndex: 9999
      }}
    >
      <div className="toolbar-drag-handle">
        <ImageIcon size={16} className="mr-2" />
        <span>Multiple images selected</span>
        <span className="selection-count">{selectedImageIds.length}</span>
      </div>
      
      <div className="multi-operations-section">
        <div className="operation-row">
          <div className="alignment-controls">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAlignImages(selectedImageIds, 'left')}
              title="Align all left"
              className="flex items-center gap-1"
            >
              <AlignLeft size={14} />
              <span>Left</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAlignImages(selectedImageIds, 'center')}
              title="Align all center"
              className="flex items-center gap-1"
            >
              <AlignCenter size={14} />
              <span>Center</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAlignImages(selectedImageIds, 'right')}
              title="Align all right"
              className="flex items-center gap-1"
            >
              <AlignRight size={14} />
              <span>Right</span>
            </Button>
          </div>
        </div>
        
        <div className="operation-row">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onResizeImages(selectedImageIds, 0.9)}
            title="Decrease size of all selected images"
            className="flex items-center gap-1"
          >
            <ZoomOut size={14} />
            <span>Smaller</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onResizeImages(selectedImageIds, 1.1)}
            title="Increase size of all selected images"
            className="flex items-center gap-1"
          >
            <ZoomIn size={14} />
            <span>Larger</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReplaceClick}
            title="Replace all selected images"
            className="flex items-center gap-1"
          >
            <ImageIcon size={14} />
            <span>Replace all</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        
        {selectedImageIds.length >= 3 && (
          <div className="operation-row">
            <span className="text-sm text-gray-500 mr-2">Distribute:</span>
            <div className="distribute-buttons">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDistributeImages(selectedImageIds, 'horizontal')}
                title="Distribute horizontally"
              >
                <MoveHorizontal size={14} />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDistributeImages(selectedImageIds, 'vertical')}
                title="Distribute vertically"
              >
                <MoveVertical size={14} />
              </Button>
            </div>
          </div>
        )}
        
        <div className="operation-row mt-2">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onRemoveImages(selectedImageIds)}
            title="Remove all selected images"
            className="flex items-center gap-1"
          >
            <Trash size={14} />
            <span>Delete all</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            title="Close toolbar"
            className="flex items-center gap-1 ml-auto"
          >
            <X size={14} />
            <span>Deselect all</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MultiImageToolbar;