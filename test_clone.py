from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model
import os

# Using a VALID existing file
REF_AUDIO = "/Users/derekbarrera/Library/Application Support/menubar-tts/custom_voices/1769563889247_recording.wav"
REF_TEXT = "The quick brown fox jumps over the lazy dog." 
TEXT = "This is a test of voice cloning."

import os
os.environ["HF_HUB_OFFLINE"] = "1"
MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit"

print("Loading model...")
model = load_model(MODEL_ID)

print("Generating with voice='' ...")
output = generate_audio(
    model=model,
    text=TEXT,
    ref_audio=REF_AUDIO,
    ref_text=REF_TEXT,
    voice="", # TRY EMPTY STRING
    file_prefix="test_clone_empty_voice",
    output_path=".",
    audio_format="wav",
    verbose=True
)
print("Done. Output:", output)