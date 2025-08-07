# Adding Custom Theme Support to Lychee

## Step 1: Add Tauri Dependencies

First, ensure your `src-tauri/Cargo.toml` has the necessary permissions:

```toml
[dependencies]
tauri = { version = "1.0", features = ["fs-read-file", "path-all"] }
```

## Step 2: Modify theme.ts

Add this to your `src/lib/theme.ts`:

```typescript
import { appDataDir } from '@tauri-apps/api/path';
import { readTextFile, readDir, exists, createDir } from '@tauri-apps/api/fs';

// Enhanced Theme interface
interface UserTheme extends Theme {
  isUserTheme?: boolean;
  content?: string;
}

// Function to ensure themes directory exists
async function ensureThemesDirectory(): Promise<string> {
  const appDataPath = await appDataDir();
  const themesPath = `${appDataPath}themes`;
  
  if (!(await exists(themesPath))) {
    await createDir(themesPath, { recursive: true });
  }
  
  return themesPath;
}

// Function to load user themes
async function loadUserThemes(): Promise<UserTheme[]> {
  try {
    const themesPath = await ensureThemesDirectory();
    const entries = await readDir(themesPath);
    const userThemes: UserTheme[] = [];
    
    for (const entry of entries) {
      if (entry.name?.endsWith('.css')) {
        const themeName = entry.name.replace('.css', '');
        const themeContent = await readTextFile(`${themesPath}/${entry.name}`);
        
        userThemes.push({
          name: `user-${themeName}`,
          displayName: `${themeName} (Custom)`,
          cssFile: '',
          isUserTheme: true,
          content: themeContent
        });
      }
    }
    
    return userThemes;
  } catch (error) {
    console.error('Failed to load user themes:', error);
    return [];
  }
}

// Enhanced ThemeManager class
class EnhancedThemeManager extends ThemeManager {
  private userThemes: UserTheme[] = [];
  
  async loadAllThemes(): Promise<Theme[]> {
    this.userThemes = await loadUserThemes();
    return [...availableThemes, ...this.userThemes];
  }
  
  async applyTheme(themeName: string) {
    // Check if it's a user theme
    const userTheme = this.userThemes.find(t => t.name === themeName);
    if (userTheme && userTheme.content) {
      // Apply user theme content
      if (this.themeElement) {
        this.themeElement.textContent = userTheme.content;
        this.currentTheme = themeName;
        localStorage.setItem('lychee-theme', themeName);
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('theme-changed', { 
          detail: { theme: themeName } 
        }));
        
        console.log(`User theme ${themeName} applied successfully`);
        return;
      }
    }
    
    // Fall back to built-in theme logic
    super.applyTheme(themeName);
  }
  
  async openThemesFolder() {
    try {
      const themesPath = await ensureThemesDirectory();
      // You can add a function to open the folder in file manager
      console.log(`Themes folder: ${themesPath}`);
      return themesPath;
    } catch (error) {
      console.error('Failed to open themes folder:', error);
    }
  }
  
  async refreshUserThemes() {
    this.userThemes = await loadUserThemes();
    // Re-populate theme selector
    window.dispatchEvent(new CustomEvent('themes-refreshed'));
  }
}

export const enhancedThemeManager = new EnhancedThemeManager();
```

## Step 3: Update ThemeSelector Component

Modify your `src/components/ThemeSelector.tsx`:

```typescript
import { createSignal, createEffect, For, Show, onMount } from "solid-js";
import { enhancedThemeManager } from "../lib/theme";

export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = createSignal('light');
  const [isOpen, setIsOpen] = createSignal(false);
  const [allThemes, setAllThemes] = createSignal([]);

  // Load themes on mount
  onMount(async () => {
    const themes = await enhancedThemeManager.loadAllThemes();
    setAllThemes(themes);
    setCurrentTheme(enhancedThemeManager.getCurrentTheme());
  });

  // Listen for theme refresh events
  createEffect(() => {
    const handleThemesRefresh = async () => {
      const themes = await enhancedThemeManager.loadAllThemes();
      setAllThemes(themes);
    };

    window.addEventListener('themes-refreshed', handleThemesRefresh);
    
    return () => {
      window.removeEventListener('themes-refreshed', handleThemesRefresh);
    };
  });

  const handleThemeSelect = (theme) => {
    enhancedThemeManager.applyTheme(theme.name);
    setCurrentTheme(theme.name);
    setIsOpen(false);
  };

  const handleOpenThemesFolder = async () => {
    await enhancedThemeManager.openThemesFolder();
  };

  const handleRefreshThemes = async () => {
    await enhancedThemeManager.refreshUserThemes();
  };

  return (
    <div class="theme-selector">
      <button 
        onClick={() => setIsOpen(!isOpen())}
        class="theme-selector-button"
        title="Change theme"
      >
        <span class="theme-icon">🎨</span>
      </button>

      <Show when={isOpen()}>
        <div class="theme-dropdown">
          <div class="theme-dropdown-header">
            <h4>Themes</h4>
            <div class="theme-actions">
              <button onClick={handleRefreshThemes} title="Refresh themes">🔄</button>
              <button onClick={handleOpenThemesFolder} title="Open themes folder">📁</button>
            </div>
          </div>
          <div class="theme-options">
            <For each={allThemes()}>
              {(theme) => (
                <button
                  class={`theme-option ${currentTheme() === theme.name ? 'active' : ''}`}
                  onClick={() => handleThemeSelect(theme)}
                >
                  <span class="theme-name">{theme.displayName}</span>
                  {theme.isUserTheme && <span class="user-badge">Custom</span>}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
```

## Step 4: User Instructions

Create a help document for users:

### How to Add Custom Themes to Lychee

1. **Find your themes folder:**
   - **Windows**: Press `Win + R`, type `%APPDATA%\lychee\themes` and press Enter
   - **Linux**: Navigate to `~/.local/share/lychee/themes/`
   - **macOS**: Navigate to `~/Library/Application Support/lychee/themes/`

2. **Create a theme file:**
   - Create a new file with `.css` extension (e.g., `my-theme.css`)
   - Use this template:

```css
:root {
  --color-primary: #your-color !important;
  --color-background-primary: #your-color !important;
  --color-background-secondary: #your-color !important;
  --color-text-primary: #your-color !important;
  --color-border: #your-color !important;
  --color-success: #your-color !important;
  --color-danger: #your-color !important;
  --color-text-secondary: #your-color !important;
}

/* Optional: Add custom styles for specific elements */
.note-card {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
}
```

3. **Apply your theme:**
   - Click the theme selector (🎨) in the sidebar
   - Click the refresh button (🔄) to reload themes
   - Select your custom theme from the list

## Example Custom Themes

### Cyberpunk Theme
```css
:root {
  --color-primary: #00ff41 !important;
  --color-background-primary: #0d1117 !important;
  --color-background-secondary: #161b22 !important;
  --color-text-primary: #00ff41 !important;
  --color-border: #ff1744 !important;
  --color-success: #00ff41 !important;
  --color-danger: #ff1744 !important;
  --color-text-secondary: #58a6ff !important;
}

.app-header {
  border-bottom: 2px solid #ff1744 !important;
}
```

### Warm Theme
```css
:root {
  --color-primary: #ff6b35 !important;
  --color-background-primary: #fff8e1 !important;
  --color-background-secondary: #fff3c4 !important;
  --color-text-primary: #3e2723 !important;
  --color-border: #ffb74d !important;
  --color-success: #689f38 !important;
  --color-danger: #f44336 !important;
  --color-text-secondary: #8d6e63 !important;
}
```