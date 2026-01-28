import os
import pytest
from unittest.mock import patch, MagicMock, mock_open
from fastapi.testclient import TestClient

def test_hf_hub_offline_env():
    # Verify that the environment variable from pyproject.toml is active
    assert os.environ.get("HF_HUB_OFFLINE") == "1"

@patch("tts_server.load_model")
@patch("tts_server.generate_audio")
@patch("pathlib.Path.glob")
@patch("builtins.open", new_callable=mock_open, read_data=b"fake audio")
def test_synthesize_endpoint_calls_generate(mock_file, mock_glob, mock_generate, mock_load):
    import tts_server
    from tts_server import app
    
    # Mock model
    mock_model = MagicMock()
    mock_load.return_value = mock_model
    
    # Mock glob to return a Path-like object
    mock_path = MagicMock()
    mock_path.name = "gen_123.wav"
    mock_glob.return_value = [mock_path]
    
    # Mock the global model_instance
    with patch("tts_server.model_instance", mock_model):
        client = TestClient(app)
        payload = {
            "text": "test text",
            "output_path": "/tmp",
            "file_prefix": "prefix"
        }
        # We need to ensure the executor finishes. TestClient should handle this.
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 200
        assert response.content == b"fake audio"
        assert mock_generate.called
