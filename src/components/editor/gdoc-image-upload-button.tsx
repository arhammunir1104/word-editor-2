import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { insertImageFromFile } from './gdoc-image-extension';

interface GDocImageUploadButtonProps {
  editor: any;
}

/**
 * Google Docs-style image upload button
 * This component creates a button that when clicked:
 * 1. Opens a file input dialog for selecting images
 * 2. Handles the upload and insertion of the selected image
 * 3. Integrates with the history system for undo/redo
 */
const GDocImageUploadButton: React.FC<GDocImageUploadButtonProps> = ({ editor }) => {
  const handleImageUpload = () => {
    if (!editor) return;
    
    console.log('Image upload requested - creating file input');
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*'; // Accept all image formats
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // When a file is selected, process it
    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (file) {
        console.log('File selected:', file.name, 'type:', file.type, 'size:', file.size);
        
        try {
          // Use our Google Docs image extension to handle the file
          await insertImageFromFile(file, editor);
          console.log('Image inserted successfully');
          
          // Record history step for undo/redo
          if (window.historyManager) {
            window.historyManager.addHistoryStep('insert-image');
          }
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }
      
      // Clean up by removing the file input
      document.body.removeChild(fileInput);
    };
    
    // Programmatically click the file input to open the dialog
    fileInput.click();
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleImageUpload}
      className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
      title="Insert image from your computer"
    >
      <ImageIcon className="h-4 w-4" />
    </Button>
  );
};

export default GDocImageUploadButton;