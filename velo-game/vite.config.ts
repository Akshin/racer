import { fileURLToPath, URL } from 'node:url'

import { AssetPack } from '@assetpack/core'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { defineConfig, type Plugin } from 'vite'
import assetpackConfig from './.assetpack.js'

/** В dev следит за raw-assets/, в production-сборке прогоняет пайплайн один раз. */
function assetpackPlugin(watch: boolean): Plugin {
  let pack: AssetPack | undefined

  return {
    name: 'assetpack',
    async buildStart() {
      if (pack !== undefined) return
      pack = new AssetPack(assetpackConfig)
      if (watch) await pack.watch()
      else await pack.run()
    },
    async closeBundle() {
      await pack?.stop()
      pack = undefined
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    assetpackPlugin(command === 'serve'),
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
}))
