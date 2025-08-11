// src/components/NoteEditor.tsx

import { createSignal, createEffect, Show, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { parseMarkdown } from "../lib/markdown";
import type { NoteWithTags, CreateNoteRequest, UpdateNoteRequest } from "../types";

interface NoteEditorProps {
  selectedNoteId: number | null;
  onNoteUpdated: () => void;
  onNewNoteCreated?: (noteId: number) => void;
}



export function NoteEditor(props: NoteEditorProps) {
  const [content, setContent] = createSignal("");
  const [tags, setTags] = createSignal<string[]>([]);
  const [tagInput, setTagInput] = createSignal("");
  const [isEditing, setIsEditing] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [showPreview, setShowPreview] = createSignal(false);


  // Load note when selectedNoteId changes
  createEffect(async () => {
    const noteId = props.selectedNoteId;
    if (noteId !== null) {
      try {
        const note = await invoke<NoteWithTags | null>("get_note_by_id", { id: noteId });
        if (note) {
          setContent(note.content);
          setTags(note.tags);
          setIsEditing(false);
        }
      } catch (error) {
        console.error("Failed to load note:", error);
      }
    } else {
      // Reset for new note
      setContent("");
      setTags([]);
      setIsEditing(false);
    }
  });

  const handleSave = async () => {
    if (!content().trim()) return;

    setIsSaving(true);
    try {
      if (props.selectedNoteId !== null) {
        // Update existing note
        const updateRequest: UpdateNoteRequest = {
          id: props.selectedNoteId,
          content: content(),
          tags: tags(),
        };
        await invoke("update_note", { request: updateRequest });
      } else {
        // Create new note
        const createRequest: CreateNoteRequest = {
          content: content(),
          tags: tags(),
        };
        const newNoteId = await invoke<number>("create_note", { request: createRequest });
        // Notify parent about the new note
        if (props.onNewNoteCreated) {
          props.onNewNoteCreated(newNoteId);
        }
      }
      
      props.onNoteUpdated();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save note:", error);
      alert(`Failed to save note: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (props.selectedNoteId === null) return;

    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await invoke("delete_note", { id: props.selectedNoteId });
        props.onNoteUpdated();
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    }
  };

  const addTag = () => {
    const newTag = tagInput().trim();
    if (newTag && !tags().includes(newTag)) {
      setTags([...tags(), newTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags().filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const renderMarkdown = (text: string) => {
    return parseMarkdown(text);
  };

  return (
    <div class="note-editor">
      <Show
        when={props.selectedNoteId !== null || isEditing()}
        fallback={
          <div class="welcome-message">
            <h1>Welcome to Lychee</h1>
            <p>Select a note from the sidebar or create a new one to start writing.</p>
            
            <div class="welcome-actions">
              <button onClick={() => {
                setIsEditing(true);
                setContent("# New Note\n\nStart writing your note here...");
              }} class="new-note-btn">
                Create New Note
              </button>
            </div>
          </div>
        }
      >
        <div class="editor-header">
          <div class="editor-controls">
            <button 
              onClick={() => setIsEditing(!isEditing())}
              class="edit-toggle-btn"
            >
              {isEditing() ? "View" : "Edit"}
            </button>
            <Show when={isEditing()}>
              <button 
                onClick={() => setShowPreview(!showPreview())}
                class="preview-toggle-btn"
              >
                {showPreview() ? "Hide Preview" : "Show Preview"}
              </button>
            </Show>
          </div>
          
          <div class="action-buttons">
            <Show when={isEditing()}>
              <button 
                onClick={handleSave} 
                disabled={isSaving()}
                class="save-btn"
              >
                {isSaving() ? "Saving..." : "Save"}
              </button>
            </Show>
            <Show when={props.selectedNoteId !== null}>
              <button onClick={handleDelete} class="delete-btn">
                Delete
              </button>
            </Show>
          </div>
        </div>

        <Show when={isEditing()}>
          <div class="editor-content">
            <div class="input-section">
              <textarea
                value={content()}
                onInput={(e) => setContent(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                placeholder="Write your note here... (Ctrl+Enter to save)"
                class="content-textarea"
              />
              
              <div class="tags-section">
                <h4>Tags:</h4>
                <div class="tag-input-container">
                  <input
                    type="text"
                    value={tagInput()}
                    onInput={(e) => setTagInput(e.currentTarget.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                    placeholder="Add a tag..."
                    class="tag-input"
                  />
                  <button onClick={addTag} class="add-tag-btn">Add</button>
                </div>
                <div class="tags-display">
                  <For each={tags()} fallback={<p>No tags</p>}>
                    {(tag) => (
                      <span class="tag-item">
                        {tag}
                        <button 
                          onClick={() => removeTag(tag)}
                          class="remove-tag-btn"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </For>
                </div>
              </div>
            </div>

            <Show when={showPreview()}>
              <div class="preview-section">
                <h4>Preview:</h4>
                <div 
                  class="markdown-preview"
                  innerHTML={renderMarkdown(content())}
                />
              </div>
            </Show>
          </div>
        </Show>

        <Show when={!isEditing()}>
          <div class="view-mode">
            <div class="note-tags">
              <For each={tags()} fallback={<span>No tags</span>}>
                {(tag) => <span class="tag-badge">{tag}</span>}
              </For>
            </div>
            <div 
              class="markdown-content"
              innerHTML={renderMarkdown(content())}
            />
          </div>
        </Show>
      </Show>
    </div>
  );
}