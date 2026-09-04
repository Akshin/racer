"""Копирует nobg/racerN в raw-assets/race{m}/racerN{tps}/ как racerN_01.png …"""

import shutil

from common import GAME_RACE_DIR, NOBG_DIR, RACERS


def main() -> None:
    GAME_RACE_DIR.mkdir(parents=True, exist_ok=True)
    for racer in RACERS:
        src = NOBG_DIR / racer
        frames = sorted(src.glob("*.png"))
        if not frames:
            raise FileNotFoundError(f"Нет кадров в {src}")
        dest = GAME_RACE_DIR / f"{racer}{{tps}}"
        if dest.exists():
            shutil.rmtree(dest)
        dest.mkdir(parents=True)
        for i, path in enumerate(frames, start=1):
            shutil.copy2(path, dest / f"{racer}_{i:02d}.png")
        print(f"Copied {len(frames)} → {dest}")


if __name__ == "__main__":
    main()
