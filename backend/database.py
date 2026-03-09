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

    # Segments Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Segments (
            id TEXT PRIMARY KEY,
            chapter_id TEXT,
            segment_index INTEGER,
            source_text TEXT,
            target_text TEXT,
            inline_tags TEXT, -- JSON mapping
            status TEXT DEFAULT 'NEW',
            locked_by TEXT,
            comment TEXT,
            version INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Indexes
    cursor.execute('''CREATE INDEX IF NOT EXISTS idx_segments_chapter ON Segments(chapter_id)''')
    cursor.execute('''CREATE INDEX IF NOT EXISTS idx_segments_index ON Segments(segment_index)''')

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

def save_segment(conn: sqlite3.Connection, segment_id: str, new_target: str, version: int, status: str, inline_tags: dict):
    cursor = conn.cursor()

    # Optimistic locking check
    cursor.execute("SELECT version FROM Segments WHERE id = ?", (segment_id,))
    row = cursor.fetchone()
    if not row:
        raise ValueError("Segment not found")

    db_version = row[0]
    if db_version != version:
        raise ValueError("Conflict: Segment version mismatch")

    # Update
    cursor.execute('''
        UPDATE Segments
        SET target_text = ?,
            version = ?,
            status = ?,
            inline_tags = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (new_target, version + 1, status, json.dumps(inline_tags), segment_id))

    conn.commit()
    return version + 1
