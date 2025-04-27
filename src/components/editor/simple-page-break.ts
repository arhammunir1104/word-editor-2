import { Extension } from "@tiptap/core";
import { Editor } from "@tiptap/react";
import "./page-break.css";

/**
 * A simple extension that adds multi-page capabilities to the editor
 */
export const SimplePageBreak = Extension.create({
  name: "simplePageBreak",

  addOptions() {
    return {
      pageHeight: 11 * 96, // 11 inches * 96 DPI (standard letter)
      headerFooterHeight: 100, // Combined header/footer height (50px each)
      onPageCountChange: null as ((count: number) => void) | null,
    };
  },

  onTransaction() {
    this.updatePageIndicators();
  },

  onUpdate() {
    this.updatePageIndicators();
  },

  onSelectionUpdate() {
    this.updatePageIndicators();
  },

  updatePageIndicators() {
    const editor = this.editor;
    const editorElement = editor.view.dom;
    const contentHeight = editorElement.scrollHeight;
    const contentHeightPerPage =
      this.options.pageHeight - this.options.headerFooterHeight;

    // Calculate needed pages
    const pagesNeeded = Math.max(
      1,
      Math.ceil(contentHeight / contentHeightPerPage),
    );

    // Remove existing page indicators
    document
      .querySelectorAll(".editor-page-break-indicator")
      .forEach((el) => el.remove());

    // Add page break indicators
    for (let i = 1; i < pagesNeeded; i++) {
      const indicator = document.createElement("div");
      indicator.className = "editor-page-break-indicator";
      indicator.style.position = "absolute";
      indicator.style.top = `${i * contentHeightPerPage}px`;
      indicator.style.left = "0";
      indicator.style.right = "0";
      indicator.style.borderTop = "1px dashed #999";
      indicator.style.textAlign = "center";
      indicator.style.color = "#888";
      indicator.style.fontSize = "12px";
      indicator.style.zIndex = "10";
      indicator.style.height = "24px";
      indicator.style.pointerEvents = "none";
      indicator.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
      indicator.innerHTML = `<span style="background: white; padding: 0 10px;">Page ${i} ends here</span>`;

      editorElement.appendChild(indicator);
    }

    // If callback provided, notify of page count change
    if (
      this.options.onPageCountChange &&
      pagesNeeded !== this.editor.storage.simplePageBreak.pageCount
    ) {
      this.editor.storage.simplePageBreak.pageCount = pagesNeeded;
      this.options.onPageCountChange(pagesNeeded);
    }
  },

  addStorage() {
    return {
      pageCount: 1,
    };
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) => {
          // Insert a horizontal rule with a special class for page breaks
          return commands.insertContent('<hr class="page-break"/>');
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.insertPageBreak(),
    };
  },
});

/**
 * Helper function to setup multi-page support in an editor
 */
export function setupMultiPageEditor(
  editor: Editor,
  setPageCount: (count: number) => void,
) {
  // Make sure the editor has the SimplePageBreak extension
  if (!editor.hasExtension("simplePageBreak")) {
    editor.registerPlugin(
      SimplePageBreak.configure({
        onPageCountChange: setPageCount,
      }),
    );
  }

  // Add a toolbar button for inserting page breaks
  const addPageBreakButton = (toolbar: HTMLElement) => {
    const button = document.createElement("button");
    button.textContent = "Page Break";
    button.className = "page-break-button btn";
    button.addEventListener("click", () => {
      editor.commands.insertPageBreak();
    });
    toolbar.appendChild(button);
  };

  return {
    addPageBreakButton,
  };
}
