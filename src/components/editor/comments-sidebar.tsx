import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Clock, Check, RefreshCw, MoreVertical, Reply, CornerUpLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { useComments, Comment as CommentType, CommentReply } from './comment-provider';
import { Editor } from '@tiptap/react';
import { commentObserver } from './comment-observer';

interface CommentsSidebarProps {
  onClose: () => void;
  editor: Editor | null;
  openCommentId?: string;
}

// Helper function to format dates in a user-friendly way
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export default function CommentsSidebar({ onClose, editor, openCommentId }: CommentsSidebarProps) {
  // Use our comment context to access comments and functions
  const { 
    comments, 
    addComment, 
    deleteComment, 
    resolveComment, 
    unresolveComment, 
    addReply, 
    deleteReply,
    activeCommentId,
    setActiveCommentId
  } = useComments();

  const [newReply, setNewReply] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'open'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Reference to scroll to a newly opened comment
  const activeCommentRef = useRef<HTMLDivElement>(null);
  
  // Scroll to active comment when it changes
  useEffect(() => {
    if (activeCommentId && activeCommentRef.current) {
      activeCommentRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeCommentId]);
  
  // Set active comment when openCommentId prop changes
  useEffect(() => {
    if (openCommentId) {
      setActiveCommentId(openCommentId);
    }
  }, [openCommentId, setActiveCommentId]);

  // Filter comments based on the selected filter
  const filteredComments = filter === 'all' 
    ? comments 
    : comments.filter(comment => !comment.resolved);
  
  // Sort comments based on the selected sort order
  const sortedComments = [...filteredComments].sort((a, b) => {
    if (sortOrder === 'newest') {
      return b.timestamp.getTime() - a.timestamp.getTime();
    } else {
      return a.timestamp.getTime() - b.timestamp.getTime();
    }
  });

  // Handle resolving/unresolving a comment
  const toggleResolveComment = (id: string, isResolved: boolean) => {
    if (isResolved) {
      unresolveComment(id);
    } else {
      resolveComment(id);
    }
  };
  
  // Handle adding a reply to a comment
  const handleAddReply = (commentId: string) => {
    const replyContent = newReply[commentId];
    if (!replyContent?.trim()) return;
    
    addReply(commentId, replyContent);
    
    // Clear the reply input for this comment
    setNewReply(prev => ({
      ...prev,
      [commentId]: ''
    }));
  };
  
  // Handle reply input change
  const handleReplyChange = (commentId: string, content: string) => {
    setNewReply(prev => ({
      ...prev,
      [commentId]: content
    }));
  };
  
  // Function to highlight all comment marks in the document with specific class
  const highlightAllCommentMarks = (commentId: string, highlightClass: string) => {
    // First remove any existing highlights
    removeAllCommentHighlights();
    
    // Get all marks with this comment ID
    const domMarks = document.querySelectorAll(`mark[data-comment-id="${commentId}"]`);
    
    // Add the highlight class to each mark
    domMarks.forEach(mark => {
      mark.classList.add(highlightClass);
    });
    
    // Return the number of marks highlighted
    return domMarks.length;
  };
  
  // Function to remove all comment highlights
  const removeAllCommentHighlights = () => {
    // Remove any existing active/highlight classes from all comment marks
    document.querySelectorAll('mark[data-comment-id]').forEach(mark => {
      mark.classList.remove('active-comment', 'highlight-comment');
    });
  };
  
  // Jump to a comment's location in the document - ULTRA-SIMPLIFIED APPROACH USING OBSERVER
  const jumpToComment = (comment: CommentType) => {
    if (!editor) return;
    
    console.log(`Jump to comment: ${comment.id}, text: "${comment.text}"`);
    
    // Set active comment ID
    setActiveCommentId(comment.id);
    
    // Try the DOM approach first via our CommentObserver
    try {
      // First force the CommentObserver to highlight all comments
      commentObserver.forceCommentStyling();
      
      // Then specifically highlight this comment
      commentObserver.highlightComment(comment.id);
      
      // Set the editor selection based on stored positions if available
      if (comment.from !== undefined && comment.to !== undefined && comment.from < comment.to) {
        // Set the selection to highlight this range
        editor.commands.setTextSelection({ from: comment.from, to: comment.to });
        
        // Ensure it's visible
        editor.commands.scrollIntoView();
        
        return; // Successfully handled
      }
    } catch (err) {
      console.error("Error in observer-based approach:", err);
    }
    
    // If first approach failed, try to find by direct DOM query
    try {
      // Find all elements with this comment ID
      const elements = document.querySelectorAll(`[data-comment-id="${comment.id}"]`);
      console.log(`Found ${elements.length} elements with comment ID ${comment.id}`);
      
      if (elements.length > 0) {
        // Scroll the first one into view
        const element = elements[0] as HTMLElement;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Try to set the editor selection at this position
        try {
          const pos = editor.view.posAtDOM(element, 0);
          if (pos !== null) {
            editor.commands.setTextSelection(pos);
          }
        } catch (e) {
          console.error("Error setting selection:", e);
        }
        
        return; // Successfully handled
      }
    } catch (err) {
      console.error("Error in direct DOM query approach:", err);
    }
    
    // If still not found, try document text search
    try {
      if (comment.text && comment.text.length > 0) {
        console.log(`Searching for text: "${comment.text}"`);
        
        const { state } = editor.view;
        
        // Search the document for this text
        state.doc.descendants((node, pos) => {
          if (node.isText && node.text?.includes(comment.text)) {
            const from = pos;
            const to = pos + comment.text.length;
            
            // Set selection and scroll
            editor.commands.setTextSelection({ from, to });
            editor.commands.scrollIntoView();
            
            // Apply mark if needed
            const tr = state.tr;
            const mark = state.schema.marks.comment.create({ id: comment.id });
            tr.addMark(from, to, mark);
            editor.view.dispatch(tr);
            
            // Run commentObserver again after mark is applied
            setTimeout(() => commentObserver.highlightComment(comment.id), 100);
            
            return false; // Stop searching
          }
          
          return true; // Continue searching
        });
      }
    } catch (err) {
      console.error("Error in text search method:", err);
      
      // Fallback message as a last resort
      alert("Could not locate the commented text. The document may have been modified.");
    }
  };
  
  return (
    <div className="comments-sidebar fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 z-30 flex flex-col shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-base font-medium text-gray-800">Comments</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full p-1 h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Filters and Sorting */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div className="flex">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs ${filter === 'all' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs ${filter === 'open' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
            onClick={() => setFilter('open')}
          >
            Open
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="text-xs flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>
      
      {/* Comments List */}
      <div className="flex-grow overflow-y-auto">
        {sortedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <MessageSquare className="h-8 w-8 mb-2 text-gray-400" />
            <p>No comments to display</p>
            {filter === 'open' && comments.length > 0 && (
              <p className="mt-1">Show all comments to see resolved items</p>
            )}
          </div>
        ) : (
          <div className="py-2">
            {sortedComments.map((comment) => (
              <div 
                key={comment.id} 
                ref={comment.id === activeCommentId ? activeCommentRef : null}
                className={`px-4 py-3 border-b border-gray-100 
                  ${comment.resolved ? 'bg-gray-50' : 'bg-white'}
                  ${comment.id === activeCommentId ? 'ring-2 ring-blue-400' : ''}
                `}
                onClick={() => setActiveCommentId(comment.id)}
              >
                <div className="flex items-start gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      {comment.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-gray-500 text-xs">{formatTimestamp(comment.timestamp)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0" 
                          title="Jump to comment"
                          onClick={() => jumpToComment(comment)}
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem 
                              onClick={() => toggleResolveComment(comment.id, comment.resolved)}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              <span>{comment.resolved ? 'Unresolve' : 'Resolve'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteComment(comment.id)}>
                              <X className="h-4 w-4 mr-2" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Original comment content */}
                    <div className="mt-1 mb-2">
                      <div className="text-xs text-gray-500 mb-1">
                        {`"${comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text}"`}
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    
                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-3 pl-3 border-l-2 border-gray-200 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="text-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-xs">{reply.author}</span>
                                <span className="text-gray-500 text-xs">{formatTimestamp(reply.timestamp)}</span>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => deleteReply(comment.id, reply.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs mt-1">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Reply input for this comment */}
                    {!comment.resolved && (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Reply..."
                            value={newReply[comment.id] || ''}
                            onChange={(e) => handleReplyChange(comment.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                            className="text-xs h-7"
                          />
                          <Button 
                            size="sm" 
                            className="h-7 px-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleAddReply(comment.id)}
                            disabled={!newReply[comment.id]?.trim()}
                          >
                            <Reply className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Resolved indicator */}
                    {comment.resolved && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Check className="h-3 w-3 mr-1" />
                        <span>Resolved</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}