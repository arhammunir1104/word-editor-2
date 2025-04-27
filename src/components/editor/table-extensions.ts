/**
 * Google Docs-style Table Extensions
 * 
 * This module provides table functionality for TipTap that mimics Google Docs tables
 * including creation, resizing, merging, splitting, and other operations.
 */

import { Extension } from '@tiptap/core';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Editor } from '@tiptap/react';

/**
 * Google Docs Table - Enhanced Table extension with Google Docs behavior
 */
export const GoogleDocsTable = Table.extend({
  name: 'table',
  
  addOptions() {
    return {
      ...this.parent?.(),
      resizable: true,
      HTMLAttributes: {
        class: 'gdocs-table',
      },
    };
  },
  
  addProseMirrorPlugins() {
    const plugins = this.parent?.() || [];
    
    // Add our custom resize plugin if enabled
    if (this.options.resizable) {
      const resizePlugin = new Plugin({
        key: new PluginKey('tableResize'),
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              const target = event.target as HTMLElement;
              const isResizeHandle = target.classList.contains('column-resize-handle');
              
              if (isResizeHandle) {
                // Handle column resize logic
                // Implemented separately for clarity
                return true;
              }
              
              return false;
            },
          },
        },
      });
      
      return [...plugins, resizePlugin];
    }
    
    return plugins;
  },
});

/**
 * Google Docs Table Row - Enhanced Table Row extension
 */
export const GoogleDocsTableRow = TableRow.extend({
  name: 'tableRow',
  
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'gdocs-table-row',
      },
    };
  },
});

/**
 * Google Docs Table Cell - Enhanced Table Cell extension
 */
export const GoogleDocsTableCell = TableCell.extend({
  name: 'tableCell',
  
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'gdocs-table-cell',
      },
    };
  },
  
  addAttributes() {
    return {
      ...this.parent?.(),
      
      // Background color attribute
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      
      // Alignment attribute
      alignment: {
        default: 'left',
        parseHTML: element => element.style.textAlign,
        renderHTML: attributes => {
          if (!attributes.alignment) {
            return {};
          }
          
          return {
            style: `text-align: ${attributes.alignment}`,
          };
        },
      },
    };
  },
});

/**
 * Google Docs Table Header - Enhanced Table Header extension
 */
export const GoogleDocsTableHeader = TableHeader.extend({
  name: 'tableHeader',
  
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'gdocs-table-header',
      },
    };
  },
  
  addAttributes() {
    return {
      ...this.parent?.(),
      
      // Background color attribute
      backgroundColor: {
        default: '#f9f9f9',
        parseHTML: element => element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      
      // Alignment attribute
      alignment: {
        default: 'left',
        parseHTML: element => element.style.textAlign,
        renderHTML: attributes => {
          if (!attributes.alignment) {
            return {};
          }
          
          return {
            style: `text-align: ${attributes.alignment}`,
          };
        },
      },
    };
  },
});

/**
 * Collection of table extensions
 */
export const TableExtensions = [
  GoogleDocsTable,
  GoogleDocsTableRow,
  GoogleDocsTableCell,
  GoogleDocsTableHeader,
];

/**
 * Create a table with the specified dimensions
 */
export function createTable(editor: Editor, rows: number, cols: number, withHeaderRow: boolean = true) {
  if (!editor) return;
  
  // Generate table cells
  const cells = Array.from({ length: cols }).map(() => {
    return {
      type: withHeaderRow ? 'tableHeader' : 'tableCell',
      content: [{ type: 'paragraph', content: [] }],
    };
  });
  
  // Generate table rows
  const tableRows = [];
  
  // Add header row if requested
  if (withHeaderRow) {
    tableRows.push({
      type: 'tableRow',
      content: cells,
    });
  }
  
  // Add regular rows (adjust count if we already added a header)
  const regularRowCount = withHeaderRow ? rows - 1 : rows;
  
  for (let i = 0; i < regularRowCount; i++) {
    tableRows.push({
      type: 'tableRow',
      content: Array.from({ length: cols }).map(() => {
        return {
          type: 'tableCell',
          content: [{ type: 'paragraph', content: [] }],
        };
      }),
    });
  }
  
  // Insert the table
  editor.chain().focus().insertContent({
    type: 'table',
    content: tableRows,
  }).run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('create-table');
  }
}

/**
 * Add a row before the current row
 */
export function addRowBefore(editor: Editor) {
  editor.chain().focus().addRowBefore().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('add-row-before');
  }
}

/**
 * Add a row after the current row
 */
export function addRowAfter(editor: Editor) {
  editor.chain().focus().addRowAfter().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('add-row-after');
  }
}

/**
 * Add a column before the current column
 */
export function addColumnBefore(editor: Editor) {
  editor.chain().focus().addColumnBefore().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('add-column-before');
  }
}

/**
 * Add a column after the current column
 */
export function addColumnAfter(editor: Editor) {
  editor.chain().focus().addColumnAfter().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('add-column-after');
  }
}

/**
 * Delete the current row
 */
export function deleteRow(editor: Editor) {
  editor.chain().focus().deleteRow().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('delete-row');
  }
}

/**
 * Delete the current column
 */
export function deleteColumn(editor: Editor) {
  editor.chain().focus().deleteColumn().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('delete-column');
  }
}

/**
 * Delete the entire table
 */
export function deleteTable(editor: Editor) {
  editor.chain().focus().deleteTable().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('delete-table');
  }
}

/**
 * Merge the selected cells
 */
export function mergeCells(editor: Editor) {
  editor.chain().focus().mergeCells().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('merge-cells');
  }
}

/**
 * Split the current cell
 */
export function splitCell(editor: Editor) {
  editor.chain().focus().splitCell().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('split-cell');
  }
}

/**
 * Toggle the header row status
 */
export function toggleHeaderRow(editor: Editor) {
  editor.chain().focus().toggleHeaderRow().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('toggle-header-row');
  }
}

/**
 * Toggle the header column status
 */
export function toggleHeaderColumn(editor: Editor) {
  editor.chain().focus().toggleHeaderColumn().run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('toggle-header-column');
  }
}

/**
 * Set the alignment of the selected cell(s)
 */
export function setCellAlignment(editor: Editor, align: 'left' | 'center' | 'right') {
  editor.chain().focus().updateAttributes('tableCell', { alignment: align }).run();
  editor.chain().focus().updateAttributes('tableHeader', { alignment: align }).run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('set-cell-alignment');
  }
}

/**
 * Set the background color of the selected cell(s)
 */
export function setCellBackgroundColor(editor: Editor, color: string) {
  editor.chain().focus().updateAttributes('tableCell', { backgroundColor: color }).run();
  editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: color }).run();
  
  // Add history step if available
  if (window.historyManager) {
    window.historyManager.addHistoryStep('set-cell-background-color');
  }
}