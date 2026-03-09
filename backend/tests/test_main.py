from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "CAT-Tool Backend is running."}

def test_get_segments():
    response = client.get("/api/chapters/ch1/segments?offset=0&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 5
    assert data["items"][0]["status"] == "NEW"

def test_update_segment():
    payload = {
        "target_text": "Новый перевод",
        "status": "EDITED",
        "version": 1,
        "inline_tags": {"1": {"prefix": "<b>", "suffix": "</b>"}}
    }
    response = client.put("/api/segments/seg_1", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["new_version"] == 2
