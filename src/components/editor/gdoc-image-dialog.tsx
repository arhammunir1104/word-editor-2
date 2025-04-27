import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

interface GDocImageDialogProps {
  editor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: string | null;
}

/**
 * Dialog for editing image properties (alt text, size, etc.)
 */
const GDocImageDialog: React.FC<GDocImageDialogProps> = ({
  editor,
  open,
  onOpenChange,
  imageId,
}) => {
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [maintainRatio, setMaintainRatio] = useState(true);
  
  // Load image properties when dialog opens
  useEffect(() => {
    if (!open || !imageId || !editor) return;
    
    // Find image in document
    let imageNode: any = null;
    
    editor.view.state.doc.descendants((node: any) => {
      if (node.type.name === 'gDocImage' && node.attrs.imageId === imageId) {
        imageNode = node;
        return false;
      }
      return true;
    });
    
    if (imageNode) {
      // Set form values from node attributes
      setAltText(imageNode.attrs.alt || '');
      setCaption(imageNode.attrs.caption || '');
      
      // Get dimensions
      let imgWidth = imageNode.attrs.width;
      let imgHeight = imageNode.attrs.height;
      
      // If dimensions are not set in the node, get them from the DOM
      if (!imgWidth || !imgHeight) {
        const imgElement = document.querySelector(`.gdoc-image[data-image-id="${imageId}"]`) as HTMLImageElement;
        if (imgElement) {
          imgWidth = imgElement.width;
          imgHeight = imgElement.height;
        }
      }
      
      setWidth(imgWidth?.toString() || '');
      setHeight(imgHeight?.toString() || '');
      setOriginalWidth(parseInt(imgWidth?.toString() || '0'));
      setOriginalHeight(parseInt(imgHeight?.toString() || '0'));
    }
  }, [open, imageId, editor]);
  
  // Handle dimension changes with aspect ratio lock
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = e.target.value;
    setWidth(newWidth);
    
    if (maintainRatio && originalWidth && originalHeight) {
      const ratio = originalHeight / originalWidth;
      const newHeight = Math.round(parseInt(newWidth || '0') * ratio);
      setHeight(newHeight.toString());
    }
  };
  
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = e.target.value;
    setHeight(newHeight);
    
    if (maintainRatio && originalWidth && originalHeight) {
      const ratio = originalWidth / originalHeight;
      const newWidth = Math.round(parseInt(newHeight || '0') * ratio);
      setWidth(newWidth.toString());
    }
  };
  
  // Reset to original dimensions
  const handleReset = () => {
    setWidth(originalWidth.toString());
    setHeight(originalHeight.toString());
  };
  
  // Apply changes and close dialog
  const handleApply = () => {
    if (!editor || !imageId) return;
    
    // Find the image node position
    let imagePos: number | null = null;
    
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'gDocImage' && node.attrs.imageId === imageId) {
        imagePos = pos;
        return false;
      }
      return true;
    });
    
    if (imagePos !== null) {
      // Update node attributes
      editor.chain()
        .setNodeSelection(imagePos)
        .updateAttributes('gDocImage', {
          alt: altText,
          caption: caption || null,
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
        })
        .run();
      
      // Add history step
      if (window.historyManager) {
        window.historyManager.addHistoryStep('edit-image-properties');
      }
    }
    
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Image Options</DialogTitle>
          <DialogDescription>
            Adjust the properties of the selected image.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="text">
          <TabsList>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="size">Size</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt text (for accessibility)</Label>
              <Input
                id="alt-text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe this image"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption below the image"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="size" className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={handleWidthChange}
                  min="10"
                />
              </div>
              
              <div className="space-y-2 flex-1">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={handleHeightChange}
                  min="10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maintain-ratio"
                checked={maintainRatio}
                onChange={(e) => setMaintainRatio(e.target.checked)}
              />
              <Label htmlFor="maintain-ratio">Maintain aspect ratio</Label>
            </div>
            
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset to original size
            </Button>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GDocImageDialog;