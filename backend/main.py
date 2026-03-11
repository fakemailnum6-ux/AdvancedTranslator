import os
import json
import uuid
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

from backend.database import init_global_db, init_project_db, save_chapter, GLOBAL_DB_PATH
from backend.nlp import segment_text

# Models for the API requests
class ImportEpubRequest(BaseModel):
    file_path: str
    source_lang: str
    target_lang: str
    project_name: str

class OpenProjectRequest(BaseModel):
    project_id: str

class UpdateChapterRequest(BaseModel):
    target_text: str
    status: str
    version: int

app = FastAPI(title="Advanced CAT-Tool API", version="9.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Application state for current open project
current_project_id = None
current_project_db_conn = None


class TMSearchRequest(BaseModel):
    query: str
    limit: int = 20

@app.on_event("startup")
def startup_event():
    # Ensure global DB is initialized
    init_global_db()

@app.get("/")
def read_root():
    return {"message": "CAT-Tool Backend is running."}

@app.post("/api/projects/import-epub")
def import_epub(request: ImportEpubRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

    project_id = str(uuid.uuid4())
    project_path = os.path.join("projects", project_id)
    os.makedirs(project_path, exist_ok=True)

    # Initialize the Global DB entry
    conn = init_global_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO Projects (id, name, path, source_lang, target_lang)
        VALUES (?, ?, ?, ?, ?)
    ''', (project_id, request.project_name, project_path, request.source_lang, request.target_lang))
    conn.commit()
    conn.close()

    # Initialize Project DB
    proj_conn = init_project_db(project_path)
    proj_cursor = proj_conn.cursor()

    try:
        book = epub.read_epub(request.file_path)
        chapter_id_counter = 0

        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                chapter_id = f"ch_{chapter_id_counter}"
                chapter_id_counter += 1
                html_content = item.get_content().decode('utf-8', errors='ignore')

                # Extract text without NLP segmentation
                soup = BeautifulSoup(html_content, 'html.parser')
                text = soup.get_text(separator='\n\n', strip=True)

                # Insert chapter
                chapter_uuid = str(uuid.uuid4())
                proj_cursor.execute('''
                    INSERT INTO Chapters (id, chapter_id, source_text, target_text, status, version)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    chapter_uuid,
                    chapter_id,
                    text,
                    "", # Target is empty initially
                    "NEW",
                    1
                ))
        proj_conn.commit()
    except Exception as e:
        proj_conn.close()
        raise HTTPException(status_code=500, detail=str(e))

    proj_conn.close()

    # Trigger background worker by adding a Job
    job_id = str(uuid.uuid4())
    proj_conn = init_project_db(project_path)
    proj_cursor = proj_conn.cursor()
    proj_cursor.execute('''
        INSERT INTO Jobs (id, task_type, payload, status)
        VALUES (?, ?, ?, ?)
    ''', (job_id, 'translate-chapter', json.dumps({"chapter_id": "all"}), 'PENDING'))
    proj_conn.commit()
    proj_conn.close()

    return {"status": "success", "project_id": project_id, "message": f"Project {request.project_name} imported successfully."}

@app.post("/api/projects/open")
def open_project(request: OpenProjectRequest):
    global current_project_id, current_project_db_conn

    conn = init_global_db()
    cursor = conn.cursor()
    cursor.execute("SELECT path FROM Projects WHERE id = ?", (request.project_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    project_path = row[0]
    db_path = os.path.join(project_path, "project.sqlite")

    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Project database not found")

    if current_project_db_conn:
        current_project_db_conn.close()

    import sqlite3
    current_project_db_conn = sqlite3.connect(db_path, check_same_thread=False)
    # Return rows as dicts
    current_project_db_conn.row_factory = sqlite3.Row
    current_project_id = request.project_id

    return {"status": "success", "message": f"Project {request.project_id} opened."}

@app.get("/api/projects/list")
def list_projects():
    conn = init_global_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, source_lang, target_lang, created_at FROM Projects ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    projects = []
    for row in rows:
        projects.append({
            "id": row[0],
            "name": row[1],
            "source_lang": row[2],
            "target_lang": row[3],
            "created_at": row[4]
        })

    return {"projects": projects}

@app.get("/api/projects/{project_id}/chapters")
def get_chapters(project_id: str):
    conn = init_global_db()
    cursor = conn.cursor()
    cursor.execute("SELECT path FROM Projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    project_path = row[0]
    db_path = os.path.join(project_path, "project.sqlite")

    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Project database not found")

    import sqlite3
    proj_conn = sqlite3.connect(db_path)
    proj_cursor = proj_conn.cursor()
    proj_cursor.execute("SELECT chapter_id FROM Chapters ORDER BY chapter_id")
    rows = proj_cursor.fetchall()
    proj_conn.close()

    chapters = [row[0] for row in rows]
    return {"chapters": chapters}


@app.get("/api/chapters/{chapter_id}/text")
def get_chapter_text(chapter_id: str):
    global current_project_db_conn
    if not current_project_db_conn:
        raise HTTPException(status_code=400, detail="No project opened. Call /api/projects/open first.")

    cursor = current_project_db_conn.cursor()

    cursor.execute('''
        SELECT id, chapter_id, source_text, target_text, status, version
        FROM Chapters
        WHERE chapter_id = ?
    ''', (chapter_id,))

    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return {
        "id": row["id"],
        "chapter_id": row["chapter_id"],
        "source_text": row["source_text"],
        "target_text": row["target_text"],
        "status": row["status"],
        "version": row["version"]
    }

@app.put("/api/chapters/{chapter_id}/text")
def update_chapter_text(chapter_id: str, request: UpdateChapterRequest):
    global current_project_db_conn
    if not current_project_db_conn:
        raise HTTPException(status_code=400, detail="No project opened. Call /api/projects/open first.")

    try:
        new_version = save_chapter(
            current_project_db_conn,
            chapter_id,
            request.target_text,
            request.version,
            request.status
        )
        return {"status": "success", "message": "Chapter updated", "new_version": new_version}
    except ValueError as e:
        if "Conflict" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        elif "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/tm/search")
def tm_search(req: TMSearchRequest):
    conn = init_global_db()
    cursor = conn.cursor()
    # FTS5 search. Join with tm_units to get target_text because FTS table only indexes source_text
    cursor.execute('''
        SELECT tm_units.source_text, tm_units.target_text
        FROM tm_fts
        JOIN tm_units ON tm_fts.rowid = tm_units.id
        WHERE tm_fts MATCH ?
        LIMIT ?
    ''', (f'"{req.query}"*', req.limit))

    rows = cursor.fetchall()
    conn.close()

    results = [{"source_text": r[0], "target_text": r[1]} for r in rows]
    return {"status": "success", "results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
