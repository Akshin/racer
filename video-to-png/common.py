"""Общие пути и имена гонщиков для пайплайна video → PNG."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS_DIR = ROOT / "assets"
FRAMES_DIR = ROOT / "frames"
CROPPED_DIR = ROOT / "cropped"
NOBG_DIR = ROOT / "nobg"

RACERS = ("racer1", "racer2")
TARGET_FRAMES = 48
VIDEO_PATTERNS = ("*.mp4", "*.mov", "*.webm")

# В игре папка с {tps} склеивается в атлас, {m} кладёт её в бандл race.
GAME_RACE_DIR = ROOT.parent / "velo-game" / "raw-assets" / "race{m}"


def list_videos() -> list[Path]:
    videos: list[Path] = []
    for pattern in VIDEO_PATTERNS:
        videos.extend(ASSETS_DIR.glob(pattern))
    videos = sorted(videos, key=lambda path: path.name.lower())
    if len(videos) != len(RACERS):
        names = ", ".join(video.name for video in videos) or "(пусто)"
        raise FileNotFoundError(
            f"Нужно ровно {len(RACERS)} видео в {ASSETS_DIR}, сейчас: {names}"
        )
    return videos


def reset_racer_dirs(root: Path) -> None:
    if root.exists():
        import shutil

        shutil.rmtree(root)
    for racer in RACERS:
        (root / racer).mkdir(parents=True)
