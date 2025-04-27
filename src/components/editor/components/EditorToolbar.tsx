import React from 'react';
import { Editor } from '@tiptap/react';
import Toolbar from '../toolbar';

interface EditorToolbarProps {
  editor: Editor | null;
  toggleSearchModal: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomLevels?: number[];
  toggleHeaderFooterMode?: () => void;
  toggleCommentSidebar?: () => void;
  toggleComment?: () => void;
  headers?: string[];
  footers?: string[];
}

/**
 * EditorToolbar component wraps the editor toolbar functionality
 * This component handles the toolbar rendering and interactions
 */
export function EditorToolbar({
  editor,
  toggleSearchModal,
  zoom,
  setZoom,
  zoomLevels = [50, 75, 100, 125, 150, 175, 200],
  toggleHeaderFooterMode,
  toggleCommentSidebar,
  toggleComment,
  headers,
  footers
}: EditorToolbarProps) {
  return (
    <Toolbar
      editor={editor}
      toggleSearchModal={toggleSearchModal}
      zoom={zoom}
      setZoom={setZoom}
      zoomLevels={zoomLevels}
      toggleHeaderFooterMode={toggleHeaderFooterMode}
      toggleCommentSidebar={toggleCommentSidebar}
      toggleComment={toggleComment}
      headers={headers}
      footers={footers}
    />
  );
}

export default EditorToolbar;