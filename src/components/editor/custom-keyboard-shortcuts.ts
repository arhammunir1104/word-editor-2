import { Extension } from '@tiptap/core'

/**
 * CustomKeyboardShortcuts Extension
 * 
 * This extension completely disables the default undo/redo keyboard shortcuts from TipTap
 * so our global history manager can handle them instead.
 */
export const CustomKeyboardShortcuts = Extension.create({
  name: 'customKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // Completely prevents TipTap from handling Ctrl+Z (or Cmd+Z on Mac)
      'Mod-z': () => {
        // Returning true means we claim to handle the shortcut (but we defer to global handler)
        console.log('⚠️ Blocked editor Mod-z (undo), deferring to global handler');
        
        // Dispatch our custom event for the global handler to intercept
        const event = new Event('customHistoryEvent:undo');
        document.dispatchEvent(event);
        return true;
      },

      // Completely prevents TipTap from handling Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
      'Mod-Shift-z': () => {
        console.log('⚠️ Blocked editor Mod-Shift-z (redo), deferring to global handler');
        
        const event = new Event('customHistoryEvent:redo');
        document.dispatchEvent(event);
        return true;
      },

      // Completely prevents TipTap from handling Ctrl+Y (Windows/Linux redo)
      'Mod-y': () => {
        console.log('⚠️ Blocked editor Mod-y (redo), deferring to global handler');
        
        const event = new Event('customHistoryEvent:redo');
        document.dispatchEvent(event);
        return true;
      },
      
      // Add Google Docs standard Ctrl+K shortcut for link insertion
      'Mod-k': () => {
        console.log('Ctrl+K/Cmd+K shortcut detected - opening link dialog');
        
        // Get the current selection if any
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : '';
        
        // Dispatch event to open link modal with the selected text
        document.dispatchEvent(
          new CustomEvent('toolbar:insertLink', { 
            detail: { selectedText } 
          })
        );
        
        // Return true to indicate we've handled this shortcut
        return true;
      },
      
      // Override Ctrl+F and Ctrl+H to prevent default browser search behavior
      // but don't implement search functionality (removed as requested)
      'Mod-f': () => {
        console.log('Ctrl+F/Cmd+F detected - search functionality removed');
        return true; // Return true to prevent default browser behavior
      },
      
      'Mod-h': () => {
        console.log('Ctrl+H/Cmd+H detected - search & replace functionality removed');
        return true; // Return true to prevent default browser behavior
      },
    }
  },
})