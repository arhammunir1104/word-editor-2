import React, { useState, useEffect } from 'react';
import ImageControls from './image-controls';
import FloatingImageToolbar from './floating-image-toolbar';
import MultiImageToolbar from './multi-image-toolbar';
import { 
  getSelectedImageId,
  getAllSelectedImageIds,
  setImageWrappingMode, 
  resetImage, 
  replaceImage, 
  cropImage, 
  setImageAltText, 
  deselectImage
} from './image-interactive';
import './image-advanced-styles.css';
import './floating-toolbar.css';

/**
 * Component to manage image selection and controls in the editor
 * This acts as a layer above the editor to handle image interactions
 * Supports multiple images with separate floating toolbars
 */
const ImageManager: React.FC = () => {
  // Support tracking multiple selected images
  const [selectedImages, setSelectedImages] = useState<Map<string, {
    position: { x: number, y: number },
    dimensions: { width: number, height: number }
  }>>(new Map());
  
  // Keep this for backward compatibility
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Function to get image position and size
  const getImagePositionAndDimensions = (imageId: string) => {
    const imageElement = document.getElementById(imageId) as HTMLImageElement;
    if (!imageElement) return null;
    
    const rect = imageElement.getBoundingClientRect();
    return {
      position: { 
        x: rect.left + window.scrollX, 
        y: rect.top + window.scrollY 
      },
      dimensions: { 
        width: imageElement.width || rect.width, 
        height: imageElement.height || rect.height 
      }
    };
  };

  // Listen for image selection events
  useEffect(() => {
    const handleImageSelected = (e: CustomEvent) => {
      const imageId = e.detail.id;
      setSelectedImageId(imageId);
      
      // Get image position and dimensions for the floating toolbar
      const imageInfo = getImagePositionAndDimensions(imageId);
      if (imageInfo) {
        // Add to the selectedImages map
        setSelectedImages(prevMap => {
          const newMap = new Map(prevMap);
          newMap.set(imageId, imageInfo);
          return newMap;
        });
      }
    };

    const handleImageDeselected = (e: CustomEvent) => {
      const imageId = e.detail?.id;
      
      if (imageId) {
        // Remove specific image
        setSelectedImages(prevMap => {
          const newMap = new Map(prevMap);
          newMap.delete(imageId);
          return newMap;
        });
        
        if (selectedImageId === imageId) {
          setSelectedImageId(null);
        }
      } else {
        // Clear all selections
        setSelectedImages(new Map());
        setSelectedImageId(null);
      }
    };

    const handleImageDeleted = (e: CustomEvent) => {
      const imageId = e.detail.id;
      const imageElement = document.getElementById(imageId);
      
      if (imageElement) {
        const container = imageElement.closest('.image-container');
        if (container) {
          container.remove();
        } else {
          imageElement.remove();
        }
      }
      
      // Remove from selectedImages
      setSelectedImages(prevMap => {
        const newMap = new Map(prevMap);
        newMap.delete(imageId);
        return newMap;
      });
      
      if (selectedImageId === imageId) {
        setSelectedImageId(null);
      }
    };
    
    // Handle newly inserted images
    const handleImageInserted = (e: CustomEvent) => {
      const imageId = e.detail.id;
      console.log('Image inserted event received for:', imageId);
      
      // Add a slight delay to ensure the image is fully rendered before selecting
      setTimeout(() => {
        setSelectedImageId(imageId);
        
        // Get image position and dimensions for the floating toolbar
        const imageInfo = getImagePositionAndDimensions(imageId);
        if (imageInfo) {
          // Add to the selectedImages map
          setSelectedImages(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(imageId, imageInfo);
            return newMap;
          });
        }
      }, 100);
    };

    // Add event listeners
    document.addEventListener('image:selected', handleImageSelected as EventListener);
    document.addEventListener('image:deselected', handleImageDeselected as EventListener);
    document.addEventListener('image:delete', handleImageDeleted as EventListener);
    document.addEventListener('image:inserted', handleImageInserted as EventListener);

    // Check if there's already a selected image (page refresh case)
    const currentSelectedId = getSelectedImageId();
    if (currentSelectedId) {
      setSelectedImageId(currentSelectedId);
    }

    // Cleanup
    return () => {
      document.removeEventListener('image:selected', handleImageSelected as EventListener);
      document.removeEventListener('image:deselected', handleImageDeselected as EventListener);
      document.removeEventListener('image:delete', handleImageDeleted as EventListener);
      document.removeEventListener('image:inserted', handleImageInserted as EventListener);
    };
  }, []);

  // Handler for removing an image
  const handleRemoveImage = (id: string) => {
    const imageElement = document.getElementById(id);
    if (imageElement) {
      // Store image information for undo/redo
      const imageInfo = {
        src: (imageElement as HTMLImageElement).src,
        width: imageElement.offsetWidth,
        height: imageElement.offsetHeight,
        alt: (imageElement as HTMLImageElement).alt || '',
        style: imageElement.getAttribute('style') || '',
        parentHTML: imageElement.parentElement?.outerHTML || ''
      };
      
      // Find the container and remove it
      const container = imageElement.closest('.image-container');
      if (container) {
        container.remove();
      } else {
        imageElement.remove();
      }
      
      // Record history step for undo/redo
      if (window.historyManager) {
        window.historyManager.addHistoryStep(`image-remove-${id}`);
        // In a real implementation with a more advanced history manager,
        // we would store the image data for potential restoration
      }
    }
    
    // Update state after removing image
    setSelectedImageId(null);
    
    // Remove from selectedImages map
    setSelectedImages(prevMap => {
      const newMap = new Map(prevMap);
      newMap.delete(id);
      return newMap;
    });
  };

  // Handler for changing wrapping mode
  const handleChangeWrapping = (id: string, mode: 'inline' | 'wrap' | 'break') => {
    const imageElement = document.getElementById(id);
    if (imageElement) {
      // Store current mode for undo/redo
      const container = imageElement.closest('.image-container');
      let currentMode = 'inline';
      
      if (container) {
        if (container.classList.contains('image-wrap')) currentMode = 'wrap';
        if (container.classList.contains('image-break')) currentMode = 'break';
      }
      
      // Apply new wrapping mode
      setImageWrappingMode(id, mode);
      
      // Record history step for undo/redo
      if (window.historyManager) {
        window.historyManager.addHistoryStep(`image-wrap-${id}-${mode}`);
      }
    }
  };

  // Handler for resizing image
  const handleResizeImage = (id: string, width: number, height: number) => {
    const imageElement = document.getElementById(id) as HTMLImageElement;
    if (imageElement) {
      // Store original dimensions to enable undo/redo
      const originalWidth = imageElement.offsetWidth;
      const originalHeight = imageElement.offsetHeight;
      
      // Apply new dimensions
      imageElement.style.width = `${width}px`;
      imageElement.style.height = `${height}px`;
      
      // Record history step for undo/redo
      if (window.historyManager) {
        window.historyManager.addHistoryStep(`image-resize-${id}`);
        // Store resize data in a way that doesn't cause TypeScript errors
        // In a real implementation, we would need to modify the historyManager to handle complex state
      }
    }
  };

  // Handler for rotating image
  const handleRotateImage = (id: string, angle: number) => {
    const imageElement = document.getElementById(id) as HTMLImageElement;
    if (imageElement) {
      // Get current transform to enable undo/redo
      const existingTransform = imageElement.style.transform || '';
      const rotateMatch = existingTransform.match(/rotate\(([^)]+)deg\)/);
      const originalAngle = rotateMatch && rotateMatch[1] ? parseInt(rotateMatch[1], 10) : 0;
      
      // Apply new rotation
      const newTransform = existingTransform.replace(/rotate\([^)]+\)/, '') + ` rotate(${angle}deg)`;
      imageElement.style.transform = newTransform.trim();
      
      // Record history step for undo/redo
      if (window.historyManager) {
        window.historyManager.addHistoryStep(`image-rotate-${id}-${angle}`);
      }
    }
  };

  // Handler for cropping image
  const handleCropImage = (id: string, crop: { x: number, y: number, width: number, height: number }) => {
    cropImage(id, crop);
  };

  // Handler for replacing image
  const handleReplaceImage = (id: string, newImageUrl: string) => {
    replaceImage(id, newImageUrl);
  };

  // Handler for resetting image
  const handleResetImage = (id: string) => {
    resetImage(id);
  };

  // Handler for setting alt text
  const handleSetAltText = (id: string, altText: string) => {
    setImageAltText(id, altText);
  };
  
  // Handler for aligning image
  const handleAlignImage = (id: string, align: 'left' | 'center' | 'right', recordHistory = true) => {
    const imageElement = document.getElementById(id) as HTMLImageElement;
    if (!imageElement) return;
    
    const container = imageElement.closest('.image-container');
    if (container) {
      // Remove previous alignment classes
      container.classList.remove('image-align-left', 'image-align-center', 'image-align-right');
      
      // Add new alignment class
      container.classList.add(`image-align-${align}`);
      
      // Record history step for undo/redo (skip if part of a multi-image operation)
      if (recordHistory && window.historyManager) {
        window.historyManager.addHistoryStep(`align-image-${id}`);
      }
    }
  };
  
  // Handler for moving image
  const handleMoveImage = (id: string, x: number, y: number) => {
    const imageElement = document.getElementById(id) as HTMLImageElement;
    if (!imageElement) return;
    
    const container = imageElement.closest('.image-container');
    if (container) {
      (container as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
      
      // Record history step for undo/redo
      if (window.historyManager) {
        window.historyManager.addHistoryStep(`move-image-${id}`);
      }
    }
  };
  
  // Handler for closing the floating toolbar for a specific image
  const handleCloseToolbar = (imageId: string) => {
    setSelectedImages(prevMap => {
      const newMap = new Map(prevMap);
      newMap.delete(imageId);
      return newMap;
    });
    
    if (selectedImageId === imageId) {
      setSelectedImageId(null);
    }
  };

  // New handlers for multiple image operations
  const handleAlignMultipleImages = (ids: string[], align: 'left' | 'center' | 'right') => {
    // First add a group history step to capture the whole operation
    if (window.historyManager) {
      window.historyManager.addHistoryStep(`multi-image-align-${align}`);
    }
    
    // Then align each image individually
    ids.forEach(id => handleAlignImage(id, align, false)); // Pass false to skip individual history steps
  };

  const handleRemoveMultipleImages = (ids: string[]) => {
    // Record a single history step for the entire operation
    if (window.historyManager) {
      window.historyManager.addHistoryStep(`multi-image-remove-${ids.length}`);
    }
    
    ids.forEach(id => handleRemoveImage(id));
  };

  const handleResizeMultipleImages = (ids: string[], scaleChange: number) => {
    // Record a single history step for the entire operation
    if (window.historyManager) {
      window.historyManager.addHistoryStep(`multi-image-resize-${scaleChange.toFixed(2)}`);
    }
    
    ids.forEach(id => {
      const imageElement = document.getElementById(id) as HTMLImageElement;
      if (imageElement) {
        const currentWidth = imageElement.offsetWidth;
        const currentHeight = imageElement.offsetHeight;
        const newWidth = currentWidth * scaleChange;
        const newHeight = currentHeight * scaleChange;
        handleResizeImage(id, newWidth, newHeight);
      }
    });
  };

  const handleReplaceMultipleImages = (ids: string[], newUrl?: string) => {
    if (!newUrl) return;
    
    // Record a single history step for the entire operation
    if (window.historyManager) {
      window.historyManager.addHistoryStep(`multi-image-replace-${ids.length}`);
    }
    
    ids.forEach(id => handleReplaceImage(id, newUrl));
  };

  const handleDistributeImages = (ids: string[], direction: 'horizontal' | 'vertical') => {
    if (ids.length < 3) return; // Need at least 3 images to distribute
    
    // Record a single history step for the entire operation
    if (window.historyManager) {
      window.historyManager.addHistoryStep(`multi-image-distribute-${direction}`);
    }

    // Get all image elements and their positions
    const imageElements = ids.map(id => ({
      id,
      element: document.getElementById(id) as HTMLImageElement,
      container: document.getElementById(id)?.closest('.image-container') as HTMLElement
    })).filter(item => item.element && item.container);

    if (direction === 'horizontal') {
      // Sort by x position
      imageElements.sort((a, b) => {
        const rectA = a.element.getBoundingClientRect();
        const rectB = b.element.getBoundingClientRect();
        return rectA.left - rectB.left;
      });

      // Get leftmost and rightmost positions
      const leftmost = imageElements[0].element.getBoundingClientRect().left;
      const rightmost = imageElements[imageElements.length - 1].element.getBoundingClientRect().right;
      const totalWidth = rightmost - leftmost;
      const step = totalWidth / (imageElements.length - 1);

      // Skip first and last elements (they define the boundaries)
      for (let i = 1; i < imageElements.length - 1; i++) {
        const targetLeft = leftmost + step * i;
        const currentLeft = imageElements[i].element.getBoundingClientRect().left;
        const offsetX = targetLeft - currentLeft;
        
        // Apply the offset
        const currentTransform = imageElements[i].container.style.transform || '';
        const translateMatch = currentTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        
        let currentX = 0;
        let currentY = 0;
        
        if (translateMatch) {
          currentX = parseFloat(translateMatch[1]);
          currentY = parseFloat(translateMatch[2]);
        }
        
        const newX = currentX + offsetX;
        handleMoveImage(imageElements[i].id, newX, currentY);
      }
    } else {
      // Sort by y position
      imageElements.sort((a, b) => {
        const rectA = a.element.getBoundingClientRect();
        const rectB = b.element.getBoundingClientRect();
        return rectA.top - rectB.top;
      });

      // Get topmost and bottommost positions
      const topmost = imageElements[0].element.getBoundingClientRect().top;
      const bottommost = imageElements[imageElements.length - 1].element.getBoundingClientRect().bottom;
      const totalHeight = bottommost - topmost;
      const step = totalHeight / (imageElements.length - 1);

      // Skip first and last elements (they define the boundaries)
      for (let i = 1; i < imageElements.length - 1; i++) {
        const targetTop = topmost + step * i;
        const currentTop = imageElements[i].element.getBoundingClientRect().top;
        const offsetY = targetTop - currentTop;
        
        // Apply the offset
        const currentTransform = imageElements[i].container.style.transform || '';
        const translateMatch = currentTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        
        let currentX = 0;
        let currentY = 0;
        
        if (translateMatch) {
          currentX = parseFloat(translateMatch[1]);
          currentY = parseFloat(translateMatch[2]);
        }
        
        const newY = currentY + offsetY;
        handleMoveImage(imageElements[i].id, currentX, newY);
      }
    }
  };

  // Calculate multi-select toolbar position (centered above all selected images)
  const getMultiToolbarPosition = () => {
    if (selectedImages.size < 2) return { x: 0, y: 0 };
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    // Find the bounding box containing all selected images
    selectedImages.forEach(info => {
      const x = info.position.x;
      const y = info.position.y;
      const right = x + info.dimensions.width;
      const bottom = y + info.dimensions.height;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    });
    
    // Position the toolbar centered above the top of the bounding box
    return {
      x: minX + (maxX - minX) / 2 - 150, // Approximate toolbar width / 2
      y: minY - 60 // Position above the images
    };
  };

  // Get all currently selected image IDs
  const multiSelectedImageIds = Array.from(selectedImages.keys());
  
  // Only show individual image toolbars when there's 1 image selected
  const showIndividualToolbars = selectedImages.size === 1;
  
  // Show multi-image toolbar when there are 2+ images selected
  const showMultiImageToolbar = selectedImages.size >= 2;
  
  return (
    <>
      {/* Legacy Image Controls UI - kept for backward compatibility */}
      <ImageControls
        selectedImageId={selectedImageId}
        onRemoveImage={handleRemoveImage}
        onChangeWrapping={handleChangeWrapping}
        onResizeImage={handleResizeImage}
        onRotateImage={handleRotateImage}
        onCropImage={handleCropImage}
        onReplaceImage={handleReplaceImage}
        onResetImage={handleResetImage}
        onSetAltText={handleSetAltText}
      />
      
      {/* Floating toolbars for each selected image (only shown when 1 image is selected) */}
      {showIndividualToolbars && Array.from(selectedImages.entries()).map(([imageId, imageInfo]) => (
        <FloatingImageToolbar
          key={imageId}
          imageId={imageId}
          position={imageInfo.position}
          dimensions={imageInfo.dimensions}
          onResizeImage={handleResizeImage}
          onRotateImage={handleRotateImage}
          onRemoveImage={handleRemoveImage}
          onAlignImage={handleAlignImage}
          onMoveImage={handleMoveImage}
          onReplaceImage={handleReplaceImage}
          onResetImage={handleResetImage}
          onSetAltText={handleSetAltText}
          onClose={() => handleCloseToolbar(imageId)}
        />
      ))}
      
      {/* Multi-image toolbar (shown when 2+ images are selected) */}
      {showMultiImageToolbar && (
        <MultiImageToolbar
          selectedImageIds={multiSelectedImageIds}
          position={getMultiToolbarPosition()}
          onAlignImages={handleAlignMultipleImages}
          onRemoveImages={handleRemoveMultipleImages}
          onResizeImages={handleResizeMultipleImages}
          onReplaceImages={handleReplaceMultipleImages}
          onDistributeImages={handleDistributeImages}
          onClose={() => setSelectedImages(new Map())}
        />
      )}
    </>
  );
};

export default ImageManager;