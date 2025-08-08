// src/components/SpotlightSearch.tsx

import { createSignal, createEffect, For, Show, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { Tag, NoteWithTags } from "../types";
import { Icon } from "./Icon";

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onTagAdd: (tag: string) => void;
  searchMode: 'text' | 'tag';
}

export function SpotlightSearch(props: SpotlightSearchProps) {
  const [query, setQuery] = createSignal('');
  const [suggestions, setSuggestions] = createSignal<(Tag | NoteWithTags)[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;

  // Reset when opened
  createEffect(() => {
    if (props.isOpen) {
      setQuery('');
      setSuggestions([]);
      setSelectedIndex(0);
      // Focus input after a small delay to ensure the element is rendered
      setTimeout(() => {
        inputRef?.focus();
      }, 50);
    }
  });

  // Handle search suggestions
  createEffect(async () => {
    const q = query().trim();
    if (!q || !props.isOpen) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      if (props.searchMode === 'tag') {
        // Search for tags
        const allTags = await invoke<Tag[]>("get_all_tags");
        const filteredTags = allTags.filter(tag => 
          tag.name.toLowerCase().includes(q.toLowerCase())
        );
        setSuggestions(filteredTags);
      } else {
        // Search for notes
        const allNotes = await invoke<NoteWithTags[]>("get_all_notes");
        const filteredNotes = allNotes.filter(note => 
          note.content.toLowerCase().includes(q.toLowerCase()) ||
          note.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
        ).slice(0, 8); // Limit to 8 results
        setSuggestions(filteredNotes);
      }
      setSelectedIndex(0);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        props.onClose();
        break;
      
      case 'Enter':
        event.preventDefault();
        handleSubmit();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(Math.min(selectedIndex() + 1, suggestions().length - 1));
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(Math.max(selectedIndex() - 1, 0));
        break;
    }
  };

  const handleSubmit = () => {
    const q = query().trim();
    if (!q) return;

    if (props.searchMode === 'tag') {
      // Handle tag search - either select suggested tag or create new one
      const selectedSuggestion = suggestions()[selectedIndex()];
      if (selectedSuggestion && 'name' in selectedSuggestion) {
        props.onTagAdd(selectedSuggestion.name);
      } else {
        // If no exact match, use the typed query as tag name
        props.onTagAdd(q);
      }
    } else {
      // Handle text search
      props.onSearch(q);
    }
    
    props.onClose();
  };

  const handleSuggestionClick = (index: number) => {
    setSelectedIndex(index);
    handleSubmit();
  };

  const extractNoteTitle = (content: string): string => {
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim() || '';
    
    // Remove markdown header symbols
    const cleanTitle = firstLine.replace(/^#+\s*/, '').trim();
    return cleanTitle || 'Untitled Note';
  };

  const renderSuggestion = (item: Tag | NoteWithTags, index: number) => {
    if ('name' in item) {
      // Tag suggestion
      return (
        <div 
          class={`spotlight-suggestion ${index === selectedIndex() ? 'selected' : ''}`}
          onClick={() => handleSuggestionClick(index)}
        >
          <Icon name="tag" size={16} />
          <span class="suggestion-text">{item.name}</span>
          <span class="suggestion-type">Tag</span>
        </div>
      );
    } else {
      // Note suggestion
      const title = extractNoteTitle(item.content);
      const preview = item.content.slice(0, 100).replace(/\n/g, ' ').trim();
      
      return (
        <div 
          class={`spotlight-suggestion ${index === selectedIndex() ? 'selected' : ''}`}
          onClick={() => handleSuggestionClick(index)}
        >
          <Icon name="file-text" size={16} />
          <div class="suggestion-content">
            <div class="suggestion-title">{title}</div>
            <div class="suggestion-preview">{preview}...</div>
            <Show when={item.tags.length > 0}>
              <div class="suggestion-tags">
                <For each={item.tags.slice(0, 3)}>
                  {(tag) => <span class="suggestion-tag">{tag}</span>}
                </For>
              </div>
            </Show>
          </div>
        </div>
      );
    }
  };

  // Set up global keyboard listener when open
  onMount(() => {
    if (props.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  if (!props.isOpen) return null;

  return (
    <div class="spotlight-overlay">
      <div class="spotlight-container">
        <div class="spotlight-header">
          <div class="spotlight-input-container">
            <Icon name="search" size={20} class="spotlight-search-icon" />
            <Show when={props.searchMode === 'tag'}>
              <span class="spotlight-prefix">/</span>
            </Show>
            <input
              ref={inputRef}
              type="text"
              placeholder={props.searchMode === 'tag' ? 'Search tags...' : 'Search notes...'}
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              class="spotlight-input"
            />
            <Show when={isLoading()}>
              <div class="spotlight-loading">
                <Icon name="loader" size={16} class="spinning" />
              </div>
            </Show>
          </div>
          <button class="spotlight-close" onClick={props.onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <Show when={suggestions().length > 0}>
          <div class="spotlight-suggestions">
            <For each={suggestions()}>
              {(suggestion, index) => renderSuggestion(suggestion, index())}
            </For>
          </div>
        </Show>

        <Show when={query().trim() && suggestions().length === 0 && !isLoading()}>
          <div class="spotlight-no-results">
            <Icon name="search" size={24} />
            <p>No {props.searchMode === 'tag' ? 'tags' : 'notes'} found</p>
            <Show when={props.searchMode === 'tag'}>
              <p class="spotlight-hint">Press Enter to create tag "{query()}"</p>
            </Show>
          </div>
        </Show>

        <div class="spotlight-footer">
          <div class="spotlight-shortcuts">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
