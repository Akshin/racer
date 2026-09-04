"""
Полный пайплайн: два видео → 48 кадров → кроп → без белого фона → ассеты игры.
"""

from copy_to_game import main as copy_to_game
from crop_cyclist import main as crop
from extract_frames import main as extract
from remove_bg import main as remove_bg


def main() -> None:
    print("1/4 extract frames")
    extract()
    print("2/4 crop")
    crop()
    print("3/4 remove white background")
    remove_bg()
    print("4/4 copy to velo-game/raw-assets")
    copy_to_game()
    print("Pipeline done — racer1 и racer2 в nobg/ и raw-assets/")


if __name__ == "__main__":
    main()
