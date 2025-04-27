import React from 'react';
import { Editor } from '@tiptap/react';
import CommentsSidebar from '../comments-sidebar';

interface CommentsSidebarContainerProps {
  editor: Editor | null;
  showCommentsSidebar: boolean;
  activeCommentId?: string;
  setShowCommentsSidebar: (show: boolean) => void;
}

/**
 * CommentsSidebarContainer component handles the comments sidebar
 * This component manages the visibility and interaction with comments
 */
export function CommentsSidebarContainer({
  editor,
  showCommentsSidebar,
  activeCommentId,
  setShowCommentsSidebar
}: CommentsSidebarContainerProps) {
  if (!editor || !showCommentsSidebar) return null;
  
  return (
    <CommentsSidebar 
      editor={editor} 
      onClose={() => setShowCommentsSidebar(false)} 
      openCommentId={activeCommentId}
    />
  );
}

export default CommentsSidebarContainer;