import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { queryClient } from "../../lib/queryClient";
import { useEditorStore } from "../../lib/editor-store";
import { Button } from "../../components/ui/button";
import { Link } from "wouter";
import { 
  MessageSquare, 
  Lock, 
  History, 
  FileText, 
  Users, 
  Star, 
  StarOff 
} from "lucide-react";

interface HeaderProps {
  toggleCommentsSidebar?: () => void;
  showCommentsSidebar?: boolean;
}

export default function Header({ toggleCommentsSidebar, showCommentsSidebar = false }: HeaderProps) {
  const documentId = useEditorStore((state) => state.documentId);
  const title = useEditorStore((state) => state.title);
  const setTitle = useEditorStore((state) => state.setTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const updateTitleMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) return null;

      const res = await apiRequest(
        "PATCH",
        `/api/documents/${documentId}`,
        { title }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    }
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (documentId) {
      updateTitleMutation.mutate();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
      if (documentId) {
        updateTitleMutation.mutate();
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 print-hide">
      <div className="flex items-center h-16 print-hide">
        {/* Logo and Document Title */}
        <div className="flex items-center mr-4">
          <Link href="/" className="mr-2">
            <img src="https://www.gstatic.com/images/branding/product/1x/docs_2020q4_48dp.png" alt="Google Docs Logo" className="w-10 h-10" />
          </Link>
          <div className="flex flex-col">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onFocus={() => setIsEditingTitle(true)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className={`text-lg font-medium text-gray-700 focus:outline-none ${
                isEditingTitle ? 'border-b-2 border-blue-500' : 'border-b border-transparent'
              }`}
            />
            <div className="flex items-center space-x-1 mt-1">
              <button className="text-xs text-gray-600 hover:bg-gray-100 px-1 py-0.5 rounded">Last edit was a few minutes ago</button>
              <div className="h-3 border-r border-gray-300 mx-1"></div>
              <button className="text-xs text-gray-600 hover:bg-gray-100 px-1 py-0.5 rounded">📝 Editing</button>
            </div>
          </div>
        </div>
        
        <div className="flex-grow"></div>
        
        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          {/* Star/Unstar */}
          <Button variant="ghost" size="sm" className="p-2 rounded-full hover:bg-gray-100" title="Star">
            <StarOff className="h-5 w-5 text-gray-600" />
          </Button>
          
          {/* Comments sidebar button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className={`p-2 rounded-full ${showCommentsSidebar ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={toggleCommentsSidebar}
            title="Comments sidebar"
          >
            <FileText className="h-5 w-5" />
          </Button>
          
          {/* Version history */}
          <Button variant="ghost" size="sm" className="p-2 rounded-full hover:bg-gray-100" title="Version history">
            <History className="h-5 w-5 text-gray-600" />
          </Button>
          
          <div className="h-6 border-r border-gray-300 mx-1"></div>
          
          {/* Share button */}
          <Button className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-1.5 rounded flex items-center">
            <Lock className="h-4 w-4 mr-1" />
            Share
          </Button>
          
          {/* Profile avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
