"""
Убирает белый фон, связанный с краями кадра (и белое между ног, если оно открыто наружу).
Блики на самой модели не трогает.
"""

import numpy as np
from PIL import Image, ImageFilter

from common import CROPPED_DIR, NOBG_DIR, racers_from_args, reset_racer_dirs

WHITE = 248
BLACK = 12
FEATHER = 1.6


def already_cutout(img: Image.Image) -> bool:
    """Кадры, где фон уже вырезан (альфа по краям)."""
    if "A" not in img.getbands():
        return False
    alpha = np.asarray(img.convert("RGBA"))[:, :, 3]
    border = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
    return float((border == 0).mean()) > 0.5


def border_color_mask(rgb: np.ndarray, near: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
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
    return bg


def knock_white(img: Image.Image) -> Image.Image:
    if already_cutout(img):
        return img.convert("RGBA")
    rgba = np.array(img.convert("RGBA"))
    rgb = rgba[:, :, :3]
    white = (rgb[:, :, 0] >= WHITE) & (rgb[:, :, 1] >= WHITE) & (rgb[:, :, 2] >= WHITE)
    black = (rgb[:, :, 0] <= BLACK) & (rgb[:, :, 1] <= BLACK) & (rgb[:, :, 2] <= BLACK)
    edge_white = np.concatenate([white[0], white[-1], white[:, 0], white[:, -1]]).mean()
    edge_black = np.concatenate([black[0], black[-1], black[:, 0], black[:, -1]]).mean()
    near = black if edge_black > edge_white else white
    bg = border_color_mask(rgb, near)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    soft = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(FEATHER))
    alpha = np.array(soft)
    alpha[bg] = 0
    alpha[~near] = 255
    rgba[:, :, 3] = np.minimum(rgba[:, :, 3], alpha)
    return Image.fromarray(rgba, mode="RGBA")


def main(racers: tuple[str, ...] | None = None) -> None:
    selected = racers or racers_from_args()
    reset_racer_dirs(NOBG_DIR, selected)
    for racer in selected:
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
