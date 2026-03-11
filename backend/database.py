import sqlite3
import os
import json

GLOBAL_DB_PATH = "global.sqlite"

def init_global_db():
    conn = sqlite3.connect(GLOBAL_DB_PATH)
    cursor = conn.cursor()

    # Projects Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Projects (
            id TEXT PRIMARY KEY,
            name TEXT,
            path TEXT,
            source_lang TEXT,
            target_lang TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_opened TIMESTAMP
        )
    ''')

    # Translation Memory Storage Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tm_units (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_text TEXT,
            target_text TEXT,
            source_lang TEXT,
            target_lang TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            project_id TEXT
        )
    ''')

    # Translation Memory Search Index (FTS5 External Content Pattern)
    cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS tm_fts USING fts5(
            source_text, content='tm_units', content_rowid='id'
        )
    ''')

    # FTS5 Triggers
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS tm_units_ai AFTER INSERT ON tm_units BEGIN
            INSERT INTO tm_fts(rowid, source_text) VALUES (new.id, new.source_text);
        END;
    ''')
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS tm_units_ad AFTER DELETE ON tm_units BEGIN
            INSERT INTO tm_fts(tm_fts, rowid, source_text) VALUES('delete', old.id, old.source_text);
        END;
    ''')
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS tm_units_au AFTER UPDATE ON tm_units BEGIN
            INSERT INTO tm_fts(tm_fts, rowid, source_text) VALUES('delete', old.id, old.source_text);
            INSERT INTO tm_fts(rowid, source_text) VALUES (new.id, new.source_text);
        END;
    ''')

    # Termbase Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Termbase (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT,
            translation TEXT,
            definition TEXT,
            context TEXT
        )
    ''')

    conn.commit()
    return conn

def init_project_db(project_path: str):
    db_path = os.path.join(project_path, "project.sqlite")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Chapters Table (Replaces Segments Table to hold entire document text)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Chapters (
            id TEXT PRIMARY KEY,
            chapter_id TEXT UNIQUE,
            source_text TEXT,
            target_text TEXT,
            status TEXT DEFAULT 'NEW',
            locked_by TEXT,
            comment TEXT,
            version INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Indexes
    cursor.execute('''CREATE INDEX IF NOT EXISTS idx_chapters_chapter ON Chapters(chapter_id)''')

    # Jobs (Persistent Queue)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Jobs (
            id TEXT PRIMARY KEY,
            task_type TEXT,
            payload TEXT, -- JSON
            status TEXT,
            error_log TEXT
        )
    ''')

    conn.commit()
    return conn

def save_chapter(conn: sqlite3.Connection, chapter_id: str, new_target: str, version: int, status: str):
    cursor = conn.cursor()

    # Optimistic locking check
    cursor.execute("SELECT version FROM Chapters WHERE chapter_id = ?", (chapter_id,))
    row = cursor.fetchone()
    if not row:
        raise ValueError("Chapter not found")

    db_version = row[0]
    if db_version != version:
        raise ValueError("Conflict: Chapter version mismatch")

    # Update
    cursor.execute('''
        UPDATE Chapters
        SET target_text = ?,
            version = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE chapter_id = ?
    ''', (new_target, version + 1, status, chapter_id))

    conn.commit()
    return version + 1
