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

from .database import init_global_db, init_project_db, save_segment, GLOBAL_DB_PATH
from .nlp import segment_text

# Models for the API requests
class ImportEpubRequest(BaseModel):
    file_path: str
    source_lang: str
    target_lang: str
    project_name: str

class OpenProjectRequest(BaseModel):
    project_id: str

class UpdateSegmentRequest(BaseModel):
    target_text: str
    status: str
    version: int
    inline_tags: Dict[str, Any]

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

                # NLP segmentation
                segments = segment_text(html_content)

                # Insert segments
                for i, seg in enumerate(segments):
                    seg_id = f"{chapter_id}_{i}"
                    proj_cursor.execute('''
                        INSERT INTO Segments (id, chapter_id, segment_index, source_text, target_text, status, inline_tags, version)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        seg_id,
                        chapter_id,
                        seg["segment_index"],
                        seg["source_text"],
                        "", # Target is empty initially
                        "NEW",
                        json.dumps(seg.get("inline_tags", {})),
                        1
                    ))
        proj_conn.commit()
    except Exception as e:
        proj_conn.close()
        raise HTTPException(status_code=500, detail=str(e))

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

@app.get("/api/chapters/{chapter_id}/segments")
def get_segments(chapter_id: str, offset: int = 0, limit: int = 50):
    global current_project_db_conn
    if not current_project_db_conn:
        raise HTTPException(status_code=400, detail="No project opened. Call /api/projects/open first.")

    cursor = current_project_db_conn.cursor()

    # Get total count
    cursor.execute("SELECT COUNT(*) FROM Segments WHERE chapter_id = ?", (chapter_id,))
    total = cursor.fetchone()[0]

    # Get chunk
    cursor.execute('''
        SELECT id, chapter_id, segment_index, source_text, target_text, inline_tags, status, version
        FROM Segments
        WHERE chapter_id = ?
        ORDER BY segment_index ASC
        LIMIT ? OFFSET ?
    ''', (chapter_id, limit, offset))

    rows = cursor.fetchall()

    segments = []
    for row in rows:
        segments.append({
            "id": row["id"],
            "chapter_id": row["chapter_id"],
            "segment_index": row["segment_index"],
            "source_text": row["source_text"],
            "target_text": row["target_text"],
            "inline_tags": json.loads(row["inline_tags"]),
            "status": row["status"],
            "version": row["version"]
        })

    return {"items": segments, "total": total}

@app.put("/api/segments/{segment_id}")
def update_segment(segment_id: str, request: UpdateSegmentRequest):
    global current_project_db_conn
    if not current_project_db_conn:
        raise HTTPException(status_code=400, detail="No project opened. Call /api/projects/open first.")

    try:
        new_version = save_segment(
            current_project_db_conn,
            segment_id,
            request.target_text,
            request.version,
            request.status,
            request.inline_tags
        )
        return {"status": "success", "message": "Segment updated", "new_version": new_version}
    except ValueError as e:
        if "Conflict" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        elif "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
