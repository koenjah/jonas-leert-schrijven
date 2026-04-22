import requests
import time
import os
import sys

API_KEY = "sk_dg7fxnnrm3ify0qptfqlkb6dasb5jsrg3dbtzw82u4a7vqb2"
VOICE_ID = "226905123659932"
BASE_URL = "https://api.ai33.pro/v1m/task/text-to-speech"

PHRASES = {
    # Letters (generic, used by all names)
    "A": "De letter Ah!",
    "E": "De letter Ee!",
    "F": "De letter Ef!",
    "H": "De letter Haa!",
    "I": "De letter Ie!",
    "J": "De letter Jee!",
    "K": "De letter Kaa!",
    "L": "De letter El!",
    "N": "De letter En!",
    "O": "De letter Oh!",
    "R": "De letter Er!",
    "S": "De letter Es!",
    "T": "De letter Tee!",
    "V": "De letter Vee!",

    # Shared feedback
    "well_done": "Goed zo!",
    "oeps": "Oeps! Probeer het nog eens.",

    # Name announcements
    "name_jonas":  "We schrijven jouw naam: Jonas!",
    "name_esther": "We schrijven de naam van mama: Esther!",
    "name_koen":   "We schrijven de naam van papa: Koen!",
    "name_vera":   "We schrijven de naam van zusje: Vera!",
    "name_floris": "We schrijven de naam van baby broertje: Floris!",

    # Congratulations per name
    "congrats_jonas":  "Gefeliciteerd Jonas! Je hebt jouw naam geschreven! Je bent een echte ster!",
    "congrats_esther": "Wauw! Je hebt mama's naam geschreven: Esther! Goed gedaan!",
    "congrats_koen":   "Geweldig! Je hebt papa's naam geschreven: Koen!",
    "congrats_vera":   "Super! Je hebt de naam van zusje Vera geschreven!",
    "congrats_floris": "Fantastisch! Je hebt Floris geschreven! Dat is je baby broertje!",

    # Memory game
    "memory_intro": "Zoek de kaarten die bij elkaar horen!",
    "memory_match": "Goed gevonden! Die passen bij elkaar!",

    # Train game
    "train_intro": "Tik de letters in de goede volgorde!",
    "train_win":   "Geweldig! Je hebt de naam goed gespeld!",
}

ASSETS_DIR = "/Users/gebruiker/.gemini/antigravity/scratch/game/assets"

def generate_audio(text, key):
    out_path = os.path.join(ASSETS_DIR, f"{key}.mp3")

    payload = {
        "text": text,
        "model": "speech-2.6-hd",
        "voice_setting": {"voice_id": VOICE_ID, "vol": 1.1, "pitch": 0, "speed": 1},
        "language_boost": "Dutch"
    }
    headers = {"Content-Type": "application/json", "xi-api-key": API_KEY}

    print(f"Generating [{key}]: {text}")
    try:
        resp = requests.post(BASE_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            print(f"  ERROR {resp.status_code}: {resp.text}")
            return False

        task_id = resp.json().get("task_id")
        if not task_id:
            print(f"  No task_id returned")
            return False

        poll_url = f"https://api.ai33.pro/v1/task/{task_id}"
        for _ in range(40):
            time.sleep(3)
            data = requests.get(poll_url, headers={"xi-api-key": API_KEY}).json()
            status = data.get("status")
            if status == "done":
                audio_url = data["metadata"]["audio_url"]
                audio_bytes = requests.get(audio_url).content
                with open(out_path, "wb") as f:
                    f.write(audio_bytes)
                print(f"  ✓ {key}.mp3 saved ({len(audio_bytes)} bytes)")
                return True
            elif status == "error":
                print(f"  Task error: {data.get('error_message')}")
                return False
        print(f"  Timed out for {key}")
    except Exception as e:
        print(f"  Exception: {e}")
    return False

if __name__ == "__main__":
    os.makedirs(ASSETS_DIR, exist_ok=True)
    force = "--force" in sys.argv

    total = len(PHRASES)
    done = 0
    skipped = 0

    for key, text in PHRASES.items():
        out_path = os.path.join(ASSETS_DIR, f"{key}.mp3")
        if not force and os.path.exists(out_path):
            print(f"  Skipping {key}.mp3 (exists, use --force to overwrite)")
            skipped += 1
            continue
        success = generate_audio(text, key)
        if success:
            done += 1
        time.sleep(1)

    print(f"\nDone: {done} generated, {skipped} skipped, {total - done - skipped} failed")
