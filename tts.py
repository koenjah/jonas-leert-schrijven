import requests
import time
import json
import os

API_KEY = "sk_dg7fxnnrm3ify0qptfqlkb6dasb5jsrg3dbtzw82u4a7vqb2"
VOICE_ID = "226905123659932"
url = f"https://api.ai33.pro/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128"
headers = {
    "Content-Type": "application/json",
    "xi-api-key": API_KEY
}

def generate_audio(text, out_path):
    # Just the exact payload from the app/user prompt
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

    print(f"POSTing task for: {text}")
    resp = requests.post(url, headers=headers, json=payload)
    if resp.status_code != 200:
        print("Error in POST:", resp.text)
        return
    
    task_id = resp.json().get("task_id")
    if not task_id:
        print("No task id in:", resp.text)
        return
    
    print(f"Task ID: {task_id}")
    
    poll_url = f"https://api.ai33.pro/v1/task/{task_id}"
    while True:
        poll_resp = requests.get(poll_url, headers={"xi-api-key": API_KEY})
        data = poll_resp.json()
        status = data.get("status")
        print(f"Status: {status}")
        if status == "done":
            audio_url = data.get("metadata", {}).get("audio_url")
            print(f"Audio URL: {audio_url}")
            audio_data = requests.get(audio_url).content
            with open(out_path, "wb") as f:
                f.write(audio_data)
            print("Saved to", out_path)
            break
        elif status == "error":
            print("Error in task:", data)
            break
        time.sleep(2)

if __name__ == "__main__":
    generate_audio("Hallo Jonas!", "/Users/gebruiker/.gemini/antigravity/scratch/game/assets/test3.mp3")

