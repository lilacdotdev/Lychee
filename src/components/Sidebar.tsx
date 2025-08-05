// src/components/Sidebar.tsx

import { createSignal, createResource, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { ThemeSelector } from "./ThemeSelector";
import type { Tag } from "../types";

interface SidebarProps {
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  notes: any[]; // Add notes to trigger refresh
}

export function Sidebar(props: SidebarProps) {
  const [tagsWithFrequency] = createResource(() => props.notes, async (notes) => {
    try {
      const tags = await invoke<Tag[]>("get_all_tags");
      
      // Count frequency for each tag
      const tagFrequency = new Map<string, number>();
      
      // Initialize with 0 frequency
      tags.forEach(tag => {
        tagFrequency.set(tag.name, 0);
      });
      
      // Count occurrences using the passed notes
      if (Array.isArray(notes)) {
        notes.forEach((note: any) => {
          if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach((tagName: string) => {
              const currentCount = tagFrequency.get(tagName) || 0;
              tagFrequency.set(tagName, currentCount + 1);
            });
          }
        });
      }
      
      // Sort by frequency (descending)
      return tags
        .map(tag => ({
          ...tag,
          frequency: tagFrequency.get(tag.name) || 0
        }))
        .sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      return [];
    }
  });

  const handleTagClick = (tagName: string) => {
    const currentTags = props.selectedTags;
    if (currentTags.includes(tagName)) {
      // Remove tag
      props.onSelectedTagsChange(currentTags.filter(t => t !== tagName));
    } else {
      // Add tag
      props.onSelectedTagsChange([...currentTags, tagName]);
    }
  };

  const handlePluginsClick = () => {
    console.log("Plugins functionality will be implemented later");
  };

  const handleSettingsClick = () => {
    console.log("Settings functionality will be implemented later");
  };

  return (
    <aside class="sidebar">
      <div class="sidebar-content">
        <div class="tags-section">
          <h3>Tags</h3>
          <div class="tags-list">
            <Show when={tagsWithFrequency()} fallback={<div>Loading tags...</div>}>
              <For each={tagsWithFrequency()}>
                {(tag) => (
                  <button
                    class={`tag-item ${props.selectedTags.includes(tag.name) ? 'selected' : ''}`}
                    onClick={() => handleTagClick(tag.name)}
                  >
                    <span class="tag-name">{tag.name}</span>
                    <span class="tag-frequency">{tag.frequency}</span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <button 
          class="sidebar-icon-btn" 
          onClick={handlePluginsClick}
          title="Plugins"
        >
          🔌
        </button>
        
        <div class="theme-selector-wrapper">
          <ThemeSelector />
        </div>
        
        <button 
          class="sidebar-icon-btn" 
          onClick={handleSettingsClick}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </aside>
  );
}