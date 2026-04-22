import requests
import time
import os

API_KEY = "sk_dg7fxnnrm3ify0qptfqlkb6dasb5jsrg3dbtzw82u4a7vqb2"
# Standard ElevenLabs Bella voice (Multilingual)
FALLBACK_VOICE_ID = "EXAVITQu4vr4xnNLXvf7" 
BASE_URL = f"https://api.ai33.pro/v1/text-to-speech/{FALLBACK_VOICE_ID}?output_format=mp3_44100_128"

PHRASES = {
    "intro": "Hoi Jonas! Kies je favoriete held om te beginnen.",
    "well_done": "Goed zo!",
    "congrats": "Gefeliciteerd Jonas! Je heb je naam geschreven! Je bent een echte held!",
    "J": "Schrijf nu de letter Jee.",
    "O": "Goed zo! Nu de letter Oh.",
    "N": "Super! Nu de letter En.",
    "A": "Bijna klaar! Nu de letter Ah.",
    "S": "De laatste letter! De Es."
}

ASSETS_DIR = "/Users/gebruiker/.gemini/antigravity/scratch/game/assets"

def generate_audio(text, key):
    out_path = os.path.join(ASSETS_DIR, f"{key}.mp3")
    if os.path.exists(out_path):
        return

    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_setting": {
            "vol": 1,
            "pitch": 0,
            "speed": 1
        },
        "language_boost": "Dutch"
    }

    headers = {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY
    }

    try:
        resp = requests.post(BASE_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            print(f"Error {key}: {resp.status_code}")
            return

        task_id = resp.json().get("task_id")
        while True:
            poll = requests.get(f"https://api.ai33.pro/v1/task/{task_id}", headers={"xi-api-key": API_KEY}).json()
            if poll.get("status") == "done":
                audio_url = poll.get("metadata", {}).get("audio_url")
                with open(out_path, "wb") as f:
                    f.write(requests.get(audio_url).content)
                print(f"Generated {key}.mp3")
                break
            elif poll.get("status") == "error":
                print(f"Error task {key}: {poll.get('error_message')}")
                break
            time.sleep(2)
    except:
        pass

if __name__ == "__main__":
    for k, v in PHRASES.items():
        generate_audio(v, k)
