import time
import tempfile
from pathlib import Path

import gradio as gr
from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model

import os

MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit"
VOICE_OPTIONS = ["", "Chelsie", "Ethan", "Vivian"]

_model = None


def get_model():
    global _model
    if _model is None:
        _model = load_model(MODEL_ID)
    return _model


def synthesize(
    text,
    voice,
    instruct,
    speed,
    pitch,
    gender,
    ref_audio,
    ref_text,
    exaggeration,
    cfg_scale,
    ddpm_steps,
):
    if not text or not text.strip():
        raise gr.Error("Text is required.")

    model = get_model()
    output_dir = Path(tempfile.gettempdir()) / "qwen3_tts"
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = f"qwen3_{int(time.time() * 1000)}"

    kwargs = {
        "model": model,
        "text": text,
        "file_prefix": prefix,
        "output_path": str(output_dir),
        "audio_format": "wav",
    }

    if voice:
        kwargs["voice"] = voice
    if instruct:
        kwargs["instruct"] = instruct
    if speed is not None:
        kwargs["speed"] = float(speed)
    if pitch is not None:
        kwargs["pitch"] = float(pitch)
    if gender:
        kwargs["gender"] = gender
    if ref_audio:
        kwargs["ref_audio"] = ref_audio
    if ref_text:
        kwargs["ref_text"] = ref_text
    if exaggeration is not None:
        kwargs["exaggeration"] = float(exaggeration)
    if cfg_scale is not None:
        kwargs["cfg_scale"] = float(cfg_scale)
    if ddpm_steps is not None:
        kwargs["ddpm_steps"] = int(ddpm_steps)

    generate_audio(**kwargs)

    matches = sorted(output_dir.glob(f"{prefix}*.wav"))
    if not matches:
        raise gr.Error("No audio file was generated.")
    return str(matches[0])


with gr.Blocks(title="Qwen3-TTS (mlx-audio)") as demo:
    gr.Markdown("# Qwen3-TTS local demo")

    with gr.Row():
        text = gr.Textbox(
            label="Text",
            lines=4,
            value="Hello, this is a test.",
        )
        audio_out = gr.Audio(label="Output", type="filepath")

    with gr.Row():
        voice = gr.Dropdown(
            label="Voice",
            choices=VOICE_OPTIONS,
            value="",
        )
        gender = gr.Dropdown(
            label="Gender",
            choices=["", "male", "female"],
            value="",
        )
        speed = gr.Slider(label="Speed", minimum=0.5, maximum=1.5, value=1.0, step=0.05)
        pitch = gr.Slider(label="Pitch", minimum=0.8, maximum=1.2, value=1.0, step=0.02)

    with gr.Row():
        instruct = gr.Textbox(
            label="Style / Instruction",
            placeholder="calm, warm, friendly",
        )
        ref_audio = gr.Audio(label="Reference audio (optional)", type="filepath")
        ref_text = gr.Textbox(
            label="Reference text (optional)",
            placeholder="What the reference audio says",
        )

    with gr.Row():
        exaggeration = gr.Slider(
            label="Exaggeration",
            minimum=0.0,
            maximum=2.0,
            value=1.0,
            step=0.1,
        )
        cfg_scale = gr.Slider(
            label="CFG scale",
            minimum=0.5,
            maximum=2.5,
            value=1.0,
            step=0.1,
        )
        ddpm_steps = gr.Slider(
            label="DDPM steps",
            minimum=10,
            maximum=60,
            value=30,
            step=1,
        )

    run = gr.Button("Generate")
    run.click(
        synthesize,
        inputs=[
            text,
            voice,
            instruct,
            speed,
            pitch,
            gender,
            ref_audio,
            ref_text,
            exaggeration,
            cfg_scale,
            ddpm_steps,
        ],
        outputs=audio_out,
    )

if __name__ == "__main__":
    demo.launch()
