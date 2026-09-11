<script setup lang="ts">
/**
 * Зацикленная анимация маскота из атласа race/mascots.
 * Рисуем в 2D canvas: HUD HTML, второй WebGL-контекст не нужен.
 */
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { loadRaceAssets, raceSheetBakedFrames } from '@/game/assets'

const FRAME_MS = 1000 / 24

const props = defineProps<{ kind: 'fat' | 'slim' }>()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

let closed = false
let raf = 0
let frames: HTMLCanvasElement[] = []
let index = 0
let acc = 0
let last = 0

onMounted(async () => {
  await loadRaceAssets()
  if (closed) return
  frames = raceSheetBakedFrames('mascots', props.kind)
  if (frames.length === 0) return
  last = performance.now()
  raf = requestAnimationFrame(tick)
})

function tick(now: number): void {
  if (closed) return
  acc += now - last
  last = now
  while (acc >= FRAME_MS && frames.length > 0) {
    acc -= FRAME_MS
    index = (index + 1) % frames.length
  }
  paint()
  raf = requestAnimationFrame(tick)
}

function paint(): void {
  const canvas = canvasRef.value
  const frame = frames[index]
  if (canvas == null || frame === undefined) return
  const ctx = canvas.getContext('2d')
  if (ctx === null) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width < 1 || height < 1) return
  const pixelW = Math.round(width * dpr)
  const pixelH = Math.round(height * dpr)
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(frame, 0, 0, width, height)
}

onBeforeUnmount(() => {
  closed = true
  cancelAnimationFrame(raf)
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
