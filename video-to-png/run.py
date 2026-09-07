"""
Полный пайплайн: видео → 48 кадров → кроп → без белого фона → ассеты игры.

По умолчанию все гонщики. Можно указать имена:
  python run.py racer3 racer4
"""

from common import racers_from_args
from copy_to_game import main as copy_to_game
from crop_cyclist import main as crop
from extract_frames import main as extract
from remove_bg import main as remove_bg


def main() -> None:
    racers = racers_from_args()
    print("1/4 extract frames")
    extract(racers)
    print("2/4 crop")
    crop(racers)
    print("3/4 remove white background")
    remove_bg(racers)
    print("4/4 copy to velo-game/raw-assets")
    copy_to_game(racers)
    print(f"Pipeline done — {', '.join(racers)} в nobg/ и raw-assets/")


if __name__ == "__main__":
    main()
