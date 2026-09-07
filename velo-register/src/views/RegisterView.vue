<script setup lang="ts">
/**
 * Одна страница киоска: оператор вписывает участника и сразу отправляет в Supabase.
 * После успеха — экран ожидания, затем снова эта форма.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUser } from '@/net/usersApi'

const NICK_MAX = 20
const PHONE_LOCAL_DIGITS = 10

type Gender = 'male' | 'female'

const router = useRouter()
const nick = ref('')
const phoneDigits = ref('')
const gender = ref<Gender>('male')
const consent = ref(false)
const submitting = ref(false)
const error = ref('')

const phoneDisplay = computed(() => formatPhone(phoneDigits.value))
const phoneReady = computed(() => phoneDigits.value.length === PHONE_LOCAL_DIGITS)
const canSubmit = computed(
  () =>
    nick.value.trim() !== '' &&
    phoneReady.value &&
    consent.value &&
    !submitting.value,
)

/** Цифры после +7: 10 штук. 7 и 8 в начале — код страны / восьмёрка, не номер. */
function parsePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  while (digits.startsWith('7') || digits.startsWith('8')) digits = digits.slice(1)
  return digits.slice(0, PHONE_LOCAL_DIGITS)
}

function formatPhone(digits: string): string {
  const a = digits.slice(0, 3)
  const b = digits.slice(3, 6)
  const c = digits.slice(6, 8)
  const d = digits.slice(8, 10)
  let out = '+7'
  if (a) out += ` ${a}`
  if (b) out += ` ${b}`
  if (c) out += `-${c}`
  if (d) out += `-${d}`
  return out
}

function onNickInput(event: Event): void {
  const input = event.target as HTMLInputElement
  nick.value = input.value.slice(0, NICK_MAX)
}

function onPhoneBeforeInput(event: Event): void {
  const inputEvent = event as InputEvent
  if (inputEvent.inputType !== 'insertText' || inputEvent.data === null) return
  if (/\D/.test(inputEvent.data)) {
    inputEvent.preventDefault()
    return
  }
  if (phoneDigits.value.length >= PHONE_LOCAL_DIGITS) inputEvent.preventDefault()
}

function onPhoneInput(event: Event): void {
  const input = event.target as HTMLInputElement
  phoneDigits.value = parsePhoneDigits(input.value)
  input.value = formatPhone(phoneDigits.value)
}

function placePhoneCaretAtEnd(event: Event): void {
  const input = event.target as HTMLInputElement
  const len = input.value.length
  requestAnimationFrame(() => input.setSelectionRange(len, len))
}

function resetForm(): void {
  nick.value = ''
  phoneDigits.value = ''
  gender.value = 'male'
  consent.value = false
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = ''

  try {
    await createUser({
      nick: nick.value,
      phone: `+7${phoneDigits.value}`,
      gender: gender.value,
    })
    resetForm()
    await router.replace({ name: 'success' })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="page">
    <div class="frame frame--red">
      <div class="frame frame--blue">
        <div class="stage">
          <div class="hero">
            <p class="bubble">Введи свой никнейм и номер телефона, чтобы ты смог забрать приз!</p>
            <img class="mascot" src="../assets/images/MASCOT_WHITE.png" alt="" draggable="false" />
          </div>

          <section class="panel">
            <img class="logo" src="../assets/images/vk_logo.png" alt="VK Видео" draggable="false" />

            <form class="form" autocomplete="off" novalidate @submit.prevent="onSubmit">
              <p v-if="error" class="banner error" role="alert">{{ error }}</p>

              <label class="field">
                <span class="field__label">Никнейм</span>
                <input
                  :value="nick"
                  name="nick"
                  type="text"
                  maxlength="20"
                  required
                  placeholder="Введите никнейм"
                  enterkeyhint="next"
                  autocapitalize="words"
                  autocomplete="off"
                  autocorrect="off"
                  spellcheck="false"
                  @input="onNickInput"
                />
              </label>

              <label class="field">
                <span class="field__label">Телефон</span>
                <input
                  :value="phoneDisplay"
                  name="phone"
                  type="tel"
                  inputmode="numeric"
                  enterkeyhint="done"
                  autocomplete="off"
                  autocorrect="off"
                  spellcheck="false"
                  @beforeinput="onPhoneBeforeInput"
                  @input="onPhoneInput"
                  @focus="placePhoneCaretAtEnd"
                />
              </label>

              <div class="field gender">
                <span id="gender-label" class="field__label">Пол</span>
                <div class="gender__row" role="radiogroup" aria-labelledby="gender-label">
                  <button
                    type="button"
                    class="choice"
                    role="radio"
                    :aria-checked="gender === 'male'"
                    :class="{ 'is-on': gender === 'male' }"
                    @click="gender = 'male'"
                  >
                    <span class="tick" aria-hidden="true" />
                    Мужской
                  </button>
                  <button
                    type="button"
                    class="choice"
                    role="radio"
                    :aria-checked="gender === 'female'"
                    :class="{ 'is-on': gender === 'female' }"
                    @click="gender = 'female'"
                  >
                    <span class="tick" aria-hidden="true" />
                    Женский
                  </button>
                </div>
              </div>

              <label class="consent" :class="{ 'is-on': consent }">
                <input v-model="consent" class="sr-only" type="checkbox" name="consent" />
                <span class="tick" aria-hidden="true" />
                Согласие на обработку персональных данных
              </label>

              <p class="legal">
                Я даю <span>согласие</span> на обработку персональных данных для цели получения
                рекламных и информационных сообщений.
              </p>

              <button class="submit" type="submit" :disabled="!canSubmit">
                {{ submitting ? 'Сохраняю…' : 'Принять участие' }}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$navy: #07101c;
$field-bg: rgba(18, 26, 40, 0.78);
$bubble: #c5ced8;
$text-dark: #1a2740;

.page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: clamp(10px, 2.2vh, 28px);
  overflow: hidden;
  background: $navy;
  box-shadow: 0 0 182px 0 #0040ff inset;
  -webkit-tap-highlight-color: transparent;
}

.frame {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border-radius: 25px;

  &--red {
    padding: clamp(10px, 1.8vh, 22px);
    border: 9px solid $red;
    box-shadow: 0 0 24px rgba($red, 0.35);
  }

  &--blue {
    padding: clamp(12px, 2.4vh, 28px) clamp(16px, 2.4vw, 32px);
    border: 7px solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
  }
}

.stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(340px, 0.88fr);
  gap: clamp(12px, 2vw, 32px);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.hero {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.bubble {
  position: relative;
  z-index: 2;
  max-width: min(100%, 28rem);
  margin: clamp(4px, 1.5vh, 20px) 0 0 clamp(8px, 2vw, 36px);
  padding: clamp(14px, 2vh, 22px) clamp(16px, 1.8vw, 26px);
  color: #fff;
  font-size: clamp(1rem, 1.7vw, 1.35rem);
  font-weight: 500;
  line-height: 1.35;
  border-radius: 22px;
  background: linear-gradient(135deg, #003180 0%, #4c9ef8 50%, #9cbefb 100%);

  &::after {
    content: '';
    position: absolute;
    left: 18%;
    bottom: -14px;
    border: 10px solid transparent;
    border-top-color: $bubble;
    border-bottom-width: 0;
  }
}

.mascot {
  position: absolute;
  left: -2%;
  bottom: -2%;
  z-index: 1;
  width: auto;
  height: 78%;
  max-width: none;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 0 clamp(8px, 1.5vw, 28px) 0 0;
  z-index: 2;
}

.logo {
  width: min(100%, 220px);
  height: auto;
  margin: 0 auto clamp(10px, 1.8vh, 22px);
}

.form {
  display: grid;
  gap: clamp(8px, 1.3vh, 14px);
}

.banner {
  margin: 0;
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  font-size: 0.95rem;

  &.error {
    color: #ffd0d5;
    background: rgba($red, 0.18);
  }
}

.field {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.field__label {
  color: #fff;
  font-size: clamp(0.95rem, 1.2vw, 1.15rem);
  font-weight: 500;
}

.field input {
  width: 100%;
  height: clamp(48px, 6.2vh, 58px);
  padding: 0 1.1rem;
  color: #fff;
  font-size: 1.05rem;
  background: $field-bg;
  border: 0;
  border-radius: 14px;
  outline: none;
  appearance: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);

  &::placeholder {
    color: rgba(255, 255, 255, 0.38);
  }

  &:focus {
    box-shadow: inset 0 0 0 1px rgba($blue, 0.7);
  }
}

.gender__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.choice,
.consent {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  min-height: clamp(48px, 6.2vh, 56px);
  padding: 0 1rem;
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  text-align: left;
  background: $field-bg;
  border: 1.5px solid rgba(255, 255, 255, 0.55);
  border-radius: 14px;
  user-select: none;
}

.consent {
  font-size: clamp(0.82rem, 1.05vw, 0.98rem);
  line-height: 1.25;
}

.choice.is-on,
.consent.is-on {
  border-color: $red;
}

.tick {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 2px solid #fff;
  border-radius: 50%;

  &::after {
    content: '';
    width: 5px;
    height: 9px;
    margin-top: -1px;
    border-right: 2px solid #fff;
    border-bottom: 2px solid #fff;
    opacity: 0;
    transform: rotate(45deg);
  }
}

.choice.is-on .tick,
.consent.is-on .tick {
  background: $red;
  border-color: $red;

  &::after {
    opacity: 1;
  }
}

.legal {
  margin: 0;
  color: rgba(255, 255, 255, 0.92);
  font-size: clamp(0.72rem, 1vw, 0.88rem);
  line-height: 1.35;

  span {
    color: $red;
    font-weight: 500;
  }
}

.submit {
  width: 100%;
  height: clamp(52px, 7vh, 64px);
  margin-top: clamp(4px, 1vh, 10px);
  color: #fff;
  font-size: clamp(1.05rem, 1.6vw, 1.35rem);
  font-weight: 700;
  background: $red;
  border: 0;
  border-radius: 999px;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    filter: brightness(0.92);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (orientation: portrait) {
  .page {
    overflow: auto;
  }

  .stage {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .hero {
    min-height: 34vh;
  }

  .mascot {
    height: 88%;
  }

  .panel {
    padding: 0 4px 8px;
  }
}
</style>
