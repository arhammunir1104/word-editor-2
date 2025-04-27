import { mergeAttributes } from '@tiptap/core';
import Link from '@tiptap/extension-link';

/**
 * Custom Link Extension that guarantees visible styling for links
 * This extension extends the default Link extension from TipTap
 * but ensures links always have proper visual styling
 */
export const CustomLink = Link.extend({
  name: 'customLink',
  
  // Use the default priorities and specs from Link extension
  priority: 100,
  
  // Use custom rendering that ensures link styling
  renderHTML({ HTMLAttributes }) {
    // Merge our style attributes with any passed attributes
    const attrs = mergeAttributes(
      {
        rel: 'noopener noreferrer nofollow',
        class: 'editor-link',
        'data-type': 'link',
        'data-styled': 'true',
        style: 'color: #1a73e8; text-decoration: underline; cursor: pointer; background-color: rgba(26, 115, 232, 0.05); border-radius: 2px;',
      },
      HTMLAttributes
    );
    
    // Return the HTML tag with forced styling
    return ['a', attrs, 0];
  },
  
  // Always add the link attributes to the JSON output
  addAttributes() {
    return {
      ...this.parent?.(),
      
      // Force the class to always be present in output
      class: {
        default: 'editor-link',
        parseHTML: (element) => element.getAttribute('class') || 'editor-link',
        renderHTML: (attributes) => {
          return {
            class: attributes.class || 'editor-link',
          };
        },
      },
      
      // Add styling information
      style: {
        default: 'color: #1a73e8; text-decoration: underline; cursor: pointer; background-color: rgba(26, 115, 232, 0.05); border-radius: 2px;',
        parseHTML: (element) => element.getAttribute('style') || 'color: #1a73e8; text-decoration: underline;',
        renderHTML: (attributes) => {
          return {
            style: attributes.style || 'color: #1a73e8; text-decoration: underline;',
          };
        },
      },
    };
  },
});