// src-tauri/src/api/themes.rs

use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserTheme {
    pub name: String,
    pub display_name: String,
    pub content: String,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThemeInfo {
    pub name: String,
    pub display_name: String,
    pub is_user_theme: bool,
}

/// Get the themes directory path in app data
#[command]
pub async fn get_themes_directory(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let themes_dir = app_data_dir.join("themes");
    
    // Create themes directory if it doesn't exist
    if !themes_dir.exists() {
        std::fs::create_dir_all(&themes_dir)
            .map_err(|e| format!("Failed to create themes directory: {}", e))?;
    }
    
    Ok(themes_dir.to_string_lossy().to_string())
}

/// Get all available user themes
#[command]
pub async fn get_user_themes(app: AppHandle) -> Result<Vec<UserTheme>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let themes_dir = app_data_dir.join("themes");
    
    if !themes_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut themes = Vec::new();
    
    let entries = std::fs::read_dir(&themes_dir)
        .map_err(|e| format!("Failed to read themes directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("css") {
            let name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            
            let display_name = capitalize_words(&name);
            
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read theme file {}: {}", path.display(), e))?;
            
            themes.push(UserTheme {
                name: format!("user-{}", name),
                display_name,
                content,
                file_path: path.to_string_lossy().to_string(),
            });
        }
    }
    
    // Sort themes by name
    themes.sort_by(|a, b| a.display_name.cmp(&b.display_name));
    
    Ok(themes)
}

/// Save a theme to the user themes directory
#[command]
pub async fn save_user_theme(
    app: AppHandle,
    name: String,
    content: String,
) -> Result<String, String> {
    // Sanitize the name to be filesystem-safe
    let sanitized_name = sanitize_filename(&name);
    
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let themes_dir = app_data_dir.join("themes");
    
    // Create themes directory if it doesn't exist
    if !themes_dir.exists() {
        std::fs::create_dir_all(&themes_dir)
            .map_err(|e| format!("Failed to create themes directory: {}", e))?;
    }
    
    let theme_file = themes_dir.join(format!("{}.css", sanitized_name));
    
    std::fs::write(&theme_file, content)
        .map_err(|e| format!("Failed to write theme file: {}", e))?;
    
    Ok(theme_file.to_string_lossy().to_string())
}

/// Delete a user theme
#[command]
pub async fn delete_user_theme(app: AppHandle, theme_name: String) -> Result<(), String> {
    // Remove "user-" prefix if present
    let clean_name = theme_name.strip_prefix("user-").unwrap_or(&theme_name);
    let sanitized_name = sanitize_filename(clean_name);
    
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let theme_file = app_data_dir.join("themes").join(format!("{}.css", sanitized_name));
    
    if theme_file.exists() {
        std::fs::remove_file(&theme_file)
            .map_err(|e| format!("Failed to delete theme file: {}", e))?;
    }
    
    Ok(())
}

/// Check if themes directory exists and is accessible
#[command]
pub async fn check_themes_directory(app: AppHandle) -> Result<bool, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let themes_dir = app_data_dir.join("themes");
    
    Ok(themes_dir.exists() && themes_dir.is_dir())
}

/// Open themes directory in file manager
#[command]
pub async fn open_themes_directory(app: AppHandle) -> Result<(), String> {
    let themes_dir = get_themes_directory(app).await?;
    
    // Use the opener plugin to open the directory
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&themes_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&themes_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&themes_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    Ok(())
}

/// Initialize default themes in the themes directory
#[command]
pub async fn initialize_default_themes(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let themes_dir = app_data_dir.join("themes");
    
    // Create themes directory if it doesn't exist
    if !themes_dir.exists() {
        std::fs::create_dir_all(&themes_dir)
            .map_err(|e| format!("Failed to create themes directory: {}", e))?;
    }
    
    // Define the default dark theme CSS
    let dark_theme_css = r#":root {
  --color-primary: #0d6efd !important;
  --color-background-primary: #212529 !important;
  --color-background-secondary: #343a40 !important;
  --color-text-primary: #f8f9fa !important;
  --color-text-secondary: #adb5bd !important;
  --color-border: #495057 !important;
  --color-success: #198754 !important;
  --color-danger: #dc3545 !important;
}"#;
    
    // Create dark.css theme file
    let dark_theme_file = themes_dir.join("dark.css");
    
    // Only create the file if it doesn't already exist
    if !dark_theme_file.exists() {
        std::fs::write(&dark_theme_file, dark_theme_css)
            .map_err(|e| format!("Failed to write dark theme file: {}", e))?;
    }
    
    Ok(())
}

// Helper functions

fn capitalize_words(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect::<Vec<String>>()
        .join(" ")
}

fn sanitize_filename(name: &str) -> String {
    // Remove or replace invalid characters for filenames
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            ' ' => '-',
            c if c.is_alphanumeric() || c == '-' || c == '_' => c,
            _ => '-',
        })
        .collect::<String>()
        .trim_matches('-')
        .to_lowercase()
}