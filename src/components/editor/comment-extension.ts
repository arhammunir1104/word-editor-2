/**
 * Comment Mark Extension for TipTap
 *
 * This extension adds a "comment" mark type to the editor, allowing us to associate
 * text with comments. We use a direct inline-style approach to guarantee highlighting works.
 */

import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Set a comment mark on the current selection
       */
      setComment: (attrs: { id: string }) => ReturnType;
      /**
       * Remove a comment mark from the current selection
       */
      unsetComment: () => ReturnType;
      /**
       * Toggle a comment mark on the current selection
       */
      toggleComment: (attrs: { id: string }) => ReturnType;
    };
  }
}

export interface CommentOptions {
  HTMLAttributes: Record<string, any>;
  onCommentClick?: (id: string) => void;
}

export const commentPluginKey = new PluginKey("comment");

export const Comment = Mark.create<CommentOptions>({
  name: "comment",

  // Default options
  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentClick: undefined,
    };
  },

  // Comment marks can be merged - for instance if two adjacent comment marks have the same ID
  spanning: true,

  // Allow comment marks to overlap other marks like bold, italic, etc.
  inclusive: true,

  // Add extra attributes to the comment mark with GUARANTEED INLINE STYLING
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          // Return attributes with ultra-aggressive styling
          return {
            "data-comment-id": attributes.id,
            class: "comment-mark yellow-highlight",
            // ULTRA-AGGRESSIVE STYLING with !important flags on EVERY property - EXACT SAME AS RENDERHTML
            style:
              "display: inline !important;" +
              "background-color: #FFEF9E !important;" +
              "background: #FFEF9E !important;" + 
              "color: black !important;" + 
              "border-bottom: 2px solid #F2C94C !important;" + 
              "border-radius: 2px !important;" + 
              "padding: 2px 0 !important;" + 
              "margin: 0 !important;" + 
              "box-shadow: 0 0 2px #F2C94C !important;" +
              "position: relative !important;" +
              "z-index: 1 !important;",
          };
        },
      },
    };
  },

  // Define how comments are parsed from HTML - updated for ALL element types
  parseHTML() {
    return [
      {
        tag: "div[data-comment-id]", // Most important - div elements with comment ID
      },
      {
        tag: "span[data-comment-id]", // Legacy - span elements with comment ID
      },
      {
        tag: "mark[data-comment-id]", // Legacy - mark elements with comment ID
      },
    ];
  },

  // Define how comments are rendered to HTML with GUARANTEED HIGHLIGHTING
  renderHTML({ HTMLAttributes }) {
    // Most important part - using a div with inline styling to FORCE highlighting
    return [
      "div",  // Changed to div for better visibility and style application
      mergeAttributes(
        {
          class: "comment-mark yellow-highlight",
          // ULTRA-AGGRESSIVE STYLING with !important flags on EVERY property
          style:
            "display: inline !important;" +
            "background-color: #FFEF9E !important;" +
            "background: #FFEF9E !important;" + 
            "color: black !important;" + 
            "border-bottom: 2px solid #F2C94C !important;" + 
            "border-radius: 2px !important;" + 
            "padding: 2px 0 !important;" + 
            "margin: 0 !important;" + 
            "box-shadow: 0 0 2px #F2C94C !important;" +
            "position: relative !important;" +
            "z-index: 1 !important;",
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0, // Zero means "render the content here"
    ];
  },

  // Add custom commands for working with comments
  addCommands() {
    return {
      setComment:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      unsetComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      toggleComment:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attrs);
        },
    };
  },

  // Add plugin for handling click events on comments
  addProseMirrorPlugins() {
    const { onCommentClick } = this.options;

    return [
      new Plugin({
        key: commentPluginKey,
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              if (onCommentClick && event.target instanceof HTMLElement) {
                // Find any element with a comment ID
                const target = event.target.closest("[data-comment-id]");
                if (target) {
                  const commentId = target.getAttribute("data-comment-id");
                  if (commentId) {
                    // Call the handler when a comment is clicked
                    onCommentClick(commentId);
                    return true;
                  }
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
