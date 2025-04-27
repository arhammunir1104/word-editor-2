import { Extension, mergeAttributes } from '@tiptap/core';

type LineSpacingOptions = {
  types: string[];
  defaultLineSpacing: string;
  defaultSpacingBefore: string;
  defaultSpacingAfter: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineSpacing: {
      /**
       * Set the line spacing
       */
      setLineSpacing: (spacing: string) => ReturnType;
      
      /**
       * Set the spacing before paragraph
       */
      setSpacingBefore: (spacing: string) => ReturnType;
      
      /**
       * Set the spacing after paragraph
       */
      setSpacingAfter: (spacing: string) => ReturnType;
    };
  }
}

export const LineSpacingExtension = Extension.create<LineSpacingOptions>({
  name: 'lineSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultLineSpacing: '1.15',
      defaultSpacingBefore: '0pt',
      defaultSpacingAfter: '0pt',
    };
  },

  addStorage() {
    return {
      lastAppliedLineSpacing: null,
      lastAppliedSpacingBefore: null,
      lastAppliedSpacingAfter: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineSpacing: {
            default: this.options.defaultLineSpacing,
            parseHTML: element => element.style.lineHeight || this.options.defaultLineSpacing,
            renderHTML: attributes => {
              if (!attributes.lineSpacing) {
                return {};
              }

              return {
                style: `line-height: ${attributes.lineSpacing} !important;`,
              };
            },
          },
          spacingBefore: {
            default: this.options.defaultSpacingBefore,
            parseHTML: element => {
              // Extract margin-top value from the element's style
              const marginTop = element.style.marginTop;
              return marginTop || this.options.defaultSpacingBefore;
            },
            renderHTML: attributes => {
              if (!attributes.spacingBefore || attributes.spacingBefore === '0pt') {
                return {};
              }

              return {
                style: `margin-top: ${attributes.spacingBefore} !important;`,
              };
            },
          },
          spacingAfter: {
            default: this.options.defaultSpacingAfter,
            parseHTML: element => {
              // Extract margin-bottom value from the element's style
              const marginBottom = element.style.marginBottom;
              return marginBottom || this.options.defaultSpacingAfter;
            },
            renderHTML: attributes => {
              if (!attributes.spacingAfter || attributes.spacingAfter === '0pt') {
                return {};
              }

              return {
                style: `margin-bottom: ${attributes.spacingAfter} !important;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineSpacing: lineSpacing => ({ commands, chain, editor }) => {
        // Store the line spacing for later use
        this.storage.lastAppliedLineSpacing = lineSpacing;
        
        // Apply to all selected paragraphs or current paragraph
        return this.options.types.every(type => 
          commands.updateAttributes(type, { lineSpacing })
        );
      },
      
      setSpacingBefore: spacingBefore => ({ commands, chain }) => {
        // Store the spacing before for later use
        this.storage.lastAppliedSpacingBefore = spacingBefore;
        
        // Apply to all selected paragraphs or current paragraph
        return this.options.types.every(type => 
          commands.updateAttributes(type, { spacingBefore })
        );
      },
      
      setSpacingAfter: spacingAfter => ({ commands, chain }) => {
        // Store the spacing after for later use
        this.storage.lastAppliedSpacingAfter = spacingAfter;
        
        // Apply to all selected paragraphs or current paragraph
        return this.options.types.every(type => 
          commands.updateAttributes(type, { spacingAfter })
        );
      },
    };
  },
  
  // Define keyboard handlers to maintain spacing across paragraphs
  addKeyboardShortcuts() {
    return {
      // When Enter is pressed, maintain line spacing in the new paragraph
      'Enter': () => {
        if (this.storage.lastAppliedLineSpacing || 
            this.storage.lastAppliedSpacingBefore || 
            this.storage.lastAppliedSpacingAfter) {
          
          // Apply the stored formatting values to the new paragraph after a slight delay
          setTimeout(() => {
            if (!this.editor) return;
            
            const attrs: Record<string, string> = {};
            
            // Add stored values to attributes
            if (this.storage.lastAppliedLineSpacing) {
              attrs.lineSpacing = this.storage.lastAppliedLineSpacing;
            }
            
            if (this.storage.lastAppliedSpacingBefore) {
              attrs.spacingBefore = this.storage.lastAppliedSpacingBefore;
            }
            
            if (this.storage.lastAppliedSpacingAfter) {
              attrs.spacingAfter = this.storage.lastAppliedSpacingAfter;
            }
            
            // Apply the attributes to the current paragraph
            this.editor.commands.updateAttributes('paragraph', attrs);
          }, 10);
        }
        
        // Let default Enter behavior proceed
        return false;
      }
    };
  }
});

// Utility functions for working with spacing values

/**
 * Convert a numeric value to pt string
 */
export function toPt(value: number): string {
  return `${value}pt`;
}

/**
 * Convert a pt string to numeric value
 */
export function fromPt(value: string): number {
  const match = value.match(/^(\d*\.?\d*)pt$/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return 0;
}

/**
 * Format spacing value for display
 */
export function formatSpacing(value: string): string {
  const numValue = parseFloat(value);
  return numValue.toFixed(2).replace(/\.00$/, '');
}

/**
 * Line spacing presets similar to Google Docs
 */
export const LINE_SPACING_PRESETS = [
  { value: '1.0', label: 'Single' },
  { value: '1.15', label: '1.15 (Default)' },
  { value: '1.5', label: '1.5' },
  { value: '2.0', label: 'Double' },
  { value: 'custom', label: 'Custom spacing...' },
];