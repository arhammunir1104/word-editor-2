import React from 'react';
import { Button } from '../../components/ui/button';
import { Image } from 'lucide-react';

interface ImageTestButtonProps {
  editor: any;
}

/**
 * Test component for direct image insertion into the editor
 * Used to diagnose issues with image loading
 */
export default function ImageTestButton({ editor }: ImageTestButtonProps) {
  // Test direct image insertion using a sample image URL
  const insertTestImage = () => {
    if (!editor) {
      console.error('❌ Editor is not available');
      return;
    }
    
    console.log('🔍 Starting test image insertion...');
    
    try {
      // Use a sample image URL for testing
      const sampleImageUrl = 'https://images.unsplash.com/photo-1575936123452-b67c3203c357?q=80&w=500&auto=format&fit=crop';
      console.log('🖼️ Using sample image URL:', sampleImageUrl);
      
      // Create unique ID for the image
      const imageId = `test-image-${Date.now()}`;
      
      // Insert directly using the image node type
      editor.chain().focus().setImage({
        src: sampleImageUrl,
        alt: 'Sample Test Image',
        title: 'Sample Test Image',
        dataId: imageId,
        width: 400
      }).run();
      
      console.log('✅ Test image insertion complete');
      
    } catch (error) {
      console.error('❌ Error inserting test image:', error);
    }
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={insertTestImage}
      className="p-1 rounded-full hover:bg-red-100 h-8 w-8 flex items-center justify-center" 
      title="Debug: Insert Test Image"
    >
      <Image className="h-4 w-4 text-red-600" />
    </Button>
  );
}