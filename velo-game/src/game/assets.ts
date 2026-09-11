/**
 * Загрузка бандла гонки из манифеста AssetPack (public/assets/manifest.json).
 * Пока манифеста нет — сцена рисуется как раньше, без спрайтов.
 */

import { Assets, Sprite, Spritesheet, Texture } from 'pixi.js'

let started = false
let inflight: Promise<void> | null = null

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

export function loadRaceAssets(): Promise<void> {
  if (inflight !== null) return inflight
  inflight = bootRaceAssets().finally(() => {
    inflight = null
  })
  return inflight
}

async function bootRaceAssets(): Promise<void> {
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
export function raceSheetTextures(alias: string, anim = alias): Texture[] {
  return namedSheetTextures(alias, anim)
    .map((item) => item.texture)
    .filter((texture): texture is Texture => textureUsable(texture) && texture.width > 0)
}

/**
 * Те же кадры, уже разложенные на отдельные canvas (с учётом trim/rotate атласа).
 * Для HTML HUD, которому не нужен второй WebGL-контекст.
 */
export function raceSheetBakedFrames(alias: string, anim = alias): HTMLCanvasElement[] {
  return namedSheetTextures(alias, anim).flatMap((item) => {
    const baked = bakeSheetFrame(item.sheet, item.name, item.texture)
    return baked == null ? [] : [baked]
  })
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

function allSheets(alias: string): Spritesheet[] {
  const root = getSheet(alias)
  if (root == null) return []
  const sheets = [root]
  for (const extra of root.linkedSheets ?? []) {
    if (extra != null && extra.textures != null && !sheets.includes(extra)) sheets.push(extra)
  }
  return sheets
}

type NamedSheetTexture = {
  name: string
  texture: Texture
  sheet: Spritesheet
}

function namedSheetTextures(alias: string, anim: string): NamedSheetTexture[] {
  const sheets = allSheets(alias)
  const prefix = `${anim}_`
  const items: NamedSheetTexture[] = []
  const seen = new Set<string>()

  const take = (sheet: Spritesheet, name: string, requirePrefix: boolean): void => {
    if (seen.has(name)) return
    if (requirePrefix && name !== anim && !name.startsWith(prefix)) return
    const texture = sheet.textures[name]
    if (texture === undefined) return
    seen.add(name)
    items.push({ name, texture, sheet })
  }

  for (const sheet of sheets) {
    for (const name of Object.keys(sheet.textures)) take(sheet, name, true)
  }
  if (items.length === 0 && anim === alias) {
    for (const sheet of sheets) {
      for (const name of Object.keys(sheet.textures)) take(sheet, name, false)
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return items
}

function bakeSheetFrame(sheet: Spritesheet, name: string, texture: Texture): HTMLCanvasElement | null {
  if (!textureUsable(texture)) return null
  const data = sheet.data.frames[name]
  const image = canvasImage(texture)
  if (data == null || image == null) return null

  const orig = data.sourceSize ?? data.frame
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, orig.w)
  canvas.height = Math.max(1, orig.h)
  const ctx = canvas.getContext('2d')
  if (ctx === null) return null

  const frame = data.frame
  const dest = data.spriteSourceSize ?? { x: 0, y: 0 }
  if (data.rotated === true) {
    // В JSON w/h — размер до поворота; в атласе спрайт лежит на боку (h×w).
    const packedW = frame.h
    const packedH = frame.w
    ctx.translate(dest.x, dest.y)
    ctx.rotate(-Math.PI / 2)
    ctx.drawImage(image, frame.x, frame.y, packedW, packedH, -packedW, 0, packedW, packedH)
  } else {
    ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, dest.x, dest.y, frame.w, frame.h)
  }
  return canvas
}

function canvasImage(texture: Texture): CanvasImageSource | null {
  const resource = texture.source.resource as unknown
  if (resource == null) return null
  if (typeof HTMLImageElement !== 'undefined' && resource instanceof HTMLImageElement) return resource
  if (typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap) return resource
  if (typeof HTMLCanvasElement !== 'undefined' && resource instanceof HTMLCanvasElement) return resource
  if (typeof OffscreenCanvas !== 'undefined' && resource instanceof OffscreenCanvas) return resource
  if (typeof HTMLVideoElement !== 'undefined' && resource instanceof HTMLVideoElement) return resource
  return null
}
