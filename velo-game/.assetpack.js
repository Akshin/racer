/**
 * Пайплайн ассетов для PixiJS: сырые файлы из raw-assets/ → public/assets/.
 *
 * Теги в именах папок (это синтаксис AssetPack, не часть пути в игре):
 *   {m}   — бандл манифеста. race{m} → Assets.loadBundle('race')
 *   {tps} — склеить PNG папки в атлас
 *
 * Куда класть исходники дизайнера (внутри raw-assets/race{m}/):
 *   trees{tps}/     деревья
 *   flags{tps}/     флаги-паруса у дороги
 *   banners{tps}/   баннеры у дороги
 *   racer1{tps}/    левая половина, женщина
 *   racer2{tps}/    правая половина, женщина
 *   racer3{tps}/    левая половина, мужчина
 *   racer4{tps}/    правая половина, мужчина
 *   finish{tps}/    финишная черта / лента
 *   markings{tps}/  надписи на асфальте
 *   road/           широкая текстура дороги — не в атлас
 *   other/          фон: солнце, горы — не в атлас
 */

import { pixiPipes } from '@assetpack/core/pixi'

export default {
  entry: './raw-assets',
  output: './public/assets',
  ignore: ['**/.gitkeep', '**/.DS_Store'],
  cache: true,
  cacheLocation: '.assetpack',
  pipes: [
    ...pixiPipes({
      // Локальный ивент: хеши в именах только мешают смотреть файлы.
      cacheBust: false,
      // Дизайнер отдаёт 1×. Второй масштаб появится, когда будут @2x исходники.
      resolutions: { default: 1 },
      compression: { jpg: true, png: true, webp: true },
      texturePacker: {
        texturePacker: {
          padding: 2,
          nameStyle: 'short',
          removeFileExtension: true,
        },
      },
      manifest: {
        output: './public/assets/manifest.json',
        createShortcuts: true,
        trimExtensions: true,
      },
    }),
  ],
}
