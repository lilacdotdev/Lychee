// src/components/SettingsModal.tsx

import { Show, onMount, onCleanup } from "solid-js";
import { Icon } from "./Icon";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.isOpen) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  if (!props.isOpen) return null;

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
          <div class="settings-placeholder">
            <Icon name="settings" size={48} />
            <h3>Settings</h3>
            <p>Settings panel will be implemented here.</p>
            <p>This will include preferences, configurations, and other application settings.</p>
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
