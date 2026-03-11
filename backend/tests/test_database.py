import os
import sqlite3
import pytest
from backend.database import init_global_db, init_project_db, save_chapter

def test_global_db_init(tmp_path):
    # Override global path for test
    import backend.database
    backend.database.GLOBAL_DB_PATH = str(tmp_path / "global.sqlite")

    conn = init_global_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    assert "Projects" in tables
    assert "tm_units" in tables
    assert "tm_fts" in tables
    conn.close()

def test_project_db_init_and_save(tmp_path):
    conn = init_project_db(str(tmp_path))
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    assert "Chapters" in tables

    # Insert dummy chapter
    cursor.execute('''
        INSERT INTO Chapters (id, chapter_id, source_text, target_text, status, version)
        VALUES ('uuid1', 'ch1', 'Source text', 'Target text', 'NEW', 1)
    ''')
    conn.commit()

    # Test valid update
    new_ver = save_chapter(conn, 'ch1', 'New Target', 1, 'EDITED')
    assert new_ver == 2

    cursor.execute("SELECT target_text, version FROM Chapters WHERE chapter_id='ch1'")
    row = cursor.fetchone()
    assert row[0] == 'New Target'
    assert row[1] == 2

    # Test optimistic locking conflict
    with pytest.raises(ValueError, match="Conflict: Chapter version mismatch"):
        save_chapter(conn, 'ch1', 'Another Target', 1, 'EDITED') # Still trying with version 1

    conn.close()
