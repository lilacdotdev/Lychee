# Custom Themes Guide for Lychee

This guide explains how to add custom themes to your Lychee application after building and distributing the .exe file.

## How Custom Themes Work

Lychee supports loading custom themes from your user data directory. Custom themes are CSS files that override the application's built-in color variables and styling.

## Finding Your Themes Directory

### Method 1: Using the App
1. Open Lychee
2. Click the theme selector icon (🎨) in the sidebar
3. Click the folder icon (📁) in the theme dropdown
4. This will open your themes directory in your file manager

### Method 2: Manual Navigation
Navigate to your app data directory:

- **Windows**: `%APPDATA%\lychee\themes\`
- **Linux**: `~/.local/share/lychee/themes/`
- **macOS**: `~/Library/Application Support/lychee/themes/`

If the `themes` directory doesn't exist, Lychee will create it automatically when you first use the theme system.

## Creating Custom Themes

### Basic Theme Structure

Create a new `.css` file in your themes directory with the following structure:

```css
/* Example: my-custom-theme.css */
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

### Required CSS Variables

Your theme must define these CSS variables:

| Variable | Description |
|----------|-------------|
| `--color-primary` | Main accent color (buttons, highlights) |
| `--color-background-primary` | Main background color |
| `--color-background-secondary` | Secondary background (cards, panels) |
| `--color-text-primary` | Main text color |
| `--color-text-secondary` | Secondary text color (subtitles, metadata) |
| `--color-border` | Border color for elements |
| `--color-success` | Success/positive action color |
| `--color-danger` | Error/destructive action color |

### Example Custom Themes

#### Cyberpunk Theme
```css
/* cyberpunk.css */
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

.note-card:hover {
  box-shadow: 0 0 15px #00ff41 !important;
}
```

#### Warm Sunset Theme
```css
/* warm-sunset.css */
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

.note-card {
  background: linear-gradient(135deg, #fff3c4 0%, #ffe0b2 100%) !important;
}
```

#### Ocean Blue Theme
```css
/* ocean-blue.css */
:root {
  --color-primary: #2196f3 !important;
  --color-background-primary: #e3f2fd !important;
  --color-background-secondary: #bbdefb !important;
  --color-text-primary: #0d47a1 !important;
  --color-border: #90caf9 !important;
  --color-success: #4caf50 !important;
  --color-danger: #f44336 !important;
  --color-text-secondary: #1976d2 !important;
}

.sidebar {
  background: linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%) !important;
}
```

## Advanced Styling

You can customize any element in the application by targeting specific CSS classes:

### Common Elements to Style

```css
/* Header customization */
.app-header {
  background: your-color !important;
  border-bottom: 2px solid another-color !important;
}

/* Note cards */
.note-card {
  background: gradient-or-color !important;
  border-radius: 15px !important;
  box-shadow: custom-shadow !important;
}

/* Sidebar */
.sidebar {
  background: your-background !important;
}

/* Buttons */
button {
  background: linear-gradient(45deg, color1, color2) !important;
  border-radius: 20px !important;
}

/* Tag badges */
.tag-badge {
  background: your-tag-color !important;
  color: your-text-color !important;
}
```

## Applying Custom Themes

1. Save your CSS file in the themes directory
2. Open Lychee
3. Click the theme selector (🎨)
4. Click the refresh button (🔄) to reload themes
5. Select your custom theme from the list
6. Your theme will be marked with a "Custom" badge

## Theme Naming

- File names should use lowercase letters, numbers, and hyphens only
- Spaces will be converted to hyphens automatically
- The theme display name will be the filename with the first letter of each word capitalized
- Example: `my-awesome-theme.css` becomes "My Awesome Theme (Custom)"

## Troubleshooting

### Theme Not Appearing
- Make sure the file has a `.css` extension
- Check that the file is in the correct themes directory
- Click the refresh button (🔄) in the theme selector

### Theme Not Working
- Ensure all CSS variables are defined with `!important`
- Check the browser console for any CSS errors
- Verify that the CSS syntax is correct

### Reset to Default
If a custom theme breaks the interface:
1. Close Lychee
2. Delete the problematic theme file
3. Restart Lychee
4. Select a built-in theme

## Sharing Themes

You can share your custom themes by:
1. Sharing the `.css` file with other users
2. Having them place it in their themes directory
3. Refreshing themes in the app

## Tips for Theme Creation

1. **Use high contrast** between text and background colors for readability
2. **Test in both light and dark environments** to ensure visibility
3. **Use consistent color schemes** - choose 2-3 main colors and stick to them
4. **Test with real content** - create some notes to see how your theme looks in practice
5. **Use !important** on all custom CSS rules to ensure they override the default styles

## Built-in Themes for Reference

Lychee includes these built-in themes you can use as reference:
- **Light**: Clean, bright theme
- **Dark**: Modern dark theme
- **Rainbow**: Colorful theme with animated gradients
- **Solarized**: Popular developer color scheme
- **Monokai**: Code editor inspired theme

## Need Help?

If you need help creating custom themes or run into issues, you can:
1. Check the browser developer tools console for errors
2. Look at the built-in theme definitions in the source code
3. Experiment with the CSS variables to understand their effects

Happy theming! 🎨