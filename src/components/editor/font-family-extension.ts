import { Extension, mergeAttributes } from "@tiptap/core";

type FontFamilyOptions = {
  types: string[];
  defaultFamily: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontFamily: {
      /**
       * Set the font family
       */
      setFontFamily: (fontFamily: string) => ReturnType;
      /**
       * Unset the font family
       */
      unsetFontFamily: () => ReturnType;
    };
  }
}

export const FontFamily = Extension.create<FontFamilyOptions>({
  name: "fontFamily",

  addOptions() {
    return {
      types: ["textStyle"],
      defaultFamily: "Arial",
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: this.options.defaultFamily,
            parseHTML: (element) =>
              element.style.fontFamily?.replace(/['"]/g, "") ||
              this.options.defaultFamily,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) {
                return {};
              }

              return {
                style: `font-family: ${attributes.fontFamily}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily) =>
        ({ commands, chain, editor }) => {
          // If there's no selection, set the marks for the next input
          if (editor.state.selection.empty) {
            return chain().focus().setMark("textStyle", { fontFamily }).run();
          }

          // With selection, wrap the selected text with the font family attribute
          return chain().focus().setMark("textStyle", { fontFamily }).run();
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain()
            .focus()
            .setMark("textStyle", { fontFamily: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});
