<script setup lang="ts">
import { useRouter } from 'vue-router'
import bubbleBlue from '@/assets/images/bubble-blue.png'

const router = useRouter()

function goToRegister(): void {
  void router.replace({ name: 'register' })
}
</script>

<template>
  <main class="page" role="status" aria-live="polite" tabindex="0">
    <div class="glow" aria-hidden="true">
      <span class="glow__spot glow__spot--top" />
      <span class="glow__spot glow__spot--mid" />
      <span class="glow__spot glow__spot--bot" />
    </div>

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <section class="section-1">
          <img src="../assets/images/mascot.png" alt="" draggable="false" />
        </section>

        <section class="section-2">
          <img
            class="logo"
            src="../assets/images/partner_logo.png"
            alt="Логотип партнёра"
            draggable="false"
          />
          <p class="bubble" :style="{ '--bubble-bg': `url(${bubbleBlue})` }">
            <span>Хорошо!</span>
            <span>Подожди, когда</span>
            <span>сотрудник тебя назовет.</span>
          </p>
          <button class="submit" type="submit" @click="goToRegister">Выход</button>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$glow: #0040ff;
$bubble: #0040ff;

.page {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: clamp(12px, 2.4vh, 32px);
  overflow: hidden;
  background: #000;
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
    overflow: visible;
    border: clamp(4px, 0.65vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
    display: flex;
    position: relative;
  }
}

.section-1 {
  width: 48%;
  position: relative;

  img {
    position: absolute;
    left: -60px;
    bottom: -70px;
    z-index: 3;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: left bottom;
    pointer-events: none;
    user-select: none;
  }
}

.section-2 {
  display: flex;
  flex-direction: column;
  width: 52%;
  height: 100%;
  align-items: center;
  padding: 45px 0 35px 0;
  .logo {
    width: 204px;
    margin-bottom: 70px;
  }

  .bubble {
    position: relative;
    z-index: 4;
    box-sizing: border-box;
    width: min(100%, 542px);
    aspect-ratio: 583 / 274;
    margin: 0;
    padding: 12% 8% 20%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 36px;
    font-weight: 500;
    line-height: 1.1;
    text-align: center;
    pointer-events: none;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background: var(--bubble-bg) no-repeat center / 96% 80%;
      pointer-events: none;
      left: -31px;
      bottom: -19px;
    }

    span {
      display: block;
      white-space: nowrap;
    }
  }

  .submit {
    width: 89%;
    height: 60px;
    border-radius: 40px;
    background: $red;
    color: #fff;
    font-size: 20px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    border: 0;
  }
}
</style>
