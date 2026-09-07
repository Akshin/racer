"""
Кроп вокруг велосипедиста: чуть сверху и по бокам, низ кадра не трогаем.

Контент ищется по альфе (если она есть), иначе по белому или чёрному фону.
"""

import numpy as np
from PIL import Image

from common import CROPPED_DIR, FRAMES_DIR, racers_from_args, reset_racer_dirs

WHITE = 248
BLACK = 12
ALPHA_MIN = 16
PAD_X = 36
PAD_TOP = 18
# Игнор одиночных артефактов сжатия по краям кадра.
MIN_COL_PX = 40
MIN_ROW_PX = 20


def content_mask(img: Image.Image) -> np.ndarray:
    if "A" in img.getbands():
        alpha = np.asarray(img.convert("RGBA"))[:, :, 3]
        return alpha >= ALPHA_MIN
    rgb = np.asarray(img.convert("RGB"))
    white = (rgb[:, :, 0] >= WHITE) & (rgb[:, :, 1] >= WHITE) & (rgb[:, :, 2] >= WHITE)
    black = (rgb[:, :, 0] <= BLACK) & (rgb[:, :, 1] <= BLACK) & (rgb[:, :, 2] <= BLACK)
    edge_white = np.concatenate([white[0], white[-1], white[:, 0], white[:, -1]]).mean()
    edge_black = np.concatenate([black[0], black[-1], black[:, 0], black[:, -1]]).mean()
    return ~black if edge_black > edge_white else ~white


def content_bbox(path) -> tuple[int, int, int, int] | None:
    mask = content_mask(Image.open(path))
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
        raise RuntimeError("Не нашёл велосипедиста на кадрах")
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


def main(racers: tuple[str, ...] | None = None) -> None:
    selected = racers or racers_from_args()
    reset_racer_dirs(CROPPED_DIR, selected)
    for racer in selected:
        src = FRAMES_DIR / racer
        dst = CROPPED_DIR / racer
        frames = sorted(src.glob("*.png"))
        if not frames:
            raise FileNotFoundError(f"Нет кадров в {src}")
        box = crop_box_for(frames)
        print(f"Crop {racer}: {box}  size={(box[2] - box[0], box[3] - box[1])}")
        for i, path in enumerate(frames, start=1):
            Image.open(path).crop(box).save(dst / f"frame_{i:05d}.png", compress_level=1)
        print(f"  {len(frames)} кадров → {dst}")


if __name__ == "__main__":
    main()
