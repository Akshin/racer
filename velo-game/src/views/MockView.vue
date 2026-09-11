<script setup lang="ts">
import FinishPopup, { type FinishPlayer } from '@/components/FinishPopup.vue'

const mocks: { players: FinishPlayer[] }[] = [
  // 1 игрок · через 5 с «Гонка закончена!»
  {
    players: [{ index: 0, nick: 'Тугарин Змей', meters: 482, place: 12 }],
  },
  // 1 игрок · без ника и места
  {
    players: [{ index: 0, nick: null, meters: 0, place: null }],
  },
  // 2 игрока
  {
    players: [
      { index: 0, nick: 'Тугарин Змей', meters: 610, place: 3 },
      { index: 1, nick: 'Гонщик', meters: 445, place: 18 },
    ],
  },
  // 2 игрока · победил второй
  {
    players: [
      { index: 0, nick: 'Тугарин Змей', meters: 312, place: 41 },
      { index: 1, nick: 'Гонщик', meters: 728, place: 2 },
    ],
  },
]

const mock = mocks[1]
</script>

<template>
  <div class="mock-view">
    <FinishPopup v-if="mock" v-bind="mock" />
  </div>
</template>

<style scoped lang="scss">
.mock-view {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: #06102c;
}
</style>
