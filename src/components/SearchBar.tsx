// src/components/SearchBar.tsx

import { createSignal, createEffect, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { Tag, NoteWithTags } from "../types";

interface SearchBarProps {
  onSearchResults: (notes: NoteWithTags[]) => void;
  onTagsChange: (tags: Tag[]) => void;
}

export function SearchBar(props: SearchBarProps) {
  const [searchText, setSearchText] = createSignal("");
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [availableTags, setAvailableTags] = createSignal<Tag[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);

  // Fetch all available tags on component mount
  createEffect(async () => {
    try {
      const tags = await invoke<Tag[]>("get_all_tags");
      setAvailableTags(tags);
      props.onTagsChange(tags);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  });

  // Real-time search effect
  createEffect(async () => {
    const text = searchText();
    const tags = selectedTags();
    
    setIsLoading(true);
    
    try {
      let results: NoteWithTags[] = [];
      
      if (tags.length > 0) {
        // Search by tags
        results = await invoke<NoteWithTags[]>("search_notes_by_tags", { tagNames: tags });
      } else {
        // Get all notes
        results = await invoke<NoteWithTags[]>("get_all_notes");
      }
      
      // Filter by text if provided
      if (text.trim()) {
        const searchLower = text.toLowerCase();
        results = results.filter(note => 
          note.content.toLowerCase().includes(searchLower) ||
          note.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      props.onSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      props.onSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  });

  const handleTagToggle = (tagName: string) => {
    const current = selectedTags();
    const newTags = current.includes(tagName)
      ? current.filter(t => t !== tagName)
      : [...current, tagName];
    setSelectedTags(newTags);
  };

  const clearSearch = () => {
    setSearchText("");
    setSelectedTags([]);
  };

  return (
    <div class="search-container">
      <div class="search-input-container">
        <input
          type="text"
          placeholder="Search notes and tags..."
          value={searchText()}
          onInput={(e) => setSearchText(e.currentTarget.value)}
          class="search-input"
        />
        <Show when={searchText() || selectedTags().length > 0}>
          <button onClick={clearSearch} class="clear-search-btn">
            Clear
          </button>
        </Show>
      </div>

      <div class="tags-container">
        <h4>Filter by Tags:</h4>
        <div class="tags-list">
          <For each={availableTags()} fallback={<p>No tags available</p>}>
            {(tag) => (
              <button
                onClick={() => handleTagToggle(tag.name)}
                class={`tag-btn ${selectedTags().includes(tag.name) ? 'selected' : ''}`}
              >
                {tag.name}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={isLoading()}>
        <div class="loading-indicator">Searching...</div>
      </Show>
    </div>
  );
}
