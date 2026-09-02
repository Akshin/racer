/**
 * Точка входа игры: приложение PixiJS, сплитскрин из половин-дорог и кадровый цикл.
 * Телеметрию игра не знает откуда брать — её подаёт вызывающая сторона через feed.
 */

import { Application, type Ticker } from 'pixi.js'
import { PLAYER_IDS } from '@/net/protocol'
import { loadRaceAssets } from './assets'
import { COLOR_DIVIDER } from './config'
import { Lane } from './lane'

export async function createGame(
  host: HTMLElement,
  feed: GameFeed,
  visualScale: () => number,
): Promise<Game> {
  const app = new Application()

  await loadRaceAssets()

  await app.init({
    // Канвас следит за размером контейнера, а не окна: вокруг него есть вёрстка страницы.
    resizeTo: host,
    background: COLOR_DIVIDER,
    antialias: true,
    // Резкая картинка на retina: буфер крупнее CSS-размера ровно во столько же раз.
    resolution: window.devicePixelRatio,
    autoDensity: true,
  })

  host.appendChild(app.canvas)

  const lanes = PLAYER_IDS.map(() => new Lane())
  app.stage.addChild(...lanes.map((lane) => lane.view))

  function layout(): void {
    const { width, height } = app.screen
    const laneWidth = width / lanes.length

    lanes.forEach((lane, index) => {
      lane.view.x = index * laneWidth
      lane.resize(laneWidth, height)
    })
  }

  function tick(ticker: Ticker): void {
    const players = feed()
    lanes.forEach((lane, index) => {
      const telemetry = players[index]
      if (telemetry !== undefined) lane.update(ticker.deltaMS, telemetry, visualScale())
    })
  }

  layout()
  app.renderer.on('resize', layout)
  app.ticker.add(tick)

  return {
    app,
    destroy(): void {
      app.ticker.remove(tick)
      app.renderer.off('resize', layout)
      // releaseGlobalResources — иначе после повторного входа в гонку остаются
      // чужие текстуры и батчи из прошлого приложения.
      app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true },
      )
    },
  }
}
