/**
 * Точка входа игры: поднимает приложение PixiJS внутри переданного элемента.
 * Сцены и логики гонки здесь пока нет — только рендерер.
 */

import { Application } from 'pixi.js'

/** Фон канваса совпадает с фоном страницы, чтобы не мигало до появления сцены. */
const BACKGROUND = 0x0d1117

export async function createGame(host: HTMLElement): Promise<Game> {
  const app = new Application()

  await app.init({
    // Канвас следит за размером контейнера, а не окна: вокруг него есть вёрстка страницы.
    resizeTo: host,
    background: BACKGROUND,
    antialias: true,
    // Резкая картинка на retina: буфер крупнее CSS-размера ровно во столько же раз.
    resolution: window.devicePixelRatio,
    autoDensity: true,
  })

  host.appendChild(app.canvas)

  return {
    app,
    destroy(): void {
      // releaseGlobalResources — иначе после повторного входа в гонку остаются
      // чужие текстуры и батчи из прошлого приложения.
      app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true },
      )
    },
  }
}
