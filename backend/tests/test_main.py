from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "CAT-Tool Backend is running."}

def test_get_chapter_no_project():
    response = client.get("/api/chapters/ch1/text")
    assert response.status_code == 400

def test_update_chapter_no_project():
    payload = {
        "target_text": "Новый перевод",
        "status": "EDITED",
        "version": 1
    }
    response = client.put("/api/chapters/ch1/text", json=payload)
    assert response.status_code == 400

def test_tm_search():
    # Setup global db
    from backend.database import init_global_db
    conn = init_global_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tm_units (source_text, target_text, source_lang, target_lang, project_id)
        VALUES ('Test sentence.', 'Тестовое предложение.', 'en', 'ru', 'uuid123')
    ''')
    conn.commit()
    conn.close()

    response = client.post("/api/tm/search", json={"query": "Test", "limit": 10})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["results"]) >= 1
    assert data["results"][0]["source_text"] == "Test sentence."
