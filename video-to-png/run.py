"""
Full pipeline: video → frames → crop → transparent PNG.
"""

from crop_cyclist import main as crop
from extract_frames import main as extract
from remove_bg import main as remove_bg


def main() -> None:
    print("1/3 extract frames")
    extract()
    print("2/3 crop cyclist")
    crop()
    print("3/3 remove background")
    remove_bg()
    print("Pipeline done — result in nobg/")


if __name__ == "__main__":
    main()
