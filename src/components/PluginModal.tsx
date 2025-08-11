// src/components/PluginModal.tsx

import { Show, onMount, onCleanup, createSignal, For, createEffect } from "solid-js";
import { Icon } from "./Icon";
import { invoke } from "@tauri-apps/api/core";

type PluginInfo = {
  id: string;
  name: string;
  version: string;
  description: string;
  path: string;
  enabled: boolean;
};

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PluginModal(props: PluginModalProps) {
  const [plugins, setPlugins] = createSignal<PluginInfo[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const loadPlugins = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await invoke<PluginInfo[]>("list_plugins");
      setPlugins(list);
    } catch (e: any) {
      console.error("Failed to load plugins:", e);
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlugin = async (pluginId: string, nextEnabled: boolean) => {
    try {
      await invoke("set_plugin_enabled", { pluginId, enabled: nextEnabled });
      setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: nextEnabled } : p));
    } catch (e) {
      console.error("Failed to update plugin state:", e);
      alert("Failed to update plugin state: " + e);
    }
  };

  const openPluginsFolder = async () => {
    try {
      await invoke("open_plugins_directory");
    } catch (e) {
      console.error("Failed to open plugins folder:", e);
      alert("Failed to open plugins folder: " + e);
    }
  };

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

  // Load plugins whenever modal opens
  createEffect(() => {
    if (props.isOpen) {
      loadPlugins();
    }
  });

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
          <div class="plugin-actions" style="display:flex; gap:.5rem; margin-bottom:1rem;">
            <button class="btn btn-secondary" onClick={openPluginsFolder}>
              <Icon name="folder" size={16} /> Open Plugins Folder
            </button>
            <button class="btn btn-secondary" onClick={loadPlugins} disabled={isLoading()}>
              <Icon name="refresh-cw" size={16} /> {isLoading() ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <Show when={!error()} fallback={<div class="error">{error()}</div>}>
            <Show when={plugins().length > 0} fallback={<div>No plugins found. Place plugin folders with a plugin.json in the plugins directory.</div>}>
              <div class="plugins-list">
                <For each={plugins()}>
                  {(pl) => (
                    <div class="plugin-card">
                      <div class="plugin-card-header">
                        <div class="plugin-title">{pl.name}</div>
                        <div class="plugin-version">v{pl.version}</div>
                      </div>
                      <div class="plugin-desc">{pl.description}</div>
                      <div class="plugin-meta">Path: {pl.path}</div>
                      <div class="plugin-actions-row">
                        <label class="toggle">
                          <input type="checkbox" checked={pl.enabled} onChange={(e) => togglePlugin(pl.id, e.currentTarget.checked)} />
                          <span>Enabled</span>
                        </label>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
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
