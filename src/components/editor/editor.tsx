import React from 'react';
import ToggleEditor from './toggle-editor';

interface EditorProps {
  initialContent?: any;
  documentId?: number;
  isLoading?: boolean;
  parentCommentSidebar?: boolean;
  toggleParentCommentSidebar?: () => void;
}

/**
 * Main Editor component that handles document editing
 * This component allows toggling between the old and new editor implementations
 */
export default function Editor(props: EditorProps) {
  // Use the toggle editor component to allow switching between implementations
  return <ToggleEditor {...props} />;
}