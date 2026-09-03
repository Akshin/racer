import glob
import json
import os
import shutil
import subprocess

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
OUT_DIR = os.path.join(os.path.dirname(__file__), "frames")
TARGET_FRAMES = 48


def main() -> None:
    if os.path.exists(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(OUT_DIR)

    videos = glob.glob(os.path.join(ASSETS_DIR, "*.mov"))
    if not videos:
        raise FileNotFoundError(f"No .mov files found in {ASSETS_DIR}")

    video = videos[0]
    print(f"Processing: {video}")

    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            video,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    duration = float(json.loads(probe.stdout)["format"]["duration"])
    if duration <= 0:
        raise RuntimeError(f"Invalid video duration: {duration}")

    fps = TARGET_FRAMES / duration

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            video,
            "-vf",
            f"fps={fps:.8f}",
            "-frames:v",
            str(TARGET_FRAMES),
            os.path.join(OUT_DIR, "frame_%05d.png"),
        ],
        check=True,
    )

    pngs = [f for f in os.listdir(OUT_DIR) if f.endswith(".png")]
    print(f"Done — {len(pngs)} frames saved to {OUT_DIR} (target: {TARGET_FRAMES})")


if __name__ == "__main__":
    main()
