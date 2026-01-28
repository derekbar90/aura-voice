import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import tts_server

@pytest.fixture
def client():
    # We want to avoid the lifespan logic during simple unit tests if possible,
    # or at least mock the model loading within it.
    with patch("tts_server.load_model") as mock_load:
        mock_load.return_value = MagicMock()
        with TestClient(tts_server.app) as c:
            yield c

def test_health_check_ready(client):
    # Manually set model_instance to simulate a loaded model
    with patch("tts_server.model_instance", MagicMock()):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ready", "model": tts_server.MODEL_ID}

def test_health_check_not_ready():
    # Test without the client fixture to avoid lifespan loading the model
    # and ensuring model_instance is None
    with patch("tts_server.model_instance", None):
        client = TestClient(tts_server.app)
        response = client.get("/health")
        assert response.status_code == 503
        assert response.json()["detail"] == "Model not loaded"

def test_lifespan_loading():
    with patch("tts_server.load_model") as mock_load:
        mock_load.return_value = MagicMock()
        # Using TestClient as a context manager triggers lifespan events
        with TestClient(tts_server.app):
            mock_load.assert_called_once_with(tts_server.MODEL_ID)
