// src-tauri/src/api/notes.rs

use crate::core::models::Note;
use tauri::State;
// Import Pool and Sqlite directly from the `sqlx` crate.
use sqlx::{Pool, Sqlite};

// A type alias for a simplified result type.
type Result<T> = std::result::Result<T, String>;

// The signature now correctly specifies the state is a Pool for the Sqlite database.
#[tauri::command]
pub async fn create_note(content: String, tags: Vec<String>, db: State<'_, Pool<Sqlite>>) -> Result<i64> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let res = sqlx::query("INSERT INTO notes (content) VALUES (?)")
        .bind(content)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;
    let note_id = res.last_insert_rowid();

    for tag_name in tags {
        let tag_id = sqlx::query_as::<_, (i64,)>("SELECT id FROM tags WHERE name = ?")
            .bind(&tag_name)
            .fetch_optional(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        let tag_id = if let Some((id,)) = tag_id {
            id
        } else {
            sqlx::query("INSERT INTO tags (name) VALUES (?)")
                .bind(&tag_name)
                .execute(&mut *conn)
                .await
                .map_err(|e| e.to_string())?
                .last_insert_rowid()
        };

        sqlx::query("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)")
            .bind(note_id)
            .bind(tag_id)
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(note_id)
}

#[tauri::command]
pub async fn get_all_notes(db: State<'_, Pool<Sqlite>>) -> Result<Vec<Note>> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    let notes = sqlx::query_as::<_, Note>("SELECT id, content FROM notes ORDER BY created_at DESC")
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(notes)
}

#[tauri::command]
pub async fn delete_note(id: i64, db: State<'_, Pool<Sqlite>>) -> Result<()> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM notes WHERE id = ?")
        .bind(id)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}