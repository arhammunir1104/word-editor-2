import React, { useRef } from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { insertImageComplete, focusEditor } from './direct-image-insertion';
import { useToast } from '../../hooks/use-toast';

/**
 * Direct ExecCommand Image Button
 * This component uses document.execCommand directly without any TipTap integration
 * Implements the exact approach that worked in the previous editor
 */
export default function DirectExecImageButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Handle button click
  const handleClick = () => {
    // First ensure editor is focused
    focusEditor();
    
    // Then open file dialog
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // For testing with a placeholder image
  const insertPlaceholder = () => {
    focusEditor();
    const success = insertImageComplete('https://via.placeholder.com/150');
    console.log(`Inserted placeholder image: ${success ? 'success' : 'failed'}`);
    
    if (success) {
      toast({
        title: "Image inserted",
        description: "Placeholder image was inserted successfully",
      });
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("Image selected:", file.name);
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Focus editor before inserting
      focusEditor();
      
      // Use our improved image insertion helper
      const success = insertImageComplete(dataUrl);
      console.log(`Image inserted: ${success ? 'success' : 'failed'}`);
      
      if (success) {
        toast({
          title: "Image inserted",
          description: `Image ${file.name} was inserted successfully`,
        });
      } else {
        toast({
          title: "Failed to insert image",
          description: "Please try again or use a different image",
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "Failed to read the selected image",
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // For demo/testing: adds a placeholder image on double-click
  const handleDoubleClick = () => {
    insertPlaceholder();
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
        title="Insert image (direct method)"
      >
        <Image className="h-4 w-4" />
      </Button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </>
  );
}