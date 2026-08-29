# velo-game

Фронтенд дуэльной гонки на велотренажёрах. Данные о каденсе и скорости приходят
по WebSocket от адаптера [velo-node](../velo-node).

## Страницы

- `/` — **проверка перед заездом** (корневая): подключение к адаптеру, статус связи,
  живые показатели обоих тренажёров, журнал событий и кнопка перехода в игру.
  Кнопка разблокируется, только когда оба датчика привязаны и передали обороты
  педалей — если чего-то не хватает, страница перечисляет что именно.
- `/game` — экран гонки. Пока заглушка с показателями; сюда встанет сплит-скрин
  на PixiJS. Прямой заход без пройденной проверки возвращает на `/`.

Адрес адаптера по умолчанию — `ws://<хост страницы>:8080`. Его можно поменять прямо
на странице проверки (сохраняется в localStorage) или задать через `VITE_WS_URL`.

Перезагрузка страницы не сбрасывает работу: адрес и факт нажатия «Подключиться» лежат
в localStorage, поэтому соединение поднимается само, а пройденная проверка помнится
в sessionStorage — гонка не выбрасывается на `/` из-за F5. Кнопка «Отключиться» снимает
и то, и другое, после неё автоподключения не будет.

## Как устроено

- `src/types.d.ts` — все типы проекта. Файл без импортов и экспортов, поэтому объявления
  глобальные: в `.ts` и `.vue` они доступны без импорта. Новые типы описываем только здесь;
- `src/net/protocol.ts` — значения контракта с адаптером (версия протокола, список игроков),
  копия раздела из `velo-node/src/types.ts`;
- `src/net/telemetryClient.ts` — WebSocket-соединение с автопереподключением;
- `src/stores/session.ts` — состояние сессии: телеметрия, журнал, проверка готовности.

Стили на SCSS. Глобально печатаются только сброс браузерных стилей
(`src/assets/styles/reset.scss`) и оформление страницы целиком — фон, цвет текста, шрифт
(`src/assets/styles/main.scss`). Палитра и миксины повторяющихся элементов (кнопка, поле,
карточка) лежат в `src/assets/styles/_theme.scss` и сами ничего не печатают: компонент
подключает их через `@use '@/assets/styles/theme' as t` внутри своего
`<style scoped lang="scss">`.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
