import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        // Все типы проекта лежат в одном .d.ts. Компилятор SFC ищет типы только в самом
        // файле и в его импортах, поэтому глобальные объявления нужно указать явно —
        // иначе defineProps<...>() с ними не собирается.
        globalTypeFiles: [fileURLToPath(new URL('./src/types.d.ts', import.meta.url))],
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
