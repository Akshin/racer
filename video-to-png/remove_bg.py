"""
Убирает белый фон, связанный с краями кадра (и белое между ног, если оно открыто наружу).
Блики на самой модели не трогает.
"""

import numpy as np
from PIL import Image, ImageFilter

from common import CROPPED_DIR, NOBG_DIR, RACERS, reset_racer_dirs

WHITE = 248
FEATHER = 1.6


def border_white_mask(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    near = (rgb[:, :, 0] >= WHITE) & (rgb[:, :, 1] >= WHITE) & (rgb[:, :, 2] >= WHITE)
    bg = np.zeros((h, w), dtype=bool)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        if near[0, x]:
            stack.append((0, x))
        if near[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if near[y, 0]:
            stack.append((y, 0))
        if near[y, w - 1]:
            stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or bg[y, x] or not near[y, x]:
            continue
        bg[y, x] = True
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    return bg, near


def knock_white(img: Image.Image) -> Image.Image:
    rgba = np.array(img.convert("RGBA"))
    bg, near = border_white_mask(rgba[:, :, :3])
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    soft = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(FEATHER))
    alpha = np.array(soft)
    alpha[bg] = 0
    alpha[~near] = 255
    rgba[:, :, 3] = np.minimum(rgba[:, :, 3], alpha)
    return Image.fromarray(rgba, mode="RGBA")


def main() -> None:
    reset_racer_dirs(NOBG_DIR)
    for racer in RACERS:
        src = CROPPED_DIR / racer
        dst = NOBG_DIR / racer
        frames = sorted(src.glob("*.png"))
        if not frames:
            raise FileNotFoundError(f"Нет кадров в {src}")
        for i, path in enumerate(frames, start=1):
            knock_white(Image.open(path)).save(dst / f"frame_{i:05d}.png", compress_level=1)
            if i % 16 == 0 or i == len(frames):
                print(f"  {racer} {i}/{len(frames)}")
        print(f"Done {racer}: {len(frames)} → {dst}")


if __name__ == "__main__":
    main()
