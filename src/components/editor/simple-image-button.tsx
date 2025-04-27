import React, { useRef } from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { insertImageFromFile } from './direct-image-extension'; 

interface SimpleImageButtonProps {
  editor: any;
}

/**
 * Simple, reliable image upload button
 * This component works with a direct file input approach
 */
export default function SimpleImageButton({ editor }: SimpleImageButtonProps) {
  // Use a ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle click on the button - opens file dialog
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    
    console.log("Image selected:", file.name, "size:", file.size, "type:", file.type);
    
    try {
      // Use our direct image insertion helper
      const success = await insertImageFromFile(file, editor);
      
      if (success) {
        console.log("✓ Image inserted successfully");
      } else {
        console.error("✗ Failed to insert image");
        
        // Fallback method if the first approach fails
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          if (typeof result === 'string') {
            editor.chain().focus().setImage({ src: result }).run();
            console.log("✓ Image inserted using fallback method");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Error inserting image:", error);
    }
    
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
        onClick={handleButtonClick}
        className="p-1 rounded-full hover:bg-gray-100 h-8 w-8 flex items-center justify-center"
        title="Insert image from your computer"
      >
        <Image className="h-4 w-4" />
      </Button>
      
      {/* Hidden file input */}
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