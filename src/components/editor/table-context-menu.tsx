/**
 * TableContextMenu Component
 * 
 * This component provides a Google Docs-style context menu for tables
 * that appears when right-clicking on a table cell.
 */

import React, { useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { 
  addRowBefore, 
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable,
  mergeCells,
  splitCell,
  toggleHeaderRow,
  toggleHeaderColumn,
  setCellAlignment,
  setCellBackgroundColor
} from './table-extensions';

interface TableContextMenuProps {
  editor: Editor;
  position: { x: number; y: number };
  onClose: () => void;
}

const TableContextMenu: React.FC<TableContextMenuProps> = ({ 
  editor, 
  position, 
  onClose 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Handle clicking outside the menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Execute a table operation and close the menu
  const executeOperation = (operation: () => void) => {
    operation();
    onClose();
  };
  
  // Menu items with their corresponding operations
  const menuItems = [
    { 
      label: 'Insert row above', 
      action: () => executeOperation(() => addRowBefore(editor)) 
    },
    { 
      label: 'Insert row below', 
      action: () => executeOperation(() => addRowAfter(editor)) 
    },
    { 
      label: 'Insert column left', 
      action: () => executeOperation(() => addColumnBefore(editor)) 
    },
    { 
      label: 'Insert column right', 
      action: () => executeOperation(() => addColumnAfter(editor)) 
    },
    { type: 'separator' },
    { 
      label: 'Delete row', 
      action: () => executeOperation(() => deleteRow(editor)) 
    },
    { 
      label: 'Delete column', 
      action: () => executeOperation(() => deleteColumn(editor)) 
    },
    { 
      label: 'Delete table', 
      action: () => executeOperation(() => deleteTable(editor)) 
    },
    { type: 'separator' },
    { 
      label: 'Merge cells', 
      action: () => executeOperation(() => mergeCells(editor)),
      disabled: !editor.can().mergeCells()
    },
    { 
      label: 'Split cell', 
      action: () => executeOperation(() => splitCell(editor)),
      disabled: !editor.can().splitCell()
    },
    { type: 'separator' },
    { 
      label: 'Toggle header row', 
      action: () => executeOperation(() => toggleHeaderRow(editor)) 
    },
    { 
      label: 'Toggle header column', 
      action: () => executeOperation(() => toggleHeaderColumn(editor)) 
    }
  ];
  
  // Helpers for styling
  const menuItemStyle = {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap' as 'nowrap',
    color: '#333',
    display: 'block',
    width: '100%',
    textAlign: 'left' as 'left',
    background: 'none',
    border: 'none',
    fontFamily: 'Arial, sans-serif'
  };
  
  const menuItemHoverStyle = {
    ...menuItemStyle,
    backgroundColor: '#f3f3f3'
  };
  
  const menuItemDisabledStyle = {
    ...menuItemStyle,
    color: '#ccc',
    cursor: 'default'
  };
  
  const separatorStyle = {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '6px 0'
  };
  
  return (
    <div
      ref={menuRef}
      className="table-context-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        padding: '6px 0',
        zIndex: 1000,
        minWidth: '200px'
      }}
    >
      {menuItems.map((item, index) => (
        item.type === 'separator' ? (
          <div key={`separator-${index}`} style={separatorStyle} />
        ) : (
          <button
            key={`menu-item-${index}`}
            className="table-context-menu-item"
            onClick={item.action}
            disabled={item.disabled}
            style={item.disabled ? menuItemDisabledStyle : menuItemStyle}
            onMouseEnter={e => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = '#f3f3f3';
              }
            }}
            onMouseLeave={e => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = '';
              }
            }}
          >
            {item.label}
          </button>
        )
      ))}
    </div>
  );
};

export default TableContextMenu;