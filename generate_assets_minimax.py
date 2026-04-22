import requests
import time
import os

API_KEY = "sk_dg7fxnnrm3ify0qptfqlkb6dasb5jsrg3dbtzw82u4a7vqb2"
VOICE_ID = "226905123659932"
# Note the 'v1m' in the URL for Minimax
BASE_URL = "https://api.ai33.pro/v1m/task/text-to-speech"

PHRASES = {
    "intro": "Hoi Jonas! Kies je favoriete held om te beginnen.",
    "well_done": "Goed zo!",
    "congrats": "Gefeliciteerd Jonas! Je hebt je naam geschreven! Je bent een echte held!",
    "J": "Schrijf nu de letter Jee.",
    "O": "Goed zo! Nu de letter Oh.",
    "N": "Super! Nu de letter En.",
    "A": "Bijna klaar! Nu de letter Ah.",
    "S": "De laatste letter! De Es.",
    "oeps": "Oeps! Weer opnieuw."
}

ASSETS_DIR = "/Users/gebruiker/.gemini/antigravity/scratch/game/assets"

def generate_audio_minimax(text, key):
    out_path = os.path.join(ASSETS_DIR, f"{key}.mp3")
    # We always overwrite to ensure we use the correct Minimax voice now
    
    payload = {
        "text": text,
        "model": "speech-2.6-hd",
        "voice_setting": {
            "voice_id": VOICE_ID,
            "vol": 1.1, # Slightly louder for kids
            "pitch": 0,
            "speed": 1
        },
        "language_boost": "Dutch"
    }

    headers = {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY
    }

    print(f"Generating Minimax audio for '{key}': {text}")
    try:
        resp = requests.post(BASE_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            print(f"Error POSTing for {key}: {resp.status_code} - {resp.text}")
            return

        task_id = resp.json().get("task_id")
        if not task_id:
            print(f"No task ID for {key}")
            return

        # Polling endpoint seems to be v1
        poll_url = f"https://api.ai33.pro/v1/task/{task_id}"
        attempts = 0
        while attempts < 40:
            poll_resp = requests.get(poll_url, headers={"xi-api-key": API_KEY})
            data = poll_resp.json()
            status = data.get("status")
            if status == "done":
                audio_url = data.get("metadata", {}).get("audio_url")
                audio_data = requests.get(audio_url).content
                with open(out_path, "wb") as f:
                    f.write(audio_data)
                print(f"Successfully saved {key}.mp3 using Minimax")
                return
            elif status == "error":
                print(f"Task error for {key}: {data.get('error_message')}")
                return
            
            time.sleep(3)
            attempts += 1
        print(f"Timed out waiting for {key}")
    except Exception as e:
        print(f"Exception for {key}: {e}")

if __name__ == "__main__":
    if not os.path.exists(ASSETS_DIR):
        os.makedirs(ASSETS_DIR)
        
    for key, text in PHRASES.items():
        generate_audio_minimax(text, key)
        time.sleep(1) # Gap
