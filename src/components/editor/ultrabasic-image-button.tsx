import React, { useRef } from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface UltraBasicImageButtonProps {
  editor: any;
}

/**
 * Ultra-basic image upload button
 * This component uses document.execCommand for direct image insertion
 * This is a compatibility approach that works in many browsers
 */
export default function UltraBasicImageButton({ editor }: UltraBasicImageButtonProps) {
  // Create a ref for the file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle button click
  const handleClick = () => {
    // Show file selection dialog
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // For quick testing with a placeholder image
  const insertPlaceholder = () => {
    // Focus the editor
    if (editor) editor.commands.focus();
    
    // Insert a placeholder image
    document.execCommand('insertImage', false, 'https://via.placeholder.com/150');
    console.log("Inserted placeholder image");
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("Image selected:", file.name);
    
    // Create a file reader
    const reader = new FileReader();
    
    // Handle file load complete
    reader.onload = () => {
      const dataUrl = reader.result as string;
      
      // CRITICAL: Make sure editor has focus before inserting
      if (editor) editor.commands.focus();
      
      // Wait a moment for focus to take effect
      setTimeout(() => {
        // DIRECT APPROACH: Use execCommand to insert image
        // This bypasses TipTap completely and uses the browser's built-in functionality
        document.execCommand('insertImage', false, dataUrl);
        console.log("Image inserted: success");
        
        // Let other components know an image was inserted
        document.dispatchEvent(new CustomEvent('image:inserted', { 
          detail: { src: dataUrl, success: true }
        }));
      }, 50);
    };
    
    // Handle errors
    reader.onerror = () => {
      console.error("Error reading file");
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
        title="Insert image (execCommand)"
      >
        <Image className="h-4 w-4" />
      </Button>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </>
  );
}