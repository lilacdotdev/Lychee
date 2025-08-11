// src-tauri/src/api/tags.rs

use crate::core::models::Tag;
use tauri::State;
use sqlx::{Pool, Sqlite};

type Result<T> = std::result::Result<T, String>;

#[tauri::command]
pub async fn get_all_tags(db: State<'_, Pool<Sqlite>>) -> Result<Vec<Tag>> {
    let tags = sqlx::query_as::<_, Tag>("SELECT id, name FROM tags ORDER BY name")
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(tags)
}

#[tauri::command]
pub async fn delete_tag(tag_id: i64, db: State<'_, Pool<Sqlite>>) -> Result<()> {
    // First delete all note_tags associations
    sqlx::query("DELETE FROM note_tags WHERE tag_id = ?")
        .bind(tag_id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    // Then delete the tag itself
    sqlx::query("DELETE FROM tags WHERE id = ?")
        .bind(tag_id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn rename_tag(tag_id: i64, new_name: String, db: State<'_, Pool<Sqlite>>) -> Result<()> {
    sqlx::query("UPDATE tags SET name = ? WHERE id = ?")
        .bind(&new_name)
        .bind(tag_id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
