import io
import os
import sys
import time
import logging
import asyncio
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import soundfile as sf
import numpy as np

from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("tts-server")

MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit"
model_instance = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    global model_instance
    logger.info(f"Loading model: {MODEL_ID}...")
    start_time = time.time()
    try:
        # Load the model once
        model_instance = load_model(MODEL_ID)
        logger.info(f"Model loaded successfully in {time.time() - start_time:.2f}s")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

    yield

    # Shutdown logic (cleanup if needed)
    logger.info("Shutting down TTS server...")
    model_instance = None


app = FastAPI(title="Qwen3 TTS Sidecar Server", lifespan=lifespan)


class TtsRequest(BaseModel):
    text: str
    output_path: str
    file_prefix: str
    voice: Optional[str] = None
    speed: Optional[float] = 1.0
    pitch: Optional[float] = 1.0
    gender: Optional[str] = None
    instruct: Optional[str] = None
    ref_audio: Optional[str] = None
    ref_text: Optional[str] = None
    exaggeration: Optional[float] = 1.0
    cfg_scale: Optional[float] = 1.0
    ddpm_steps: Optional[int] = 30


@app.get("/health")
async def health_check():
    if model_instance is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ready", "model": MODEL_ID}


@app.post("/stream")
async def stream_speech(req: TtsRequest):
    if model_instance is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    def generate_chunks():
        try:
            # Prepare arguments
            gen_kwargs = dict(
                text=req.text,
                voice=req.voice if req.voice else "af_heart",
                speed=req.speed if req.speed else 1.0,
                cfg_scale=req.cfg_scale if req.cfg_scale else 1.5,
                ddpm_steps=req.ddpm_steps if req.ddpm_steps else 20,
                stream=True,
                instruct=req.instruct,
            )

            if req.ref_audio:
                from mlx_audio.tts.generate import load_audio

                gen_kwargs["ref_audio"] = load_audio(
                    req.ref_audio, sample_rate=model_instance.sample_rate
                )
                gen_kwargs["ref_text"] = req.ref_text

            logger.info(f"Starting model generation for: {req.text[:20]}...")

            # This needs to be a real generator
            for result in model_instance.generate(**gen_kwargs):
                audio_data = np.array(result.audio).astype(np.float32)
                yield audio_data.tobytes()

        except Exception as e:
            logger.error(f"Streaming generator error: {e}")

    return StreamingResponse(generate_chunks(), media_type="application/octet-stream")


@app.post("/generate")
async def synthesize(req: TtsRequest):
    if model_instance is None:
        raise HTTPException(status_code=503, detail="Model not initialized")

    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        steps = req.ddpm_steps if req.ddpm_steps else 20
        temp_prefix = f"gen_{int(time.time() * 1000)}"
        temp_path = Path(req.output_path)

        kwargs = {
            "model": model_instance,
            "text": req.text,
            "output_path": str(temp_path),
            "file_prefix": temp_prefix,
            "audio_format": "wav",
            "verbose": False,
            "ddpm_steps": steps,
        }

        if req.voice:
            kwargs["voice"] = req.voice
        if req.instruct:
            kwargs["instruct"] = req.instruct
        if req.gender:
            kwargs["gender"] = req.gender
        if req.ref_audio:
            kwargs["ref_audio"] = req.ref_audio
        if req.ref_text:
            kwargs["ref_text"] = req.ref_text
        if req.speed:
            kwargs["speed"] = float(req.speed)
        if req.pitch:
            kwargs["pitch"] = float(req.pitch)
        if req.exaggeration:
            kwargs["exaggeration"] = float(req.exaggeration)
        if req.cfg_scale:
            kwargs["cfg_scale"] = float(req.cfg_scale)

        # Execute generation
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: generate_audio(**kwargs))

        # Find and read the file into memory
        matches = sorted(temp_path.glob(f"{temp_prefix}*.wav"))
        if not matches:
            raise Exception("No audio file was generated")

        audio_file = matches[0]
        with open(audio_file, "rb") as f:
            audio_bytes = f.read()

        # Cleanup
        try:
            os.remove(audio_file)
        except:
            pass

        return Response(content=audio_bytes, media_type="audio/wav")

    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.environ.get("TTS_PORT", 8000))
    logger.info(f"Starting TTS server on port {port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
