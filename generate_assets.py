import requests
import time
import os

API_KEY = "sk_dg7fxnnrm3ify0qptfqlkb6dasb5jsrg3dbtzw82u4a7vqb2"
VOICE_ID = "226905123659932"
BASE_URL = f"https://api.ai33.pro/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128"

PHRASES = {
    "intro": "Hoi Jonas! Kies je favoriete held om te beginnen.",
    "well_done": "Goed zo!",
    "congrats": "Gefeliciteerd Jonas! Je heb je naam geschreven! Je bent een echte held!",
    "J": "Schrijf nu de letter J.",
    "O": "Nog eentje! De letter O.",
    "N": "Super! Nu de letter N.",
    "A": "Bijna klaar! De letter A.",
    "S": "De laatste letter! De S."
}

ASSETS_DIR = "/Users/gebruiker/.gemini/antigravity/scratch/game/assets"

def generate_audio(text, key):
    out_path = os.path.join(ASSETS_DIR, f"{key}.mp3")
    if os.path.exists(out_path):
        print(f"Skipping {key}, already exists.")
        return

    payload = {
        "text": text,
        "model": "speech-2.6-hd",
        "effects": {
            "robotic": False,
            "nasal_crisp": 0,
            "spacious_echo": False,
            "deepen_lighten": 0,
            "lofi_telephone": False,
            "auditorium_echo": False,
            "stronger_softer": 0
        },
        "audio_setting": {},
        "voice_setting": {
            "vol": 1,
            "pitch": 0,
            "speed": 1,
            "voice_id": VOICE_ID
        },
        "language_boost": "Dutch"
    }

    headers = {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY
    }

    print(f"Generating audio for '{key}': {text}")
    try:
        resp = requests.post(BASE_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            print(f"Error POSTing for {key}: {resp.status_code} - {resp.text}")
            return

        task_id = resp.json().get("task_id")
        if not task_id:
            print(f"No task ID for {key}")
            return

        poll_url = f"https://api.ai33.pro/v1/task/{task_id}"
        attempts = 0
        while attempts < 30:
            poll_resp = requests.get(poll_url, headers={"xi-api-key": API_KEY})
            data = poll_resp.json()
            status = data.get("status")
            if status == "done":
                audio_url = data.get("metadata", {}).get("audio_url")
                audio_data = requests.get(audio_url).content
                with open(out_path, "wb") as f:
                    f.write(audio_data)
                print(f"Successfully saved {key}.mp3")
                return
            elif status == "error":
                print(f"Task error for {key}: {data.get('error_message')}")
                return
            
            time.sleep(2)
            attempts += 1
        print(f"Timed out waiting for {key}")
    except Exception as e:
        print(f"Exception for {key}: {e}")

if __name__ == "__main__":
    for key, text in PHRASES.items():
        generate_audio(text, key)
        time.sleep(1) # Small gap between requests
