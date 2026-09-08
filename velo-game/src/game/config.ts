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
 * Обочина-клин: от кромки асфальта растёт вверх и в сторону.
 * В перспективе сам сходится к горизонту.
 */
export const BERM_WIDTH_M = 3.8
export const BERM_HEIGHT_M = 4.3

/**
 * Деревья вдоль обочины: билборды в той же проекции, что дорога.
 * Свет в PNG справа — слева от дороги как есть, справа зеркалим.
 */
export const TREE_HEIGHT_M = 8
export const TREE_OFFSET_M = 0.85
/** Разброс влево-вправо от линии посадки, метры. */
export const TREE_OFFSET_SPREAD_M = 0.2
/** На сколько метров ствол уходит в склон — иначе дерево стоит на поверхности. */
export const TREE_SINK_M = 0.45
export const TREE_PERIOD_M = 5.6
export const TREE_PHASE_LEFT = 1
export const TREE_PHASE_RIGHT = 8
export const TREE_DISTANCE_M = 110
/** За сколько метров до горизонта дерево проявляется из тумана. */
export const TREE_FADE_M = 16
export const TREE_SLOTS_PER_SIDE = 24

/**
 * Флаги-паруса у кромки: те же билборды, что деревья.
 * Ткань в PNG справа от древка — справа зеркалим, чтобы оба полотна смотрели на трассу.
 * Высота больше баннера (~1.6 м до верха рамы): полотно начинается выше постера.
 */
export const FLAG_HEIGHT_M = 5.8
/** Чуть дальше баннера, у подножия обочины — не на гребне склона. */
export const FLAG_OFFSET_M = 0.48
/** Ножка уходит в склон, как ствол дерева: иначе древко висит над травой. */
export const FLAG_SINK_M = 0.32
/**
 * Древко в исходном PNG 140×280, не в обрезанном кадре атласа.
 * AssetPack тримит поля, Pixi якорит по sourceSize — 0.08 сажало якорь в пустоту слева.
 */
export const FLAG_ANCHOR_X = 50.5 / 140
export const FLAG_FADE_M = 16
export const FLAG_DISTANCE_M = 110
/** Четыре ряда у кромки, кластер каждые 100 м адаптера. */
export const FLAG_PERIOD_M = 100
export const FLAG_ROWS = 4
export const FLAG_ROW_GAP_M = 5
export const FLAG_CLUSTER_SLOTS = Math.ceil(FLAG_DISTANCE_M / FLAG_PERIOD_M) + 2

/**
 * Баннеры — сплошной забор вдоль кромки, плоскость параллельна дороге.
 * Длинная сторона постера идёт вдаль, не лицом в камеру.
 */
export const BANNER_WIDTH_M = 4.2
export const BANNER_HEIGHT_M = 1.05
export const BANNER_LEG_M = 0.12
export const BANNER_TUBE_M = 0.07
/** Зазор между постером и верхней/нижней трубой — сквозь него видна обочина. */
export const BANNER_GAP_M = 0.06
export const BANNER_OFFSET_M = 0.16
export const BANNER_PERIOD_M = BANNER_WIDTH_M + BANNER_TUBE_M + 0.1
export const BANNER_PHASE_LEFT = 0.4
export const BANNER_PHASE_RIGHT = 0.4
export const BANNER_DISTANCE_M = 90
export const BANNER_FADE_M = 14
/**
 * Минимальный z постера у камеры. Не путать с projection.nearZ (низ кадра):
 * клип туда сжимал текстуру, когда баннер подъезжал к краю экрана.
 */
export const BANNER_CAM_Z_M = 0.45
export const BANNER_SLOTS_PER_SIDE = Math.ceil(BANNER_DISTANCE_M / BANNER_PERIOD_M) + 2
/** Баннеры только на первых метрах заезда (метры адаптера, как в HUD). */
export const BANNER_UNTIL_M = 170

/**
 * Велосипедист — неподвижный относительно камеры спрайт по центру дороги.
 * Высота — от покрышки до шлема; z — насколько впереди камеры стоит модель.
 */
export const CYCLIST_HEIGHT_M = 1.72
export const CYCLIST_Z_M = 5.1
/**
 * animationSpeed Pixi при 1× слайдера и этой скорости с датчика.
 * Исходный ролик ~16 кадр/с → 16/60. На трассе множится на speedScale.
 */
export const CYCLIST_ANIM_AT_KMH = 28
export const CYCLIST_ANIM_SPEED = 16 / 60
export const COLOR_METAL = 0x2a2e33
export const COLOR_METAL_LIT = 0x4a5158

/** Разгон дороги и педалей. Короткий τ — старт не «ватный». */
export const SPEED_TAU_ACCEL_MS = 45
/** Торможение чуть мягче разгона, чтобы датчик не дёргал анимацию. */
export const SPEED_TAU_MS = 140
/** После финиша дорога выкатывается к нулю медленнее, чем при потере датчика. */
export const COAST_TAU_MS = 1600
/** Доля долга дистанции за кадр. Большое значение рвёт асфальт из-под ног. */
export const DISTANCE_CATCHUP = 0.012
/** Догоняем адаптер, только когда своя скорость уже почти совпала, км/ч. */
export const DISTANCE_CATCHUP_MAX_SPEED_GAP = 2
/** Потолок догона, м/с — без скачка даже на большом долге. */
export const DISTANCE_CATCHUP_MAX_MS = 0.35

export const COLOR_SKY_TOP = 0x7a7b8e
export const COLOR_SKY_MID = 0xcbb6b4
export const COLOR_SKY_HORIZON = 0xf0d6c2
export const COLOR_GROUND = 0x4a7a3a
/** Обочина: свет у дороги (к солнцу), тень на гребне. */
export const COLOR_BERM_LIT = 0x456834
export const COLOR_BERM = 0x3a5c30
export const COLOR_BERM_SHADE = 0x32502c
export const COLOR_ASPHALT = 0x5c524e
/** Асфальт у горизонта: алый отсвет закатного солнца. */
export const COLOR_ASPHALT_SUN = 0x7a554c
/** Разметка: не холодный белый, а кремово-персиковый в том же свете. */
export const COLOR_MARKING = 0xf0d4c0
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
