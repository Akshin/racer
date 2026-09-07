<script setup lang="ts">
/**
 * Первый финишный оверлей: победитель. Полупрозрачный — трасса видна под ним.
 */
defineProps<{
  winnerName: string
}>()

const confetti = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: `${(i * 19 + 7) % 100}%`,
  top: `${(i * 27 + 3) % 92}%`,
  size: 7 + (i % 6),
  color: ['#ff4d8d', '#5ec8ff', '#ffffff'][i % 3] ?? '#fff',
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
          <h2>Финиш!</h2>
          <p class="place">1-ое место:</p>
          <p class="name">{{ winnerName }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;

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
  padding: 8% 6% 8% 32%;
  color: #fff;
  text-align: center;
}

.logo {
  width: min(100%, 210px);
  height: auto;
  margin-bottom: clamp(12px, 2vh, 22px);
}

h2 {
  margin: 0;
  font-size: clamp(3rem, 9vw, 6.2rem);
  font-weight: 800;
  line-height: 0.95;
}

.place {
  margin: 0.4em 0 0.15em;
  font-size: clamp(1.15rem, 2.4vw, 1.7rem);
  font-weight: 600;
}

.name {
  margin: 0;
  font-size: clamp(1.6rem, 3.4vw, 2.6rem);
  font-weight: 800;
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
