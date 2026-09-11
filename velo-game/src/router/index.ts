import { createRouter, createWebHistory } from 'vue-router'
import SetupView from '@/views/SetupView.vue'
import { useSessionStore } from '@/stores/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'setup', component: SetupView },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('@/views/LeaderboardView.vue'),
    },
    {
      path: '/start',
      name: 'start',
      component: () => import('@/views/StartView.vue'),
    },
    {
      path: '/mock',
      name: 'mock',
      component: () => import('@/views/MockView.vue'),
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('@/views/GameView.vue'),
      // Без пройденной проверки экран гонки бесполезен — возвращаем на страницу проверки.
      // Смотрим на `canRace`, а не на `ready`: после F5 соединение поднимается не мгновенно.
      beforeEnter: (to) => {
        if (import.meta.env.DEV && ['finish', 'solo', 'over'].includes(String(to.query.popup))) {
          return true
        }
        return useSessionStore().canRace ? true : { name: 'setup' }
      },
    },
  ],
})

export default router
