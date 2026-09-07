import json
import subprocess

from common import FRAMES_DIR, TARGET_FRAMES, list_videos, racers_from_args, reset_racer_dirs


def video_duration(path) -> float:
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    duration = float(json.loads(probe.stdout)["format"]["duration"])
    if duration <= 0:
        raise RuntimeError(f"Invalid video duration: {duration}")
    return duration


def extract_one(video, out_dir) -> None:
    fps = TARGET_FRAMES / video_duration(video)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video),
            "-vf",
            f"fps={fps:.8f}",
            "-frames:v",
            str(TARGET_FRAMES),
            str(out_dir / "frame_%05d.png"),
        ],
        check=True,
    )
    pngs = list(out_dir.glob("*.png"))
    print(f"  {video.name} → {out_dir.name}: {len(pngs)} кадров")


def main(racers: tuple[str, ...] | None = None) -> None:
    selected = racers or racers_from_args()
    videos = list_videos(selected)
    reset_racer_dirs(FRAMES_DIR, selected)
    for racer, video in zip(selected, videos):
        print(f"Extract {racer}: {video.name}")
        extract_one(video, FRAMES_DIR / racer)


if __name__ == "__main__":
    main()
