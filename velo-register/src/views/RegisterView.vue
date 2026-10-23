<script setup lang="ts">
/**
 * Одна страница киоска: оператор вписывает участника и сразу отправляет в Supabase.
 * После успеха — экран ожидания, затем снова эта форма.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUser } from '@/net/usersApi'
import bubbleBlack from '@/assets/images/bubble-black-1.png'

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
  () => nick.value.trim() !== '' && phoneReady.value && consent.value && !submitting.value,
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

function capitalizeNick(value: string): string {
  if (value === '') return value
  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1)
}

function onNickInput(event: Event): void {
  const input = event.target as HTMLInputElement
  const caret = input.selectionStart
  nick.value = capitalizeNick(input.value.slice(0, NICK_MAX))
  input.value = nick.value
  if (caret !== null) input.setSelectionRange(caret, caret)
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
    <div class="glow" aria-hidden="true">
      <span class="glow__spot glow__spot--top" />
      <span class="glow__spot glow__spot--mid" />
      <span class="glow__spot glow__spot--bot" />
    </div>

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <section class="section-1">
          <img src="../assets/images/mascot.png" alt="" draggable="false" />
          <p class="bubble" :style="{ '--bubble-bg': `url(${bubbleBlack})` }">
            <span>Введи свой никнейм</span>
            <span>и номер телефона, чтобы</span>
            <span>ты смог забрать приз!</span>
          </p>
        </section>

        <section class="section-2">
          <img
            class="logo"
            src="../assets/images/partner_logo.png"
            alt="Логотип партнёра"
            draggable="false"
          />

          <form class="form" autocomplete="off" novalidate>
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
          </form>
          <button class="submit" type="submit" :disabled="!canSubmit" @click="onSubmit">
            {{ submitting ? 'Сохраняю…' : 'Принять участие' }}
          </button>
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
    bottom: -180px;
    z-index: 3;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: left bottom;
    pointer-events: none;
    user-select: none;
  }

  .bubble {
    position: relative;
    z-index: 4;
    box-sizing: border-box;
    aspect-ratio: 583 / 274;
    margin: 0;
    padding: 12% 8% 17%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 26px;
    font-weight: 500;
    line-height: 1.1;
    text-align: center;
    pointer-events: none;
    width: 369px;
    left: 61px;
    bottom: -40px;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background: var(--bubble-bg) no-repeat center / 96% 80%;
      pointer-events: none;
      left: 6px;
      bottom: -19px;
    }

    span {
      display: block;
      white-space: nowrap;
    }
  }
}

.section-2 {
  display: flex;
  flex-direction: column;
  width: 52%;
  height: 100%;
  align-items: center;
  padding: 45px 36px 35px 0;
  .logo {
    width: 204px;
    margin-bottom: 48px;
  }
  .submit {
    width: 100%;
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
    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &:not(:disabled):active {
      filter: brightness(0.92);
    }
  }

  .form {
    display: grid;
    gap: clamp(14px, 2.2vh, 26px);
  }

  .field {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  .field__label {
    color: #fff;
    font-size: clamp(1rem, 1.15vw, 1.25rem);
    font-weight: 700;
    font-size: 20px;
  }

  .field input {
    width: 100%;
    height: clamp(46px, 5.8vh, 54px);
    padding: 0 1rem;
    color: #000;
    font-size: 20px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.4);
    border: 0;
    border-radius: 13px;
    outline: none;
    appearance: none;

    &::placeholder {
      color: #313131;
      opacity: 0.72;
    }

    &:focus {
      box-shadow: 0 0 0 2px rgba($blue, 0.65);
    }
  }

  .gender__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
  }

  .choice,
  .consent {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    min-height: clamp(46px, 5.8vh, 52px);
    padding: 0 0.85rem;
    color: #fff;
    font-size: clamp(0.95rem, 1.05vw, 1.125rem);
    font-weight: 500;
    text-align: left;
    background: transparent;
    border: 2.5px solid #c8c8c8;
    border-radius: 13px;
    user-select: none;
  }

  .consent {
    font-size: clamp(0.88rem, 1vw, 1.05rem);
    line-height: 1.2;
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

  .consent .tick {
    border-radius: 6px;
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
    color: #c7c7c7;
    font-size: clamp(0.8rem, 0.95vw, 1.05rem);
    font-weight: 500;
    line-height: 1.35;

    span {
      color: $red;
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
}
</style>
