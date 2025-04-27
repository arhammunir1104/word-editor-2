import React from 'react';

interface PageHeaderProps {
  index: number;
  pageCount: number;
  pageHeight: number;
  content?: string;
  onEdit?: (index: number, headerText: string) => void;
}

/**
 * Renders a header at the top of each page in the document
 */
export default function PageHeader({ 
  index, 
  pageCount, 
  pageHeight, 
  content,
  onEdit 
}: PageHeaderProps) {
  
  const handleDoubleClick = () => {
    if (onEdit) {
      const newHeader = prompt("Edit header:", content);
      if (newHeader !== null) {
        onEdit(index, newHeader);
      }
    }
  };
  
  return (
    <div 
      className="page-header"
      style={{
        position: 'absolute',
        top: `${index * pageHeight + 0}px`, // Position at the top of each page
        left: 0,
        right: 0,
        height: '36px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '10pt',
        cursor: onEdit ? 'pointer' : 'default'
      }}
      onDoubleClick={handleDoubleClick}
    >
      {content || `Header`}
    </div>
  );
}