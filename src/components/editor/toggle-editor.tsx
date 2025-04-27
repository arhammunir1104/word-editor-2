import React, { useState } from 'react';
import OldEditor from './index';
import NewEditor from './new-index';
import { Button } from '../../components/ui/button';

interface ToggleEditorProps {
  initialContent?: any;
  documentId?: number;
  isLoading?: boolean;
  parentCommentSidebar?: boolean;
  toggleParentCommentSidebar?: () => void;
}

/**
 * ToggleEditor component allows switching between old and new editor versions
 * This is useful during refactoring to ensure no functionality is lost
 */
export default function ToggleEditor(props: ToggleEditorProps) {
  const [useNewEditor, setUseNewEditor] = useState(false);
  
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-100 p-2 flex items-center justify-between border-b">
        <span className="text-gray-700 font-medium">
          {useNewEditor ? 'Using: New Modular Editor' : 'Using: Original Editor'}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setUseNewEditor(!useNewEditor)}
        >
          Switch to {useNewEditor ? 'Original' : 'New'} Editor
        </Button>
      </div>
      
      <div className="flex-grow">
        {useNewEditor ? (
          <NewEditor {...props} />
        ) : (
          <OldEditor {...props} />
        )}
      </div>
    </div>
  );
}