import argparse
import os
import sys
from pathlib import Path
import mlx.core as mx
import soundfile as sf
from mlx_audio.tts import utils, generate


def patch_load_model():
    old_load_model = utils.load_model

    def new_load_model(*args, **kwargs):
        kwargs["strict"] = False
        return old_load_model(*args, **kwargs)

    utils.load_model = new_load_model


def main():
    parser = argparse.ArgumentParser(
        description="Generate TTS using mlx-audio and Qwen3"
    )
    parser.add_argument("text", help="The text to convert to speech")
    parser.add_argument("--output", default="output.wav", help="Output file name")
    args = parser.parse_args()

    model_path = "./Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16"

    # Patch the utility to allow non-strict loading (ignore extra weights)
    patch_load_model()

    print(f"Generating audio for: '{args.text}'...")

    # Use the generate_audio function from mlx_audio.tts.generate
    # It will use our patched load_model
    generate.generate_audio(
        model=model_path,
        text=args.text,
        file_prefix=args.output.replace(".wav", ""),
        audio_format="wav",
        verbose=True,
    )

    print(f"Process complete. Check for {args.output}")


if __name__ == "__main__":
    main()
