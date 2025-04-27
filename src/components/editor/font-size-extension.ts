import { Extension, mergeAttributes } from '@tiptap/core';
import { DEFAULT_FONT_SIZE } from './format-detection';

type FontSizeOptions = {
  types: string[];
  defaultSize: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size
       */
      setFontSize: (size: string) => ReturnType;
      /**
       * Unset the font size
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
      defaultSize: `${DEFAULT_FONT_SIZE}px`, // Use our global default font size
    };
  },

  addStorage() {
    return {
      lastAppliedFontSize: null,
      isTyping: false,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: this.options.defaultSize,
            parseHTML: element => element.style.fontSize || this.options.defaultSize,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  onUpdate() {
    // Set isTyping to true when content changes
    this.storage.isTyping = true;
    
    // Clear typing flag after a short delay
    setTimeout(() => {
      this.storage.isTyping = false;
    }, 200);
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ commands, chain, editor }) => {
        // Store the font size for later use
        this.storage.lastAppliedFontSize = fontSize;
        
        // If there's no selection, set the marks for the next input
        if (editor.state.selection.empty) {
          // Create a persistent mark that will be applied to all subsequent typing
          const textStyle = editor.schema.marks.textStyle.create({ fontSize });
          
          // Add this as a stored mark that will be applied to new text
          editor.view.dispatch(
            editor.view.state.tr.addStoredMark(textStyle)
          );
          
          return chain()
            .focus()
            .setMark('textStyle', { fontSize })
            .run();
        }
        
        // With selection, wrap the selected text with the font size attribute
        return chain()
          .focus()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        // Clear stored font size
        this.storage.lastAppliedFontSize = null;
        
        return chain()
          .focus()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
  
  // Define keyboard handlers
  addKeyboardShortcuts() {
    return {
      // Intercept typing to ensure font size is maintained
      'Backspace': () => {
        // Don't interfere with normal deletion behavior
        return false;
      },
      'Enter': () => {
        // Before allowing the default enter behavior, make sure we persist formatting
        if (this.storage.lastAppliedFontSize) {
          // We'll apply the last font size to the new paragraph/line
          setTimeout(() => {
            if (this.editor) {
              // Create stored mark for next typed characters
              const textStyle = this.editor.schema.marks.textStyle.create({ 
                fontSize: this.storage.lastAppliedFontSize 
              });
              
              // Apply the mark
              this.editor.view.dispatch(
                this.editor.view.state.tr.addStoredMark(textStyle)
              );
            }
          }, 10);
        }
        
        // Allow default enter behavior
        return false;
      }
    };
  }
});