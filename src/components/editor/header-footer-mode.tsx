import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { EditorContent, useEditor } from '@tiptap/react';
import { getExtensions } from './tiptap-extensions';
import { FileText, ChevronRight, ChevronLeft } from 'lucide-react';

interface HeaderFooterModeProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  footers: string[];
  onEditHeader: (index: number, text: string) => void;
  onEditFooter: (index: number, text: string) => void;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  options?: {
    differentFirstPage: boolean;
    differentOddEven: boolean;
  };
  onOptionsChange?: (options: { differentFirstPage: boolean; differentOddEven: boolean }) => void;
}

export default function HeaderFooterMode({
  isOpen,
  onClose,
  headers,
  footers,
  onEditHeader,
  onEditFooter,
  totalPages,
  currentPage,
  onChangePage,
  options = {
    differentFirstPage: false,
    differentOddEven: false,
  },
  onOptionsChange
}: HeaderFooterModeProps) {
  // Track local state for headers/footers while editing
  const [localHeaders, setLocalHeaders] = useState<string[]>(headers);
  const [localFooters, setLocalFooters] = useState<string[]>(footers);
  const [differentFirstPage, setDifferentFirstPage] = useState(options.differentFirstPage);
  const [differentOddEven, setDifferentOddEven] = useState(options.differentOddEven);
  const [activeTab, setActiveTab] = useState<'header' | 'footer'>('header');
  
  // Helper functions to get the appropriate header/footer index
  const getHeaderIndex = (pageNum: number): number => {
    if (differentFirstPage && pageNum === 1) {
      return 0; // First page header
    } else if (differentOddEven) {
      return pageNum % 2 === 1 ? 1 : 2; // Odd/even headers
    } else {
      return 0; // Default header
    }
  };
  
  const getFooterIndex = (pageNum: number): number => {
    if (differentFirstPage && pageNum === 1) {
      return 0; // First page footer
    } else if (differentOddEven) {
      return pageNum % 2 === 1 ? 1 : 2; // Odd/even footers
    } else {
      return 0; // Default footer
    }
  };
  
  // Get current header/footer index
  const currentHeaderIndex = getHeaderIndex(currentPage);
  const currentFooterIndex = getFooterIndex(currentPage);
  
  // Helper to determine what type of header/footer is being edited
  const getHeaderTitle = (index: number): string => {
    if (differentFirstPage && index === 0) {
      return 'First Page Header';
    } else if (differentOddEven) {
      if (index === 1) return 'Odd Page Header';
      if (index === 2) return 'Even Page Header';
    }
    return 'Header';
  };
  
  const getFooterTitle = (index: number): string => {
    if (differentFirstPage && index === 0) {
      return 'First Page Footer';
    } else if (differentOddEven) {
      if (index === 1) return 'Odd Page Footer';
      if (index === 2) return 'Even Page Footer';
    }
    return 'Footer';
  };
  
  // Update header and footer when tab changes
  const handleLocalHeaderChange = (index: number, value: string) => {
    const newHeaders = [...localHeaders];
    // Ensure we have enough slots
    while (newHeaders.length <= index) {
      newHeaders.push('');
    }
    newHeaders[index] = value;
    setLocalHeaders(newHeaders);
    onEditHeader(index, value);
  };
  
  const handleLocalFooterChange = (index: number, value: string) => {
    const newFooters = [...localFooters];
    // Ensure we have enough slots
    while (newFooters.length <= index) {
      newFooters.push('');
    }
    newFooters[index] = value;
    setLocalFooters(newFooters);
    onEditFooter(index, value);
  };
  
  // Create TipTap editors for rich text editing
  const headerEditor = useEditor({
    extensions: getExtensions(),
    content: `<p>${localHeaders[currentHeaderIndex] || ''}</p>`,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = html.replace(/<[^>]+>/g, ''); // Strip HTML for basic text storage
      handleLocalHeaderChange(currentHeaderIndex, text);
    }
  });
  
  const footerEditor = useEditor({
    extensions: getExtensions(),
    content: `<p>${localFooters[currentFooterIndex] || ''}</p>`,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = html.replace(/<[^>]+>/g, ''); // Strip HTML for basic text storage
      handleLocalFooterChange(currentFooterIndex, text);
    }
  });
  
  // Update editors when current page changes
  useEffect(() => {
    if (headerEditor) {
      headerEditor.commands.setContent(`<p>${localHeaders[getHeaderIndex(currentPage)] || ''}</p>`);
    }
    if (footerEditor) {
      footerEditor.commands.setContent(`<p>${localFooters[getFooterIndex(currentPage)] || ''}</p>`);
    }
  }, [currentPage, localHeaders, localFooters, headerEditor, footerEditor]);
  
  // Add overlay to gray out main document when header/footer mode is active
  useEffect(() => {
    if (isOpen) {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = 'header-footer-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      overlay.style.zIndex = '40';
      overlay.style.pointerEvents = 'none'; // Allow clicking through
      document.body.appendChild(overlay);
      
      return () => {
        // Remove overlay when component unmounts
        const existingOverlay = document.getElementById('header-footer-overlay');
        if (existingOverlay) {
          document.body.removeChild(existingOverlay);
        }
      };
    }
  }, [isOpen]);
  
  // Handle option changes
  const handleOptionChange = () => {
    const newOptions = {
      differentFirstPage,
      differentOddEven,
    };
    
    if (onOptionsChange) {
      onOptionsChange(newOptions);
    }
  };
  
  // Navigate to previous/next page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onChangePage(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onChangePage(currentPage + 1);
    }
  };
  
  // Close and apply changes
  const handleClose = () => {
    // Save any pending changes
    handleOptionChange();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Headers and Footers</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          {/* Options */}
          <div className="flex space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="different-first-page" 
                checked={differentFirstPage}
                onCheckedChange={(checked) => {
                  setDifferentFirstPage(checked);
                  handleOptionChange();
                }}
              />
              <Label htmlFor="different-first-page">Different first page</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="different-odd-even" 
                checked={differentOddEven}
                onCheckedChange={(checked) => {
                  setDifferentOddEven(checked);
                  handleOptionChange();
                }}
              />
              <Label htmlFor="different-odd-even">Different odd & even pages</Label>
            </div>
          </div>
          
          {/* Page navigation */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Page
            </Button>
            
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
            >
              Next Page
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {/* Editing tabs */}
          <Tabs 
            defaultValue="header" 
            className="w-full"
            onValueChange={(value) => setActiveTab(value as 'header' | 'footer')}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="header">Header</TabsTrigger>
              <TabsTrigger value="footer">Footer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="header" className="p-4 border rounded-md">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <h3 className="text-md font-medium">{getHeaderTitle(currentHeaderIndex)}</h3>
                  </div>
                  <div className="text-xs font-medium">
                    Editing header for page {currentPage}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-2">
                  Use {"{pageNumber}"} to insert the current page number
                </div>
                
                <div className="min-h-[100px] border rounded-md overflow-hidden p-2">
                  {headerEditor && (
                    <div className="prose-sm w-full">
                      <EditorContent editor={headerEditor} />
                    </div>
                  )}
                </div>
                
                {/* Mini formatting toolbar for header */}
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => headerEditor?.chain().focus().toggleBold().run()}
                    className={`p-1 ${headerEditor?.isActive('bold') ? 'bg-slate-200' : ''}`}
                  >
                    <b>B</b>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => headerEditor?.chain().focus().toggleItalic().run()}
                    className={`p-1 ${headerEditor?.isActive('italic') ? 'bg-slate-200' : ''}`}
                  >
                    <i>I</i>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => headerEditor?.chain().focus().toggleUnderline().run()}
                    className={`p-1 ${headerEditor?.isActive('underline') ? 'bg-slate-200' : ''}`}
                  >
                    <u>U</u>
                  </Button>
                  
                  <div className="h-4 border-r border-slate-200 mx-2"></div>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      // Insert the page number placeholder
                      headerEditor?.chain().focus().insertContent('{pageNumber}').run();
                    }}
                    className="p-1"
                  >
                    Insert Page #
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="footer" className="p-4 border rounded-md">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <h3 className="text-md font-medium">{getFooterTitle(currentFooterIndex)}</h3>
                  </div>
                  <div className="text-xs font-medium">
                    Editing footer for page {currentPage}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-2">
                  Use {"{pageNumber}"} to insert the current page number
                </div>
                
                <div className="min-h-[100px] border rounded-md overflow-hidden p-2">
                  {footerEditor && (
                    <div className="prose-sm w-full">
                      <EditorContent editor={footerEditor} />
                    </div>
                  )}
                </div>
                
                {/* Mini formatting toolbar for footer */}
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => footerEditor?.chain().focus().toggleBold().run()}
                    className={`p-1 ${footerEditor?.isActive('bold') ? 'bg-slate-200' : ''}`}
                  >
                    <b>B</b>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => footerEditor?.chain().focus().toggleItalic().run()}
                    className={`p-1 ${footerEditor?.isActive('italic') ? 'bg-slate-200' : ''}`}
                  >
                    <i>I</i>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => footerEditor?.chain().focus().toggleUnderline().run()}
                    className={`p-1 ${footerEditor?.isActive('underline') ? 'bg-slate-200' : ''}`}
                  >
                    <u>U</u>
                  </Button>
                  
                  <div className="h-4 border-r border-slate-200 mx-2"></div>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      // Insert the page number placeholder
                      footerEditor?.chain().focus().insertContent('{pageNumber}').run();
                    }}
                    className="p-1"
                  >
                    Insert Page #
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}