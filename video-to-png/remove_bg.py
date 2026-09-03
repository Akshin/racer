"""
Remove grey background from cropped cyclist frames using rembg (U²-Net).
Outputs transparent PNGs to video-to-png/nobg/.
"""

import glob
import os
import shutil

from PIL import Image
from rembg import new_session, remove

CROPPED_DIR = os.path.join(os.path.dirname(__file__), "cropped")
OUT_DIR = os.path.join(os.path.dirname(__file__), "nobg")


def main() -> None:
    if os.path.exists(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(OUT_DIR)

    session = new_session("u2net")

    frames = sorted(glob.glob(os.path.join(CROPPED_DIR, "*.png")))
    if not frames:
        raise FileNotFoundError(f"No frames in {CROPPED_DIR}")

    for i, path in enumerate(frames):
        img = Image.open(path)
        result = remove(
            img,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )
        result.save(os.path.join(OUT_DIR, f"frame_{i:05d}.png"), compress_level=1)
        if (i + 1) % 10 == 0 or i + 1 == len(frames):
            print(f"  {i + 1}/{len(frames)}...")

    print(f"Done — {len(frames)} frames with removed background saved to {OUT_DIR}")


if __name__ == "__main__":
    main()
