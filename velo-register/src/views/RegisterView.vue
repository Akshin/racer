<script setup lang="ts">
/**
 * Одна страница киоска: оператор вписывает участника и сразу отправляет в Supabase.
 * После успеха форма очищается — следующий человек регистрируется без перезагрузки.
 */
import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { createUser } from '@/net/usersApi'

const SUCCESS_MS = 4000

const nick = ref('')
const email = ref('')
const phone = ref('')
const submitting = ref(false)
const error = ref('')
const successNick = ref('')

const nickField = useTemplateRef<HTMLInputElement>('nickField')
let successTimer: number | undefined

function clearSuccessTimer(): void {
  if (successTimer === undefined) return
  window.clearTimeout(successTimer)
  successTimer = undefined
}

async function focusNick(): Promise<void> {
  await nextTick()
  nickField.value?.focus()
}

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  successNick.value = ''
  clearSuccessTimer()

  try {
    const user = await createUser({
      nick: nick.value,
      email: email.value,
      phone: phone.value,
    })
    nick.value = ''
    email.value = ''
    phone.value = ''
    successNick.value = user.nick
    successTimer = window.setTimeout(() => {
      successNick.value = ''
      successTimer = undefined
    }, SUCCESS_MS)
    await focusNick()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(clearSuccessTimer)
</script>

<template>
  <main class="page">
    <header>
      <p class="kicker">Заезд</p>
      <h1>Регистрация участника</h1>
      <p class="muted">Ник обязателен. Почта и телефон — по желанию.</p>
    </header>

    <form class="card" autocomplete="off" @submit.prevent="onSubmit">
      <p v-if="successNick" class="banner ok" role="status">{{ successNick }} зарегистрирован</p>
      <p v-if="error" class="banner error" role="alert">{{ error }}</p>

      <label>
        Ник
        <input
          ref="nickField"
          v-model="nick"
          name="nick"
          type="text"
          required
          maxlength="40"
          enterkeyhint="next"
          autocapitalize="words"
          autocomplete="off"
          spellcheck="false"
        />
      </label>

      <label>
        Почта
        <input
          v-model="email"
          name="email"
          type="email"
          inputmode="email"
          enterkeyhint="next"
          autocomplete="off"
          placeholder="необязательно"
        />
      </label>

      <label>
        Телефон
        <input
          v-model="phone"
          name="phone"
          type="tel"
          inputmode="tel"
          enterkeyhint="done"
          autocomplete="off"
          placeholder="необязательно"
        />
      </label>

      <button class="primary" type="submit" :disabled="submitting || nick.trim() === ''">
        {{ submitting ? 'Сохраняю…' : 'Зарегистрировать' }}
      </button>
    </form>
  </main>
</template>

<style scoped lang="scss">
@use '@/assets/styles/theme' as t;

.page {
  display: grid;
  gap: 1.5rem;
  width: min(36rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2.5rem 0 3rem;
}

header {
  display: grid;
  gap: 0.35rem;
}

.kicker {
  color: t.$accent;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  font-size: 2rem;
}

.muted {
  color: t.$muted;
}

.card {
  @include t.card;
}

label {
  display: grid;
  gap: 0.4rem;
  font-weight: 600;
}

input {
  @include t.field;
  font-weight: 400;
}

.banner {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: t.$radius;
  font-weight: 600;

  &.ok {
    color: t.$ok;
    background: color-mix(in srgb, t.$ok 12%, transparent);
  }

  &.error {
    color: t.$error;
    background: color-mix(in srgb, t.$error 12%, transparent);
  }
}

button {
  @include t.button;
  width: 100%;
  margin-top: 0.25rem;
  padding: 1.1rem 1.25rem;
  font-size: 1.15rem;

  &.primary {
    @include t.button-primary;
  }
}
</style>
