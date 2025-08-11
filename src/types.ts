export interface Note {
  id: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface NoteWithTags {
  id: number;
  content: string;
  created_at?: string;
  updated_at?: string;
  tags: string[];
}

export interface CreateNoteRequest {
  content: string;
  tags: string[];
}

export interface UpdateNoteRequest {
  id: number;
  content: string;
  tags: string[];
}