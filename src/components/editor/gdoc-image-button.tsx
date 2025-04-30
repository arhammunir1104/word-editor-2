import React from 'react';
import { Image } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

interface GDocImageButtonProps {
  editor: any;
}

/**
 * Toolbar button for inserting images
 */
const GDocImageButton: React.FC<GDocImageButtonProps> = ({ editor }) => {
  const handleInsertImage = () => {
    // Trigger image upload event
    document.dispatchEvent(new CustomEvent('gdoc:toolbar:insertImage'));
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleInsertImage}
            className="h-8 w-8 p-0 rounded-full"
            aria-label="Insert image"
          >
            <Image className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Insert image</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GDocImageButton;