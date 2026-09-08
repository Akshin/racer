<script setup lang="ts">
/**
 * Экран после удачной регистрации: ждём сотрудника.
 * Через 3 секунды или по клику возвращаемся к форме — киоск готов к следующему человеку.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const RETURN_MS = 4000

const router = useRouter()
let timer: number | undefined
let left = false

function goToRegister(): void {
  if (left) return
  left = true
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timer = undefined
  }
  void router.replace({ name: 'register' })
}

onMounted(() => {
  timer = window.setTimeout(goToRegister, RETURN_MS)
})

onBeforeUnmount(() => {
  if (timer === undefined) return
  window.clearTimeout(timer)
  timer = undefined
})
</script>

<template>
  <main
    class="page"
    role="status"
    aria-live="polite"
    tabindex="0"
    @click="goToRegister"
    @keydown.enter.prevent="goToRegister"
    @keydown.space.prevent="goToRegister"
  >
    <div class="glow" aria-hidden="true">
      <span class="glow__spot glow__spot--top" />
      <span class="glow__spot glow__spot--mid" />
      <span class="glow__spot glow__spot--bot" />
    </div>

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <img class="logo" src="../assets/images/vk_logo.png" alt="VK Видео" draggable="false" />

        <div class="stage">
          <p class="bubble">
            <strong>Хорошо!</strong>
            <span>Подожди, когда сотрудник</span>
            <span>тебя назовет.</span>
          </p>
        </div>
      </div>
    </div>

    <img class="mascot" src="../assets/images/MASCOT_WHITE.png" alt="" draggable="false" />
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$glow: #0040ff;
$bubble-start: #2e54f1;
$bubble-end: #c5d2f8;
$bubble-bot: #8ea4f5;
$bubble-side: #5e7af3;

.page {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: clamp(12px, 2.4vh, 32px);
  overflow: hidden;
  background: #0e1a50;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.glow__spot {
  position: absolute;
  border-radius: 50%;
  background: $glow;
  opacity: 0.9;

  &--top {
    width: 58%;
    height: 70%;
    left: 6%;
    top: -28%;
    filter: blur(180px);
  }

  &--mid {
    width: 46%;
    height: 52%;
    left: 18%;
    top: 18%;
    opacity: 0.55;
    filter: blur(160px);
  }

  &--bot {
    width: 42%;
    height: 38%;
    left: 8%;
    bottom: -18%;
    filter: blur(90px);
  }
}

.frame {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: visible;
  border-radius: clamp(16px, 2.2vw, 25px);

  &--red {
    padding: clamp(8px, 1.6vh, 22px);
    border: clamp(5px, 0.8vw, 9px) solid $red;
    box-shadow: 0 0 24px rgba($red, 0.35);
  }

  &--blue {
    padding: clamp(56px, 9vh, 76px) clamp(18px, 2.6vw, 40px) clamp(16px, 2.4vh, 28px);
    overflow: visible;
    border: clamp(4px, 0.65vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
  }
}

.logo {
  position: absolute;
  top: 40px;
  left: 50%;
  z-index: 6;
  width: min(42vw, 210px);
  height: auto;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
}

.stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.mascot {
  position: absolute;
  left: -23px;
  bottom: 0;
  z-index: 3;
  width: auto;
  max-width: 58%;
  height: min(92%, 78vh);
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.bubble {
  position: relative;
  z-index: 4;
  grid-column: 2;
  justify-self: start;
  width: max-content;
  max-width: min(100%, 34rem);
  margin: 0;
  padding: clamp(22px, 3.4vh, 42px) clamp(22px, 3vw, 40px);
  color: #fff;
  font-size: clamp(1.25rem, 0.75rem + 2vw, 2.15rem);
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  border-radius: 32px;
  background: linear-gradient(135deg, $bubble-start 0%, $bubble-end 100%);
  pointer-events: none;

  strong,
  span {
    display: block;
  }

  strong {
    margin-bottom: 0.15em;
    font-size: 1.08em;
  }

  span {
    white-space: nowrap;
  }

  &::after {
    content: '';
    position: absolute;
    top: 52%;
    left: 0;
    border: 16px solid transparent;
    border-right-color: $bubble-side;
    border-left-width: 0;
    transform: translate(-90%, -50%);
  }
}

@media (orientation: portrait) {
  .page {
    overflow: auto;
  }

  .frame--blue {
    padding-top: clamp(64px, 10vh, 84px);
  }

  .stage {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    justify-items: center;
  }

  .bubble {
    grid-column: 1;
    margin-top: clamp(8px, 2vh, 20px);

    &::after {
      top: auto;
      bottom: 0;
      left: 28%;
      border: 12px solid transparent;
      border-top-color: $bubble-bot;
      border-bottom-width: 0;
      transform: translateY(90%);
    }
  }

  .mascot {
    max-width: 72%;
    height: min(42vh, 360px);
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
  }
}

@media (max-height: 600px) {
  .logo {
    width: 140px;
  }

  .bubble {
    font-size: clamp(1rem, 2.4vh, 1.35rem);
    padding: 14px 20px;
  }
}
</style>
