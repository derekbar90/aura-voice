import soundfile as sf
import numpy as np

FILE_PATH = "/Users/derekbarrera/Library/Application Support/menubar-tts/custom_voices/1769565081713_recording.wav"

try:
    data, samplerate = sf.read(FILE_PATH)
    print(f"Sample Rate: {samplerate}")
    print(f"Shape: {data.shape}")
    print(f"Max Amplitude: {np.max(np.abs(data))}")
    print(f"Mean Amplitude: {np.mean(np.abs(data))}")
    
    if np.max(np.abs(data)) < 0.01:
        print("WARNING: Audio is near silent!")
    else:
        print("Audio seems to have content.")
        
except Exception as e:
    print(f"Error reading file: {e}")
