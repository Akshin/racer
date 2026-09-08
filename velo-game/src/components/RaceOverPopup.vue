<script setup lang="ts">
/**
 * Последний финишный оверлей: «никуда не уходите». Всегда после результатов.
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

        <div class="panel">
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
  backdrop-filter: blur(8px);
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
  min-width: 0;
  min-height: 0;
  overflow: visible;
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
  left: calc(-1 * clamp(20px, 3.6vw, 48px));
  bottom: 0;
  z-index: 3;
  width: auto;
  height: min(96%, 88vh);
  max-width: 44%;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.panel {
  position: relative;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.6vh, 18px);
  width: min(58%, 38rem);
  height: 100%;
  margin-left: auto;
  padding: clamp(12px, 2vh, 24px) clamp(16px, 2vw, 28px) clamp(56px, 8vh, 72px);
  color: #fff;
  text-align: center;
}

.logo {
  width: min(100%, 210px);
  height: auto;
  pointer-events: none;
  user-select: none;
}

h2 {
  margin: 0;
  font-size: clamp(2.1rem, 5.2vw, 3.8rem);
  font-weight: 700;
  line-height: 1.05;
}

.card {
  position: relative;
  width: 100%;
  padding: clamp(2.4rem, 4vh, 2.8rem) clamp(1.5rem, 2.6vw, 2.2rem) clamp(1.3rem, 2.2vh, 1.7rem);
  color: $text-blue;
  background: rgb(255 255 255 / 88%);
  border-radius: 32px;
}

.avatars {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 1;
  display: flex;
  transform: translate(-50%, -50%);
}

.avatar {
  display: grid;
  place-items: center;
  width: clamp(44px, 5.2vw, 56px);
  height: clamp(44px, 5.2vw, 56px);
  color: #fff;
  font-size: 1.15rem;
  font-weight: 700;
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
  margin: 0 0 0.4rem;
  font-size: clamp(1.25rem, 2.4vw, 1.85rem);
  font-weight: 700;
}

.card__text {
  margin: 0;
  font-size: clamp(0.88rem, 1.35vw, 1.08rem);
  font-weight: 500;
  line-height: 1.35;
}

.end {
  position: absolute;
  right: clamp(16px, 3vw, 36px);
  bottom: clamp(12px, 2.2vh, 24px);
  left: 32%;
  z-index: 4;
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

@media (max-width: 900px) {
  .panel {
    width: min(92%, 38rem);
    margin: 0 auto;
  }

  .mascot {
    max-width: 58%;
    height: min(52%, 46vh);
  }

  .end {
    left: 8%;
  }
}
</style>
