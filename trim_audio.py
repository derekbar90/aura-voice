import sys
import soundfile as sf

def main():
    if len(sys.argv) != 4:
        print("Usage: trim_audio.py <generated_file> <reference_file> <output_file>")
        sys.exit(1)

    gen_path = sys.argv[1]
    ref_path = sys.argv[2]
    out_path = sys.argv[3]

    try:
        # Load reference to get duration
        ref_info = sf.info(ref_path)
        ref_duration = ref_info.duration

        # Load generated audio
        gen_data, samplerate = sf.read(gen_path)
        
        # Calculate start sample
        start_sample = int(ref_duration * samplerate)
        
        if start_sample >= len(gen_data):
            print("Warning: Reference is longer than generated audio. Returning full audio.")
            sf.write(out_path, gen_data, samplerate)
            return

        # Slice
        trimmed_data = gen_data[start_sample:]
        
        # Save
        sf.write(out_path, trimmed_data, samplerate)
        print(f"Trimmed {ref_duration:.2f}s from start.")

    except Exception as e:
        print(f"Error trimming audio: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
