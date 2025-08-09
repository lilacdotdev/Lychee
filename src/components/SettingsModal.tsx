// src/components/SettingsModal.tsx

import { Show, onMount, onCleanup, For, createSignal } from "solid-js";
import { Icon } from "./Icon";
import { keyBindingManager } from "../lib/keybindings";
import { invoke } from "@tauri-apps/api/core";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const [editingAction, setEditingAction] = createSignal<string | null>(null);
  const bindings = () => keyBindingManager.getBindings();

  const startCapture = (action: string) => {
    setEditingAction(action);
  };

  const handleKeyCapture = (e: KeyboardEvent) => {
    const action = editingAction();
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    const update = {
      key: e.key.toLowerCase(),
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };
    const ok = keyBindingManager.setBinding(action as any, update);
    if (!ok) {
      alert("This key combination is already in use.");
    } else {
      setEditingAction(null);
    }
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.isOpen) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyCapture, true);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keydown', handleKeyCapture, true);
  });

  if (!props.isOpen) return null;

  const openThemesFolder = async () => {
    try {
      await invoke('open_themes_directory');
    } catch (e) {
      console.error(e);
    }
  };

  const openPluginsFolder = async () => {
    try {
      await invoke('open_plugins_directory');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div class="modal-overlay">
      <div class="modal-container settings-modal">
        <div class="modal-header">
          <h2>Settings</h2>
          <button class="modal-close" onClick={props.onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="settings-section">
            <h3>Keybindings</h3>
            <div class="keybinds-table">
              <div class="kb-row kb-header">
                <div>Action</div>
                <div>Binding</div>
                <div>Change</div>
              </div>
              <For each={bindings()}>
                {(b) => (
                  <div class="kb-row">
                    <div>{b.description}</div>
                    <div>{keyBindingManager.getBindingKeys(b.action as any)}</div>
                    <div>
                      <button class="btn btn-secondary" onClick={() => startCapture(b.action)}>Change</button>
                    </div>
                  </div>
                )}
              </For>
              <div style="margin-top: .5rem;">
                <Show when={!!editingAction()}>
                  <div class="kb-capture">Press the new key combination… (Esc to cancel)</div>
                </Show>
                <button class="btn btn-secondary" onClick={() => keyBindingManager.resetAllBindings()}>Reset All</button>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>Folders</h3>
            <div style="display:flex; gap:.5rem;">
              <button class="btn btn-secondary" onClick={openThemesFolder}><Icon name="folder" size={16}/> Open Themes Folder</button>
              <button class="btn btn-secondary" onClick={openPluginsFolder}><Icon name="folder" size={16}/> Open Plugins Folder</button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
