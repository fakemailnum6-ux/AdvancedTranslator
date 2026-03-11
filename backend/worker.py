import os
import time
import json
import sqlite3
from rapidfuzz import process, fuzz
from backend.providers import get_provider
from backend.database import init_global_db, init_project_db, GLOBAL_DB_PATH

def run_cascade_translation(project_path: str, source_lang: str, target_lang: str):
    """
    Background worker that performs:
    1. Exact TM Match
    2. Fuzzy TM Match
    3. Machine Translation
    """
    # Initialize connections
    global_conn = init_global_db()
    proj_conn = init_project_db(project_path)

    global_cursor = global_conn.cursor()
    proj_cursor = proj_conn.cursor()

    # Load all TM units into memory for fuzzy matching (could be optimized with FTS5 search instead)
    global_cursor.execute("SELECT source_text, target_text FROM tm_units WHERE source_lang=? AND target_lang=?", (source_lang, target_lang))
    tm_data = global_cursor.fetchall()

    # Extract source texts for fuzzy matching
    tm_sources = {row[0]: row[1] for row in tm_data}
    tm_source_list = list(tm_sources.keys())

    # Get all NEW chapters
    proj_cursor.execute("SELECT chapter_id, source_text, version FROM Chapters WHERE status='NEW'")
    chapters = proj_cursor.fetchall()

    if not chapters:
        return

    mt_texts_to_translate = []
    mt_chapter_map = [] # stores chapter ids to update later

    for chapter_id, source_text, version in chapters:
        # Step 1: Exact Match
        if source_text in tm_sources:
            target_text = tm_sources[source_text]
            proj_cursor.execute('''
                UPDATE Chapters
                SET target_text=?, status='TRANSLATED', version=version+1, updated_at=CURRENT_TIMESTAMP
                WHERE chapter_id=? AND version=?
            ''', (target_text, chapter_id, version))
            continue

        # Step 2: Fuzzy Match (RapidFuzz)
        if tm_source_list:
            # We look for a high match
            match = process.extractOne(source_text, tm_source_list, scorer=fuzz.ratio)
            if match and match[1] >= 85:
                matched_source = match[0]
                target_text = tm_sources[matched_source]
                proj_cursor.execute('''
                    UPDATE Chapters
                    SET target_text=?, status='DRAFT', version=version+1, updated_at=CURRENT_TIMESTAMP
                    WHERE chapter_id=? AND version=?
                ''', (target_text, chapter_id, version))
                continue

        # Step 3: MT Fallback
        mt_texts_to_translate.append(source_text)
        mt_chapter_map.append((chapter_id, version))

    # Execute database updates for TM matches
    proj_conn.commit()

    # Step 3 Execution: MT Provider API Call
    if mt_texts_to_translate:
        try:
            # Get dummy provider for now
            mt_provider = get_provider("dummy")

            # Note: translate is async but we are in a sync thread. For this boilerplate we can use asyncio.run
            import asyncio
            mt_results = asyncio.run(mt_provider.translate(mt_texts_to_translate, source_lang, target_lang, {}))

            # Save MT results back
            for i, target_text in enumerate(mt_results):
                chapter_id, version = mt_chapter_map[i]
                proj_cursor.execute('''
                    UPDATE Chapters
                    SET target_text=?, status='AI_TRANSLATED', version=version+1, updated_at=CURRENT_TIMESTAMP
                    WHERE chapter_id=? AND version=?
                ''', (target_text, chapter_id, version))
            proj_conn.commit()

        except Exception as e:
            print(f"MT Worker failed: {e}")

    global_conn.close()
    proj_conn.close()

def worker_loop():
    """
    Main worker loop that polls the Projects database for Jobs.
    We iterate over all projects in the global DB and check their Jobs table.
    """
    print("Worker started. Polling for jobs...")
    while True:
        try:
            # Connect to global db to find all projects
            if not os.path.exists(GLOBAL_DB_PATH):
                time.sleep(1)
                continue

            global_conn = sqlite3.connect(GLOBAL_DB_PATH)
            global_cursor = global_conn.cursor()

            # Get all projects
            try:
                global_cursor.execute("SELECT id, path, source_lang, target_lang FROM Projects")
                projects = global_cursor.fetchall()
            except sqlite3.OperationalError:
                # Table might not exist yet
                projects = []

            global_conn.close()

            for proj_id, proj_path, source_lang, target_lang in projects:
                proj_db_path = os.path.join(proj_path, "project.sqlite")
                if not os.path.exists(proj_db_path):
                    continue

                proj_conn = sqlite3.connect(proj_db_path)
                proj_cursor = proj_conn.cursor()

                try:
                    # Find pending jobs
                    proj_cursor.execute("SELECT id, task_type, payload FROM Jobs WHERE status = 'PENDING' LIMIT 1")
                    job = proj_cursor.fetchone()

                    if job:
                        job_id, task_type, payload_json = job

                        # Mark as processing
                        proj_cursor.execute("UPDATE Jobs SET status = 'PROCESSING' WHERE id = ?", (job_id,))
                        proj_conn.commit()

                        try:
                            payload = json.loads(payload_json)
                            if task_type == 'translate-chapter':
                                # Run translation
                                run_cascade_translation(proj_path, source_lang, target_lang)

                            # Mark as completed
                            proj_cursor.execute("UPDATE Jobs SET status = 'COMPLETED' WHERE id = ?", (job_id,))
                            proj_conn.commit()

                        except Exception as e:
                            # Mark as failed
                            proj_cursor.execute("UPDATE Jobs SET status = 'FAILED', error_log = ? WHERE id = ?", (str(e), job_id))
                            proj_conn.commit()
                            print(f"Job {job_id} failed: {e}")

                except sqlite3.OperationalError:
                    pass
                finally:
                    proj_conn.close()

        except Exception as e:
            print(f"Worker loop error: {e}")

        time.sleep(1)

if __name__ == "__main__":
    worker_loop()
