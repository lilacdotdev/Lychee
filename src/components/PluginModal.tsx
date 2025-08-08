// src/components/PluginModal.tsx

import { Show, onMount, onCleanup } from "solid-js";
import { Icon } from "./Icon";

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PluginModal(props: PluginModalProps) {
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
      <div class="modal-container plugin-modal">
        <div class="modal-header">
          <h2>Plugins</h2>
          <button class="modal-close" onClick={props.onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="plugin-placeholder">
            <Icon name="package" size={48} />
            <h3>Plugin Manager</h3>
            <p>Plugin management will be implemented here.</p>
            <p>This will include installing, configuring, and managing application plugins.</p>
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
