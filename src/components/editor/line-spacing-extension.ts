import { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";

/**
 * Line spacing presets similar to Google Docs
 */
export const LINE_SPACING_PRESETS = [
  { label: "Single", value: "1.0" },
  { label: "Default (1.15)", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "Double", value: "2.0" },
  { label: "Custom", value: "custom" },
];

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
  if (!value) return 0;
  return parseFloat(value.replace("pt", ""));
}

/**
 * Format spacing value for display
 */
export function formatSpacing(value: string): string {
  if (!value) return "1.0";

  if (value.includes("pt")) {
    return value;
  }

  const numValue = parseFloat(value);
  return numValue.toFixed(2).replace(/\.00$/, "");
}

/**
 * Set line spacing in the editor
 */
export function setLineSpacing(editor: Editor, value: string): void {
  if (!editor) return;

  console.log(`🔥 DIRECT DOM LINE SPACING: Setting to ${value}`);

  editor
    .chain()
    .focus()
    .updateAttributes("paragraph", {
      lineSpacing: value,
    })
    .run();

  try {
    const editorContainer = editor.view.dom;
    if (!editorContainer) {
      console.error("Could not find editor container");
      return;
    }

    const { selection } = editor.state;
    const hasSelection = !selection.empty;

    const paragraphs = hasSelection
      ? getSelectedParagraphs(editor)
      : editorContainer.querySelectorAll("p");

    console.log(
      `Applying line spacing ${value} to ${paragraphs.length} paragraphs`,
    );

    paragraphs.forEach((p) => {
      p.removeAttribute("style");
      p.removeAttribute("data-line-spacing");

      p.classList.remove(
        "line-spacing-1-0",
        "line-spacing-1-15",
        "line-spacing-1-5",
        "line-spacing-2-0",
      );

      const className = `line-spacing-${value.replace(".", "-")}`;
      p.classList.add(className);
      p.setAttribute("data-line-spacing", value);
    });

    document.dispatchEvent(
      new CustomEvent("line-spacing-applied", {
        detail: { value, elementsUpdated: paragraphs.length },
      }),
    );

    console.log(`✅ Line spacing ${value} successfully applied`);
  } catch (err) {
    console.error("Error applying line spacing:", err);
  }
}

function getSelectedParagraphs(
  editor: Editor,
): NodeListOf<HTMLParagraphElement> {
  try {
    const { selection } = editor.state;
    const editorContainer = editor.view.dom;

    if (selection.empty) {
      const currentNode = selection.$from.parent;
      if (currentNode.type.name === "paragraph") {
        const pos = selection.$from.pos;
        const domPos = editor.view.domAtPos(pos);

        let element = domPos.node as Element;
        while (element && element.tagName !== "P") {
          if (element.parentElement) {
            element = element.parentElement;
          } else {
            break;
          }
        }

        if (element && element.tagName === "P") {
          return editorContainer.querySelectorAll("p");
        }
      }

      return editorContainer.querySelectorAll("p");
    }

    return editorContainer.querySelectorAll("p");
  } catch (error) {
    console.error("Error getting selected paragraphs:", error);
    return document.querySelectorAll("p");
  }
}

/**
 * Set spacing before in the editor
 */
export function setSpacingBefore(editor: Editor, value: string): void {
  if (!editor) return;

  console.log(`🔥 DIRECT DOM SPACING BEFORE: Setting to ${value}`);

  editor
    .chain()
    .focus()
    .updateAttributes("paragraph", {
      spacingBefore: value,
    })
    .run();

  try {
    const editorContainer = editor.view.dom;
    if (!editorContainer) {
      console.error("Could not find editor container");
      return;
    }

    const paragraphs = editorContainer.querySelectorAll("p");

    paragraphs.forEach((p) => {
      p.removeAttribute("data-spacing-before");

      p.classList.remove(
        "spacing-before-0pt",
        "spacing-before-6pt",
        "spacing-before-12pt",
      );

      p.classList.add(`spacing-before-${value}`);
    });

    console.log(
      `✅ Spacing before ${value} successfully applied to ${paragraphs.length} paragraphs`,
    );
  } catch (err) {
    console.error("Error applying spacing before:", err);
  }
}

/**
 * Set spacing after in the editor
 */
export function setSpacingAfter(editor: Editor, value: string): void {
  if (!editor) return;

  console.log(`🔥 DIRECT DOM SPACING AFTER: Setting to ${value}`);

  editor
    .chain()
    .focus()
    .updateAttributes("paragraph", {
      spacingAfter: value,
    })
    .run();

  try {
    const editorContainer = editor.view.dom;
    if (!editorContainer) {
      console.error("Could not find editor container");
      return;
    }

    const paragraphs = editorContainer.querySelectorAll("p");

    paragraphs.forEach((p) => {
      p.removeAttribute("data-spacing-after");

      p.classList.remove(
        "spacing-after-0pt",
        "spacing-after-6pt",
        "spacing-after-12pt",
      );

      p.classList.add(`spacing-after-${value}`);
    });

    console.log(
      `✅ Spacing after ${value} successfully applied to ${paragraphs.length} paragraphs`,
    );
  } catch (err) {
    console.error("Error applying spacing after:", err);
  }
}

/**
 * Apply all spacings at once
 */
export function setAllSpacing(
  editor: Editor,
  lineSpacing: string,
  spacingBefore: string,
  spacingAfter: string,
): void {
  setLineSpacing(editor, lineSpacing);
  setSpacingBefore(editor, spacingBefore);
  setSpacingAfter(editor, spacingAfter);
}

interface Commands {
  [key: string]: any;
}

/**
 * TipTap extension for line and paragraph spacing
 */
export const LineSpacingExtension = Extension.create({
  name: "lineSpacing",

  addOptions() {
    return {
      types: ["paragraph", "heading", "listItem", "taskItem"],
      defaultLineSpacing: "1.15",
      defaultSpacingBefore: "0pt",
      defaultSpacingAfter: "0pt",
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineSpacing: {
            default: this.options.defaultLineSpacing,
            parseHTML: (element) =>
              element.getAttribute("data-line-spacing") ||
              this.options.defaultLineSpacing,
            renderHTML: (attributes) => {
              if (!attributes.lineSpacing) return {};
              return {
                "data-line-spacing": attributes.lineSpacing,
                style: `line-height: ${attributes.lineSpacing} !important;`,
              };
            },
          },
          spacingBefore: {
            default: this.options.defaultSpacingBefore,
            parseHTML: (element) =>
              element.getAttribute("data-spacing-before") ||
              this.options.defaultSpacingBefore,
            renderHTML: (attributes) => {
              if (
                !attributes.spacingBefore ||
                attributes.spacingBefore === "0pt"
              )
                return {};
              return {
                "data-spacing-before": attributes.spacingBefore,
                style: `margin-top: ${attributes.spacingBefore} !important;`,
              };
            },
          },
          spacingAfter: {
            default: this.options.defaultSpacingAfter,
            parseHTML: (element) =>
              element.getAttribute("data-spacing-after") ||
              this.options.defaultSpacingAfter,
            renderHTML: (attributes) => {
              if (!attributes.spacingAfter || attributes.spacingAfter === "0pt")
                return {};
              return {
                "data-spacing-after": attributes.spacingAfter,
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
      setLineSpacing:
        (lineSpacing: string) =>
        ({ commands }: { commands: Commands }) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineSpacing }),
          ),
      setSpacingBefore:
        (spacingBefore: string) =>
        ({ commands }: { commands: Commands }) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { spacingBefore }),
          ),
      setSpacingAfter:
        (spacingAfter: string) =>
        ({ commands }: { commands: Commands }) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { spacingAfter }),
          ),
    } as any;
  },
});
