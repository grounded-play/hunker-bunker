import os
import json
from mutagen.id3 import ID3, TIT2, TPE1, TPE2, TALB, TRCK, TPOS, TDRC, TCON, TCOM, TPUB, TCOP, COMM, APIC, ID3NoHeaderError

def embed_tags_in_dist():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(repo_root, "dist_soundtrack")
    config_path = os.path.join(repo_root, "public", "audio", "soundtrack-config.json")
    cover_jpg = os.path.join(repo_root, "steam", "store", "soundtrack", "album_cover_1000x1000.jpg")
    cover_png = os.path.join(dist_dir, "cover.png")
    
    cover_to_use = cover_jpg if os.path.exists(cover_jpg) else cover_png

    if not os.path.exists(config_path):
        print(f"Config not found at {config_path}")
        return

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    tracks = config.get("legacy_tracks", []) + config.get("tracks", [])
    total_tracks = len(tracks)

    for track_num, track in enumerate(tracks, start=1):
        num_str = str(track_num).zfill(2)
        clean_title = "".join(c for c in track["title"] if c.isalnum() or c in " -_()")
        filename = f"{num_str} - {clean_title}.mp3"
        mp3_path = os.path.join(dist_dir, filename)

        if not os.path.exists(mp3_path):
            print(f"File not found: {mp3_path}")
            continue

        try:
            audio = ID3(mp3_path)
        except ID3NoHeaderError:
            audio = ID3()

        audio.delete()

        audio.add(TIT2(encoding=3, text=track["title"]))
        audio.add(TPE1(encoding=3, text=config.get("artist", "Government Name")))
        audio.add(TPE2(encoding=3, text=config.get("album_artist", config.get("artist", "Government Name"))))
        audio.add(TALB(encoding=3, text=config.get("album", "Hunker Bunker (Original Game Soundtrack)")))
        audio.add(TRCK(encoding=3, text=f"{track_num}/{total_tracks}"))
        audio.add(TPOS(encoding=3, text="1/1"))
        audio.add(TDRC(encoding=3, text=str(config.get("year", "2026"))))
        audio.add(TCON(encoding=3, text=config.get("genre", "Soundtrack / Industrial Ambient / Chiptune")))
        audio.add(TCOM(encoding=3, text=config.get("composer", config.get("artist", "Government Name"))))
        audio.add(TPUB(encoding=3, text=config.get("publisher", "Tuesday Cinema Club")))
        audio.add(TCOP(encoding=3, text=config.get("copyright", "© 2026 Tuesday Cinema Club")))
        audio.add(COMM(encoding=3, lang="eng", desc="Description", text=track.get("description", "")))

        if os.path.exists(cover_to_use):
            mime = "image/jpeg" if cover_to_use.endswith(".jpg") or cover_to_use.endswith(".jpeg") else "image/png"
            with open(cover_to_use, "rb") as img_f:
                audio.add(APIC(
                    encoding=3,
                    mime=mime,
                    type=3,  # 3 is Cover (front)
                    desc="Cover Art",
                    data=img_f.read()
                ))

        audio.save(mp3_path, v2_version=3)
        print(f"Embedded full ID3 metadata & artwork: {filename}")

if __name__ == "__main__":
    embed_tags_in_dist()
