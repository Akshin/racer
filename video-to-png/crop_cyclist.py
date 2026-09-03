"""
Crop the cyclist from extracted frames.
Cuts out the 3D viewport area (grey background with the cyclist)
and saves cropped PNGs to video-to-png/cropped/.
"""

import glob
import os
import shutil

from PIL import Image

FRAMES_DIR = os.path.join(os.path.dirname(__file__), "frames")
OUT_DIR = os.path.join(os.path.dirname(__file__), "cropped")

# Crop box in original pixels (2992×1934).
# The grey viewport with the cyclist.
# (left, upper, right, lower)
# Cyclist bounding box: x:1014-1155, y:694-1099 (detected via red pixels)
PAD = 50
CROP_BOX = (1014 - PAD, 694 - PAD, 1155 + PAD, 1342)


def main() -> None:
    if os.path.exists(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(OUT_DIR)

    frames = sorted(glob.glob(os.path.join(FRAMES_DIR, "*.png")))
    if not frames:
        raise FileNotFoundError(f"No frames in {FRAMES_DIR}")

    for i, path in enumerate(frames):
        img = Image.open(path)
        cropped = img.crop(CROP_BOX)
        cropped.save(os.path.join(OUT_DIR, f"frame_{i:05d}.png"), compress_level=1)

    print(f"Done — {len(frames)} cropped frames saved to {OUT_DIR}")


if __name__ == "__main__":
    main()
