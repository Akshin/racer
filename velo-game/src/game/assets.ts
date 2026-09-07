/**
 * Загрузка бандла гонки из манифеста AssetPack (public/assets/manifest.json).
 * Пока манифеста нет — сцена рисуется как раньше, без спрайтов.
 */

import { Assets, Sprite, Spritesheet, Texture } from 'pixi.js'

let started = false

function textureUsable(texture: Texture | undefined): texture is Texture {
  try {
    return texture != null && !texture.destroyed && texture.source != null && !texture.source.destroyed
  } catch {
    return false
  }
}

/** Белая текстура для мешей. Texture.WHITE могли убить прошлым destroy — тогда своя 1×1. */
export function whiteTexture(): Texture {
  if (textureUsable(Texture.WHITE)) return Texture.WHITE
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (ctx !== null) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 1, 1)
  }
  return Texture.from(canvas)
}

export async function loadRaceAssets(): Promise<void> {
  if (started) {
    try {
      const sample = Assets.get<Texture>('sun')
      if (sample == null || textureUsable(sample)) return
    } catch {
      // Кэш есть, а GPU-ресурс уже убит — грузим заново.
    }
    Assets.reset()
    started = false
  }

  started = true

  try {
    await Assets.init({
      basePath: '/assets/',
      manifest: 'manifest.json',
    })
    await Assets.loadBundle('race')
  } catch (error) {
    started = false
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
  if (!textureUsable(texture) || texture === Texture.EMPTY || texture.width === 0) return null
  return new Sprite({ texture })
}

/** Кадры атласа по имени, пустой массив если атласа нет. */
export function raceSheetTextures(alias: string): Texture[] {
  const sheet = getSheet(alias)
  if (sheet == null) return []
  const fromAnim = sheet.animations?.[alias]
  const list =
    fromAnim != null && fromAnim.length > 0 ? fromAnim : orderedSheetTextures(sheet, alias)
  return list.filter((texture): texture is Texture => textureUsable(texture) && texture.width > 0)
}

function getSheet(alias: string): Spritesheet | null {
  for (const key of [alias, `race/${alias}`]) {
    try {
      const value = Assets.get(key) as Spritesheet | undefined
      if (value != null && value.textures != null) return value
    } catch {
      // Нет такого алиаса.
    }
  }
  return null
}

function orderedSheetTextures(sheet: Spritesheet, alias: string): Texture[] {
  const frames = sheet.textures
  const prefix = `${alias}_`
  const keys = Object.keys(frames)
    .filter((name) => name === alias || name.startsWith(prefix))
    .sort()
  const names = keys.length > 0 ? keys : Object.keys(frames).sort()
  return names.flatMap((name) => {
    const texture = frames[name]
    return texture === undefined ? [] : [texture]
  })
}
