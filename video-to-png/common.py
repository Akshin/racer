"""Общие пути и имена гонщиков для пайплайна video → PNG."""

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS_DIR = ROOT / "assets"
FRAMES_DIR = ROOT / "frames"
CROPPED_DIR = ROOT / "cropped"
NOBG_DIR = ROOT / "nobg"

# Папка гонщика ← файл в assets/. blue/red — женщины, blue_man/red_man — мужчины.
RACER_VIDEOS: tuple[tuple[str, str], ...] = (
    ("racer1", "blue.mov"),
    ("racer2", "red.mov"),
    ("racer3", "racer3/blue_man_new.mov"),
    ("racer4", "racer4/red_man_new.mov"),
)
RACERS = tuple(name for name, _ in RACER_VIDEOS)
TARGET_FRAMES = 48

# В игре папка с {tps} склеивается в атлас, {m} кладёт её в бандл race.
GAME_RACE_DIR = ROOT.parent / "velo-game" / "raw-assets" / "race{m}"


def racers_from_args(argv: list[str] | None = None) -> tuple[str, ...]:
    args = list(argv if argv is not None else sys.argv[1:])
    known = {name for name, _ in RACER_VIDEOS}
    if not args:
        return RACERS
    unknown = [name for name in args if name not in known]
    if unknown:
        raise SystemExit(
            f"Неизвестные гонщики: {', '.join(unknown)}. Есть: {', '.join(RACERS)}"
        )
    return tuple(args)


def list_videos(racers: tuple[str, ...] | None = None) -> list[Path]:
    mapping = dict(RACER_VIDEOS)
    selected = racers or RACERS
    videos: list[Path] = []
    for racer in selected:
        path = ASSETS_DIR / mapping[racer]
        if not path.exists():
            raise FileNotFoundError(f"Нет видео {path.name} для {racer} в {ASSETS_DIR}")
        videos.append(path)
    return videos


def reset_racer_dirs(root: Path, racers: tuple[str, ...] | None = None) -> None:
    """Пересоздаёт только выбранных гонщиков, остальных не трогает."""
    selected = racers or RACERS
    for racer in selected:
        dest = root / racer
        if dest.exists():
            shutil.rmtree(dest)
        dest.mkdir(parents=True)
