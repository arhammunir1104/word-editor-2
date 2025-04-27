import React from 'react';
import { Editor } from '@tiptap/react';
import SearchModal from '../search-modal';
import LineSpacingDialog from '../line-spacing-dialog';
import CommentModal from '../comment-modal';
import LinkModal from '../link-modal';
import TableContextMenu from '../table-context-menu';

interface EditorModalsProps {
  editor: Editor | null;
  showSearchModal: boolean;
  showCommentModal: boolean;
  showLinkModal: boolean;
  showLineSpacingDialog: boolean;
  tableContextMenuPosition: { x: number; y: number } | null;
  selectedText: string;
  setShowSearchModal: (show: boolean) => void;
  setShowCommentModal: (show: boolean) => void;
  setShowLinkModal: (show: boolean) => void;
  setShowLineSpacingDialog: (show: boolean) => void;
  setTableContextMenuPosition: (position: { x: number; y: number } | null) => void;
  setActiveCommentId: (id: string | undefined) => void;
  toggleParentCommentSidebar?: () => void;
  setShowCommentsSidebar: (show: boolean) => void;
}

/**
 * EditorModals component handles all modals and dialogs used in the editor
 * This component centralizes the modal rendering logic
 */
export function EditorModals({
  editor,
  showSearchModal,
  showCommentModal,
  showLinkModal,
  showLineSpacingDialog,
  tableContextMenuPosition,
  selectedText,
  setShowSearchModal,
  setShowCommentModal,
  setShowLinkModal,
  setShowLineSpacingDialog,
  setTableContextMenuPosition,
  setActiveCommentId,
  toggleParentCommentSidebar,
  setShowCommentsSidebar
}: EditorModalsProps) {
  
  if (!editor) return null;
  
  return (
    <>
      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal editor={editor} onClose={() => setShowSearchModal(false)} />
      )}
      
      {/* Comment Modal */}
      {showCommentModal && (
        <CommentModal 
          editor={editor} 
          onClose={() => {
            // Clear stored selection when closing
            (window as any).lastEditorSelection = null;
            setShowCommentModal(false);
          }}
          onSuccess={(commentId) => {
            setActiveCommentId(commentId);
            if (toggleParentCommentSidebar) {
              toggleParentCommentSidebar();
            } else {
              setShowCommentsSidebar(true);
            }
          }}
        />
      )}
      
      {/* Link Modal */}
      {showLinkModal && (
        <LinkModal 
          editor={editor} 
          onClose={() => {
            setShowLinkModal(false);
          }}
          selectionText={selectedText}
        />
      )}
      
      {/* Line & Paragraph Spacing Dialog */}
      {showLineSpacingDialog && (
        <LineSpacingDialog
          editor={editor}
          isOpen={showLineSpacingDialog}
          onClose={() => setShowLineSpacingDialog(false)}
        />
      )}
      
      {/* Table context menu for table operations */}
      {tableContextMenuPosition && (
        <TableContextMenu
          editor={editor}
          position={tableContextMenuPosition}
          onClose={() => setTableContextMenuPosition(null)}
        />
      )}
    </>
  );
}

export default EditorModals;