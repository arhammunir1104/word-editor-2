import React, { useState, useEffect, useRef } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';

// The component that will be rendered for the resizable image
const ImageResizeComponent = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const [size, setSize] = useState({
    width: node.attrs.width,
    height: node.attrs.height,
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  
  const aspectRatio = useRef(node.attrs.width / node.attrs.height);
  const imageRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    // Add listeners for resizing
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing]);
  
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setStartSize({ width: size.width, height: size.height });
    setStartPosition({ x: e.clientX, y: e.clientY });
  };
  
  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaWidth = e.clientX - startPosition.x;
    const newWidth = Math.max(100, startSize.width + deltaWidth);
    const newHeight = newWidth / aspectRatio.current;
    
    setSize({ width: newWidth, height: newHeight });
  };
  
  const stopResize = () => {
    if (isResizing) {
      setIsResizing(false);
      // Update the node attributes
      updateAttributes({
        width: size.width,
        height: size.height,
      });
    }
  };
  
  return (
    <NodeViewWrapper className="image-resize-wrapper relative">
      <img 
        ref={imageRef}
        src={node.attrs.src} 
        alt={node.attrs.alt || ''} 
        width={size.width} 
        height={size.height}
        className={`${isResizing ? 'resizing' : ''}`}
        style={{ display: 'block' }}
      />
      
      {/* Resize handle */}
      <div 
        className="resize-handle absolute w-3 h-3 bg-blue-500 bottom-0 right-0 cursor-se-resize"
        onMouseDown={startResize}
        style={{
          transform: 'translate(50%, 50%)',
          borderRadius: '50%',
          zIndex: 10
        }}
      />
    </NodeViewWrapper>
  );
};

// Extension for resizable images
export const ImageResize = Node.create({
  name: 'resizableImage',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  
  inline() {
    return true;
  },
  
  group() {
    return 'inline';
  },
  
  draggable: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: 300,
      },
      height: {
        default: 300,
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) {
            return false;
          }
          
          const width = dom.getAttribute('width') ? parseInt(dom.getAttribute('width') || '0', 10) : 300;
          const height = dom.getAttribute('height') ? parseInt(dom.getAttribute('height') || '0', 10) : 300;
          
          return {
            src: dom.getAttribute('src'),
            alt: dom.getAttribute('alt'),
            title: dom.getAttribute('title'),
            width,
            height,
          };
        },
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
  
  // Use a function that returns a React component for the node view
  addNodeView() {
    return ({ editor, node, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'image-resize-wrapper relative';
      
      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.width = node.attrs.width;
      img.height = node.attrs.height;
      img.style.display = 'block';
      
      const handle = document.createElement('div');
      handle.className = 'resize-handle absolute w-3 h-3 bg-blue-500 bottom-0 right-0 cursor-se-resize';
      handle.style.transform = 'translate(50%, 50%)';
      handle.style.borderRadius = '50%';
      handle.style.zIndex = '10';
      handle.style.position = 'absolute';
      handle.style.bottom = '0';
      handle.style.right = '0';
      
      dom.appendChild(img);
      dom.appendChild(handle);
      
      // Handle resize functionality
      let isResizing = false;
      let startWidth = 0;
      let startHeight = 0;
      let startX = 0;
      let startY = 0;
      
      const aspectRatio = node.attrs.width / node.attrs.height;
      
      const startResize = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        startWidth = node.attrs.width;
        startHeight = node.attrs.height;
        startX = e.clientX;
        startY = e.clientY;
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
      };
      
      const handleResize = (e: MouseEvent) => {
        if (!isResizing) return;
        
        const deltaWidth = e.clientX - startX;
        const newWidth = Math.max(100, startWidth + deltaWidth);
        const newHeight = newWidth / aspectRatio;
        
        img.width = newWidth;
        img.height = newHeight;
      };
      
      const stopResize = () => {
        if (!isResizing) return;
        
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        
        if (typeof getPos === 'function') {
          editor.view.dispatch(editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
            ...node.attrs,
            width: img.width,
            height: img.height,
          }));
        }
      };
      
      handle.addEventListener('mousedown', startResize);
      
      return {
        dom,
        contentDOM: null,
        destroy: () => {
          handle.removeEventListener('mousedown', startResize);
          document.removeEventListener('mousemove', handleResize);
          document.removeEventListener('mouseup', stopResize);
        },
      };
    };
  },
});