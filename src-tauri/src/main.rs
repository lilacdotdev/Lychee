// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sqlx::SqlitePool;
use tauri::Manager;

mod core;
mod api;

fn main() {
    println!("Starting Lychee application...");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database in async context
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Get app data directory and create database path
                let app_data_dir = app_handle
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app data directory");
                
                // Create app data directory if it doesn't exist
                if !app_data_dir.exists() {
                    std::fs::create_dir_all(&app_data_dir)
                        .expect("Failed to create app data directory");
                }
                
                let db_path = app_data_dir.join("tree.db");
                let db_url = format!("sqlite:{}", db_path.to_string_lossy());
                
                println!("Database path: {}", db_url);
                
                // Create database connection pool with create if missing
                let pool = SqlitePool::connect_with(
                    sqlx::sqlite::SqliteConnectOptions::new()
                        .filename(&db_path)
                        .create_if_missing(true)
                )
                .await
                .expect("Failed to connect to database");
                
                // Run migrations
                let migration_sql = include_str!("../migrations/1_create_tables.sql");
                sqlx::query(migration_sql)
                    .execute(&pool)
                    .await
                    .expect("Failed to run migrations");
                
                println!("Database initialized successfully");
                
                // Manage the pool
                app_handle.manage(pool);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::notes::create_note,
            api::notes::get_all_notes,
            api::notes::get_note_by_id,
            api::notes::update_note,
            api::notes::delete_note,
            api::notes::get_tags_for_note,
            api::notes::search_notes_by_tags,
            api::tags::get_all_tags,
            api::tags::delete_tag,
            api::tags::rename_tag,
            api::themes::get_themes_directory,
            api::themes::get_user_themes,
            api::themes::save_user_theme,
            api::themes::delete_user_theme,
            api::themes::check_themes_directory,
            api::themes::open_themes_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}