import React from 'react';
import { Trash } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface GDocImageToolbarProps {
  editor: any;
  imageId: string | null;
}

/**
 * Simplified toolbar for selected images
 * This is a placeholder for the future enhanced image toolbar
 */
const GDocImageToolbar: React.FC<GDocImageToolbarProps> = ({ editor, imageId }) => {
  // Don't render if no image is selected
  if (!imageId) return null;
  
  // Simplified toolbar - all features removed
  // This is a placeholder for when we rebuild image functionality
  return null;
};

export default GDocImageToolbar;