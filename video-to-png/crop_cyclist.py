"""
Кроп вокруг велосипедиста: чуть сверху и по бокам, низ кадра не трогаем.
"""

import numpy as np
from PIL import Image

from common import CROPPED_DIR, FRAMES_DIR, RACERS, reset_racer_dirs

WHITE = 248
PAD_X = 36
PAD_TOP = 18
# Игнор одиночных артефактов сжатия по краям кадра.
MIN_COL_PX = 40
MIN_ROW_PX = 20


def content_bbox(path) -> tuple[int, int, int, int] | None:
    rgb = np.asarray(Image.open(path).convert("RGB"))
    mask = ~((rgb[:, :, 0] >= WHITE) & (rgb[:, :, 1] >= WHITE) & (rgb[:, :, 2] >= WHITE))
    cols = np.where(mask.sum(axis=0) >= MIN_COL_PX)[0]
    rows = np.where(mask.sum(axis=1) >= MIN_ROW_PX)[0]
    if cols.size == 0 or rows.size == 0:
        return None
    return int(cols.min()), int(rows.min()), int(cols.max()) + 1, int(rows.max()) + 1


def union_box(frames: list) -> tuple[int, int, int, int]:
    box = None
    for path in frames:
        part = content_bbox(path)
        if part is None:
            continue
        if box is None:
            box = part
            continue
        box = (
            min(box[0], part[0]),
            min(box[1], part[1]),
            max(box[2], part[2]),
            max(box[3], part[3]),
        )
    if box is None:
        raise RuntimeError("Не нашёл велосипедиста на кадрах — фон не белый?")
    return box


def crop_box_for(frames: list) -> tuple[int, int, int, int]:
    sample = Image.open(frames[0])
    width, height = sample.size
    x0, y0, x1, _y1 = union_box(frames)
    return (
        max(0, x0 - PAD_X),
        max(0, y0 - PAD_TOP),
        min(width, x1 + PAD_X),
        height,
    )


def main() -> None:
    reset_racer_dirs(CROPPED_DIR)
    for racer in RACERS:
        src = FRAMES_DIR / racer
        dst = CROPPED_DIR / racer
        frames = sorted(src.glob("*.png"))
        if not frames:
            raise FileNotFoundError(f"Нет кадров в {src}")
        box = crop_box_for(frames)
        print(f"Crop {racer}: {box}")
        for i, path in enumerate(frames, start=1):
            Image.open(path).crop(box).save(dst / f"frame_{i:05d}.png", compress_level=1)
        print(f"  {len(frames)} кадров → {dst}")


if __name__ == "__main__":
    main()
