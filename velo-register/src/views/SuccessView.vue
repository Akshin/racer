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
    <div class="frame frame--red">
      <div class="frame frame--blue">
        <img class="logo" src="../assets/images/vk_logo.png" alt="VK Видео" draggable="false" />

        <div class="body">
          <img class="mascot" src="../assets/images/MASCOT_WHITE.png" alt="" draggable="false" />
          <p class="bubble">
            <strong>Хорошо!</strong>
            <span>Подожди, когда сотрудник</span>
            <span>тебя назовет.</span>
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$navy: #07101c;
$bubble: #9aa8bc;
$gutter: clamp(8px, 1.6vh, 28px);

.page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: max($gutter, env(safe-area-inset-top, 0px)) max($gutter, env(safe-area-inset-right, 0px))
    max($gutter, env(safe-area-inset-bottom, 0px)) max($gutter, env(safe-area-inset-left, 0px));
  overflow: hidden;
  background: $navy;
  box-shadow: 0 0 182px 0 #0040ff inset;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.frame {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: clamp(14px, 2.2vw, 25px);

  &--red {
    padding: clamp(6px, 1.5vh, 22px);
    border: clamp(4px, 0.8vw, 9px) solid $red;
    box-shadow: 0 0 24px rgba($red, 0.35);
  }

  &--blue {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: clamp(8px, 2vh, 24px);
    padding: clamp(10px, 2.2vh, 32px) clamp(12px, 2.4vw, 36px) clamp(8px, 1.4vh, 20px);
    border: clamp(3px, 0.6vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
  }
}

.logo {
  width: min(100%, clamp(160px, 20vw, 240px));
  height: auto;
  margin: 0 auto;
  pointer-events: none;
}

.body {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  align-items: center;
  min-width: 0;
  min-height: 0;
}

.mascot {
  align-self: end;
  justify-self: start;
  width: auto;
  max-width: 100%;
  height: min(100%, 78vh);
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
}

.bubble {
  position: relative;
  z-index: 1;
  justify-self: center;
  width: max-content;
  max-width: min(100%, 34rem);
  margin: 0;
  padding: clamp(18px, 3.2vh, 40px) clamp(12px, 3.2vw, 28px);
  color: #fff;
  font-size: clamp(1.15rem, 0.7rem + 2.1vw, 2.15rem);
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  background: #9aa8bc;
  border-radius: clamp(18px, 2.4vw, 32px);
  pointer-events: none;
  background: linear-gradient(135deg, #003180 0%, #4c9ef8 50%, #9cbefb 100%);
  white-space: nowrap;

  strong,
  span {
    display: block;
  }

  strong {
    margin-bottom: 0.2em;
    font-size: 1.08em;
    font-weight: 700;
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
    border-right-color: $bubble;
    border-left-width: 0;
    transform: translate(-92%, -50%);
  }
}

@media (orientation: portrait) {
  .frame--blue {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    justify-items: center;
  }

  .bubble {
    order: 0;
    margin-top: clamp(8px, 2vh, 20px);

    &::after {
      top: auto;
      bottom: 0;
      left: 28%;
      border: 12px solid transparent;
      border-top-color: $bubble;
      border-bottom-width: 0;
      transform: translateY(92%);
    }
  }

  .mascot {
    order: 1;
    height: min(100%, 48vh);
    justify-self: center;
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

@media (max-width: 700px) {
  .body {
    grid-template-columns: 1fr;
  }
}
</style>
