import argparse
import os
import sys
from pathlib import Path
import mlx.core as mx
import soundfile as sf
from mlx_audio.tts import utils
from mlx_audio.tts.models.qwen3.qwen3 import Model, ModelConfig

def main():
    parser = argparse.ArgumentParser(description="Generate TTS using mlx-audio and Qwen3")
    parser.add_argument("text", help="The text to convert to speech")
    parser.add_argument("--output", default="output.wav", help="Output file name")
    args = parser.parse_args()

    model_path = "./Qwen3-TTS-12Hz-0.6B-Base-6bit"
    
    print(f"Loading model from {model_path} (non-strict)...")
    # load_model internally handles the remapping if we updated config.json
    model = utils.load_model(model_path, strict=False)
    
    # Post load hook for tokenizer
    model = model.__class__.post_load_hook(model, model_path)
    
    print(f"Generating audio for: '{args.text}'...")
    results = model.generate(
        text=args.text,
        voice="default",
        verbose=True
    )
    
    for i, result in enumerate(results):
        output_file = args.output if i == 0 else f"{args.output.replace('.wav', '')}_{i}.wav"
        sf.write(output_file, result.audio, result.sample_rate)
        print(f"Saved to {output_file}")

if __name__ == "__main__":
    main()
