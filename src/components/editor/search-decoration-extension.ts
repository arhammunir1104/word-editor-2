/**
 * Search Decoration Extension - Adds decoration support for search highlights
 * This extension processes search-decorations metadata in transactions to render
 * highlights for search matches.
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const SearchHighlightKey = new PluginKey("search-highlights");

export const SearchHighlightExtension = Extension.create({
  name: "searchHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SearchHighlightKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            // Handle clearing decorations
            const clearMeta = tr.getMeta("search-decorations")?.clear;
            if (clearMeta) {
              console.log("Clearing all search decorations");
              return DecorationSet.empty;
            }

            // Get search matches from transaction metadata
            const matches = tr.getMeta("search-decorations")?.matches;
            if (!matches) {
              // If the transaction doesn't involve search, map decorations
              // to adjust positions after document changes
              return oldState.map(tr.mapping, tr.doc);
            }

            console.log(`Creating ${matches.length} search decorations`);

            // Create new decorations for search matches
            const decorations = matches.map(
              (match: { from: number; to: number; active: boolean }) => {
                // Print debug information about creating each decoration
                console.log(
                  `Creating search decoration: ${match.from}-${match.to} ` +
                    `(${match.active ? "active" : "inactive"})`,
                );

                return Decoration.inline(match.from, match.to, {
                  class: match.active
                    ? "pm-search-match pm-search-match-active"
                    : "pm-search-match",
                });
              },
            );

            // Create a new decoration set
            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          // Provide decorations to the editor view
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export default SearchHighlightExtension;
