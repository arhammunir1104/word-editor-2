/**
 * Comments Context Provider
 * 
 * Manages all comment-related data and operations for Google Docs-style commenting:
 * - Storing/retrieving comments
 * - Adding new comments
 * - Resolving/unresolving comments
 * - Replying to comments
 * - Deleting comments
 * - Updating the UI when comments change
 */
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Editor } from '@tiptap/react';

// Define the Comment and Reply interfaces
export interface CommentReply {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies: CommentReply[];
  // Selection data
  text: string; // The text that was selected
  from: number; // Start position in the document
  to: number; // End position in the document
}

type CommentContextValue = {
  comments: Comment[];
  addComment: (text: string, content: string, from: number, to: number) => string;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  unresolveComment: (id: string) => void;
  addReply: (commentId: string, content: string) => void;
  deleteReply: (commentId: string, replyId: string) => void;
  getCommentById: (id: string) => Comment | undefined;
  activeCommentId: string | null;
  setActiveCommentId: (id: string | null) => void;
  getCommentsForDocument: (documentId?: number) => Comment[];
  clearComments: () => void;
};

// Create context with a default empty value
const CommentContext = createContext<CommentContextValue>({
  comments: [],
  addComment: () => '',
  deleteComment: () => {},
  resolveComment: () => {},
  unresolveComment: () => {},
  addReply: () => {},
  deleteReply: () => {},
  getCommentById: () => undefined,
  activeCommentId: null,
  setActiveCommentId: () => {},
  getCommentsForDocument: () => [],
  clearComments: () => {},
});

// Storage key for local storage persistence
const COMMENTS_STORAGE_KEY = 'gdocs_comments';

interface CommentProviderProps {
  children: ReactNode;
  editor: Editor | null;
  documentId?: number;
}

export const CommentProvider: React.FC<CommentProviderProps> = ({ 
  children,
  editor,
  documentId,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Load comments from localStorage on initial render
  useEffect(() => {
    try {
      const savedComments = localStorage.getItem(COMMENTS_STORAGE_KEY);
      if (savedComments) {
        const parsedComments = JSON.parse(savedComments);
        // Convert ISO string timestamps back to Date objects
        const processedComments = parsedComments.map((comment: any) => ({
          ...comment,
          timestamp: new Date(comment.timestamp),
          replies: comment.replies.map((reply: any) => ({
            ...reply,
            timestamp: new Date(reply.timestamp)
          }))
        }));
        setComments(processedComments);
      }
    } catch (error) {
      console.error('Error loading comments from localStorage', error);
    }
  }, []);

  // Save comments to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
    } catch (error) {
      console.error('Error saving comments to localStorage', error);
    }
  }, [comments]);
  
  // Add a listener to handle document changes including undo/redo operations
  useEffect(() => {
    if (!editor) return;
    
    // Listener for document changes
    const handleUpdate = () => {
      try {
        // Remove comments whose text has been deleted from the document
        setComments(prevComments => {
          const updatedComments = prevComments.filter(comment => {
            if (!editor || !editor.state) return true;
            
            // First check if the comment mark still exists in the document
            let markExists = false;
            editor.state.doc.descendants((node, pos) => {
              if (markExists) return false; // Skip if already found
              
              const marks = node.marks.filter(mark => 
                mark.type.name === 'comment' && mark.attrs.id === comment.id
              );
              
              if (marks.length > 0) {
                markExists = true;
                return false; // Stop searching
              }
              
              return true; // Continue searching
            });
            
            if (!markExists) {
              console.log(`Comment ${comment.id} removed during document update`);
              return false; // Remove this comment
            }
            
            return true; // Keep this comment
          });
          
          return updatedComments.length !== prevComments.length 
            ? updatedComments 
            : prevComments;
        });
      } catch (error) {
        console.error('Error during document update handler:', error);
      }
    };
    
    const handleUndoRedo = ({ transaction }: any) => {
      if (transaction.getMeta('isUndo') || transaction.getMeta('isRedo')) {
        console.log("Detected undo/redo transaction");
        // Run our handler on undo/redo
        handleUpdate();
      }
    };
    
    // Listen for both general updates and specific undo/redo transactions
    editor.on('update', handleUpdate);
    editor.on('transaction', handleUndoRedo);
    
    return () => {
      editor.off('update', handleUpdate);
      editor.off('transaction', handleUndoRedo);
    };
  }, [editor]);

  // Add a new comment
  const addComment = (
    text: string,
    content: string,
    from: number,
    to: number
  ): string => {
    const id = `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newComment: Comment = {
      id,
      author: 'You',
      content,
      timestamp: new Date(),
      resolved: false,
      replies: [],
      text,
      from,
      to
    };
    
    setComments(prevComments => [...prevComments, newComment]);
    setActiveCommentId(id);
    return id;
  };

  // Delete a comment
  const deleteComment = (id: string) => {
    setComments(prevComments => 
      prevComments.filter(comment => comment.id !== id)
    );
    
    if (activeCommentId === id) {
      setActiveCommentId(null);
    }
    
    // Also remove the comment mark from the editor if it exists
    if (editor) {
      const { state, dispatch } = editor.view;
      const { doc } = state;
      
      let found = false;
      doc.descendants((node, pos) => {
        if (found) return false;
        
        const marks = node.marks.filter(mark => 
          mark.type.name === 'comment' && mark.attrs.id === id
        );
        
        if (marks.length > 0) {
          found = true;
          
          // Remove the comment mark
          const tr = state.tr;
          tr.removeMark(pos, pos + node.nodeSize, state.schema.marks.comment);
          dispatch(tr);
          
          return false;
        }
        
        return true;
      });
    }
  };

  // Resolve a comment
  const resolveComment = (id: string) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === id ? { ...comment, resolved: true } : comment
      )
    );
  };

  // Unresolve a comment
  const unresolveComment = (id: string) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === id ? { ...comment, resolved: false } : comment
      )
    );
  };

  // Add a reply to a comment
  const addReply = (commentId: string, content: string) => {
    if (!content.trim()) return;
    
    const replyId = `reply-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newReply: CommentReply = {
      id: replyId,
      author: 'You',
      content,
      timestamp: new Date()
    };
    
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId
          ? { ...comment, replies: [...comment.replies, newReply] }
          : comment
      )
    );
  };

  // Delete a reply from a comment
  const deleteReply = (commentId: string, replyId: string) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId
          ? { 
              ...comment, 
              replies: comment.replies.filter(reply => reply.id !== replyId) 
            }
          : comment
      )
    );
  };

  // Get a comment by ID
  const getCommentById = (id: string): Comment | undefined => {
    return comments.find(comment => comment.id === id);
  };

  // Get comments for a specific document (if documentId is provided)
  const getCommentsForDocument = (docId?: number): Comment[] => {
    if (!docId) return comments;
    
    // In a real implementation, you'd filter by documentId
    // For now, we'll just return all comments
    return comments;
  };

  // Clear all comments (useful when loading a new document)
  const clearComments = () => {
    setComments([]);
    setActiveCommentId(null);
  };

  // The value provided to consumers of this context
  const contextValue: CommentContextValue = {
    comments,
    addComment,
    deleteComment,
    resolveComment,
    unresolveComment,
    addReply,
    deleteReply,
    getCommentById,
    activeCommentId,
    setActiveCommentId,
    getCommentsForDocument,
    clearComments,
  };

  return (
    <CommentContext.Provider value={contextValue}>
      {children}
    </CommentContext.Provider>
  );
};

// Custom hook to use the comment context
export const useComments = () => useContext(CommentContext);

export default CommentProvider;