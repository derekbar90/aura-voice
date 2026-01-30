from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model
import os

# Data from voices.json for "asd"
REF_AUDIO = "/Users/derekbarrera/Library/Application Support/menubar-tts/custom_voices/1769565081713_recording.wav"
REF_TEXT = "I enjoy reading about the history of space exploration."
TEXT = "Hello, this is a test. This application is designed to read content to you in a clear, natural voice. Enjoy the experience."
OUTPUT_DIR = "debug_output"
MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16"

os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Checking reference audio: {REF_AUDIO}")
if not os.path.exists(REF_AUDIO):
    print("ERROR: Reference audio file not found!")
    exit(1)

# Check file size to ensure it's not silent/empty
size = os.path.getsize(REF_AUDIO)
print(f"Reference audio size: {size} bytes")
if size < 1000:
    print("WARNING: Audio file seems very small.")

print("Loading model...")
model = load_model(MODEL_ID)

print("Generating audio with cloning parameters...")
try:
    generate_audio(
        model=model,
        text=TEXT,
        ref_audio=REF_AUDIO,
        output_path=OUTPUT_DIR,
        file_prefix="verify_clone_asd_no_ref_text",
        audio_format="wav",
        verbose=True,
    )
    print(
        f"Generation complete. Check {OUTPUT_DIR}/verify_clone_asd_no_ref_text_000.wav"
    )
except Exception as e:
    print(f"Generation failed: {e}")
