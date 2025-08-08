// src/lib/keybindings.ts

export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
}

export const defaultKeybindings: KeyBinding[] = [
  { key: 'a', ctrl: true, action: 'CREATE_NOTE', description: 'Create new note' },
  { key: 'q', ctrl: true, action: 'RETURN_TO_VIEW', description: 'Return from edit to view note' },
  { key: 'h', ctrl: true, action: 'RETURN_TO_NOTES', description: 'Return to All Notes menu' },
  { key: 'b', ctrl: true, action: 'OPEN_SETTINGS', description: 'Settings Menu' },
  { key: 'x', ctrl: true, action: 'OPEN_EXPORT', description: 'Export menu' },
  { key: 'z', ctrl: true, action: 'UNDO', description: 'Undo' },
  { key: 'z', ctrl: true, shift: true, action: 'REDO', description: 'Redo' },
  { key: 't', ctrl: true, shift: true, action: 'OPEN_THEME_DROPDOWN', description: 'Open Theme Dropdown' },
  { key: 's', ctrl: true, action: 'OPEN_SPOTLIGHT_SEARCH', description: 'Search for text (Spotlight)' },
  { key: 't', ctrl: true, action: 'OPEN_TAG_SEARCH', description: 'Search for tags (Spotlight)' },
];

export type KeyBindingAction = 
  | 'CREATE_NOTE'
  | 'RETURN_TO_VIEW'
  | 'RETURN_TO_NOTES' 
  | 'OPEN_SETTINGS'
  | 'OPEN_EXPORT'
  | 'UNDO'
  | 'REDO'
  | 'OPEN_THEME_DROPDOWN'
  | 'OPEN_SPOTLIGHT_SEARCH'
  | 'OPEN_TAG_SEARCH';

class KeyBindingManager {
  private bindings: Map<string, KeyBinding> = new Map();
  private listeners: Map<KeyBindingAction, ((event?: KeyboardEvent) => void)[]> = new Map();
  private isEnabled = true;

  constructor() {
    this.loadDefaultBindings();
    this.setupGlobalListener();
  }

  private loadDefaultBindings() {
    defaultKeybindings.forEach(binding => {
      const key = this.getBindingKey(binding);
      this.bindings.set(key, binding);
    });
  }

  private getBindingKey(binding: KeyBinding): string {
    const modifiers = [];
    if (binding.ctrl) modifiers.push('ctrl');
    if (binding.shift) modifiers.push('shift');
    if (binding.alt) modifiers.push('alt');
    return `${modifiers.join('+')}-${binding.key}`;
  }

  private setupGlobalListener() {
    document.addEventListener('keydown', (event) => {
      if (!this.isEnabled) return;
      
      // Don't trigger if user is typing in an input/textarea unless it's a global shortcut
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      // Allow certain shortcuts even in input elements
      const globalShortcuts = ['OPEN_SPOTLIGHT_SEARCH', 'OPEN_TAG_SEARCH', 'OPEN_THEME_DROPDOWN', 'OPEN_SETTINGS', 'OPEN_EXPORT'];
      
      const modifiers = [];
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.shiftKey) modifiers.push('shift');
      if (event.altKey) modifiers.push('alt');
      
      const key = `${modifiers.join('+')}-${event.key.toLowerCase()}`;
      const binding = this.bindings.get(key);
      
      if (binding) {
        // If it's an input element and not a global shortcut, ignore
        if (isInputElement && !globalShortcuts.includes(binding.action)) {
          // Allow undo/redo in text editors
          if (binding.action === 'UNDO' || binding.action === 'REDO') {
            // Let browser handle native undo/redo
            return;
          }
          return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        this.executeAction(binding.action, event);
      }
    });
  }

  private executeAction(action: KeyBindingAction, event: KeyboardEvent) {
    const actionListeners = this.listeners.get(action) || [];
    actionListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error executing keybinding action ${action}:`, error);
      }
    });
  }

  public on(action: KeyBindingAction, listener: (event?: KeyboardEvent) => void) {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, []);
    }
    this.listeners.get(action)!.push(listener);
  }

  public off(action: KeyBindingAction, listener: (event?: KeyboardEvent) => void) {
    const actionListeners = this.listeners.get(action);
    if (actionListeners) {
      const index = actionListeners.indexOf(listener);
      if (index > -1) {
        actionListeners.splice(index, 1);
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getBindings(): KeyBinding[] {
    return Array.from(this.bindings.values());
  }

  public getBindingDescription(action: KeyBindingAction): string {
    const binding = Array.from(this.bindings.values()).find(b => b.action === action);
    return binding?.description || '';
  }

  public getBindingKeys(action: KeyBindingAction): string {
    const binding = Array.from(this.bindings.values()).find(b => b.action === action);
    if (!binding) return '';
    
    const modifiers = [];
    if (binding.ctrl) modifiers.push('Ctrl');
    if (binding.shift) modifiers.push('Shift');
    if (binding.alt) modifiers.push('Alt');
    
    return modifiers.length > 0 ? `${modifiers.join('+')}+${binding.key.toUpperCase()}` : binding.key.toUpperCase();
  }
}

export const keyBindingManager = new KeyBindingManager();
