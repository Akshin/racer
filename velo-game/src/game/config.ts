/**
 * Настройки сцены: геометрия дороги в метрах, камера и палитра.
 * Всё, что задано в пикселях, названо с суффиксом _PX.
 */

/** Множитель визуальной скорости по умолчанию: реальные 30 км/ч выглядят как 60. */
export const SPEED_SCALE = 2
export const SPEED_SCALE_MIN = 1
export const SPEED_SCALE_MAX = 3
export const SPEED_SCALE_STEP = 0.25

/** Длительность заезда. Таймер сверху считает вниз, в нуле вызывается finish. */
export const RACE_DURATION_MS = 60_000

/** Длины заезда, которые можно выбрать на странице проверки. */
export const RACE_DISTANCES_M = [500, 1000, 5000] as const
/** Длина заезда по умолчанию: по ней считается прогресс на шкале в HUD. */
export const RACE_DISTANCE_M = 5000

export const ROAD_WIDTH_M = 7
export const LINE_WIDTH_M = 0.15
export const DASH_LENGTH_M = 3
/** Пробел между штрихами короче гостовского: чаще отсечки — лучше читается скорость. */
export const DASH_GAP_M = 6
export const DASH_PERIOD_M = DASH_LENGTH_M + DASH_GAP_M

export const CAMERA_HEIGHT_M = 1.8
export const VERTICAL_FOV_DEG = 55
/** Доля высоты половины экрана, на которой стоит линия горизонта. */
export const HORIZON_RATIO = 0.36

/** Дальше этого расстояния дорога уже схлопнулась в линию горизонта. */
export const ROAD_DISTANCE_M = 400
/** Пунктир дальше становится тоньше пикселя, поэтому обрываем раньше дороги. */
export const DASH_DISTANCE_M = 150
/** Сколько квадов держим под пунктир: сколько периодов влезает в дальность плюс запас. */
export const MAX_DASHES = Math.ceil(DASH_DISTANCE_M / DASH_PERIOD_M) + 1

/**
 * Деревья вдоль обочины: билборды в той же проекции, что дорога.
 * Свет в PNG справа — слева от дороги как есть, справа зеркалим.
 */
export const TREE_HEIGHT_M = 8
export const TREE_OFFSET_M = 2.2
/** Разброс влево-вправо от линии посадки, метры. */
export const TREE_OFFSET_SPREAD_M = 0.95
export const TREE_PERIOD_M = 5.6
export const TREE_PHASE_LEFT = 1
export const TREE_PHASE_RIGHT = 8
export const TREE_DISTANCE_M = 110
/** За сколько метров до горизонта дерево проявляется из тумана. */
export const TREE_FADE_M = 16
export const TREE_SLOTS_PER_SIDE = 24

/** Постоянная времени разгона/остановки дороги. При потере датчика она замирает за ~2τ. */
export const SPEED_TAU_MS = 400
/** Какую долю отставания от дистанции адаптера догоняем за кадр. */
export const DISTANCE_CATCHUP = 0.08

export const COLOR_SKY_TOP = 0x7a7b8e
export const COLOR_SKY_MID = 0xcbb6b4
export const COLOR_SKY_HORIZON = 0xf0d6c2
export const COLOR_GROUND = 0x4a7a3a
export const COLOR_ASPHALT = 0x6e747b
export const COLOR_MARKING = 0xf2f2ee
export const COLOR_DIVIDER = 0x0d1117

/** Видимый диск — доля ширины половины, как на рефе (~20–25%). */
export const SUN_WIDTH_RATIO = 0.23
export const SUN_OFFSET_X_RATIO = 0
/** Зазор между нижним краем диска и вершинами гор, доля высоты половины. */
export const SUN_PEAK_GAP_RATIO = 0.035
/** Небо над диском, чтобы спрайт не обрезало верх кадра. */
export const SUN_TOP_MARGIN_RATIO = 0.04
/** Радиус ареола относительно видимого диска. */
export const SUN_GLOW_SCALE = 2
export const COLOR_SUN_GLOW_INNER = 0xfff3d2
export const COLOR_SUN_GLOW_MID = 0xffb07a
/** Непрозрачный диск в PNG 350×386: вокруг него пустые поля. */
export const SUN_CONTENT_LEFT = 21 / 350
export const SUN_CONTENT_RIGHT = 330 / 350
export const SUN_CONTENT_TOP = 41 / 386
export const SUN_CONTENT_BOTTOM = 349 / 386
/** Горы на всю ширину половины. Якорь — нижняя кромка рисунка в PNG, не пустой край файла. */
export const MOUNTAINS_WIDTH_RATIO = 1
export const MOUNTAINS_ANCHOR_Y = 605 / 768
/** Верх непрозрачных пиков в PNG. */
export const MOUNTAINS_CONTENT_TOP = 192 / 768
