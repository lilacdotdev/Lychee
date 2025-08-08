// src/components/ViewPane.tsx

import { createSignal, Show, For, createEffect, createMemo, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { parseMarkdown, extractPlainText } from "../lib/markdown";
import { parseAndFormatTags } from "../lib/tagFormatter";
import { keyBindingManager } from "../lib/keybindings";
import { Icon } from "./Icon";
import type { NoteWithTags, UpdateNoteRequest } from "../types";

interface ViewPaneProps {
  notes: NoteWithTags[];
  selectedNoteId: number | null;
  onSelectedNoteIdChange: (id: number | null) => void;
  searchQuery: string;
  selectedTags: string[];
  onNotesChange: () => void;
  viewMode: 'search' | 'note' | 'edit';
  onViewModeChange: (mode: 'search' | 'note' | 'edit') => void;
}

export function ViewPane(props: ViewPaneProps) {
  const [editContent, setEditContent] = createSignal('');
  const [tagInput, setTagInput] = createSignal('');
  const [editTagList, setEditTagList] = createSignal<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [showCancelConfirm, setShowCancelConfirm] = createSignal(false);
  
  // Undo/Redo system
  const [undoStack, setUndoStack] = createSignal<string[]>([]);
  const [redoStack, setRedoStack] = createSignal<string[]>([]);
  let undoTimer: NodeJS.Timeout | null = null;

  // Undo/Redo functions
  const pushToUndoStack = (content: string) => {
    setUndoStack(prev => [...prev, content]);
    setRedoStack([]); // Clear redo stack when new change is made
  };

  const undo = () => {
    const currentContent = editContent();
    const stack = undoStack();
    
    if (stack.length > 0) {
      const previousContent = stack[stack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, currentContent]);
      setEditContent(previousContent);
    }
  };

  const redo = () => {
    const stack = redoStack();
    
    if (stack.length > 0) {
      const nextContent = stack[stack.length - 1];
      setRedoStack(prev => prev.slice(0, -1));
      pushToUndoStack(editContent());
      setEditContent(nextContent);
    }
  };

  const handleContentChange = (newContent: string) => {
    // Clear existing timer
    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    // Set new timer to push to undo stack after 1 second of no typing
    undoTimer = setTimeout(() => {
      pushToUndoStack(editContent());
    }, 1000);

    setEditContent(newContent);
  };

  // Auto-populate edit content when entering edit mode
  createEffect(() => {
    // Ensure we track both viewMode and notes changes
    const viewMode = props.viewMode;
    const notes = props.notes;
    const selectedId = props.selectedNoteId;
    
    if (viewMode === 'edit' && selectedId) {
      const note = notes.find(n => n.id === selectedId);
      if (note) {
        setEditContent(note.content);
        setEditTagList(note.tags);
        setTagInput('');
        // Initialize undo stack with original content
        setUndoStack([note.content]);
        setRedoStack([]);
      }
    }
  });

  // Set up keybinding handlers for undo/redo
  onMount(() => {
    const handleUndo = () => {
      if (props.viewMode === 'edit') {
        undo();
      }
    };

    const handleRedo = () => {
      if (props.viewMode === 'edit') {
        redo();
      }
    };

    keyBindingManager.on('UNDO', handleUndo);
    keyBindingManager.on('REDO', handleRedo);

    return () => {
      keyBindingManager.off('UNDO', handleUndo);
      keyBindingManager.off('REDO', handleRedo);
    };
  });

  onCleanup(() => {
    if (undoTimer) {
      clearTimeout(undoTimer);
    }
  });

  // Filter notes based on search query and selected tags
  const filteredNotes = createMemo(() => {
    let filtered = props.notes;

    // Filter by selected tags (AND logic)
    if (props.selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        props.selectedTags.every(tag => note.tags.includes(tag))
      );
    }

    // Filter by search query
    if (props.searchQuery.trim()) {
      const query = props.searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  const currentNote = createMemo(() => 
    props.notes.find(note => note.id === props.selectedNoteId)
  );

  const extractNoteTitle = (content: string): string => {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ') && line.length > 2) {
        return line.substring(2).trim();
      }
    }
    
    // Fallback to first word
    const words = extractPlainText(content).split(' ').filter(word => word.trim());
    return words.length > 0 ? words[0] : 'Untitled';
  };

  const handleNoteClick = (noteId: number) => {
    props.onSelectedNoteIdChange(noteId);
    props.onViewModeChange('note');
  };

  const handleBackToSearch = () => {
    props.onViewModeChange('search');
    props.onSelectedNoteIdChange(null);
  };

  const handleBackFromEdit = () => {
    // Return to the previous view mode based on context
    // If we have a selected note, go back to note view
    // Otherwise, go back to search view
    if (props.selectedNoteId) {
      props.onViewModeChange('note');
    } else {
      props.onViewModeChange('search');
    }
  };

  const handleEditNote = () => {
    const note = currentNote();
    if (note) {
      setEditContent(note.content);
      setEditTagList(note.tags);
      setTagInput('');
      props.onViewModeChange('edit');
    }
  };

  const handleSaveNote = async () => {
    const note = props.notes.find(n => n.id === props.selectedNoteId);
    if (!note) return;

    try {
      const tags = editTagList().map(tag => parseAndFormatTags(tag)[0]).filter(Boolean);
      const request: UpdateNoteRequest = {
        id: note.id,
        content: editContent(),
        tags
      };

      await invoke("update_note", { request });
      props.onNotesChange();
      
      // Go back to note view if we have a selected note, otherwise search view
      if (props.selectedNoteId) {
        props.onViewModeChange('note');
      } else {
        props.onViewModeChange('search');
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const handleCancelEdit = () => {
    const note = props.notes.find(n => n.id === props.selectedNoteId);
    const hasContentChanges = note?.content !== editContent();
    const hasTagChanges = JSON.stringify(note?.tags || []) !== JSON.stringify(editTagList());
    
    if (hasContentChanges || hasTagChanges) {
      setShowCancelConfirm(true);
    } else {
      handleBackFromEdit();
    }
  };

  const confirmCancelEdit = () => {
    setShowCancelConfirm(false);
    handleBackFromEdit();
  };

  const handleAddTag = (tagText: string) => {
    const trimmedTag = tagText.trim();
    if (trimmedTag && !editTagList().includes(trimmedTag)) {
      const formattedTag = parseAndFormatTags(trimmedTag)[0];
      if (formattedTag) {
        setEditTagList([...editTagList(), formattedTag]);
      }
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTagList(editTagList().filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput());
    }
  };

  const handleDeleteNote = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNote = async () => {
    const note = currentNote();
    if (!note) return;

    try {
      await invoke("delete_note", { id: note.id });
      props.onNotesChange();
      setShowDeleteConfirm(false);
      handleBackToSearch();
    } catch (error) {
      console.error("Failed to delete note:", error);
      setShowDeleteConfirm(false);
    }
  };

  const getSearchHeaderText = () => {
    if (props.selectedTags.length > 0 && props.searchQuery.trim()) {
      return `Search by: ${props.selectedTags.join(', ')} | ${props.searchQuery}`;
    } else if (props.selectedTags.length > 0) {
      return `Search by: ${props.selectedTags.join(', ')}`;
    } else if (props.searchQuery.trim()) {
      return `Search by: ${props.searchQuery}`;
    } else {
      return 'All Notes';
    }
  };

  return (
    <div class="view-pane">
      <Show when={props.viewMode === 'search'}>
        <div class="search-view">
          <div class="view-header">
            <h2>{getSearchHeaderText()}</h2>
          </div>
          
          <div class="notes-grid">
            <Show when={filteredNotes().length > 0} fallback={
              <div class="no-notes">
                <p>No notes found matching your criteria.</p>
              </div>
            }>
              <For each={filteredNotes()}>
                {(note) => (
                  <div 
                    class="note-card" 
                    onClick={() => handleNoteClick(note.id)}
                  >
                    <div class="note-card-left">
                      <h3 class="note-title">{extractNoteTitle(note.content)}</h3>
                      <div class="note-tags">
                        <For each={note.tags}>
                          {(tag) => <span class="tag-chip">{tag}</span>}
                        </For>
                      </div>
                    </div>
                    <div class="note-card-right">
                      <button 
                        class="note-action-btn edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNoteClick(note.id);
                          setTimeout(() => handleEditNote(), 0);
                        }}
                        title="Edit note"
                      >
                        <Icon name="edit" size={16} class="clickable" />
                      </button>
                      <button 
                        class="note-action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onSelectedNoteIdChange(note.id);
                          setTimeout(() => handleDeleteNote(), 0);
                        }}
                        title="Delete note"
                      >
                        <Icon name="trash-2" size={16} class="clickable" />
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.viewMode === 'note'}>
        <div class="note-view">
          <div class="note-toolbar">
            <button class="back-btn" onClick={handleBackToSearch} title="Back to search">
              <Icon name="arrow-left" size={18} class="clickable" />
              <span>Back</span>
            </button>
            <div class="note-actions">
              <button class="edit-btn" onClick={handleEditNote} title="Edit note">
                <Icon name="edit" size={18} class="clickable" />
              </button>
              <button class="delete-btn" onClick={handleDeleteNote} title="Delete note">
                <Icon name="trash-2" size={18} class="clickable" />
              </button>
            </div>
          </div>
          
          <div class="note-tags-section">
            <Show when={currentNote()}>
              {(() => {
                const note = currentNote();
                if (!note || !note.tags || note.tags.length === 0) {
                  return null;
                }
                return (
                  <div class="note-tags">
                    <For each={note.tags}>
                      {(tag) => (
                        <span class="note-tag-badge">{tag}</span>
                      )}
                    </For>
                  </div>
                );
              })()}
            </Show>
          </div>
          
          <div class="note-content">
            <Show when={currentNote()}>
              {(() => {
                const note = currentNote();
                if (!note || typeof note.content !== 'string') {
                  return <div class="markdown-content">No content available</div>;
                }
                return (
                  <div 
                    class="markdown-content"
                    innerHTML={parseMarkdown(note.content)}
                  />
                );
              })()}
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.viewMode === 'edit'}>
        <div class="edit-view">
          <div class="edit-toolbar">
            <button class="back-btn" onClick={handleBackFromEdit} title="Back">
              <Icon name="arrow-left" size={18} class="clickable" />
            </button>
            <div class="edit-actions">
              <button class="save-btn" onClick={handleSaveNote} title="Save">
                <Icon name="save" size={18} class="clickable" />
              </button>
              <button class="cancel-btn" onClick={handleCancelEdit} title="Cancel">
                <Icon name="x" size={18} class="clickable" />
              </button>
            </div>
          </div>
          
          <div class="edit-content">
            <textarea
              class="content-textarea"
              value={editContent()}
              onInput={(e) => handleContentChange(e.target.value)}
              placeholder="Write your note here..."
            />
            
            <div class="tags-input-section">
              <label for="tags-input">Tags:</label>
              <textarea
                id="tags-input"
                class="tags-textarea"
                value={tagInput()}
                onInput={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Type a tag and press Enter"
                rows="1"
              />
              <div class="tag-badges">
                <For each={editTagList()}>
                  {(tag) => (
                    <span 
                      class="tag-badge"
                      onMouseEnter={(e) => (e.target as HTMLElement).classList.add('delete-hover')}
                      onMouseLeave={(e) => (e.target as HTMLElement).classList.remove('delete-hover')}
                      onClick={() => handleRemoveTag(tag)}
                      title="Click to remove"
                    >
                      {tag}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={showDeleteConfirm()}>
        <div class="modal-overlay">
          <div class="modal">
            <h3>Delete Note?</h3>
            <p>Are you sure you want to delete this note? This action cannot be undone.</p>
            <div class="modal-actions">
              <button 
                class="modal-btn yes-btn" 
                onClick={confirmDeleteNote}
              >
                Yes
              </button>
              <button 
                class="modal-btn no-btn" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={showCancelConfirm()}>
        <div class="modal-overlay">
          <div class="modal">
            <h3>Discard Changes?</h3>
            <p>Do you want to discard all changes?</p>
            <div class="modal-actions">
              <button 
                class="modal-btn yes-btn" 
                onClick={confirmCancelEdit}
              >
                Yes
              </button>
              <button 
                class="modal-btn no-btn" 
                onClick={() => setShowCancelConfirm(false)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}