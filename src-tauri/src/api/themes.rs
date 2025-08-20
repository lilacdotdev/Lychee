/**
 * Theme management API for Lychee application
 * Handles user theme creation, loading, and directory management
 */

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

    let vivid_color_css = r#":root {
        --color-primary: #0801ff !important;
        --color-background-primary: #111827 !important;
        --color-background-secondary: #302f50 !important;
        --color-text-primary: #ff00b5 !important;
        --color-text-secondary: #ab00ff !important;
        --color-border: #00fcff !important;
        --color-success: #56ff00 !important;
        --color-danger: #ff1100 !important;
    }"#;
    
    let purple_haze_css = r#":root {
        --color-primary: #815ebf !important;
        --color-background-primary: #271832 !important;
        --color-background-secondary: #403354 !important;
        --color-text-primary: #bfabcf !important;
        --color-text-secondary: #7f6c8d !important;
        --color-border: #250041 !important;
        --color-success: #915abb !important;
        --color-danger: #53109c !important;
    }"#;
    
    let seaside_picnic_css = r#":root {
        --color-primary:rgb(122, 215, 147) !important;
        --color-background-primary: #4e5c74 !important;
        --color-background-secondary: #47716d !important;
        --color-text-primary: #b0eeff !important;
        --color-text-secondary: #b0ceff !important;
        --color-border: #a598ca !important;
        --color-success: #a5ffd4 !important;
        --color-danger: #feffcb !important;
    }"#;
    
    let sunset_savannah_css = r#":root {
        --color-primary: #f86e1b !important;
        --color-background-primary: #754122 !important;
        --color-background-secondary:rgb(52, 27, 27) !important;
        --color-text-primary:rgb(235, 211, 151) !important;
        --color-text-secondary: #e2a94f !important;
        --color-border:rgb(190, 147, 82) !important;
        --color-success: #98d667 !important;
        --color-danger: #d64e27 !important;
    }"#;
    
    let modern_camo_css = r#":root {
        --color-primary:rgb(77, 88, 71) !important;
        --color-background-primary:rgb(56, 51, 38) !important;
        --color-background-secondary:rgb(91, 77, 41) !important;
        --color-text-primary:rgb(184, 153, 120) !important;
        --color-text-secondary: #74b086 !important;
        --color-border: #b97825 !important;
        --color-success: #1b391f !important;
        --color-danger: #f7d300 !important;
    }"#;
    
    let pastel_sunrise_css = r#":root {
        --color-primary: #ff6a66 !important;
        --color-background-primary:rgb(241, 131, 151) !important;
        --color-background-secondary:rgb(245, 140, 79) !important;
        --color-text-primary:rgb(255, 243, 187) !important;
        --color-text-secondary: #ffc166 !important;
        --color-border: #ff8e66 !important;
        --color-success: #ffe766 !important;
        --color-danger: #f33b36 !important;
    }"#;
    
    let lychee_classic_css = r#":root {
        --color-primary: #ff6766 !important;
        --color-background-primary:rgb(254, 142, 111) !important;
        --color-background-secondary:rgb(170, 80, 127) !important;
        --color-text-primary: #ffd6c0 !important;
        --color-text-secondary: #fdb28a !important;
        --color-border:rgb(255, 185, 201) !important;
        --color-success: #7ac57a !important;
        --color-danger: #ff6766 !important;
    }"#;
    
    let lychee_dark_css = r#":root {
        --color-primary:rgb(138, 66, 138) !important;
        --color-background-primary: #392b39ff !important;
        --color-background-secondary: #573945ff !important;
        --color-text-primary: #f5bef5ff !important;
        --color-text-secondary: #e29ec7ff !important;
        --color-border: #d66a85ff !important;
        --color-success: #55cb81ff !important;
        --color-danger: #a33263ff !important;
    }"#;
    
    let cloudy_thoughts_css = r#":root {
        --color-primary:rgb(74, 128, 254) !important;
        --color-background-primary: #373174 !important;
        --color-background-secondary: #8f75aa !important;
        --color-text-primary: #e2f6ff !important;
        --color-text-secondary: #cdd7ff !important;
        --color-border:rgb(186, 195, 255) !important;
        --color-success: #4f8dff !important;
        --color-danger: #ffe0fc !important;
    }"#;
    
    let blackberry_fizz_css = r#":root {
        --color-primary:rgb(154, 89, 224) !important;
        --color-background-primary: #331b4e !important;
        --color-background-secondary: #2e4c5f !important;
        --color-text-primary: #edccf8 !important;
        --color-text-secondary: #cc90d4 !important;
        --color-border: #8bd1ff !important;
        --color-success: #a6e0ac !important;
        --color-danger: #ffa3c3 !important;
    }"#;
    
    let bleeding_heart_css = r#":root {
        --color-primary: #d1185c !important;
        --color-background-primary:rgb(139, 37, 51) !important;
        --color-background-secondary:rgb(192, 70, 115) !important;
        --color-text-primary: #ff98b4 !important;
        --color-text-secondary: #f15a91 !important;
        --color-border: #e43f3c !important;
        --color-success: #ffa6b2 !important;
        --color-danger: #d11c18 !important;
    }"#;

    // Create all additional theme files
    let theme_files = vec![
        ("vivid-night.css", vivid_color_css),
        ("purple-haze.css", purple_haze_css),
        ("seaside-picnic.css", seaside_picnic_css),
        ("sunset-savannah.css", sunset_savannah_css),
        ("modern-camo.css", modern_camo_css),
        ("pastel-sunrise.css", pastel_sunrise_css),
        ("lychee-classic.css", lychee_classic_css),
        ("lychee-dark.css", lychee_dark_css),
        ("cloudy-thoughts.css", cloudy_thoughts_css),
        ("blackberry-fizz.css", blackberry_fizz_css),
        ("bleeding-heart.css", bleeding_heart_css),
    ];

    for (filename, content) in theme_files {
        let theme_file = themes_dir.join(filename);
        if !theme_file.exists() {
            std::fs::write(&theme_file, content)
                .map_err(|e| format!("Failed to write {} theme file: {}", filename, e))?;
        }
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