/**
 * Загрузка бандла гонки из манифеста AssetPack (public/assets/manifest.json).
 * Пока манифеста нет — сцена рисуется как раньше, без спрайтов.
 */

import { Assets, Sprite, Texture } from 'pixi.js'

let started = false

export async function loadRaceAssets(): Promise<void> {
  if (started) return
  started = true

  try {
    await Assets.init({
      basePath: '/assets/',
      manifest: 'manifest.json',
    })
    await Assets.loadBundle('race')
  } catch (error) {
    console.warn(
      '[assets] нет сборки ассетов. Положите PNG в raw-assets/race{m}/ и выполните npm run assets',
      error,
    )
  }
}

/** Спрайт из бандла `race`, или null если ассета нет — сцена тогда без него. */
export function raceSprite(alias: string): Sprite | null {
  let texture: Texture | undefined
  try {
    texture = Assets.get<Texture>(alias)
  } catch {
    return null
  }
  if (texture == null || texture === Texture.EMPTY || texture.width === 0) return null
  return new Sprite({ texture })
}
