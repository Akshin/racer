<script setup lang="ts">
/**
 * Экран гонки: пустой контейнер, в который монтируется канвас PixiJS.
 * Вся отрисовка и логика живут в src/game.
 */
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { createGame } from '@/game'

const host = useTemplateRef<HTMLDivElement>('host')

let game: Game | null = null
/** Инициализация асинхронная — компонент могли закрыть, не дождавшись её. */
let closed = false

onMounted(async () => {
  if (host.value === null) return

  const started = await createGame(host.value)
  if (closed) {
    started.destroy()
    return
  }
  game = started
})

onBeforeUnmount(() => {
  closed = true
  game?.destroy()
  game = null
})
</script>

<template>
  <div ref="host" class="stage"></div>
</template>

<style scoped lang="scss">
.stage {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
}
</style>
