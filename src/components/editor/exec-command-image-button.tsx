import React, { useRef } from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { insertImageComplete, focusEditor } from './direct-image-insertion';
import { useToast } from '../../hooks/use-toast';

interface ExecCommandImageButtonProps {
  editor: any;
}

/**
 * Simple image button that uses document.execCommand to insert images
 * Enhanced with improved insertion logic and error handling
 */
export default function ExecCommandImageButton({ editor }: ExecCommandImageButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Handle button click - open file selector
  const handleButtonClick = () => {
    // First ensure editor is focused if available
    if (editor) {
      editor.commands.focus();
    } else {
      focusEditor();
    }
    
    // Then open file dialog
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
      
      // Focus the editor first to ensure proper context
      if (editor) {
        editor.commands.focus();
      } else {
        focusEditor();
      }
      
      // Wait a tiny bit for focus to take effect
      setTimeout(() => {
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
      }, 10);
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
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
        title="Insert image (editor aware)"
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