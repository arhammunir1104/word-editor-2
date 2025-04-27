import React from 'react';

interface PageFooterProps {
  index: number;
  pageCount: number;
  pageHeight: number;
  content?: string;
  onEdit?: (index: number, footerText: string) => void;
}

/**
 * Renders a footer at the bottom of each page in the document
 */
export default function PageFooter({ 
  index, 
  pageCount, 
  pageHeight, 
  content,
  onEdit 
}: PageFooterProps) {
  
  const handleDoubleClick = () => {
    if (onEdit) {
      const newFooter = prompt("Edit footer:", content);
      if (newFooter !== null) {
        onEdit(index, newFooter);
      }
    }
  };
  
  return (
    <div 
      className="page-footer"
      style={{
        position: 'absolute',
        top: `${(index + 1) * pageHeight - 36}px`, // 36px from bottom of page
        left: 0,
        right: 0,
        height: '36px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '10pt',
        cursor: onEdit ? 'pointer' : 'default'
      }}
      onDoubleClick={handleDoubleClick}
    >
      {content || `Page ${index + 1} of ${pageCount}`}
    </div>
  );
}