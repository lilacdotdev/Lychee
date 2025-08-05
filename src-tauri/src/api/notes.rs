// src-tauri/src/api/notes.rs

use crate::core::models::{Note, NoteWithTags, CreateNoteRequest, UpdateNoteRequest};
use tauri::State;
use sqlx::{Pool, Sqlite};

type Result<T> = std::result::Result<T, String>;

#[tauri::command]
pub async fn create_note(request: CreateNoteRequest, db: State<'_, Pool<Sqlite>>) -> Result<i64> {
    let res = sqlx::query("INSERT INTO notes (content) VALUES (?)")
        .bind(&request.content)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
    let note_id = res.last_insert_rowid();

    // Add tags
    for tag_name in request.tags {
        let tag_id = sqlx::query_as::<_, (i64,)>("SELECT id FROM tags WHERE name = ?")
            .bind(&tag_name)
            .fetch_optional(&*db)
            .await
            .map_err(|e| e.to_string())?;

        let tag_id = if let Some((id,)) = tag_id {
            id
        } else {
            sqlx::query("INSERT INTO tags (name) VALUES (?)")
                .bind(&tag_name)
                .execute(&*db)
                .await
                .map_err(|e| e.to_string())?
                .last_insert_rowid()
        };

        sqlx::query("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)")
            .bind(note_id)
            .bind(tag_id)
            .execute(&*db)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(note_id)
}

#[tauri::command]
pub async fn get_all_notes(db: State<'_, Pool<Sqlite>>) -> Result<Vec<NoteWithTags>> {
    let notes = sqlx::query_as::<_, Note>(
        "SELECT id, content, created_at, updated_at FROM notes ORDER BY created_at DESC"
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    let mut notes_with_tags = Vec::new();
    for note in notes {
        let tags = get_tags_for_note_internal(note.id, &db).await?;
        notes_with_tags.push(NoteWithTags {
            id: note.id,
            content: note.content,
            created_at: note.created_at,
            updated_at: note.updated_at,
            tags,
        });
    }

    Ok(notes_with_tags)
}

#[tauri::command]
pub async fn get_note_by_id(id: i64, db: State<'_, Pool<Sqlite>>) -> Result<Option<NoteWithTags>> {
    let note = sqlx::query_as::<_, Note>(
        "SELECT id, content, created_at, updated_at FROM notes WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&*db)
    .await
    .map_err(|e| e.to_string())?;

    match note {
        Some(note) => {
            let tags = get_tags_for_note_internal(note.id, &db).await?;
            Ok(Some(NoteWithTags {
                id: note.id,
                content: note.content,
                created_at: note.created_at,
                updated_at: note.updated_at,
                tags,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_note(request: UpdateNoteRequest, db: State<'_, Pool<Sqlite>>) -> Result<()> {
    // Update note content
    sqlx::query("UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&request.content)
        .bind(request.id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    // Remove existing tags
    sqlx::query("DELETE FROM note_tags WHERE note_id = ?")
        .bind(request.id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    // Add new tags
    for tag_name in request.tags {
        let tag_id = sqlx::query_as::<_, (i64,)>("SELECT id FROM tags WHERE name = ?")
            .bind(&tag_name)
            .fetch_optional(&*db)
            .await
            .map_err(|e| e.to_string())?;

        let tag_id = if let Some((id,)) = tag_id {
            id
        } else {
            sqlx::query("INSERT INTO tags (name) VALUES (?)")
                .bind(&tag_name)
                .execute(&*db)
                .await
                .map_err(|e| e.to_string())?
                .last_insert_rowid()
        };

        sqlx::query("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)")
            .bind(request.id)
            .bind(tag_id)
            .execute(&*db)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Clean up orphaned tags
    cleanup_orphaned_tags(&db).await?;

    Ok(())
}

#[tauri::command]
pub async fn delete_note(id: i64, db: State<'_, Pool<Sqlite>>) -> Result<()> {
    sqlx::query("DELETE FROM notes WHERE id = ?")
        .bind(id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    // Clean up orphaned tags
    cleanup_orphaned_tags(&db).await?;

    Ok(())
}

#[tauri::command]
pub async fn get_tags_for_note(note_id: i64, db: State<'_, Pool<Sqlite>>) -> Result<Vec<String>> {
    get_tags_for_note_internal(note_id, &db).await
}



#[tauri::command]
pub async fn search_notes_by_tags(tag_names: Vec<String>, db: State<'_, Pool<Sqlite>>) -> Result<Vec<NoteWithTags>> {
    if tag_names.is_empty() {
        return get_all_notes(db).await;
    }

    // Build the query to find notes that have ALL the specified tags
    let placeholders = tag_names.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        "SELECT DISTINCT n.id, n.content, n.created_at, n.updated_at 
         FROM notes n 
         INNER JOIN note_tags nt ON n.id = nt.note_id 
         INNER JOIN tags t ON nt.tag_id = t.id 
         WHERE t.name IN ({}) 
         GROUP BY n.id 
         HAVING COUNT(DISTINCT t.name) = ? 
         ORDER BY n.created_at DESC",
        placeholders
    );

    let mut query_builder = sqlx::query_as::<_, Note>(&query);
    
    // Bind tag names
    for tag_name in &tag_names {
        query_builder = query_builder.bind(tag_name);
    }
    
    // Bind the count of tags we're looking for
    query_builder = query_builder.bind(tag_names.len() as i64);

    let notes = query_builder
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())?;

    let mut notes_with_tags = Vec::new();
    for note in notes {
        let tags = get_tags_for_note_internal(note.id, &db).await?;
        notes_with_tags.push(NoteWithTags {
            id: note.id,
            content: note.content,
            created_at: note.created_at,
            updated_at: note.updated_at,
            tags,
        });
    }

    Ok(notes_with_tags)
}

// Helper function to get tags for a note
async fn get_tags_for_note_internal(note_id: i64, db: &Pool<Sqlite>) -> Result<Vec<String>> {
    let tags = sqlx::query_as::<_, (String,)>(
        "SELECT t.name FROM tags t 
         INNER JOIN note_tags nt ON t.id = nt.tag_id 
         WHERE nt.note_id = ? 
         ORDER BY t.name"
    )
    .bind(note_id)
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(tags.into_iter().map(|(name,)| name).collect())
}

// Helper function to clean up orphaned tags
async fn cleanup_orphaned_tags(db: &Pool<Sqlite>) -> Result<()> {
    sqlx::query(
        "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)"
    )
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}