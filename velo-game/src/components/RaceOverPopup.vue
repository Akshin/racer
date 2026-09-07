<script setup lang="ts">
/**
 * Второй финишный оверлей: «никуда не уходите». Полупрозрачный — трасса видна под ним.
 */
import { computed } from 'vue'

const props = defineProps<{
  names: string[]
}>()

const initials = computed(() =>
  props.names.map((name) => name.trim().charAt(0).toUpperCase() || '?').slice(0, 2),
)

const confetti = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: `${(i * 19 + 7) % 100}%`,
  top: `${(i * 27 + 3) % 92}%`,
  size: 7 + (i % 6),
  color: ['#ff4d8d', '#5ec8ff', '#c9a0ff'][i % 3] ?? '#fff',
  rotate: (i * 41) % 360,
  delay: `${(i % 8) * 0.14}s`,
}))
</script>

<template>
  <div class="popup">
    <span
      v-for="piece in confetti"
      :key="piece.id"
      class="confetti"
      :style="{
        left: piece.left,
        top: piece.top,
        width: `${piece.size}px`,
        height: `${piece.size}px`,
        background: piece.color,
        transform: `rotate(${piece.rotate}deg)`,
        animationDelay: piece.delay,
      }"
    />

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <img class="mascot" src="@/assets/images/mascod_flag.png" alt="" draggable="false" />

        <div class="copy">
          <img class="logo" src="@/assets/images/vk_logo.png" alt="VK Видео" draggable="false" />
          <h2>Гонка закончена!</h2>

          <div class="card">
            <div v-if="initials.length" class="avatars" aria-hidden="true">
              <span
                v-for="(letter, index) in initials"
                :key="`${letter}-${index}`"
                class="avatar"
                :class="`avatar--${index + 1}`"
              >
                {{ letter }}
              </span>
            </div>
            <p class="card__title">Никуда не уходите!</p>
            <p class="card__text">
              Попадите в рейтинг, получите подарок за результат и сделайте фото на стенде.
            </p>
          </div>
        </div>

        <div class="end">
          <span class="end__line" />
          <img class="end__bike" src="@/assets/images/white_biker.png" alt="" draggable="false" />
          <p>Конец заезда</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$text-blue: #1d4aa8;

.popup {
  position: absolute;
  inset: 0;
  display: grid;
  padding: clamp(10px, 2vh, 24px);
  overflow: hidden;
  background: rgb(10 48 150 / 42%);
}

.confetti {
  position: absolute;
  z-index: 1;
  border-radius: 1px;
  pointer-events: none;
  animation: confetti-fall 4.5s linear infinite;
}

.frame {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: clamp(16px, 2.4vw, 28px);

  &--red {
    padding: clamp(8px, 1.5vh, 20px);
    border: clamp(4px, 0.75vw, 8px) solid $red;
    box-shadow: 0 0 22px rgb(255 43 66 / 35%);
  }

  &--blue {
    position: relative;
    overflow: visible;
    border: clamp(3px, 0.55vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgb(0 119 255 / 35%);
  }
}

.mascot {
  position: absolute;
  left: calc(-1 * clamp(28px, 5vw, 64px));
  bottom: calc(-1 * clamp(12px, 2.4vh, 32px));
  z-index: 3;
  width: auto;
  height: min(108%, 92vh);
  max-width: none;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 6% 6% 12% 32%;
  color: #fff;
  text-align: center;
}

.logo {
  width: min(100%, 210px);
  height: auto;
  margin-bottom: clamp(10px, 1.8vh, 18px);
}

h2 {
  margin: 0 0 clamp(18px, 3vh, 32px);
  font-size: clamp(2.1rem, 5.4vw, 4.2rem);
  font-weight: 800;
  line-height: 1.05;
}

.card {
  position: relative;
  width: min(100%, 36rem);
  padding: clamp(2rem, 3.6vh, 2.6rem) clamp(1.6rem, 3vw, 2.4rem) clamp(1.2rem, 2.4vh, 1.7rem);
  color: $text-blue;
  background: rgb(255 255 255 / 78%);
  border-radius: 999px;
}

.avatars {
  position: absolute;
  top: 0;
  left: 50%;
  display: flex;
  transform: translate(-50%, -55%);
}

.avatar {
  display: grid;
  place-items: center;
  width: clamp(42px, 5vw, 56px);
  height: clamp(42px, 5vw, 56px);
  color: #fff;
  font-size: 1.15rem;
  font-weight: 800;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 4px 10px rgb(0 0 0 / 25%);

  &--1 {
    z-index: 1;
    background: #f0c14a;
  }

  &--2 {
    margin-left: -12px;
    background: #5a7dff;
  }
}

.card__title {
  margin: 0.35rem 0 0.35rem;
  font-size: clamp(1.25rem, 2.4vw, 1.85rem);
  font-weight: 800;
}

.card__text {
  margin: 0;
  font-size: clamp(0.85rem, 1.35vw, 1.05rem);
  line-height: 1.35;
}

.end {
  position: absolute;
  right: clamp(16px, 3vw, 36px);
  bottom: clamp(12px, 2.2vh, 24px);
  left: 32%;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #fff;
}

.end__line {
  flex: 1 1 auto;
  height: 2px;
  background: rgb(255 255 255 / 92%);
}

.end__bike {
  width: auto;
  height: 26px;
  mix-blend-mode: screen;
}

.end p {
  margin: 0;
  font-size: clamp(0.9rem, 1.3vw, 1.1rem);
  font-weight: 600;
  white-space: nowrap;
}

@keyframes confetti-fall {
  0% {
    opacity: 0.85;
    translate: 0 -8px;
  }

  100% {
    opacity: 0.9;
    translate: 12px 18px;
  }
}
</style>
