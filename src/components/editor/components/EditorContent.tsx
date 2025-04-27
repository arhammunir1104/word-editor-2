import React from 'react';
import { Editor } from '@tiptap/react';
import PageManager from '../page-manager';
import GDocImageToolbar from '../gdoc-image-toolbar';

interface EditorContentProps {
  editor: Editor | null;
  zoom: number;
  selectedImageId: string | null;
}

/**
 * EditorContent component handles the main content area of the editor
 * This includes the document pages and any floating content like image toolbars
 */
export function EditorContent({
  editor,
  zoom,
  selectedImageId
}: EditorContentProps) {
  return (
    <>
      {/* Google Docs-style Image toolbar for selected images */}
      {editor && (
        <GDocImageToolbar
          editor={editor}
          imageId={selectedImageId}
        />
      )}
      
      <main className="flex-grow overflow-auto bg-gray-100">
        <div className="p-8 flex flex-col items-center">
          {/* Document manager with pagination */}
          <PageManager editor={editor} zoom={zoom} />
        </div>
      </main>
    </>
  );
}

export default EditorContent;