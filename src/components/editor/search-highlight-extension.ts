import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

interface SearchHighlightOptions {
  searchTerm: string
  caseSensitive: boolean
  wholeWord: boolean
}

interface SearchHighlightStorage {
  decorationSet: DecorationSet
  activeIndex: number
}

export const SearchHighlightExtension = Extension.create<SearchHighlightOptions, SearchHighlightStorage>({
  name: 'searchHighlight',

  addOptions() {
    return {
      searchTerm: '',
      caseSensitive: false,
      wholeWord: false,
    }
  },

  addStorage() {
    return {
      decorationSet: DecorationSet.empty,
      activeIndex: -1,
    }
  },

  // Method to update the search term
  updateSearch(options: Partial<SearchHighlightOptions>) {
    this.options = {
      ...this.options,
      ...options,
    }

    // Force a state update to refresh the decorations
    const { state, view } = this.editor
    if (view && state) {
      const tr = state.tr
      tr.setMeta('forceUpdateDecorations', true)
      view.dispatch(tr)
    }
  },

  // Get total matches
  getMatchCount(): number {
    return this.storage.decorationSet.find().length
  },

  // Get all matches as decorations
  getMatches(): Decoration[] {
    return this.storage.decorationSet.find()
  },

  // Set active match (highlights the specific match)
  setActiveMatch(index: number) {
    if (index < 0 || index >= this.getMatchCount()) {
      return false
    }

    this.storage.activeIndex = index

    // Force a state update to refresh decorations
    const { state, view } = this.editor
    if (view && state) {
      const tr = state.tr
      tr.setMeta('forceUpdateDecorations', true)
      view.dispatch(tr)
      
      // Scroll to the active match
      const matches = this.getMatches()
      if (matches[index]) {
        const activeMatch = matches[index]
        
        // Find the DOM element in the editor for this match
        const dom = view.domAtPos(activeMatch.from)
        if (dom && dom.node) {
          const element = dom.node.parentElement
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
    }

    return true
  },

  // Get active match index
  getActiveMatchIndex(): number {
    return this.storage.activeIndex
  },

  // Navigate to next match
  nextMatch() {
    const count = this.getMatchCount()
    if (count === 0) return false
    
    const nextIndex = (this.storage.activeIndex + 1) % count
    return this.setActiveMatch(nextIndex)
  },

  // Navigate to previous match
  prevMatch() {
    const count = this.getMatchCount()
    if (count === 0) return false
    
    const prevIndex = (this.storage.activeIndex - 1 + count) % count
    return this.setActiveMatch(prevIndex)
  },

  // Replace current match with new text
  replaceMatch(replacement: string) {
    const { state, view } = this.editor
    if (!view || !state) return false
    
    const matches = this.getMatches()
    const activeIndex = this.storage.activeIndex
    
    if (activeIndex < 0 || activeIndex >= matches.length) return false
    
    const activeMatch = matches[activeIndex]
    const from = activeMatch.from
    const to = activeMatch.to
    
    // Create transaction to replace text
    const tr = state.tr
    tr.insertText(replacement, from, to)
    view.dispatch(tr)
    
    // Update search after replacement
    setTimeout(() => {
      this.updateSearch(this.options)
    }, 10)
    
    return true
  },

  // Replace all matches with new text
  replaceAllMatches(replacement: string) {
    const { state, view } = this.editor
    if (!view || !state) return 0
    
    const matches = this.getMatches()
    if (matches.length === 0) return 0
    
    // Create a single transaction for all replacements (starting from the end to avoid position shifts)
    const tr = state.tr
    
    // Sort matches in reverse to avoid position shifts
    const sortedMatches = [...matches].sort((a, b) => b.from - a.from)
    
    // Replace each match
    for (const match of sortedMatches) {
      tr.insertText(replacement, match.from, match.to)
    }
    
    // Apply the transaction
    view.dispatch(tr)
    
    // Return the number of replacements
    const count = matches.length
    
    // Update search after replacements
    setTimeout(() => {
      this.updateSearch(this.options)
    }, 10)
    
    return count
  },

  // Clear all search highlights
  clearSearch() {
    this.options.searchTerm = ''
    this.storage.activeIndex = -1
    
    // Force a state update to refresh decorations
    const { state, view } = this.editor
    if (view && state) {
      const tr = state.tr
      tr.setMeta('forceUpdateDecorations', true)
      view.dispatch(tr)
    }
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('searchHighlight')
    const extension = this

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldSet) {
            // Only update if document has changed or there's a specific update request
            if (tr.docChanged || tr.getMeta('forceUpdateDecorations')) {
              const { doc } = tr
              const { searchTerm, caseSensitive, wholeWord } = extension.options
              
              if (!searchTerm) {
                extension.storage.decorationSet = DecorationSet.empty
                return DecorationSet.empty
              }
              
              // Create regex pattern based on options
              let flags = 'g'
              if (!caseSensitive) {
                flags += 'i'
              }
              
              let pattern = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // Escape regex special chars
              if (wholeWord) {
                pattern = `\\b${pattern}\\b`
              }
              
              const regex = new RegExp(pattern, flags)
              
              // Collect all decorations
              const decorations: Decoration[] = []
              
              // Function to find matches in text nodes
              doc.descendants((node: any, pos: number) => {
                if (!node.isText) return
                
                const text = node.text || ''
                let match
                
                // Reset regex for each new text node
                regex.lastIndex = 0
                
                while ((match = regex.exec(text)) !== null) {
                  const from = pos + match.index
                  const to = from + match[0].length
                  
                  // Check if this is the active match
                  const isActive = decorations.length === extension.storage.activeIndex
                  
                  // Create appropriate decoration
                  if (isActive) {
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: 'search-highlight-active',
                        style: 'color: #FF0000; font-weight: bold;'
                      })
                    )
                  } else {
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: 'search-highlight',
                        style: 'color: #FF0000;'
                      })
                    )
                  }
                }
              })
              
              // Save the decorations to extension storage
              const decorationSet = DecorationSet.create(doc, decorations)
              extension.storage.decorationSet = decorationSet
              
              return decorationSet
            }
            
            return oldSet.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  }
})