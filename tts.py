import argparse
import os
import json
from pathlib import Path
import mlx.core as mx
import soundfile as sf
from mlx_audio.tts.models.qwen3.qwen3 import Model, ModelConfig


def main():
    parser = argparse.ArgumentParser(
        description="Generate TTS using mlx-audio and Qwen3"
    )
    parser.add_argument("text", help="The text to convert to speech")
    parser.add_argument("--output", default="output.wav", help="Output file name")
    args = parser.parse_args()

    model_path = Path("./Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16")

    print(f"Loading model from {model_path}...")
    with open(model_path / "config.json", "r") as f:
        config_dict = json.load(f)

    # Qwen3 model in mlx_audio expects the parameters from talker_config at the top level
    talker_config = config_dict.get("talker_config", {})
    for k, v in talker_config.items():
        if k not in config_dict:
            config_dict[k] = v

    # Manually ensure required fields for ModelConfig (which inherits from Qwen3ModelConfig)
    config_dict["tokenizer_name"] = str(model_path)
    config_dict["model_type"] = "qwen3"  # Force it to qwen3 for the internal logic
    if "tie_word_embeddings" not in config_dict:
        config_dict["tie_word_embeddings"] = False

    # Initialize config and model
    config = ModelConfig.from_dict(config_dict)
    model = Model(config)

    # Load weights
    print("Loading weights...")
    weights = {}
    for wf in model_path.glob("*.safetensors"):
        weights.update(mx.load(str(wf)))

    model.load_weights(list(weights.items()))
    mx.eval(model.parameters())

    # Post load hook for tokenizer
    model = Model.post_load_hook(model, model_path)

    print(f"Generating audio for: '{args.text}'...")
    results = model.generate(
        text=args.text,
        voice="default",  # Qwen3 might need a voice prefix or just text
        verbose=True,
    )

    for i, result in enumerate(results):
        output_file = (
            args.output if i == 0 else f"{args.output.replace('.wav', '')}_{i}.wav"
        )
        sf.write(output_file, result.audio, result.sample_rate)
        print(f"Saved to {output_file}")


if __name__ == "__main__":
    main()
