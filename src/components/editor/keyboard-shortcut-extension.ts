import { Extension } from '@tiptap/core';
import { toggleMark } from './text-formatting-utils';

/**
 * This extension adds keyboard shortcuts for formatting commands
 * Matches Google Docs behavior for bold, italic, and underline
 */
export const KeyboardShortcuts = Extension.create({
  name: 'keyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // Bold: Ctrl+B or Cmd+B
      'Mod-b': ({ editor }) => {
        editor.chain().focus().toggleBold().run();
        return true;
      },
      
      // Italic: Ctrl+I or Cmd+I
      'Mod-i': ({ editor }) => {
        editor.chain().focus().toggleItalic().run();
        return true;
      },
      
      // Underline: Ctrl+U or Cmd+U
      'Mod-u': ({ editor }) => {
        editor.chain().focus().toggleUnderline().run();
        return true;
      }
    };
  }
});